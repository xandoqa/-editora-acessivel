import { Megaphone } from 'lucide-react';
import type { PaletteColors } from './readerPrefs';

/**
 * Publicidade nas obras monetizadas por anúncios.
 *
 * Três regras moldam este componente, e todas vêm do mesmo princípio: **a
 * publicidade não pode atrapalhar a leitura.**
 *
 *  1. **Entre unidades de leitura, nunca dentro delas.** O anúncio aparece
 *     antes da primeira página e entre blocos de páginas — jamais no meio de
 *     um parágrafo, de um diálogo ou por cima do texto.
 *  2. **Sem movimento, sem sobreposição, sem interrupção.** Nada de pop-up,
 *     nada que cubra a página, nada que apareça sozinho depois de alguns
 *     segundos. É um bloco estático que ocupa seu próprio espaço.
 *  3. **Sem rastreamento.** Não há script de terceiro, pixel, cookie ou
 *     chamada de rede. Os anúncios são componentes desta aplicação.
 *
 * Não existe rede publicitária conectada ao projeto. Os anúncios abaixo são
 * fictícios e declarados como demonstração acadêmica — inventar uma
 * integração real seria simular receita que não existe.
 */

interface Anuncio {
  titulo: string;
  texto: string;
  marca: string;
}

/**
 * Anunciantes fictícios, coerentes com o contexto de uma livraria acessível.
 *
 * São invenções do projeto, não empresas reais, e nenhum deles paga nada.
 */
const ANUNCIOS: Anuncio[] = [
  {
    marca: 'Tipografia Aurora',
    titulo: 'Fontes pensadas para quem lê devagar',
    texto: 'Famílias tipográficas com letras que não se confundem entre si.',
  },
  {
    marca: 'Oficina Braille Sul',
    titulo: 'Impressão em braille sob demanda',
    texto: 'Do arquivo digital à página tátil, a partir de um exemplar.',
  },
  {
    marca: 'Estúdio Voz Clara',
    titulo: 'Audiodescrição com narração humana',
    texto: 'Roteiro, locução e revisão para obras independentes.',
  },
  {
    marca: 'Papel & Lupa',
    titulo: 'Lupas eletrônicas para leitura prolongada',
    texto: 'Ampliação com contraste ajustável, sem cansar a vista.',
  },
];

/**
 * Escolhe o anúncio pela posição, e não por sorteio.
 *
 * Sorteio a cada render trocaria o anúncio a cada rolagem da página — que é
 * exatamente o tipo de inquietação que este componente existe para evitar.
 */
function anuncioDaVez(indice: number): Anuncio {
  return ANUNCIOS[Math.abs(indice) % ANUNCIOS.length];
}

export function BlocoPublicitario({
  indice,
  palette,
  rotulo,
}: {
  indice: number;
  palette?: PaletteColors;
  rotulo: string;
}) {
  const anuncio = anuncioDaVez(indice);
  // Dentro do leitor, o bloco segue a paleta escolhida pela pessoa; fora dele,
  // segue os tokens do site. Um anúncio que ignora o tema de alto contraste
  // seria, ele próprio, uma barreira de acessibilidade.
  const estilo = palette
    ? { background: palette.surface, color: palette.text, borderColor: `${palette.muted}66` }
    : undefined;

  return (
    <aside
      aria-label={`Anúncio de demonstração — ${rotulo}`}
      className={`my-5 rounded-[14px_10px_14px_10px] border border-dashed p-4 ${palette ? '' : 'border-outline/70 bg-surface-high'}`}
      style={estilo}
    >
      <p className="eyebrow flex items-center gap-1.5" style={palette ? { color: palette.muted } : undefined}>
        <Megaphone className="h-3.5 w-3.5" aria-hidden />
        Publicidade · demonstração
      </p>
      <p className="mt-2 font-display text-lg font-semibold leading-snug">{anuncio.titulo}</p>
      <p className="mt-1 text-sm" style={palette ? { color: palette.muted } : undefined}>
        {anuncio.texto}
      </p>
      <p className="mt-2 text-xs" style={palette ? { color: palette.muted } : undefined}>
        {anuncio.marca} — anunciante fictício. Nenhuma receita é gerada e nenhum dado seu é coletado.
      </p>
    </aside>
  );
}

/**
 * Decide ONDE cabe um anúncio, dado o número da página.
 *
 * Antes da primeira página (abertura da leitura) e a cada bloco de páginas,
 * que é a unidade natural que este leitor tem. Em obra de texto corrido o
 * leitor já pagina o conteúdo, então "entre páginas" equivale a "entre
 * trechos" — e nunca parte uma frase ao meio.
 */
export const PAGINAS_POR_ANUNCIO = 4;

export function cabeAnuncioAntes(page: number): boolean {
  return page === 1;
}

export function cabeAnuncioDepois(page: number, totalPages: number): boolean {
  if (page >= totalPages) return true; // fim da leitura
  return page % PAGINAS_POR_ANUNCIO === 0;
}
