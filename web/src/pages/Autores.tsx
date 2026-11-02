import { Link } from 'react-router-dom';
import { BookMarked, Library, Users } from 'lucide-react';
import { useAutores } from '../hooks/queries';
import { errorMessage } from '../lib/api';
import { formatNumber } from '../lib/format';
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader, Stars } from '../components/ui';
import { OndaDivisoria } from '../components/ui/Ornamentos';
import RetratoAutor from '../components/autores/RetratoAutor';
import { useT } from '../i18n/I18nContext';
import type { AutorResumo } from '../types/api';
import type { ChaveDeTraducao } from '../i18n/tipos';

/**
 * Coleções por autor.
 *
 * A lista é derivada: quem tem obra aprovada aparece, quem tem só rascunho não.
 * Não existe cadastro de autor para manter em dia — e por isso não existe o
 * problema clássico dessas páginas, que é a lista de autores e o acervo
 * discordarem sobre quem publicou o quê.
 */

/** Os mesmos rótulos curtos de formato do catálogo, por chave de tradução. */
const FORMATO: Record<string, ChaveDeTraducao> = {
  QUADRINHO: 'formato.hq',
  LIVRO: 'formato.livro',
  MANGA_WEBCOMIC: 'formato.webcomic',
  ZINE: 'formato.zine',
};

/**
 * Pilha de capas: as três obras mais recentes, uma atrás da outra.
 *
 * É decorativa — `aria-hidden` —, porque o conteúdo que ela insinua (quantas
 * obras, quais gêneros) está escrito em texto logo abaixo. Uma pilha de capas
 * anunciada em leitor de tela como três imagens sem contexto só atrapalharia.
 */
function PilhaDeCapas({ autor }: { autor: AutorResumo }) {
  if (!autor.covers.length) return null;
  return (
    <div className="relative h-[108px] w-[86px] shrink-0" aria-hidden>
      {autor.covers.map((capa, i) => (
        <span
          key={capa.id}
          className="absolute bottom-0 left-0 h-[100px] w-[68px] overflow-hidden rounded-sm border border-outline bg-surface-high shadow-sm"
          style={{
            transform: `translateX(${i * 9}px) rotate(${(i - 1) * 3}deg)`,
            zIndex: autor.covers.length - i,
          }}
        >
          {capa.coverUrl && <img src={capa.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}
        </span>
      ))}
    </div>
  );
}

function CardDeAutor({ autor }: { autor: AutorResumo }) {
  const t = useT();
  // Sem hover de sombra: era o único do site, e o cartão já responde pelo
  // sublinhado do título, que é um dos três efeitos padrão daqui.
  return (
    <li className="card flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <RetratoAutor nome={autor.name} className="h-16 w-16 shrink-0 rounded-full sm:h-[72px] sm:w-[72px]" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-bold leading-tight text-ink">
            <Link to={`/autores/${autor.id}`} className="rounded hover:underline">
              {autor.name}
            </Link>
          </h2>
          {autor.headline && <p className="mt-0.5 text-sm font-semibold text-accent">{autor.headline}</p>}
          <p className="mt-2 text-sm text-ink-muted">
            <strong className="font-bold text-ink">{formatNumber(autor.worksCount)}</strong>{' '}
            {autor.worksCount === 1 ? t('autores.umaObra') : t('autores.obras')} ·{' '}
            {formatNumber(autor.pagesTotal)} {t('autores.paginas')}
          </p>
        </div>
      </div>

      {autor.bio && <p className="line-clamp-3 text-sm leading-relaxed text-ink-muted">{autor.bio}</p>}

      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <ul className="flex flex-wrap gap-2">
            {autor.genres.slice(0, 3).map((genero) => (
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
          {autor.rating.count > 0 ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
              <Stars value={autor.rating.average} size={14} />
              <span>
                {t('autores.avaliacao', {
                  nota: autor.rating.average.toFixed(1),
                  n: formatNumber(autor.rating.count),
                })}
              </span>
            </p>
          ) : (
            <p className="mt-3 text-sm text-ink-subtle">{t('autores.semAvaliacao')}</p>
          )}
        </div>
        <PilhaDeCapas autor={autor} />
      </div>

      <Link to={`/autores/${autor.id}`} className="btn-secondary mt-auto self-start">
        <BookMarked className="h-4 w-4" aria-hidden /> {t('autores.verColecao')}
      </Link>
    </li>
  );
}

export default function Autores() {
  const t = useT();
  const { data: autores = [], isLoading, isError, error, refetch } = useAutores();

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={errorMessage(error) || t('autores.erro')} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        eyebrow={t('roleta.olho')}
        icon={<Users className="h-4 w-4" aria-hidden />}
        title={t('autores.titulo')}
        description={t('autores.subtitulo')}
        actions={
          <Link to="/" className="btn-ghost">
            <Library className="h-4 w-4" aria-hidden /> {t('vitrine.verTudo')}
          </Link>
        }
      />

      {autores.length === 0 ? (
        <EmptyState title={t('autores.vazio')} />
      ) : (
        <>
          <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {autores.map((autor) => (
              <CardDeAutor key={autor.id} autor={autor} />
            ))}
          </ul>

          <OndaDivisoria className="mt-12 text-outline/50" />
          <p className="mt-4 text-center text-xs text-ink-subtle">{t('roleta.ficcao')}</p>
        </>
      )}
    </div>
  );
}
