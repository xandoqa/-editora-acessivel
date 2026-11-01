import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useCatalog } from '../../hooks/queries';
import { useT } from '../../i18n/I18nContext';
import { Badge, Spinner, Stars } from '../ui';
import type { Work } from '../../types/api';

/**
 * Vitrine de lançamentos — a estante em movimento da página inicial.
 *
 * O que ela é
 * -----------
 * As obras aprovadas mais recentes, vindas da MESMA rota do catálogo
 * (`/works?sort=recent`). Não há lista fixa no código e não há obra de
 * mentira: publicar uma obra e tê-la aprovada a faz aparecer aqui.
 *
 * Por que 3D
 * ----------
 * Uma fileira de capas chapadas é uma planilha de imagens. Com lombada, corte
 * de páginas e um giro de dezesseis graus, a mesma fileira vira estante — e o
 * leitor entende que aquilo são livros antes de ler uma palavra. O volume está
 * no CSS (`.vitrine-livro`), não em imagem: nenhum mockup, nenhuma textura
 * baixada, nada que precise de arquivo.
 *
 * O que ela NÃO faz, de propósito
 * -------------------------------
 * **Não gira sozinha.** Carrossel que avança sem ser pedido reprova no
 * critério 2.2.2 da WCAG (movimento que começa automaticamente e dura mais de
 * cinco segundos precisa de pausa) e, pior que reprovar, atrapalha: quem lê
 * devagar perde o cartão no meio da frase, e quem usa ampliação de tela perde
 * a posição. Aqui o movimento só acontece quando alguém pede — seta, rolagem
 * ou tecla.
 *
 * Acessibilidade do conjunto: a trilha é uma lista rolável com rótulo, cada
 * livro é um link único (capa e título no mesmo alvo, não dois links para o
 * mesmo lugar), e as setas se desabilitam nas pontas em vez de sumirem — botão
 * que desaparece tira a referência de quem está ampliando a tela.
 */

const QUANTOS = 12;

/** Quanto a trilha anda por clique: quase uma tela, com um fiapo de sobra. */
const PASSO = 0.85;

function Livro({ obra, indice, total }: { obra: Work; indice: number; total: number }) {
  const t = useT();
  return (
    <li
      className="vitrine-palco snap-start pl-1 pr-6 pt-2 first:pl-0"
      aria-label={t('vitrine.posicao', { n: indice + 1, total })}
    >
      <Link to={`/reader/${obra.id}`} className="vitrine-link group/livro block w-[170px] rounded-sm sm:w-[196px]">
        {/* O palco guarda a perspectiva; o volume gira dentro dele. O texto
            abaixo fica FORA dos dois, de pé: frase em perspectiva é pior de
            ler, e isso não se paga com enfeite. */}
        <span className="vitrine-palco block">
          <span className="vitrine-livro relative block">
            <span className="relative block aspect-[2/3] w-full overflow-hidden rounded-sm border border-outline bg-surface-high">
              {obra.coverUrl ? (
                <img
                  src={obra.coverUrl}
                  alt={obra.coverAlt ?? obra.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center px-3 text-center font-display text-sm font-bold leading-tight text-ink-muted">
                  {obra.title}
                  <span className="sr-only"> — {t('vitrine.semCapa')}</span>
                </span>
              )}

              {/* Lombada e corte das páginas são decorativos: quem não enxerga
                  a profundidade não perde nada, porque título, formato e nota
                  estão escritos logo abaixo em texto. */}
              <span className="vitrine-lombada absolute inset-y-0 left-0 w-[15px]" aria-hidden />

              {obra.editionLabel && (
                <span className="absolute left-[15px] top-3 rounded-r-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-on-accent">
                  {obra.editionLabel}
                </span>
              )}
            </span>

            <span
              className="vitrine-corte absolute right-0 top-[4px] h-[calc(100%-8px)] w-[7px] translate-x-[6px] rounded-r-[2px]"
              aria-hidden
            />
          </span>
        </span>

        <span className="mt-3 block font-display text-[15px] font-bold leading-snug text-ink group-hover/livro:underline">
          {obra.title}
        </span>
        <span className="mt-0.5 block text-sm text-ink-muted">{obra.author.name}</span>
        <span className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone="muted">{t('vitrine.paginas', { n: obra.pages })}</Badge>
          {obra.rating.count > 0 && <Stars value={obra.rating.average} size={14} />}
        </span>
      </Link>
    </li>
  );
}

export default function Vitrine() {
  const t = useT();
  const trilha = useRef<HTMLUListElement>(null);
  const [pontas, setPontas] = useState({ inicio: true, fim: false });

  const { data, isLoading } = useCatalog({ sort: 'recent', page: 1, pageSize: QUANTOS });
  const obras = data?.data ?? [];

  /**
   * Desabilita a seta que não leva a lugar nenhum.
   *
   * A margem de 2px não é frescura: navegador com zoom ou fator de escala
   * fracionário devolve `scrollWidth` e `clientWidth` com diferença de um pixel
   * quando a trilha já está no fim, e sem a folga a seta "próximo" ficava
   * eternamente ativa sem rolar nada.
   */
  const medirPontas = useCallback(() => {
    const el = trilha.current;
    if (!el) return;
    setPontas({
      inicio: el.scrollLeft <= 2,
      fim: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    medirPontas();
    const el = trilha.current;
    if (!el) return;
    const observador = new ResizeObserver(medirPontas);
    observador.observe(el);
    return () => observador.disconnect();
  }, [medirPontas, obras.length]);

  const rolar = (sentido: -1 | 1) => {
    const el = trilha.current;
    if (!el) return;
    // `smooth` aqui é seguro: o navegador já respeita `prefers-reduced-motion`
    // em `scrollBehavior`, e quem pediu menos movimento recebe um salto seco.
    el.scrollBy({ left: sentido * el.clientWidth * PASSO, behavior: 'smooth' });
  };

  /** Setas do teclado percorrem a trilha quando o foco está dentro dela. */
  const aoTeclar = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      rolar(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      rolar(-1);
    }
  };

  if (!isLoading && !obras.length) return null;

  return (
    <section className="mb-14" aria-labelledby="vitrine-titulo">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="eyebrow flex items-center gap-2 text-accent">
            <Sparkles className="h-4 w-4" aria-hidden />
            {t('vitrine.olho')}
          </p>
          <h2
            id="vitrine-titulo"
            className="mt-2 font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-ink sm:text-4xl"
          >
            {t('vitrine.titulo')}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted sm:text-base">{t('vitrine.chamada')}</p>
        </div>

        {/* As setas ficam no alto, junto do título: no pé elas competiriam com
            a barra de rolagem do próprio trilho em telas pequenas. */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="icon-btn border-outline/60 disabled:opacity-35"
            onClick={() => rolar(-1)}
            disabled={pontas.inicio}
            aria-label={t('vitrine.anterior')}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            className="icon-btn border-outline/60 disabled:opacity-35"
            onClick={() => rolar(1)}
            disabled={pontas.fim}
            aria-label={t('vitrine.proximo')}
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <ul
          ref={trilha}
          onScroll={medirPontas}
          onKeyDown={aoTeclar}
          // `tabIndex` numa região rolável não é enfeite de ARIA: sem ele, quem
          // navega só pelo teclado não consegue rolar a trilha, e o critério
          // 2.1.1 cobra exatamente isso.
          tabIndex={0}
          aria-label={t('vitrine.titulo')}
          aria-describedby="vitrine-instrucao"
          className="-mx-1 flex snap-x snap-mandatory gap-1 overflow-x-auto px-1 pb-4 [scrollbar-width:thin]"
        >
          {obras.map((obra, i) => (
            <Livro key={obra.id} obra={obra} indice={i} total={obras.length} />
          ))}
        </ul>
      )}

      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <p id="vitrine-instrucao" className="text-xs text-ink-subtle">
          {t('vitrine.instrucao')}
        </p>
        <Link to="/?ordem=recent" className="btn-ghost">
          {t('vitrine.verTudo')} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
