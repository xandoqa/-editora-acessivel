import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { users, works } from '../db/schema';
import { notFound } from '../utils/http-error';
import { baseWorkQuery, orderings, toWorkDto, type WorkDto } from './work-queries';
import { PUBLIC_STATUS } from './work-policy';

/**
 * Coleções por autor.
 *
 * Este serviço não guarda nada: ele lê as obras que já existem e as agrupa por
 * autoria. Autor, no Livrin, não é uma tabela nova — é a pessoa que publicou, e
 * `works.author_id` já aponta para ela desde a primeira versão. Criar uma
 * tabela `authors` seria duplicar `users` e abrir a porta para as duas
 * discordarem.
 *
 * Consequência que vale dizer em voz alta: **a lista é derivada**. Quem publica
 * uma obra e tem ela aprovada aparece aqui no mesmo instante, sem ninguém
 * cadastrar nada. Quem tem só rascunho não aparece — a página é pública, e
 * rascunho não é.
 *
 * Sobre o custo: a listagem carrega as obras aprovadas e agrupa em memória. Não
 * é por preguiça — o card de cada autor mostra as capas das obras recentes, e
 * capa só sai da consulta de obras. Com um `count` agregado eu ainda teria de
 * buscar as obras para as capas, e aí seriam duas consultas fazendo o trabalho
 * de uma. No tamanho deste acervo (dezenas de obras) isso é uma consulta e
 * alguns milissegundos. Se um dia o acervo crescer a ponto de incomodar, o
 * conserto é paginar a lista de autores e buscar as capas com um `lateral
 * join` por autor — e aí a troca passa a valer a pena.
 */

/** Só entra em coleção quem tem obra aprovada. Rascunho não é obra publicada. */
const SOMENTE_PUBLICADAS = eq(works.status, PUBLIC_STATUS);

export interface AutorResumo {
  id: number;
  name: string;
  headline: string | null;
  bio: string | null;
  worksCount: number;
  /** Gêneros em que publicou, do mais frequente para o menos. */
  genres: string[];
  /** Formatos publicados (LIVRO, QUADRINHO, ...), para os selos do card. */
  formats: string[];
  /** Soma de páginas publicadas — a medida honesta do tamanho de uma coleção. */
  pagesTotal: number;
  /** Capas das obras mais recentes, para a pilha do card. Até três. */
  covers: { id: number; title: string; coverUrl: string | null; coverAlt: string | null }[];
  /** Média das avaliações recebidas e quantas foram. Zero quando não há. */
  rating: { average: number; count: number };
}

interface LinhaDeAutor {
  id: number;
  name: string;
  headline: string | null;
  bio: string | null;
}

/**
 * Monta o resumo a partir das obras já carregadas.
 *
 * Uma função só, usada pela lista e pela página do autor: dois jeitos de somar
 * as mesmas páginas seriam dois jeitos de divergir.
 */
function resumir(autor: LinhaDeAutor, obras: WorkDto[]): AutorResumo {
  const porGenero = new Map<string, number>();
  for (const obra of obras) porGenero.set(obra.genre.name, (porGenero.get(obra.genre.name) ?? 0) + 1);

  const totalNotas = obras.reduce((s, o) => s + o.rating.count, 0);

  return {
    id: autor.id,
    name: autor.name,
    headline: autor.headline,
    bio: autor.bio,
    worksCount: obras.length,
    pagesTotal: obras.reduce((s, o) => s + o.pages, 0),
    // Do gênero mais publicado para o menos; empate resolvido pelo nome, para a
    // ordem não mudar de uma requisição para outra.
    genres: [...porGenero.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
      .map(([nome]) => nome),
    formats: [...new Set(obras.map((o) => o.format))].sort(),
    covers: obras.slice(0, 3).map((o) => ({
      id: o.id,
      title: o.title,
      coverUrl: o.coverUrl,
      coverAlt: o.coverAlt,
    })),
    rating: {
      // Média ponderada pelo número de avaliações, e não média de médias: uma
      // obra com 40 notas não pode pesar o mesmo que uma com 1.
      average: totalNotas
        ? Number((obras.reduce((s, o) => s + o.rating.average * o.rating.count, 0) / totalNotas).toFixed(2))
        : 0,
      count: totalNotas,
    },
  };
}

/** Agrupa as obras por autor preservando a ordem em que chegaram. */
function agrupar(obras: WorkDto[]): Map<number, WorkDto[]> {
  const mapa = new Map<number, WorkDto[]>();
  for (const obra of obras) {
    const lista = mapa.get(obra.author.id);
    if (lista) lista.push(obra);
    else mapa.set(obra.author.id, [obra]);
  }
  return mapa;
}

/**
 * Autores com obra publicada, do que publicou mais recentemente para o resto.
 *
 * A ordem sai de graça: as obras já vêm por data de publicação decrescente, e
 * o `Map` do JavaScript preserva a ordem de inserção. O primeiro autor da lista
 * é, portanto, o dono da obra mais recente do acervo.
 */
export async function listAuthors(): Promise<AutorResumo[]> {
  const obras = (await baseWorkQuery().where(SOMENTE_PUBLICADAS).orderBy(...orderings.recent)).map(toWorkDto);
  const porAutor = agrupar(obras);
  if (!porAutor.size) return [];

  const linhas = await db
    .select({ id: users.id, name: users.name, headline: users.headline, bio: users.bio })
    .from(users)
    .where(inArray(users.id, [...porAutor.keys()]));
  const porId = new Map(linhas.map((l) => [l.id, l]));

  const resumos: AutorResumo[] = [];
  for (const [autorId, minhas] of porAutor) {
    const linha = porId.get(autorId);
    if (linha) resumos.push(resumir(linha, minhas));
  }
  return resumos;
}

/** Autor com a coleção completa. 404 para quem não tem obra publicada. */
export async function getAuthor(id: number) {
  const [autor] = await db
    .select({ id: users.id, name: users.name, headline: users.headline, bio: users.bio })
    .from(users)
    .where(eq(users.id, id));
  if (!autor) throw notFound('Autor não encontrado.');

  const obras = (
    await baseWorkQuery()
      .where(and(eq(works.authorId, id), SOMENTE_PUBLICADAS))
      .orderBy(...orderings.recent)
  ).map(toWorkDto);

  // 404 também para quem existe mas não publicou nada. A página é pública, e
  // confirmar a existência de uma conta sem obra aprovada contaria a um
  // visitante quem tem cadastro aqui.
  if (!obras.length) throw notFound('Autor não encontrado.');

  return { ...resumir(autor, obras), works: obras };
}
