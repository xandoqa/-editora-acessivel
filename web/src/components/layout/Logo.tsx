import { Link } from 'react-router-dom';

/**
 * Marca da Livrin, desenhada à mão em SVG.
 *
 * Um livro aberto de traço irregular com ondas de som saindo da página da
 * direita: um livro que fala. É o assunto desta plataforma — audiodescrição e
 * leitura para quem lê com os ouvidos —, não o ícone de biblioteca que vem em
 * qualquer conjunto pronto. As duas páginas não são espelhadas e nenhuma linha
 * é perfeitamente reta, de propósito.
 *
 * Desenho original, feito para este projeto.
 */
function MarcaDesenhada({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.7"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden
      focusable="false"
    >
      {/* página da esquerda */}
      <path d="M3.5 15.6q9.2-4.6 18.3.9v18.6q-9.1-5.1-18.3-.7Z" />
      {/* página da direita, mais curta: as ondas ocupam o lugar */}
      <path d="M21.8 16.5q6.8-4.2 13.4-1.1v17.2q-6.8-2.8-13.4 2.4Z" />
      {/* lombada */}
      <path d="M21.8 16.5v18.9" />
      {/* linhas de texto insinuadas, tortas */}
      <path d="M8.1 21.3q4.3-1.3 8.6.5M8.3 26.1q4.2-1.2 8.4.4" />
      {/* o livro falando */}
      <path d="M38.8 19.4q3.9 5.2 0 10.4" strokeWidth="2.3" />
      <path d="M43.2 15.6q6.1 8.9 0 18" strokeWidth="2.3" />
      <circle cx="31.6" cy="10.4" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Letras levemente tortas, como quem escreveu à mão e não se importou. */
const LETRAS: { letra: string; giro: number; desloca: number }[] = [
  { letra: 'L', giro: -3, desloca: 0 },
  { letra: 'i', giro: 2, desloca: -1 },
  { letra: 'v', giro: -1.5, desloca: 1 },
  { letra: 'r', giro: 3, desloca: -1 },
  { letra: 'i', giro: -2, desloca: 1 },
  { letra: 'n', giro: 1.5, desloca: 0 },
];

export function LogoMark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const caixa = size === 'lg' ? 'h-16 w-16' : 'h-10 w-10';
  const icone = size === 'lg' ? 'h-11 w-11' : 'h-7 w-7';
  return (
    <span
      className={`brand-mark inline-flex shrink-0 items-center justify-center ${caixa}`}
      style={{ borderRadius: '16px 22px 14px 20px', boxShadow: '3px 3px 0 var(--sombra-tinta)' }}
      aria-hidden
    >
      <MarcaDesenhada className={icone} />
    </span>
  );
}

/** Nome da marca com letras tortas e o sublinhado desenhado. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-block leading-none ${className}`}>
      <span className="font-display text-xl font-extrabold tracking-tight text-ink" aria-hidden>
        {LETRAS.map((l, i) => (
          <span
            key={i}
            className="inline-block"
            style={{ transform: `rotate(${l.giro}deg) translateY(${l.desloca}px)` }}
          >
            {l.letra}
          </span>
        ))}
      </span>
      <span className="sr-only">Livrin</span>
      <svg viewBox="0 0 86 7" className="-mt-0.5 block h-[6px] w-[68px] text-accent" fill="none" aria-hidden focusable="false">
        <path d="M1 4.6c12-3.4 24-4.1 36-2.1s24 1.5 36-1.6" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export default function Logo() {
  return (
    <Link
      to="/"
      className="flex items-center gap-3 rounded-xl"
      aria-label="Livrin — livraria acessível, ir para o catálogo"
    >
      <LogoMark />
      <span className="leading-tight">
        <Wordmark />
        <span className="mt-1 block text-[11px] font-bold uppercase tracking-wider text-ink-muted">Livraria acessível</span>
      </span>
    </Link>
  );
}
