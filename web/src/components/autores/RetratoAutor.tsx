import { montarRetrato } from './retrato';

/**
 * Retrato de autoria — desenho geométrico gerado a partir do nome.
 *
 * Por que não foto
 * ----------------
 * A referência que inspirou esta seção mostra fotografias de quadrinistas
 * reais. Pôr fotos de pessoas reais num site que diz "estes autores apoiam o
 * Livrin" seria atribuir a elas um apoio que nunca deram — e as fotos também
 * não são nossas para usar. Os autores do acervo são fictícios, e o retrato
 * deles precisa ser fictício do mesmo jeito.
 *
 * Também não é avatar de iniciais: duas letras num círculo colorido é o que
 * todo sistema faz quando desistiu do assunto. Aqui o retrato é uma composição
 * — busto, cabeça, gola e um ornamento — no mesmo vocabulário das capas do
 * acervo: campo de cor chapada, uma forma grande e um filete.
 *
 * O desenho em si está em `retrato.ts`, para a ferramenta de prévia conseguir
 * renderizar exatamente o mesmo que o site. Ver ADR 021.
 */

/** Ornamentos: a forma que distingue um retrato do outro à primeira vista. */
function Ornamento({ variante, cor }: { variante: number; cor: string }) {
  const fill = `rgb(var(${cor}))`;
  switch (variante) {
    case 0: // três filetes, como linhas de texto
      return (
        <g fill={fill}>
          <rect x="11" y="17" width="18" height="3.4" rx="1.7" />
          <rect x="11" y="24" width="12" height="3.4" rx="1.7" />
          <rect x="11" y="31" width="15" height="3.4" rx="1.7" />
        </g>
      );
    case 1: // lua crescente
      return <path d="M82 15a13 13 0 1 0 0 22 16 16 0 0 1 0-22Z" fill={fill} />;
    case 2: // constelação
      return (
        <g fill={fill} stroke={fill} strokeWidth="1.1">
          <path d="M80 19 88 30M80 19 72 30" />
          <circle cx="80" cy="19" r="3.4" />
          <circle cx="88" cy="30" r="2.2" />
          <circle cx="72" cy="30" r="1.8" />
        </g>
      );
    case 3: // triângulo de cartaz
      return <path d="M80 13 92 35H68Z" fill={fill} />;
    case 4: // onda de som — a marca da casa
      return (
        <g fill="none" stroke={fill} strokeWidth="3" strokeLinecap="round">
          <path d="M76 19q6 8 0 16" />
          <path d="M84 14q10 13 0 26" />
        </g>
      );
    default: // arco duplo, como um livro aberto visto de longe
      return (
        <g fill="none" stroke={fill} strokeWidth="3" strokeLinecap="round">
          <path d="M13 35a12 12 0 0 1 24 0" />
          <path d="M21 35a4 4 0 0 1 8 0" />
        </g>
      );
  }
}

export default function RetratoAutor({ nome, className = '' }: { nome: string; className?: string }) {
  const r = montarRetrato(nome);
  const { fundo, figura, ornamento } = r.paleta;
  // O id do clip precisa ser único na página: duas autorias com o mesmo id
  // fariam o segundo retrato recortar pelo caminho do primeiro.
  const id = `retrato-${nome.replace(/[^a-zA-Z0-9]/g, '')}-${r.ornamento}${r.chao}`;

  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={nome} focusable="false">
      <defs>
        {/* O busto é recortado no círculo: assim o desenho encosta na borda em
            vez de flutuar com margem, como num retrato impresso. */}
        <clipPath id={id}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${id})`}>
        <rect width="100" height="100" fill={`rgb(var(${fundo}))`} />
        {/* Faixa de chão: separa o busto do fundo sem precisar de contorno. */}
        <rect y={100 - r.chao} width="100" height={r.chao} fill={`rgb(var(${figura}) / 0.14)`} />
        {r.halo && (
          <circle cx="50" cy="42" r="30" fill="none" stroke={`rgb(var(${ornamento}) / 0.35)`} strokeWidth="2.5" />
        )}

        <path d={r.ombros} fill={`rgb(var(${figura}))`} />
        <path d={r.gola} fill="none" stroke={`rgb(var(${fundo}))`} strokeWidth="3" strokeLinecap="round" />
        <path d={r.cabeca} fill={`rgb(var(${figura}))`} />
        {/* Um reflexo de luz, para a cabeça não ser um disco chapado. */}
        <path d={r.brilho} fill={`rgb(var(${fundo}) / 0.45)`} />

        <Ornamento variante={r.ornamento} cor={ornamento} />
      </g>

      {/* Aro: o limite do retrato precisa de 3:1 contra o fundo da página, como
          manda o critério 1.4.11 para limite de componente. */}
      <circle cx="50" cy="50" r="48.5" fill="none" stroke="rgb(var(--c-outline) / 0.55)" strokeWidth="3" />
    </svg>
  );
}
