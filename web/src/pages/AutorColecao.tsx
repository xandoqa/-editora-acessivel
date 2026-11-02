import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Layers, Star, Users } from 'lucide-react';
import { useAutor } from '../hooks/queries';
import { errorMessage } from '../lib/api';
import { formatNumber } from '../lib/format';
import WorkCard from '../components/works/WorkCard';
import { Badge, EmptyState, ErrorState, LoadingState, Stars } from '../components/ui';
import { OndaDivisoria } from '../components/ui/Ornamentos';
import { Reticula } from '../components/ui/Quadrinhos';
import RetratoAutor from '../components/autores/RetratoAutor';
import { useT } from '../i18n/I18nContext';
import type { ChaveDeTraducao } from '../i18n/tipos';

/**
 * A coleção completa de uma autoria.
 *
 * As obras são renderizadas pelo MESMO `WorkCard` do catálogo. Não é economia
 * de trabalho: é a garantia de que o selo de curadoria, o preço, os recursos
 * de acessibilidade e o estado de aquisição apareçam aqui exatamente como
 * aparecem lá. Um segundo card seria uma segunda chance de mostrar "gratuita"
 * numa obra paga.
 */

const FORMATO: Record<string, ChaveDeTraducao> = {
  QUADRINHO: 'formato.hq',
  LIVRO: 'formato.livro',
  MANGA_WEBCOMIC: 'formato.webcomic',
  ZINE: 'formato.zine',
};

/** Um número grande com a legenda embaixo. */
function Numero({ icone, valor, legenda }: { icone: React.ReactNode; valor: string; legenda: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-highest text-accent" aria-hidden>
        {icone}
      </span>
      <span>
        <span className="block font-display text-xl font-bold leading-none text-ink">{valor}</span>
        <span className="block text-xs uppercase tracking-wider text-ink-subtle">{legenda}</span>
      </span>
    </div>
  );
}

export default function AutorColecao() {
  const t = useT();
  const { id } = useParams();
  const autorId = Number(id);
  const { data: autor, isLoading, isError, error, refetch } = useAutor(
    Number.isFinite(autorId) && autorId > 0 ? autorId : undefined,
  );

  if (isLoading) return <LoadingState />;
  if (isError) {
    return (
      <div>
        <ErrorState message={errorMessage(error) || t('autores.naoEncontrado')} onRetry={refetch} />
        <div className="mt-6 flex justify-center">
          <Link to="/autores" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" aria-hidden /> {t('autores.naLista')}
          </Link>
        </div>
      </div>
    );
  }
  if (!autor) return <EmptyState title={t('autores.naoEncontrado')} />;

  return (
    <div>
      <Link to="/autores" className="btn-ghost mb-6 inline-flex">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {t('autores.naLista')}
      </Link>

      {/* ------------------------------ Cabeçalho ------------------------- */}
      <header className="card relative overflow-hidden p-6 sm:p-8">
        {/* Retícula só na faixa do alto, atrás do retrato e do nome: a
            biografia logo abaixo é texto corrido e fica sobre papel limpo. */}
        <Reticula className="pointer-events-none absolute inset-x-0 top-0 h-40 w-full text-primary/[0.1] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        <RetratoAutor
          nome={autor.name}
          className="h-24 w-24 shrink-0 self-start rounded-full sm:h-32 sm:w-32"
        />

        <div className="min-w-0 flex-1">
          <p className="eyebrow flex items-center gap-2 text-accent">
            <Users className="h-4 w-4" aria-hidden />
            {t('roleta.olho')}
          </p>
          <h1 className="mt-2 font-display text-[2rem] font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl">
            {autor.name}
          </h1>
          {autor.headline && <p className="mt-2 text-base font-semibold text-accent">{autor.headline}</p>}

          {autor.bio && (
            <>
              <h2 className="eyebrow mt-6 text-ink-subtle">{t('autores.sobre')}</h2>
              <p className="mt-2 max-w-prose leading-relaxed text-ink-muted">{autor.bio}</p>
            </>
          )}

          <ul className="mt-5 flex flex-wrap gap-2">
            {autor.genres.map((genero) => (
              <li key={genero}>
                <Badge tone="muted">{genero}</Badge>
              </li>
            ))}
            {autor.formats.map((formato) => (
              <li key={formato}>
                <Badge tone="accent">{FORMATO[formato] ? t(FORMATO[formato]) : formato}</Badge>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-4 border-t border-outline/25 pt-5">
            <Numero
              icone={<BookOpen className="h-5 w-5" aria-hidden />}
              valor={formatNumber(autor.worksCount)}
              legenda={autor.worksCount === 1 ? t('autores.umaObra') : t('autores.obras')}
            />
            <Numero
              icone={<Layers className="h-5 w-5" aria-hidden />}
              valor={formatNumber(autor.pagesTotal)}
              legenda={t('autores.paginas')}
            />
            {autor.rating.count > 0 && (
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-highest text-accent"
                  aria-hidden
                >
                  <Star className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <Stars value={autor.rating.average} size={16} />
                  <span className="mt-0.5 block text-xs uppercase tracking-wider text-ink-subtle">
                    {t('autores.avaliacao', {
                      nota: autor.rating.average.toFixed(1),
                      n: formatNumber(autor.rating.count),
                    })}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
        </div>
      </header>

      {/* ------------------------------- Estante -------------------------- */}
      <section className="mt-10" aria-labelledby="colecao-titulo">
        <h2
          id="colecao-titulo"
          className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
        >
          {t('autores.estante')}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{t('autores.colecaoDe', { nome: autor.name })}</p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {autor.works.map((obra) => (
            <WorkCard key={obra.id} work={obra} />
          ))}
        </div>
      </section>

      <OndaDivisoria className="mt-12 text-outline/50" />
      <p className="mt-4 text-center text-xs text-ink-subtle">{t('autores.ficcional')}</p>
    </div>
  );
}
