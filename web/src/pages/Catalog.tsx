import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Ear, Headphones, LayoutGrid, PlusCircle, Sparkles, Upload, Video, Volume2, VolumeX, AudioLines, Feather, SpellCheck2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useCatalog, useGenres } from '../hooks/queries';
import { errorMessage } from '../lib/api';
import { formatNumber } from '../lib/format';
import { speak, speechSupported, stopSpeaking } from '../lib/speech';
import WorkCard from '../components/works/WorkCard';
import { EmptyState, ErrorState, LoadingState, Pagination } from '../components/ui';
import { OndaDivisoria, OndasDeSom, Rabisco } from '../components/ui/Ornamentos';
import { useT } from '../i18n/I18nContext';
import type { ChaveDeTraducao } from '../i18n/tipos';

interface Filter {
  key: string;
  /**
   * Chave de tradução, não texto.
   *
   * A lista é declarada no nível do módulo e roda uma vez, antes de qualquer
   * idioma ser escolhido. Guardar o texto aqui congelaria o português no
   * primeiro carregamento — foi exatamente assim que os chips de filtro
   * continuaram em português depois de trocar o idioma.
   */
  label: ChaveDeTraducao;
  icon: React.ReactNode;
  format?: string;
  feature?: string;
}

/** Chips de "Formatos & Recursos Assistivos" do protótipo, mapeados para filtros reais da API. */
const FILTERS: Filter[] = [
  { key: 'todos', label: 'filtro.todos', icon: <Sparkles className="h-4 w-4" /> },
  { key: 'quadrinhos', label: 'filtro.quadrinhos', icon: <LayoutGrid className="h-4 w-4" />, format: 'QUADRINHO' },
  { key: 'livros', label: 'filtro.livros', icon: <BookOpen className="h-4 w-4" />, format: 'LIVRO' },
  { key: 'manga', label: 'filtro.manga', icon: <LayoutGrid className="h-4 w-4" />, format: 'MANGA_WEBCOMIC' },
  { key: 'zines', label: 'filtro.zines', icon: <Feather className="h-4 w-4" />, format: 'ZINE' },
  { key: 'hq-audio', label: 'filtro.comAudiodescricao', icon: <AudioLines className="h-4 w-4" />, feature: 'audiodescricao' },
  { key: 'libras', label: 'filtro.comLibras', icon: <Video className="h-4 w-4" />, feature: 'libras' },
  { key: 'facil', label: 'filtro.leituraFacil', icon: <SpellCheck2 className="h-4 w-4" />, feature: 'facil-leitura' },
];

const PAGE_SIZE = 9;

export default function Catalog() {
  const t = useT();
  const { user, isWriter } = useAuth();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const filterKey = params.get('filtro') ?? 'todos';
  const sort = params.get('ordem') ?? 'recent';
  const genreId = params.get('genero') ?? '';
  const page = Math.max(1, Number(params.get('pagina')) || 1);
  const filter = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0];
  const [readingIntro, setReadingIntro] = useState(false);

  const { data: genres = [] } = useGenres();
  const { data, isLoading, isError, error, refetch, isFetching } = useCatalog({
    q: q || undefined,
    format: filter.format,
    feature: filter.feature,
    genreId: genreId ? Number(genreId) : undefined,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });

  useEffect(() => () => stopSpeaking(), []);

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    if (!('pagina' in changes)) next.delete('pagina');
    setParams(next, { replace: false });
  };

  const readIntro = () => {
    if (readingIntro) {
      stopSpeaking();
      setReadingIntro(false);
      return;
    }
    const total = data?.catalogTotal ?? 0;
    const ok = speak(
      `Catálogo editorial aberto da Livrin, com ${total} títulos inclusivos. Leituras em destaque: histórias plurais que todo mundo pode ler e sentir. ` +
        'Use os filtros de formatos e recursos assistivos para encontrar quadrinhos com audiodescrição, ficção independente, mangás e obras com Libras no conteúdo.',
      { onEnd: () => setReadingIntro(false), onError: () => setReadingIntro(false) },
    );
    setReadingIntro(!!ok);
  };

  return (
    <div>
      {/*
        * Abertura sem caixa.
        *
        * Era um card com borda, sombra e uma etiqueta colorida antes do
        * título. A referência do Instituto Ziraldo faz o contrário: fundo
        * limpo, um rótulo pequeno em versalete, o título grande e um filete
        * fechando a seção. Quem organiza a página é o alinhamento, não a
        * moldura.
        */}
      <section className="relative mb-12 border-b border-outline/25 pb-10" aria-labelledby="catalog-title">
        <Rabisco className="pointer-events-none absolute -right-1 -top-7 h-20 w-24 text-primary/20" />
        <OndasDeSom className="pointer-events-none absolute -bottom-2 right-8 hidden h-14 w-14 text-accent/20 lg:block" />

        <p className="eyebrow text-ink-subtle">
          {t('catalogo.olho', { n: formatNumber(data?.catalogTotal ?? 0) })}
        </p>

        <h1
          id="catalog-title"
          /* 2,75rem (44px) num aparelho de 375px ocupava a tela inteira com
             duas palavras. A escala agora sobe com a largura: 32px no celular,
             40px a partir de 640px, 60px no computador. */
          className="mt-3 max-w-3xl font-display text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[2.5rem] sm:leading-[1.05] md:text-6xl"
        >
          {t('catalogo.titulo')}
        </h1>

        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted sm:mt-5 sm:text-lg">
          {t('catalogo.chamada')}
        </p>

        <ul className="mt-6 flex flex-wrap gap-x-7 gap-y-2 text-sm text-ink-muted">
          <li className="flex items-center gap-2">
            <Headphones className="h-4 w-4" aria-hidden /> {t('catalogo.audiodescricaoNativa')}
          </li>
          <li className="flex items-center gap-2">
            <span className="font-bold text-primary" aria-hidden>A+</span> {t('catalogo.compativelLeitores')}
          </li>
          <li className="flex items-center gap-2">
            <Ear className="h-4 w-4" aria-hidden /> {t('catalogo.librasConteudo')}
          </li>
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to={isWriter ? '/submit' : user ? '/profile' : '/register'} className="btn-primary py-3">
            <PlusCircle className="h-5 w-5" aria-hidden />
            {isWriter ? t('catalogo.novaObra') : t('catalogo.queroPublicarObra')}
          </Link>
          <button type="button" className="btn-ghost py-3" onClick={readIntro} disabled={!speechSupported} aria-pressed={readingIntro}>
            {readingIntro ? <VolumeX className="h-5 w-5 text-accent" aria-hidden /> : <Volume2 className="h-5 w-5 text-accent" aria-hidden />}
            {readingIntro ? t('catalogo.pararIntroducao') : t('catalogo.ouvirIntroducao')}
          </button>
        </div>
      </section>

      {/* Filtros */}
      <section aria-labelledby="filters-title">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 id="filters-title" className="eyebrow font-sans text-ink-muted">
            {t('catalogo.formatosRecursos')}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="genero" className="text-sm text-ink-muted">
              {t('catalogo.categoria')}
            </label>
            <select id="genero" className="input w-auto py-2" value={genreId} onChange={(e) => update({ genero: e.target.value })}>
              <option value="">{t('catalogo.todasCategorias')}</option>
              {genres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <label htmlFor="sort" className="text-sm text-ink-muted">
              {t('catalogo.ordenarPor')}
            </label>
            <select id="sort" className="input w-auto py-2" value={sort} onChange={(e) => update({ ordem: e.target.value })}>
              <option value="recent">{t('catalogo.maisRecentes')}</option>
              <option value="title">{t('catalogo.tituloAZ')}</option>
              <option value="rating">{t('catalogo.melhorAvaliadas')}</option>
            </select>
          </div>
        </div>
        <div
          className="scrollbar-thin -mx-1 mb-4 flex gap-5 overflow-x-auto border-b border-outline/25 px-1"
          role="group"
          aria-label={t('catalogo.filtrar')}
        >
          {FILTERS.map((f) => {
            const active = f.key === filter.key;
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={active}
                onClick={() => update({ filtro: f.key === 'todos' ? null : f.key })}
                /* Aba com filete, no lugar da pílula preenchida: o estado
                   ativo continua óbvio e o peso de cor sai da página. */
                className={`hc-border flex min-h-[44px] shrink-0 items-center gap-2 border-b-2 px-1.5 text-sm transition-colors ${
                  active ? 'border-primary font-semibold text-ink' : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                <span aria-hidden>{f.icon}</span>
                {t(f.label)}
              </button>
            );
          })}
        </div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-sm">
          {q ? (
            <p className="text-ink-muted">
              Resultados para <strong className="text-ink">“{q}”</strong>{' '}
              <button type="button" className="ml-1 font-semibold text-primary underline" onClick={() => update({ q: null })}>
                limpar busca
              </button>
            </p>
          ) : (
            <span />
          )}
          {data && (
            <p className="font-semibold text-accent" aria-live="polite">
              {t('catalogo.exibindo', { n: data.data.length, total: data.meta.total })}
              {isFetching ? '…' : ''}
            </p>
          )}
        </div>
      </section>

      {isLoading ? (
        <LoadingState label={t('catalogo.carregando')} />
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : data && data.data.length === 0 ? (
        <EmptyState
          title={t('catalogo.nenhumaObra')}
          description={t('catalogo.nenhumaObraTexto')}
          action={
            <button type="button" className="btn-secondary" onClick={() => setParams(new URLSearchParams())}>
              {t('catalogo.verTodas')}
            </button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-x-7 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
            {data?.data.map((work) => <WorkCard key={work.id} work={work} />)}
          </div>
          {data && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={(p) => update({ pagina: String(p) })} />}
        </>
      )}

      <OndaDivisoria className="mt-12 text-outline/50" />

      {/* Chamada para autores */}
      <section className="card mt-6 flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8" aria-labelledby="cta-title">
        <div className="max-w-md">
          <p className="eyebrow mb-2 text-accent">{t('catalogo.paraAutores')}</p>
          <h2 id="cta-title" className="text-2xl font-bold text-ink sm:text-3xl">
            {t('catalogo.quererPublicar')}
          </h2>
          <p className="mt-2 text-ink-muted">
            {t('catalogo.ctaTexto')}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to={isWriter ? '/submit' : user ? '/profile' : '/register'} className="btn-primary px-6 py-3">
            <Upload className="h-4 w-4" aria-hidden />
            {isWriter ? t('catalogo.submeterManuscrito') : t('catalogo.virarEscritor')}
          </Link>
          {isWriter && (
            <Link to="/review" className="btn-secondary px-6 py-3">
              {t('catalogo.acompanharAnalise')} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
