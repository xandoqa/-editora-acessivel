import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BadgeCheck, BookOpen, Ear, Headphones, LayoutGrid, PlusCircle, Sparkles, Upload, Video, Volume2, VolumeX, AudioLines, Feather, SpellCheck2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useCatalog, useGenres } from '../hooks/queries';
import { errorMessage } from '../lib/api';
import { formatNumber } from '../lib/format';
import { speak, speechSupported, stopSpeaking } from '../lib/speech';
import WorkCard from '../components/works/WorkCard';
import { EmptyState, ErrorState, LoadingState, Pagination } from '../components/ui';
import { OndaDivisoria, OndasDeSom, Rabisco } from '../components/ui/Ornamentos';

interface Filter {
  key: string;
  label: string;
  icon: React.ReactNode;
  format?: string;
  feature?: string;
}

/** Chips de "Formatos & Recursos Assistivos" do protótipo, mapeados para filtros reais da API. */
const FILTERS: Filter[] = [
  { key: 'todos', label: 'Todos os Títulos', icon: <Sparkles className="h-4 w-4" /> },
  { key: 'quadrinhos', label: 'Quadrinhos', icon: <LayoutGrid className="h-4 w-4" />, format: 'QUADRINHO' },
  { key: 'livros', label: 'Livros', icon: <BookOpen className="h-4 w-4" />, format: 'LIVRO' },
  { key: 'manga', label: 'Mangás & Webcomics', icon: <LayoutGrid className="h-4 w-4" />, format: 'MANGA_WEBCOMIC' },
  { key: 'zines', label: 'Zines & Poesia', icon: <Feather className="h-4 w-4" />, format: 'ZINE' },
  { key: 'hq-audio', label: 'Com Audiodescrição', icon: <AudioLines className="h-4 w-4" />, feature: 'audiodescricao' },
  { key: 'libras', label: 'Com Janela de Libras', icon: <Video className="h-4 w-4" />, feature: 'libras' },
  { key: 'facil', label: 'Leitura Fácil', icon: <SpellCheck2 className="h-4 w-4" />, feature: 'facil-leitura' },
];

const PAGE_SIZE = 9;

export default function Catalog() {
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
        'Use os filtros de formatos e recursos assistivos para encontrar quadrinhos com audiodescrição, ficção independente, mangás e obras com janela de Libras.',
      { onEnd: () => setReadingIntro(false), onError: () => setReadingIntro(false) },
    );
    setReadingIntro(!!ok);
  };

  return (
    <div>
      {/* Hero */}
      <section className="card relative mb-10 overflow-hidden bg-surface p-6 md:p-10" aria-labelledby="catalog-title">
        <Rabisco className="pointer-events-none absolute -right-2 -top-3 h-24 w-28 text-primary/25" />
        <OndasDeSom className="pointer-events-none absolute bottom-4 right-6 hidden h-16 w-16 text-accent/30 lg:block" />
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="chip bg-accent-container uppercase tracking-wider text-accent">
                <BadgeCheck className="h-4 w-4" aria-hidden /> Catálogo editorial aberto
              </span>
              <span className="font-medium text-ink-muted">· {formatNumber(data?.catalogTotal ?? 0)} títulos inclusivos</span>
            </p>
            <h1 id="catalog-title" className="text-4xl font-bold tracking-tight text-ink md:text-5xl">
              Leituras em destaque
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-muted">
              Histórias plurais que todo mundo pode ler e sentir. Narrativas visuais independentes com tecnologia assistiva integrada,
              audiodescrição imersiva e tipografia universal.
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-ink">
              <li className="flex items-center gap-2">
                <Headphones className="h-4 w-4 text-ink-muted" aria-hidden /> Audiodescrição nativa
              </li>
              <li className="flex items-center gap-2">
                <span className="font-bold text-primary" aria-hidden>A+</span> Compatível com Leitores de Tela
              </li>
              <li className="flex items-center gap-2">
                <Ear className="h-4 w-4 text-ink-muted" aria-hidden /> Janela de Libras
              </li>
            </ul>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:w-[300px] lg:flex-col">
            <Link to={isWriter ? '/submit' : user ? '/profile' : '/register'} className="btn-primary py-3">
              <PlusCircle className="h-5 w-5" aria-hidden />
              {isWriter ? '+ Nova Obra Independente' : 'Quero publicar minha obra'}
            </Link>
            <button type="button" className="btn bg-bg py-3 text-ink hover:bg-surface-high" onClick={readIntro} disabled={!speechSupported} aria-pressed={readingIntro}>
              {readingIntro ? <VolumeX className="h-5 w-5 text-accent" aria-hidden /> : <Volume2 className="h-5 w-5 text-accent" aria-hidden />}
              {readingIntro ? 'Parar introdução' : 'Ouvir introdução da página'}
            </button>
          </div>
        </div>
      </section>

      {/* Filtros */}
      <section aria-labelledby="filters-title">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 id="filters-title" className="eyebrow font-sans text-ink-muted">
            Formatos & recursos assistivos
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="genero" className="text-sm text-ink-muted">
              Categoria
            </label>
            <select id="genero" className="input w-auto py-2" value={genreId} onChange={(e) => update({ genero: e.target.value })}>
              <option value="">Todas as categorias</option>
              {genres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <label htmlFor="sort" className="text-sm text-ink-muted">
              Ordenar por
            </label>
            <select id="sort" className="input w-auto py-2" value={sort} onChange={(e) => update({ ordem: e.target.value })}>
              <option value="recent">Mais recentes</option>
              <option value="title">Título (A–Z)</option>
              <option value="rating">Melhor avaliadas</option>
            </select>
          </div>
        </div>
        <div className="scrollbar-thin -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-2" role="group" aria-label="Filtrar catálogo">
          {FILTERS.map((f) => {
            const active = f.key === filter.key;
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={active}
                onClick={() => update({ filtro: f.key === 'todos' ? null : f.key })}
                className={`hc-border flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
                  active ? 'border-transparent bg-primary text-primary-on' : 'border-outline/60 bg-surface-high text-ink hover:bg-surface-highest'
                }`}
              >
                <span aria-hidden>{f.icon}</span>
                {f.label}
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
              Exibindo {data.data.length} de {data.meta.total} obras{isFetching ? '…' : ''}
            </p>
          )}
        </div>
      </section>

      {isLoading ? (
        <LoadingState label="Carregando catálogo..." />
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : data && data.data.length === 0 ? (
        <EmptyState
          title="Nenhuma obra encontrada"
          description="Tente outro termo de busca ou remova os filtros para ver todo o catálogo."
          action={
            <button type="button" className="btn-secondary" onClick={() => setParams(new URLSearchParams())}>
              Ver todas as obras
            </button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {data?.data.map((work) => <WorkCard key={work.id} work={work} />)}
          </div>
          {data && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={(p) => update({ pagina: String(p) })} />}
        </>
      )}

      <OndaDivisoria className="mt-12 text-outline/50" />

      {/* Chamada para autores */}
      <section className="card mt-6 flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8" aria-labelledby="cta-title">
        <div className="max-w-md">
          <p className="eyebrow mb-2 text-accent">Para quadrinistas & editoras</p>
          <h2 id="cta-title" className="text-3xl font-bold text-ink">
            Quer tornar sua obra acessível?
          </h2>
          <p className="mt-2 text-ink-muted">
            Nossa equipe e ferramentas automatizadas convertem HQs, livros e mangás para o padrão de acessibilidade Livrin Universal, com
            suporte a audiodescrição quadro a quadro.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to={isWriter ? '/submit' : user ? '/profile' : '/register'} className="btn-primary px-6 py-3">
            <Upload className="h-4 w-4" aria-hidden />
            {isWriter ? 'Submeter meu manuscrito' : 'Virar escritor na Livrin'}
          </Link>
          {isWriter && (
            <Link to="/review" className="btn-secondary px-6 py-3">
              Acompanhar análise <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
