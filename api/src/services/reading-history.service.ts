import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { readingSessions, users, works } from '../db/schema';
import { coverUrl } from './storage.service';

/**
 * Histórico de leitura.
 *
 * Não existe tabela nova aqui, e isso é a decisão: o sistema **já registra**
 * cada sessão de leitura em `reading_sessions`, com a obra, a conta, a última
 * página e o instante da última atividade. Esses dados alimentavam só as
 * métricas do painel da autoria. O histórico é a mesma informação lida do
 * outro lado — pela pessoa que leu, em vez de por quem escreveu.
 *
 * Criar uma tabela de histórico seria guardar duas vezes o mesmo fato, com o
 * risco de os dois registros discordarem.
 *
 * O vínculo é com a CONTA (`user_id`), então o histórico sobrevive a sair e
 * entrar de novo, e acompanha a pessoa em outro aparelho. Visitante sem conta
 * gera sessão anônima (`user_id` nulo), que alimenta as métricas e não vira
 * histórico de ninguém — não há a quem atribuí-la.
 */

export interface ItemDoHistorico {
  work: {
    id: number;
    title: string;
    subtitle: string | null;
    coverUrl: string | null;
    format: string;
    pages: number;
    monetization: string;
  };
  author: { id: number; name: string };
  /** Página mais distante alcançada, somando todas as sessões da obra. */
  lastPage: number;
  /** Quantas vezes a pessoa voltou a esta obra. */
  sessions: number;
  firstReadAt: Date;
  lastReadAt: Date;
  /** 0 a 100. Usa o total de páginas declarado na ficha da obra. */
  progresso: number;
}

export async function listReadingHistory(userId: number, limite = 60): Promise<ItemDoHistorico[]> {
  /*
   * Uma linha por OBRA, não por sessão: quem leu a mesma obra cinco vezes
   * quer ver a obra uma vez, com a informação de que voltou cinco.
   *
   * `max(last_page)` é a página mais distante alcançada, e não a da última
   * sessão — se a pessoa releu o começo ontem, o histórico não deve dizer
   * que ela regrediu.
   */
  const linhas = await db
    .select({
      workId: readingSessions.workId,
      sessions: sql<number>`count(*)`.mapWith(Number),
      lastPage: sql<number>`max(${readingSessions.lastPage})`.mapWith(Number),
      firstReadAt: sql<Date>`min(${readingSessions.startedAt})`,
      lastReadAt: sql<Date>`max(${readingSessions.lastActivityAt})`,
      title: works.title,
      subtitle: works.subtitle,
      coverPath: works.coverPath,
      format: works.format,
      pages: works.pages,
      monetization: works.monetization,
      authorId: users.id,
      authorName: users.name,
    })
    .from(readingSessions)
    .innerJoin(works, eq(works.id, readingSessions.workId))
    .innerJoin(users, eq(users.id, works.authorId))
    .where(and(eq(readingSessions.userId, userId)))
    .groupBy(
      readingSessions.workId,
      works.title,
      works.subtitle,
      works.coverPath,
      works.format,
      works.pages,
      works.monetization,
      users.id,
      users.name,
    )
    .orderBy(desc(sql`max(${readingSessions.lastActivityAt})`))
    .limit(limite);

  return linhas.map((l) => ({
    work: {
      id: l.workId,
      title: l.title,
      subtitle: l.subtitle,
      coverUrl: coverUrl(l.coverPath),
      format: l.format,
      pages: l.pages,
      monetization: l.monetization,
    },
    author: { id: l.authorId, name: l.authorName },
    lastPage: l.lastPage,
    sessions: l.sessions,
    firstReadAt: l.firstReadAt,
    lastReadAt: l.lastReadAt,
    // Limitado a 100: uma sessão pode registrar página maior que o total
    // declarado se a ficha estiver desatualizada, e 103% não existe.
    progresso: l.pages > 0 ? Math.min(100, Math.round((l.lastPage / l.pages) * 100)) : 0,
  }));
}

/** Apaga o histórico da pessoa. As métricas da autoria seguem anônimas. */
export async function clearReadingHistory(userId: number): Promise<number> {
  /*
   * Desvincular, e não excluir.
   *
   * A sessão também é o número que a autoria vê no painel dela. Apagar a
   * linha reescreveria as métricas de outra pessoa; soltar o `user_id` tira
   * a leitura do histórico de quem leu e mantém a contagem de pé. É o mesmo
   * que acontece com um visitante sem conta.
   */
  const alteradas = await db
    .update(readingSessions)
    .set({ userId: null })
    .where(eq(readingSessions.userId, userId))
    .returning({ id: readingSessions.id });
  return alteradas.length;
}
