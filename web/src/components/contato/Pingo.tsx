import {
  ARCO_FONE,
  BRILHO,
  CONCHAS,
  CORPO,
  HASTE_MIC,
  OLHOS_CHEIOS,
  ONDAS,
  REFLEXOS,
  rosto,
  type Humor,
} from './pingo';

/**
 * Pingo, o mascote do Fale Conosco — uma gota de tinta que atende.
 *
 * O desenho está em `pingo.ts`; aqui só a montagem. Ver o comentário de lá
 * para o porquê do personagem e por que ele não é o atendente da referência.
 *
 * Acessibilidade: por padrão o mascote é **decorativo** (`aria-hidden`), porque
 * o texto ao lado dele sempre diz a mesma coisa que a expressão. Passar
 * `rotulo` o transforma em imagem com nome, para os casos em que ele aparece
 * sozinho.
 */
export default function Pingo({
  humor = 'oi',
  className = '',
  rotulo,
}: {
  humor?: Humor;
  className?: string;
  rotulo?: string;
}) {
  const r = rosto(humor);

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      {...(rotulo ? { role: 'img', 'aria-label': rotulo } : { 'aria-hidden': true })}
      focusable="false"
    >
      {/* Ondas de som: ele é da casa de quem lê com os ouvidos. */}
      {r.ondas &&
        ONDAS.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="rgb(var(--c-accent))"
            strokeWidth="3"
            strokeLinecap="round"
            opacity={0.85 - i * 0.25}
          />
        ))}

      {/* Conchas do fone, atrás da cabeça. */}
      {CONCHAS.map((c) => (
        <rect
          key={c.x}
          x={c.x}
          y={c.y}
          width={c.w}
          height={c.h}
          rx="6"
          fill="rgb(var(--c-accent))"
          stroke="rgb(var(--c-ink))"
          strokeWidth="2.6"
        />
      ))}

      {/* A gota. */}
      <path d={CORPO} fill="rgb(var(--c-primary))" stroke="rgb(var(--c-ink))" strokeWidth="3" strokeLinejoin="round" />
      <path d={BRILHO} fill="rgb(var(--c-on-primary) / 0.35)" />

      {/*
        Arco e haste em traço DUPLO: tinta por baixo, cor de destaque por cima.
        Com um traço só, de tinta, os dois sumiam sobre a gota — que também é
        escura. O contorno escuro continua ali embaixo, garantindo o limite.
      */}
      <g fill="none" strokeLinecap="round">
        <path d={ARCO_FONE} stroke="rgb(var(--c-ink))" strokeWidth="6" />
        <path d={ARCO_FONE} stroke="rgb(var(--c-accent))" strokeWidth="3.2" />
        <path d={HASTE_MIC} stroke="rgb(var(--c-ink))" strokeWidth="5.4" />
        <path d={HASTE_MIC} stroke="rgb(var(--c-accent))" strokeWidth="2.8" />
      </g>
      <circle cx="71" cy="80" r="3.6" fill="rgb(var(--c-accent))" stroke="rgb(var(--c-ink))" strokeWidth="2.2" />

      {/* Rosto. */}
      {r.sobrancelhas && (
        <g fill="none" stroke="rgb(var(--c-on-primary))" strokeWidth="2.6" strokeLinecap="round">
          <path d={r.sobrancelhas.esquerda} />
          <path d={r.sobrancelhas.direita} />
        </g>
      )}

      {r.olhos ? (
        <g fill="none" stroke="rgb(var(--c-on-primary))" strokeWidth="3.2" strokeLinecap="round">
          <path d={r.olhos.esquerdo} />
          <path d={r.olhos.direito} />
        </g>
      ) : (
        <>
          {OLHOS_CHEIOS.map((o) => (
            <circle key={o.cx} cx={o.cx} cy={o.cy} r={o.r} fill="rgb(var(--c-on-primary))" />
          ))}
          {REFLEXOS.map((o) => (
            <circle key={o.cx} cx={o.cx} cy={o.cy} r={o.r} fill="rgb(var(--c-primary))" />
          ))}
        </>
      )}

      <path d={r.boca} fill="none" stroke="rgb(var(--c-on-primary))" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}
