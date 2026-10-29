import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  AudioLines,
  BadgeCheck,
  BookOpen,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Contrast,
  Download,
  Eye,
  FileText,
  Hand,
  HandHeart,
  Headphones,
  Info,
  PersonStanding,
  Play,
  ShoppingBag,
  SpellCheck2,
  Table2,
  Volume2,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useAudioDescriptions, useWork } from '../hooks/queries';
import { downloadAuthenticated, errorMessage, safeStorage } from '../lib/api';
import { formatBytes, formatMonthYear, pad2 } from '../lib/format';
import { STATUS_LABEL, ageRatingLabel } from '../lib/labels';
import { usePreferences } from '../preferences/PreferencesContext';
import AudioDescriptionPlayer, { type PlayerHandle } from '../components/reader/AudioDescriptionPlayer';
import { descricaoDeReserva } from '../components/reader/descricaoDeReserva';
import DocumentViewer from '../components/reader/DocumentViewer';
import AquisicaoDialog from '../components/works/AquisicaoDialog';
import {
  BlocoPublicitario,
  PAGINAS_POR_ANUNCIO,
  cabeAnuncioAntes,
  cabeAnuncioDepois,
} from '../components/reader/Publicidade';
import { EspacoPublicitario } from '../components/works/Modalidade';
import { formatCents } from '../lib/format';
import ReaderPreferencesPanel from '../components/reader/ReaderPreferencesPanel';
import { PALETTES, textStyle, useReaderPrefs } from '../components/reader/readerPrefs';
import { useReadingSession } from '../components/reader/useReadingSession';
import FeedbackSection from '../components/works/FeedbackSection';
import SeloLivrin from '../components/works/SeloLivrin';
import { Avatar, Cover, ErrorState, LoadingState, Stars } from '../components/ui';

export const LAST_READ_KEY = 'livrin_last_read';

function isTypingTarget(el: EventTarget | null) {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable;
}

export default function Reader() {
  const { id } = useParams();
  const workId = Number(id);
  const location = useLocation();
  const [params] = useSearchParams();
  const { user, isAdmin } = useAuth();
  const globalPrefs = usePreferences();
  const { data: work, isLoading, isError, error, refetch } = useWork(Number.isInteger(workId) ? workId : undefined);
  const { data: descriptions = [] } = useAudioDescriptions(work ? workId : undefined);
  const [prefs, setPrefs] = useReaderPrefs();
  const [page, setPage] = useState(1);
  const [comprando, setComprando] = useState(false);
  const [fileTotal, setFileTotal] = useState(0);
  const [playerOpen, setPlayerOpen] = useState(true);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const playerRef = useRef<PlayerHandle>(null);
  const readerRef = useRef<HTMLElement>(null);
  // Prévias do próprio autor e de rascunhos não contam como leitura nas métricas.
  const track = useReadingSession(work?.id, !!work && work.status === 'APROVADO' && work.author.id !== user?.id);

  const totalPages = work?.hasFile ? fileTotal || 1 : Math.max(1, ...descriptions.map((d) => d.pageNumber));
  const goTo = useCallback((p: number) => setPage(() => Math.min(Math.max(1, p), Math.max(1, totalPages))), [totalPages]);
  const onPageCount = useCallback((n: number) => setFileTotal(n), []);

  // Página inicial (?pagina=) e reset ao trocar de obra.
  useEffect(() => {
    setPage(Math.max(1, Number(params.get('pagina')) || 1));
    setFileTotal(0);
    if (work) safeStorage.set(LAST_READ_KEY, String(work.id));
    // Dependência intencionalmente só na obra: reiniciar a página ao trocar de obra, não a cada render.
  }, [work?.id]);

  // "Ouvir audiodescrição" vindo de outro lugar (?ouvir=1).
  useEffect(() => {
    if (params.get('ouvir') === '1' && work) setTimeout(() => playerRef.current?.play(), 300);
    // Dependência intencionalmente só na obra: reiniciar a página ao trocar de obra, não a cada render.
  }, [work?.id]);

  useEffect(() => {
    if (location.hash === '#ficha' && work) document.getElementById('ficha')?.scrollIntoView({ behavior: 'smooth' });
  }, [location.hash, work]);

  // Métricas de uso dos recursos de acessibilidade.
  useEffect(() => track({ lastPage: page }), [page, track]);
  useEffect(() => {
    track({
      usedHighContrast: prefs.palette === 'amarelo' || globalPrefs.highContrast,
      usedDyslexicFont: prefs.typography === 'opendyslexic',
      usedZoom: prefs.scale !== 100 || globalPrefs.fontScale !== 1,
    });
  }, [prefs, globalPrefs.highContrast, globalPrefs.fontScale, track]);

  // Atalhos: ← → trocam de página; Espaço reproduz/pausa a audiodescrição.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight') goTo(page + 1);
      else if (e.key === 'ArrowLeft') goTo(page - 1);
      else if (e.key === ' ' && !(e.target as HTMLElement)?.closest('button, a, [role="radio"]')) {
        e.preventDefault();
        setPlayerOpen(true);
        playerRef.current?.toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo, page]);

  /*
   * Obra paga que esta pessoa ainda não adquiriu.
   *
   * `access` vem do detalhe da obra e serve para a tela decidir o que mostrar.
   * A autorização de verdade continua no servidor: mesmo que alguém force
   * este valor no navegador, o endpoint do arquivo recusa do mesmo jeito.
   */
  const bloqueadaPorAquisicao = Boolean(work?.access?.required && !work.access.granted);

  // O card do catálogo manda para cá com #aquisicao quando a obra é paga:
  // quem clicou em "Adquirir" não deveria ter que clicar de novo ao chegar.
  useEffect(() => {
    if (location.hash === '#aquisicao' && bloqueadaPorAquisicao && user) setComprando(true);
  }, [location.hash, bloqueadaPorAquisicao, user]);

  /*
   * Anúncios aparecem só onde as três condições se encontram: a obra foi
   * configurada para publicidade PELA AUTORIA, a pessoa não é assinante
   * premium, e há leitura acontecendo. Obra gratuita comum e obra paga não
   * exibem anúncio nenhum — a modalidade é de cada obra, não da plataforma.
   */
  const comPublicidade = work?.monetization === 'PUBLICIDADE' && user?.plan !== 'PREMIUM';

  /*
   * Quando a obra não tem audiodescrição cadastrada, o player narra uma
   * descrição montada a partir da ficha — capa, autoria, formato, recursos e
   * sinopse. Antes, nesse caso, o botão não fazia absolutamente nada.
   *
   * A reserva vai SÓ para o player: `descriptions` segue como está, para não
   * mudar o que aparece ao lado da página nem a contagem de páginas.
   */
  const semAudiodescricao = descriptions.length === 0;
  const descricoesNarradas = useMemo(
    () => (semAudiodescricao && work ? descricaoDeReserva(work) : descriptions),
    [semAudiodescricao, work, descriptions],
  );

  const currentAd = descriptions.find((d) => d.pageNumber === page);
  const chapterAd = useMemo(
    () => [...descriptions].filter((d) => d.pageNumber <= page).sort((a, b) => b.pageNumber - a.pageNumber)[0] ?? descriptions[0],
    [descriptions, page],
  );

  if (!Number.isInteger(workId) || workId <= 0) return <ErrorState message="Obra inválida." />;
  if (isLoading) return <LoadingState label="Abrindo obra..." />;
  if (isError || !work) return <ErrorState message={errorMessage(error, 'Obra não encontrada.')} onRetry={() => refetch()} />;

  const palette = PALETTES[prefs.palette];
  const isOwner = user?.id === work.author.id;
  const audioDescValidated = work.hasAudioDesc && work.status === 'APROVADO';
  const fileLabel = work.file ? `${work.file.type} · ${formatBytes(work.file.sizeBytes)}` : '';

  const startReading = () => {
    readerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    readerRef.current?.focus({ preventScroll: true });
  };
  const listen = () => {
    setPlayerOpen(true);
    setTimeout(() => playerRef.current?.play(), 50);
  };

  const certified = [
    work.hasAudioDesc && { icon: <AudioLines className="h-4 w-4" />, label: work.hasAudio ? 'Audiodescrição Completa (Voz Humana)' : 'Audiodescrição Completa (Voz Sintetizada)', accent: true },
    work.hasAltoContraste && { icon: <Contrast className="h-4 w-4" />, label: 'Alto Contraste Ocular' },
    { icon: <SpellCheck2 className="h-4 w-4" />, label: 'Fontes Lexend & OpenDyslexic' },
    work.hasLibras && { icon: <Hand className="h-4 w-4" />, label: 'Janela Libras nos Diálogos Chave' },
    work.hasLeitorTela && { icon: <PersonStanding className="h-4 w-4" />, label: 'Compatível com Leitores de Tela' },
    work.hasFacilLeitura && { icon: <BookOpen className="h-4 w-4" />, label: 'Leitura Fácil' },
  ].filter(Boolean) as { icon: JSX.Element; label: string; accent?: boolean }[];

  return (
    <div className="space-y-6">
      {work.status !== 'APROVADO' && (
        <div className="flex items-start gap-3 rounded-xl border border-warn/40 bg-warn-container p-4 text-sm text-ink" role="status">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden />
          <p>
            <strong>Prévia no Leitor Web.</strong> Esta obra ainda não está no catálogo público (status: {STATUS_LABEL[work.status]}). Somente
            {isAdmin && !isOwner ? ' a administração e o autor' : ' você e a curadoria'} podem vê-la.
            {isOwner && (
              <>
                {' '}
                <Link to={work.status === 'EM_ANALISE' ? `/review/${work.id}` : '/dashboard'} className="font-semibold text-primary underline">
                  Voltar ao acompanhamento
                </Link>
              </>
            )}
          </p>
        </div>
      )}

      {/* Detalhe da obra */}
      <section className="relative border-b border-outline/25 pb-8" aria-labelledby="work-title">
        <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
          <div>
            <div className="relative overflow-hidden rounded-[12px_16px_12px_16px] border border-outline/70 bg-surface-high">
              {work.hasAltoContraste && (
                <span className="chip absolute left-3 top-3 z-10 bg-black/75 text-accent">
                  <BadgeCheck className="h-4 w-4" aria-hidden /> Alto contraste
                </span>
              )}
              <Cover
                url={work.coverUrl}
                title={work.title}
                /* A descrição escrita pela autoria é o texto alternativo.
                   Sem ela, resta o título — melhor que nada, pior que uma
                   descrição de verdade. */
                alt={work.coverAlt ?? undefined}
                className="aspect-[3/4] w-full"
              />
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/90 to-transparent p-3 pt-10 text-sm font-semibold text-white">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" aria-hidden /> {work.pages} páginas
                </span>
                {work.hasAudioDesc && (
                  <span className="flex items-center gap-1.5 text-[#d6e2ff]">
                    <Volume2 className="h-4 w-4" aria-hidden />
                    {work.hasAudio ? 'Faixa em áudio' : `${descriptions.length} quadros narrados`}
                  </span>
                )}
              </div>
            </div>
            <div className="card-high mt-3 flex items-center justify-between px-4 py-3">
              <span className="flex items-center gap-2">
                <Stars value={work.rating.average} />
                <span className="text-xl font-semibold text-ink">{work.rating.count ? work.rating.average.toFixed(1) : '—'}</span>
              </span>
              <span className="text-sm text-ink-muted">{work.rating.count} avaliações</span>
            </div>
          </div>

          <div className="min-w-0">
            <p className="mb-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="chip bg-primary-container uppercase tracking-wider text-primary">{work.genre.name} acessível</span>
              {work.isbn && <span className="font-semibold text-ink-muted">· ISBN {work.isbn}</span>}
            </p>
            {audioDescValidated && (
              <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-accent">
                <BadgeCheck className="h-4 w-4" aria-hidden /> Audiodescrição validada
              </p>
            )}
            <h1 id="work-title" className="text-4xl font-bold leading-tight tracking-tight text-ink md:text-5xl">
              {work.title}
              {work.subtitle && <span className="text-primary">: {work.subtitle}</span>}
            </h1>

            <ul className="mt-5 space-y-3">
              <li className="flex items-center gap-3">
                <Avatar name={work.author.name} />
                <span>
                  <span className="block text-sm font-semibold text-ink">{work.author.name}</span>
                  <span className="block text-xs text-ink-muted">{work.author.headline ?? 'Autoria'}</span>
                </span>
              </li>
              {work.audioDescriber && (
                <li className="flex items-center gap-3">
                  <Avatar name={work.audioDescriber} tone="accent" />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{work.audioDescriber}</span>
                    <span className="block text-xs text-ink-muted">Roteirista de Audiodescrição & Consultoria PCD</span>
                  </span>
                </li>
              )}
            </ul>

            <div className="mt-6">
              <SeloLivrin work={work} />
            </div>

            <h2 className="eyebrow mt-6 mb-3 font-sans text-ink-muted">Recursos inclusivos certificados</h2>
            <ul className="flex flex-wrap gap-2">
              {certified.map((c) => (
                <li key={c.label} className={`chip hc-border border border-transparent py-2 text-sm ${c.accent ? 'bg-accent-container text-accent' : 'bg-surface-high text-ink'}`}>
                  <span aria-hidden>{c.icon}</span>
                  {c.label}
                </li>
              ))}
            </ul>

            {/*
             * Obra paga aberta sem compra: diz por quê.
             *
             * Sem este aviso, quem testasse com a conta da administração veria
             * a obra paga abrir e concluiria que o bloqueio não funciona. Ele
             * funciona — e esta linha é a diferença entre um sistema que
             * parece falhar e um que se explica.
             */}
            {work.access?.required && (work.access.reason === 'ADMINISTRACAO' || work.access.reason === 'AUTORIA') && (
              <p className="mt-6 flex gap-2 rounded-xl border-l-4 border-warn bg-surface-high p-3 text-sm text-ink">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden />
                <span>
                  Esta obra é paga ({formatCents(work.priceCents ?? 0)}) e você está lendo{' '}
                  {work.access.reason === 'AUTORIA' ? 'por ser a autoria' : 'pela conta de administração'}, sem compra.
                  Um leitor comum precisa adquiri-la.
                </span>
              </p>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              {/*
               * Obra paga sem aquisição não mostra ação de leitura nem de
               * download. Não é por segurança — o servidor recusa de qualquer
               * jeito — é por honestidade: oferecer um botão que vai falhar é
               * prometer o que não se cumpre.
               */}
              {bloqueadaPorAquisicao ? (
                <>
                  {user ? (
                    <button
                      type="button"
                      className="btn-primary px-6 py-3 text-base"
                      onClick={() => setComprando(true)}
                    >
                      <ShoppingBag className="h-5 w-5" aria-hidden /> Comprar obra ·{' '}
                      {formatCents(work.priceCents ?? 0)}
                    </button>
                  ) : (
                    <Link to="/login" className="btn-primary px-6 py-3 text-base">
                      <ShoppingBag className="h-5 w-5" aria-hidden /> Entrar para comprar ·{' '}
                      {formatCents(work.priceCents ?? 0)}
                    </Link>
                  )}
                  <p className="w-full text-sm text-ink-muted">
                    A leitura e o download ficam disponíveis assim que o pagamento for aprovado. Você continua podendo
                    ver capa, sinopse, ficha técnica e avaliações.
                  </p>
                </>
              ) : (
                <>
                  <button type="button" className="btn-primary px-6 py-3 text-base" onClick={startReading}>
                    <Play className="h-5 w-5 fill-current" aria-hidden /> Iniciar Leitura Acessível
                  </button>
                  <button type="button" className="btn-accent px-6 py-3 text-base" onClick={listen}>
                    <Volume2 className="h-5 w-5" aria-hidden /> Ouvir Audiodescrição
                  </button>
                </>
              )}
              {work.hasFile && !bloqueadaPorAquisicao && (
                <div className="relative">
                  <button type="button" className="btn-secondary px-5 py-3" aria-expanded={downloadOpen} aria-haspopup="menu" onClick={() => setDownloadOpen((o) => !o)}>
                    <Download className="h-5 w-5" aria-hidden /> Baixar Obra <ChevronDown className="h-4 w-4" aria-hidden />
                  </button>
                  {downloadOpen && (
                    <div role="menu" className="card absolute left-0 top-14 z-20 w-72 p-2 shadow-card">
                      <button
                        role="menuitem"
                        type="button"
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-surface-highest"
                        onClick={() => {
                          setDownloadOpen(false);
                          void downloadAuthenticated(`/works/${work.id}/file?download=1`, `${work.title}.${work.file?.type.toLowerCase()}`);
                        }}
                      >
                        <FileText className="h-4 w-4" aria-hidden /> Arquivo original ({fileLabel})
                      </button>
                      {work.hasAudio && (
                        <button
                          role="menuitem"
                          type="button"
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-surface-highest"
                          onClick={() => {
                            setDownloadOpen(false);
                            void downloadAuthenticated(`/works/${work.id}/audio`, `${work.title}-audiodescricao`);
                          }}
                        >
                          <Headphones className="h-4 w-4" aria-hidden /> Faixa de audiodescrição
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* Apoio discreto, ao lado das ações da obra — nunca antes de ler (seção 19). */}
              <Link to={`/apoiar?obra=${work.id}`} className="btn-ghost px-5 py-3">
                <HandHeart className="h-5 w-5" aria-hidden /> Apoiar esta obra
              </Link>
            </div>
          </div>
        </div>
      </section>

      {playerOpen ? (
        <AudioDescriptionPlayer
          ref={playerRef}
          work={work}
          descriptions={descricoesNarradas}
          usandoReserva={semAudiodescricao}
          currentPage={page}
          onGoToPage={goTo}
          onUse={() => track({ usedAudioDesc: true })}
          onClose={() => setPlayerOpen(false)}
        />
      ) : (
        <button type="button" className="btn-secondary" onClick={() => setPlayerOpen(true)}>
          <Headphones className="h-4 w-4" aria-hidden /> Mostrar player de audiodescrição
        </button>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <ReaderPreferencesPanel prefs={prefs} onChange={setPrefs} />

          {/* Leitor */}
          <section
            ref={readerRef}
            tabIndex={-1}
            aria-labelledby="reader-title"
            className="rounded-2xl border border-outline/60 p-4 focus:outline-none md:p-6"
            style={{ background: palette.bg, color: palette.text }}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-3" style={{ borderColor: `${palette.muted}40` }}>
              <h2 id="reader-title" className="flex min-w-0 items-center gap-3 text-xl font-semibold">
                <span className="rounded-md px-2 py-1 text-xs font-bold" style={{ background: palette.surface, color: palette.muted }}>
                  {chapterAd?.chapterLabel ?? 'Leitura'}
                </span>
                <span className="truncate">{chapterAd?.chapterTitle ?? work.title}</span>
              </h2>
              <nav className="flex items-center gap-1" aria-label="Paginação do leitor">
                <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:opacity-80 disabled:opacity-30" onClick={() => goTo(page - 1)} disabled={page <= 1} aria-label="Página anterior">
                  <ChevronLeft className="h-5 w-5" aria-hidden />
                </button>
                <span className="min-w-[110px] text-center text-sm font-semibold" aria-live="polite">
                  Pág {pad2(page)} / {pad2(totalPages)}
                </span>
                <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:opacity-80 disabled:opacity-30" onClick={() => goTo(page + 1)} disabled={page >= totalPages} aria-label="Próxima página">
                  <ChevronRight className="h-5 w-5" aria-hidden />
                </button>
              </nav>
            </div>

            {/* Anúncio de abertura: antes da primeira página, nunca por cima
                dela. Some assim que a leitura avança. */}
            {comPublicidade && !bloqueadaPorAquisicao && cabeAnuncioAntes(page) && (
              <BlocoPublicitario indice={0} palette={palette} rotulo="abertura da leitura" />
            )}

            <div className="relative rounded-xl p-2" style={{ background: palette.surface }}>
              {bloqueadaPorAquisicao ? (
                /*
                 * Obra paga sem aquisição. O bloqueio REAL está no servidor —
                 * este painel existe para explicar e oferecer o caminho, em
                 * vez de deixar o leitor tentar abrir e receber um erro seco.
                 */
                <div className="p-8 text-center" style={{ color: palette.text }}>
                  <ShoppingBag className="mx-auto h-8 w-8 opacity-70" aria-hidden />
                  <p className="mt-3 font-display text-xl font-semibold">Esta obra é paga</p>
                  <p className="mx-auto mt-2 max-w-prose text-sm" style={{ color: palette.muted }}>
                    Adquira <strong>{work.title}</strong> por {formatCents(work.priceCents ?? 0)} para ler. A obra fica
                    na sua biblioteca e continua disponível quando você voltar.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {user ? (
                      <button type="button" className="btn-primary" onClick={() => setComprando(true)}>
                        <ShoppingBag className="h-4 w-4" aria-hidden /> Adquirir por {formatCents(work.priceCents ?? 0)}
                      </button>
                    ) : (
                      <Link to="/login" className="btn-primary">
                        Entrar para adquirir
                      </Link>
                    )}
                  </div>
                </div>
              ) : work.hasFile && work.file ? (
                <DocumentViewer
                  workId={work.id}
                  fileType={work.file.type}
                  page={page}
                  onPageCount={onPageCount}
                  onPageChange={setPage}
                  prefs={prefs}
                  title={work.title}
                  pageAlt={currentAd?.description}
                />
              ) : (
                <p className="p-10 text-center" style={{ color: palette.muted }}>
                  O arquivo desta obra ainda não foi enviado. A audiodescrição cadastrada pode ser ouvida no player acima.
                </p>
              )}
              {currentAd?.panelLabel && (
                <span className="chip pointer-events-none absolute bottom-4 right-4 bg-black/80 text-accent">
                  <Eye className="h-3.5 w-3.5" aria-hidden /> {currentAd.panelLabel}
                </span>
              )}
            </div>

            {/* Anúncio entre trechos: depois da página, a cada bloco de
                páginas e ao fim da leitura. Nunca parte uma frase ao meio,
                porque só aparece quando a página já terminou. */}
            {comPublicidade && !bloqueadaPorAquisicao && cabeAnuncioDepois(page, totalPages) && (
              <BlocoPublicitario
                indice={Math.ceil(page / PAGINAS_POR_ANUNCIO)}
                palette={palette}
                rotulo={page >= totalPages ? 'fim da leitura' : 'intervalo entre trechos'}
              />
            )}

            {currentAd ? (
              <div className="mt-5 space-y-4" style={textStyle(prefs)}>
                <div className="rounded-xl p-4" style={{ background: palette.surface }}>
                  <p className="mb-1 flex items-center gap-2 text-[0.8em] font-bold uppercase tracking-wider" style={{ color: palette.accent }}>
                    <AudioLines className="h-4 w-4" aria-hidden /> Audiodescrição do quadro:
                  </p>
                  <p>{currentAd.description}</p>
                </div>
                {currentAd.dialogues.length > 0 && (
                  <ul className="grid gap-3 md:grid-cols-2">
                    {currentAd.dialogues.map((d, i) => (
                      <li key={i} className="rounded-xl p-4" style={{ background: palette.surface }}>
                        <p className="mb-1 flex items-center justify-between gap-2 text-[0.8em] font-bold">
                          <span className="flex items-center gap-1.5" style={{ color: i % 2 ? palette.accent : palette.text }}>
                            <span className="h-2 w-2 rounded-full bg-current" aria-hidden /> {d.speaker}
                          </span>
                          {d.tone && <span style={{ color: palette.muted }}>{d.tone}</span>}
                        </p>
                        <p>“{d.text}”</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              descriptions.length > 0 && (
                <p className="mt-4 text-sm" style={{ color: palette.muted }}>
                  Esta página não possui audiodescrição específica.
                </p>
              )
            )}

            <p className="mt-5 flex flex-wrap items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: palette.surface, color: palette.muted }}>
              <kbd className="rounded border px-1.5 font-sans text-xs" style={{ borderColor: palette.muted }}>←</kbd>
              <kbd className="rounded border px-1.5 font-sans text-xs" style={{ borderColor: palette.muted }}>→</kbd>
              Troca de páginas por setas
              <kbd className="ml-3 rounded border px-1.5 font-sans text-xs" style={{ borderColor: palette.muted }}>Espaço</kbd>
              Reproduzir/Pausar áudio-guia
            </p>
          </section>
        </div>

        {/* Coluna lateral */}
        <aside className="space-y-6" aria-label="Informações da obra">
          <section className="card p-5" aria-labelledby="synopsis-title">
            <h2 id="synopsis-title" className="mb-3 flex items-center gap-2 text-xl font-semibold text-ink">
              <BookOpen className="h-5 w-5 text-primary" aria-hidden /> Sinopse da Obra
            </h2>
            <p className="whitespace-pre-line leading-relaxed text-ink-muted">{work.synopsis}</p>
            {work.tags.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {work.tags.map((t) => (
                  <li key={t}>
                    <Link to={`/?q=${encodeURIComponent(t)}`} className="chip bg-surface-high text-ink-muted hover:text-ink">
                      #{t}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {work.authorNotes && (
            <section className="card p-5" aria-labelledby="notes-title">
              <h2 id="notes-title" className="mb-3 flex items-center gap-2 text-xl font-semibold text-ink">
                <PersonStanding className="h-5 w-5 text-accent" aria-hidden /> Notas da Autoria: Adaptação Universal
              </h2>
              <blockquote className="card-high p-4 text-sm leading-relaxed text-ink-muted">
                “{work.authorNotes}”
                <footer className="mt-3 flex justify-between text-xs font-semibold">
                  <span className="text-ink">— {work.author.name}</span>
                  {work.publishedAt && <span className="text-accent">{new Date(work.publishedAt).getFullYear()}</span>}
                </footer>
              </blockquote>
              <ul className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-ink">
                {work.hasAltoContraste && (
                  <li className="card-high flex items-center gap-2 p-3">
                    <CheckSquare className="h-4 w-4 shrink-0 text-primary" aria-hidden /> Paleta de contraste cromático testada
                  </li>
                )}
                {work.hasLeitorTela && (
                  <li className="card-high flex items-center gap-2 p-3">
                    <CheckSquare className="h-4 w-4 shrink-0 text-accent" aria-hidden /> Ordem de leitura linear para leitores de tela
                  </li>
                )}
              </ul>
            </section>
          )}

          <section id="ficha" className="card scroll-mt-24 p-5" aria-labelledby="tech-title">
            <h2 id="tech-title" className="mb-3 flex items-center gap-2 text-xl font-semibold text-ink">
              <Table2 className="h-5 w-5 text-primary" aria-hidden /> Ficha Técnica Editorial
            </h2>
            <dl className="divide-y divide-outline/50 text-sm">
              {[
                ['Editora', 'Livrin Quadrinhos Acessíveis'],
                ['Autoria', work.author.name],
                ['Gênero', work.genre.name],
                ['Data da Publicação', work.publishedAt ? formatMonthYear(work.publishedAt) : 'Não publicada'],
                ['Classificação Indicativa', ageRatingLabel(work.ageRating)],
                ['Formatos Compatíveis', [work.file?.type, work.hasAudio ? 'Áudio' : null, descriptions.length ? 'Audiodescrição' : null].filter(Boolean).join(', ') || '—'],
                ['Revisão de Audiodescrição', work.audioReviewer ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-ink-muted">{k}</dt>
                  <dd className="text-right font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <FeedbackSection work={work} />
        </aside>
      </div>

      {/* A nota sobre a divisão de receita fica no rodapé da página, longe da
          leitura: é informação sobre o modelo, não publicidade. */}
      {work.monetization === 'PUBLICIDADE' && <EspacoPublicitario share={work.adRevenueAuthorShare} />}

      {work.monetization === 'PAGA' && user && (
        <AquisicaoDialog work={work} open={comprando} onClose={() => setComprando(false)} />
      )}
    </div>
  );
}
