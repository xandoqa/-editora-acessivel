/**
 * Ornamentos desenhados à mão.
 *
 * São o que separa esta interface de um conjunto de retângulos: ilustrações de
 * traço irregular que aparecem nos vazios, nos cabeçalhos e nas divisórias,
 * como os desenhos que um editor rabisca na margem da prova. Todos herdam a cor
 * por `currentColor` e somem para leitores de tela.
 *
 * Desenhos originais, feitos para este projeto (seção 14 da especificação).
 */

/** Régua ondulada: substitui a linha reta de 1px entre seções. */
export function OndaDivisoria({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 10" className={`h-2.5 w-full text-outline ${className}`} preserveAspectRatio="none" fill="none" aria-hidden focusable="false">
      <path
        d="M0 7q10-9 20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Pilha de livros tortos: ilustração dos estados vazios. */
export function PilhaDeLivros({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 96" className={className} fill="none" aria-hidden focusable="false">
      <g stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
        <path d="M14 78q44-6 90 1v12q-46-7-90-1Z" />
        <path d="M18 62q40-7 80 1v13q-40-8-80-1Z" />
        <path d="M24 45q33-6 66 1v13q-33-7-66-1Z" />
        {/* o livro de cima, aberto */}
        <path d="M30 32q14-8 28 1v10q-14-9-28-1Z" />
        <path d="M58 33q13-8 26 0v10q-13-7-26 1Z" />
        <path d="M58 33v10" strokeWidth="2.4" />
      </g>
      {/* traços de brilho, como quem marca que ali tem alguma coisa */}
      <g stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" opacity="0.75">
        <path d="M96 20v8M104 26l-6 5M88 28l5 4" />
      </g>
    </svg>
  );
}

/**
 * Rabisco de margem: um arco com três traços, do tipo que se faz para destacar
 * um trecho. Usado como enfeite de canto nos cabeçalhos.
 */
export function Rabisco({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 60" className={className} fill="none" aria-hidden focusable="false">
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <path d="M6 46q18-34 46-38" />
        <path d="M44 6q8 1 11 7" />
        <path d="M52 22q6-3 12-1M48 34q7-2 13 1M40 45q6-1 11 2" />
      </g>
    </svg>
  );
}

/**
 * Ondas de som: o mesmo gesto da marca, reaproveitado para marcar audiodescrição
 * em cabeçalhos e cartões.
 */
export function OndasDeSom({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden focusable="false">
      <g stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
        <path d="M8 14q4 6 0 12" />
        <path d="M16 10q7 10 0 20" />
        <path d="M24 6q10 14 0 28" />
      </g>
    </svg>
  );
}
