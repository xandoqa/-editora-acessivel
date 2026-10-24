import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CHECK_LABEL } from '../../lib/labels';
import { formatDate } from '../../lib/format';
import type { Work } from '../../types/api';

/**
 * Selo de Qualidade Livrin.
 *
 * É o resumo do que a curadoria verificou — não um adorno. Uma obra só chega ao
 * catálogo depois que o checklist inteiro passa, então estar publicada É ter o
 * selo; o que o selo acrescenta é o nome de quem assinou e a data.
 *
 * O critério fica aberto de propósito: `detalhado` mostra a lista do que foi
 * conferido. Um selo cujo critério ninguém pode ler não atesta nada, e a
 * proposta de valor do projeto é justamente dar confiança ao leitor e
 * credibilidade a quem publica.
 */

/** Estrela desenhada com traço irregular, no mesmo espírito dos ornamentos. */
function Estrela({ tamanho = 17 }: { tamanho?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      className="shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="M12 2.6l2.6 5.5 6 .9-4.4 4.3 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9l6-.9z" />
    </svg>
  );
}

const CLASSE_SELO =
  'inline-flex items-center gap-1.5 rounded-full border-2 border-outline bg-accent-container py-1 pl-2 pr-3 text-xs font-extrabold text-accent sombra-dura-leve';

/** Versão compacta, para o card do catálogo e listagens. */
export function SeloCompacto({ work, className = '' }: { work: Work; className?: string }) {
  if (!work.seal.granted) return null;
  return (
    <span
      className={`${CLASSE_SELO} ${className}`}
      title={
        work.seal.reviewer
          ? `Aprovada pela curadoria da Livrin em ${formatDate(work.seal.grantedAt)}, por ${work.seal.reviewer}`
          : `Aprovada pela curadoria da Livrin em ${formatDate(work.seal.grantedAt)}`
      }
    >
      <Estrela />
      Selo Livrin
    </span>
  );
}

/** Versão completa, para a página da obra: abre a lista do que foi verificado. */
export default function SeloLivrin({ work }: { work: Work }) {
  const [aberto, setAberto] = useState(false);
  if (!work.seal.granted) return null;

  const itens = work.seal.checks ?? [];
  const assinatura = work.seal.reviewer
    ? `Concedido em ${formatDate(work.seal.grantedAt)} por ${work.seal.reviewer}, curadoria da Livrin.`
    : `Concedido pela curadoria da Livrin em ${formatDate(work.seal.grantedAt)}.`;

  return (
    <section className="card-high p-4" aria-labelledby="selo-titulo">
      <div className="flex flex-wrap items-center gap-3">
        <span className={CLASSE_SELO}>
          <Estrela tamanho={19} />
          Selo Livrin
        </span>
        <p id="selo-titulo" className="min-w-0 flex-1 text-sm text-ink-muted">
          {assinatura}
        </p>
      </div>

      {itens.length > 0 && (
        <>
          <button
            type="button"
            className="btn-ghost mt-2 min-h-[40px] px-2 text-sm"
            aria-expanded={aberto}
            onClick={() => setAberto((a) => !a)}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden />
            {aberto ? 'Ocultar o que foi verificado' : `Ver os ${itens.length} itens verificados`}
          </button>

          {aberto && (
            <ul className="mt-2 space-y-2">
              {itens.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-outline/20 pt-2 text-sm">
                  <span className="min-w-0 text-ink">{item.label}</span>
                  <span className="chip bg-accent-container text-accent">{CHECK_LABEL[item.status]}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
