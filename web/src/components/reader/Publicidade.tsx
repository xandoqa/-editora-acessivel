import type { ComponentType } from 'react';
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
 *     chamada de rede. Os anúncios são componentes desta aplicação, e as
 *     marcas abaixo são desenhadas aqui mesmo, em SVG.
 *
 * Não existe rede publicitária conectada ao projeto. Os anunciantes são
 * fictícios e declarados como demonstração acadêmica — inventar uma
 * integração real seria simular receita que não existe.
 *
 * Sobre a arte: cada marca é uma composição geométrica original, no mesmo
 * vocabulário das capas do projeto (campo de cor, uma forma grande, um
 * filete). Usa `currentColor` de propósito, para herdar a paleta que a pessoa
 * escolheu no leitor — inclusive o alto contraste. Um anúncio com cores
 * fixas seria, ele próprio, uma barreira de acessibilidade.
 */

interface Anuncio {
  marca: string;
  titulo: string;
  texto: string;
  /** A assinatura da marca. É o que dá voz a cada anunciante. */
  slogan: string;
  arte: ComponentType<{ className?: string }>;
}

/* -------------------------------------------------------------------------- */
/*                          Marcas (SVG, decorativas)                         */
/* -------------------------------------------------------------------------- */
/* `aria-hidden` em todas: quem lê por leitor de tela recebe o texto do        */
/* anúncio, que já diz tudo. Descrever o desenho seria ruído.                  */

/** Tipografia Aurora: um "A" sob um arco nascente, sobre a linha de base. */
function MarcaAurora({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
      <path d="M6 30a18 18 0 0 1 36 0" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.45" />
      <path d="M15 38 24 16l9 22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M18.5 31h11" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M4 43h40" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}

/**
 * Oficina Braille Sul: uma cela braille em relevo na quina de uma página.
 *
 * Os pontos cheios não são enfeite: são os pontos 2, 3 e 4, que formam a
 * letra **S** no braille — a inicial de "Sul". Quem lê braille reconhece;
 * quem não lê vê uma cela coerente em vez de um padrão sorteado.
 */
function MarcaBraille({ className = '' }: { className?: string }) {
  // [x, y, cheio] — coluna esquerda = pontos 1,2,3; direita = 4,5,6.
  const pontos = [
    [17, 13, false], // 1
    [29, 13, true], //  4
    [17, 24, true], //  2
    [29, 24, false], // 5
    [17, 35, true], //  3
    [29, 35, false], // 6
  ] as const;
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
      <path d="M8 6h26l6 6v30H8z" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <path d="M34 6v6h6" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      {pontos.map(([cx, cy, cheio]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r="3.6"
          fill={cheio ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
          opacity={cheio ? 1 : 0.45}
        />
      ))}
    </svg>
  );
}

/** Estúdio Voz Clara: ondas saindo de um ponto, abertas para a direita. */
function MarcaVoz({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
      <circle cx="13" cy="24" r="4.5" fill="currentColor" />
      <path d="M22 16a11 11 0 0 1 0 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M29 10a19 19 0 0 1 0 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <path d="M36 5a27 27 0 0 1 0 38" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

/** Papel & Lupa: uma lente sobre linhas de texto, com uma linha ampliada. */
function MarcaLupa({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
      <path d="M6 12h30M6 19h30M6 33h22M6 40h26" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
      <circle cx="27" cy="25" r="12" fill="none" stroke="currentColor" strokeWidth="2.5" />
      {/* Duas linhas de texto AMPLIADO dentro da lente: mais grossas e mais
          curtas que as de fora. Uma barra só no meio leria como "diminuir
          zoom", que é o oposto do que a marca quer dizer. */}
      <path d="M20 21h14M20 29h9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M36 34l7 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Anunciantes fictícios, coerentes com o contexto de uma livraria acessível.
 *
 * São invenções do projeto, não empresas reais, e nenhum deles paga nada. A
 * voz de cada um é deliberada: quem anuncia numa plataforma de leitura
 * acessível fala de ofício, não de promoção.
 */
const ANUNCIOS: Anuncio[] = [
  {
    marca: 'Tipografia Aurora',
    titulo: 'Letras que não se confundem entre si',
    texto:
      'Desenhamos famílias tipográficas para quem lê devagar: o "l" não vira "I", o "a" tem barriga larga e o espaço entre as palavras respira.',
    slogan: 'Desde 1998, desenhando para o olho cansado.',
    arte: MarcaAurora,
  },
  {
    marca: 'Oficina Braille Sul',
    titulo: 'Do arquivo digital à página tátil',
    texto:
      'Impressão em braille sob demanda, a partir de um exemplar. Mandamos o PDF de volta revisado antes de furar o papel — erro em relevo ninguém apaga.',
    slogan: 'Um exemplar já é tiragem.',
    arte: MarcaBraille,
  },
  {
    marca: 'Estúdio Voz Clara',
    titulo: 'Audiodescrição com gente narrando',
    texto:
      'Roteiro, locução e revisão para obras independentes. Quem descreve leu a obra inteira antes — e quem revisa é quem depende da descrição.',
    slogan: 'A cena contada por quem a viu.',
    arte: MarcaVoz,
  },
  {
    marca: 'Papel & Lupa',
    titulo: 'Lupas eletrônicas para leitura longa',
    texto:
      'Ampliação com contraste ajustável e luz que não estoura o branco do papel. Para ler um capítulo, não um rótulo de remédio.',
    slogan: 'Feita para a terceira hora de leitura.',
    arte: MarcaLupa,
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
  const Arte = anuncio.arte;
  // Dentro do leitor, o bloco segue a paleta escolhida pela pessoa; fora dele,
  // segue os tokens do site.
  const estilo = palette
    ? { background: palette.surface, color: palette.text, borderColor: `${palette.muted}66` }
    : undefined;
  const corSecundaria = palette ? { color: palette.muted } : undefined;

  return (
    <aside
      aria-label={`Anúncio de demonstração — ${rotulo}`}
      className={`my-5 overflow-hidden rounded-[14px_10px_14px_10px] border border-dashed p-4 ${
        palette ? '' : 'border-outline/70 bg-surface-high'
      }`}
      style={estilo}
    >
      <p className="eyebrow flex items-center gap-1.5" style={corSecundaria}>
        <Megaphone className="h-3.5 w-3.5" aria-hidden />
        Publicidade · demonstração
      </p>

      <div className="mt-3 flex flex-wrap items-start gap-4 sm:flex-nowrap">
        {/* A arte é decorativa: o texto ao lado já diz tudo o que o anúncio
            comunica, então descrevê-la seria repetição para quem usa leitor
            de tela. */}
        <Arte className="h-14 w-14 shrink-0" />

        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold leading-snug">{anuncio.titulo}</p>
          <p className="mt-1 text-sm leading-relaxed" style={corSecundaria}>
            {anuncio.texto}
          </p>
          <p className="mt-2 text-sm italic" style={corSecundaria}>
            “{anuncio.slogan}”
          </p>
          <p className="mt-2 text-xs" style={corSecundaria}>
            <strong className="font-semibold">{anuncio.marca}</strong> — anunciante fictício. Nenhuma receita é
            gerada e nenhum dado seu é coletado.
          </p>
        </div>
      </div>
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
