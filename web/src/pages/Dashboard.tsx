import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Contrast,
  Eye,
  FilePlus2,
  FilePen,
  Globe,
  Info,
  Keyboard,
  PersonStanding,
  Rocket,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  Users,
  Volume2,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useMyDashboard } from '../hooks/queries';
import { errorMessage } from '../lib/api';
import { formatMonthYear, formatNumber } from '../lib/format';
import type { MyWork } from '../types/api';
import { useWorkActions } from '../components/works/workActions';
import { Avatar, ConfirmDialog, Cover, EmptyState, ErrorState, LoadingState, Modal, Stars, StatusBadge } from '../components/ui';

function StatCard({ label, icon, value, suffix, accent }: { label: string; icon: React.ReactNode; value: React.ReactNode; suffix?: React.ReactNode; accent?: boolean }) {
  return (
    <div className="card relative overflow-hidden p-5">
      <span className="pointer-events-none absolute -bottom-10 -right-10 h-28 w-28 rounded-full bg-surface-high" aria-hidden />
      <div className="relative flex items-start justify-between gap-3">
        <p className="font-medium text-ink-muted">{label}</p>
        <span className={`hc-border inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent ${accent ? 'bg-accent-container text-accent' : 'bg-surface-highest text-primary'}`} aria-hidden>
          {icon}
        </span>
      </div>
      <p className="relative mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={`font-display text-4xl font-bold ${accent ? 'text-accent' : 'text-ink'}`}>{value}</span>
        {suffix}
      </p>
    </div>
  );
}

function workAction(work: MyWork, onPublish: (w: MyWork) => void, onStats: (w: MyWork) => void) {
  switch (work.status) {
    case 'PUBLICADO':
      return (
        <>
          <button type="button" className="btn-secondary" onClick={() => onStats(work)}>
            <BarChart3 className="h-4 w-4" aria-hidden /> Estatísticas
          </button>
          <Link to={`/works/${work.id}/edit`} className="btn-secondary">
            <SlidersHorizontal className="h-4 w-4" aria-hidden /> Gerenciar
          </Link>
        </>
      );
    case 'RASCUNHO':
      return (
        <Link to={`/works/${work.id}/edit`} className="btn-tonal">
          <ArrowRight className="h-4 w-4" aria-hidden /> Continuar Envio
        </Link>
      );
    case 'REJEITADO':
      return (
        <Link to={`/works/${work.id}/edit`} className="btn-tonal">
          <FilePen className="h-4 w-4" aria-hidden /> Corrigir e reenviar
        </Link>
      );
    case 'EM_ANALISE':
      return (
        <Link to={`/review/${work.id}`} className="btn-secondary">
          Acompanhar análise <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      );
    case 'APROVADO':
      return (
        <button type="button" className="btn-primary" onClick={() => onPublish(work)}>
          <Upload className="h-4 w-4" aria-hidden /> Lançar Agora
        </button>
      );
    default:
      return <span className="text-sm text-ink-subtle">Arquivada pela curadoria</span>;
  }
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useMyDashboard();
  const { publish } = useWorkActions();
  const [toPublish, setToPublish] = useState<MyWork | null>(null);
  const [stats, setStats] = useState<MyWork | null>(null);

  if (isLoading) return <LoadingState label="Carregando seu painel..." />;
  if (isError || !data) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;

  const { summary, highlight, engagement } = data;
  const editTarget = highlight ?? data.works.find((w) => w.status === 'PUBLICADO') ?? data.works.find((w) => ['RASCUNHO', 'REJEITADO'].includes(w.status));
  const indexValue = data.accessibilityIndex.count ? data.accessibilityIndex.average.toFixed(1) : '—';

  const confirmPublish = () => {
    if (!toPublish) return;
    publish.mutate(toPublish.id, { onSettled: () => setToPublish(null) });
  };

  return (
    <div>
      <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow mb-2 flex items-center gap-2 text-accent">
            <ShieldCheck className="h-4 w-4" aria-hidden /> Painel editorial do autor
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-ink">Olá, {user?.name}</h1>
          <p className="mt-3 text-lg text-ink-muted">
            Acompanhe o impacto social, o ciclo de homologação de acessibilidade WCAG 2.2 e a distribuição das suas histórias em quadrinhos
            inclusivas.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 lg:max-w-[360px] lg:justify-end">
          <button type="button" className="btn-secondary" onClick={() => editTarget && navigate(`/works/${editTarget.id}/edit`)} disabled={!editTarget}>
            <FilePen className="h-4 w-4" aria-hidden /> Editar Metadados
          </button>
          <a href="#metricas" className="btn-secondary">
            <BarChart3 className="h-4 w-4" aria-hidden /> Ver Métricas
          </a>
          <Link to="/submit" className="btn-tonal">
            <FilePlus2 className="h-4 w-4" aria-hidden /> Submeter Nova Obra
          </Link>
        </div>
      </header>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo">
        <StatCard
          label="Obras Ativas"
          icon={<BookOpenCheck className="h-5 w-5" />}
          value={summary.published}
          suffix={summary.readyToLaunch > 0 && <span className="text-sm font-semibold text-accent">+{summary.readyToLaunch} em lançamento</span>}
        />
        <StatCard
          label="Leitores Totais"
          icon={<Users className="h-5 w-5" />}
          value={formatNumber(data.totalReads)}
          suffix={<span className="text-sm text-ink-muted">sessões em {data.worksWithReads} obra(s)</span>}
        />
        <StatCard
          label="Índice de Acessibilidade"
          icon={<PersonStanding className="h-5 w-5" />}
          accent
          value={indexValue}
          suffix={
            <>
              <span className="text-ink-muted">/5</span>
              {data.accessibilityIndex.average >= 4.5 ? (
                <span className="chip bg-accent-container text-accent">AAA Máximo</span>
              ) : (
                <span className="text-xs text-ink-muted">{data.accessibilityIndex.count} avaliações</span>
              )}
            </>
          }
        />
        <StatCard
          label="Pronta para Lançar"
          icon={<Rocket className="h-5 w-5" />}
          value={summary.readyToLaunch}
          suffix={<span className="text-sm text-ink-muted">{summary.readyToLaunch ? 'Aprovação recente' : 'Nenhuma aguardando'}</span>}
        />
      </section>

      {highlight && (
        <section className="card mb-8 overflow-hidden bg-gradient-to-br from-surface to-accent-container/40 p-5 md:p-8" aria-labelledby="highlight-title">
          <div className="grid gap-8 md:grid-cols-[260px_1fr]">
            <div className="relative overflow-hidden rounded-xl bg-surface-high">
              <span className="chip absolute left-3 top-3 z-10 bg-black/75 text-accent">
                <CheckCircle2 className="h-4 w-4" aria-hidden /> WCAG AAA Validado
              </span>
              <Cover url={highlight.coverUrl} title={highlight.title} className="aspect-[3/4] w-full" />
              <p className="bg-black/80 px-3 py-2 font-mono text-xs uppercase tracking-wider text-white">
                {highlight.pages} páginas · {highlight.genre.name}
              </p>
            </div>
            <div>
              <p className="chip mb-4 bg-accent-container py-1.5 text-accent">
                <span className="h-2 w-2 rounded-full bg-current" aria-hidden /> Aprovado pelo comitê editorial e revisores de acessibilidade!
              </p>
              <h2 id="highlight-title" className="text-4xl font-bold text-ink">
                {highlight.title}
              </h2>
              {highlight.subtitle && <p className="mt-1 text-lg text-primary">{highlight.subtitle}</p>}
              <p className="mt-4 leading-relaxed text-ink-muted">
                Parabéns! Sua obra concluiu todas as etapas da esteira editorial: a audiodescrição quadro a quadro foi revisada, a tipografia em
                modo ampliado/disléxico foi validada e a navegação por teclado foi aprovada pelos nossos consultores com deficiência. Sua história
                está pronta para ser disponibilizada ao mundo.
              </p>
              <ul className="mt-5 grid gap-3 sm:grid-cols-3">
                <li className="card-high flex items-center gap-3 p-3">
                  <Volume2 className="h-5 w-5 shrink-0 text-accent" aria-hidden />
                  <span className="text-sm">
                    <span className="block font-semibold text-ink">Audiodescrição</span>
                    <span className="text-accent">{highlight.hasAudioDesc ? '100% Concluída' : 'Não declarada'}</span>
                  </span>
                </li>
                <li className="card-high flex items-center gap-3 p-3">
                  <Contrast className="h-5 w-5 shrink-0 text-accent" aria-hidden />
                  <span className="text-sm">
                    <span className="block font-semibold text-ink">Camadas Contraste</span>
                    <span className="text-accent">{highlight.hasAltoContraste ? '7:1 Aferido' : 'Padrão AA'}</span>
                  </span>
                </li>
                <li className="card-high flex items-center gap-3 p-3">
                  <Keyboard className="h-5 w-5 shrink-0 text-accent" aria-hidden />
                  <span className="text-sm">
                    <span className="block font-semibold text-ink">Navegação Motora</span>
                    <span className="text-accent">Aprovado pelo Comitê</span>
                  </span>
                </li>
              </ul>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button type="button" className="btn-primary px-6 py-3" onClick={() => setToPublish(highlight)}>
                  <Globe className="h-5 w-5" aria-hidden /> Publicar Definitivamente Agora
                </button>
                <Link to={`/reader/${highlight.id}`} className="btn-secondary px-6 py-3">
                  <Eye className="h-5 w-5" aria-hidden /> Prévia no Leitor Web
                </Link>
                <p className="text-sm text-ink-muted">Distribuição gratuita imediata no catálogo Livrin</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="acervo-title">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="acervo-title" className="text-2xl font-semibold text-ink">
                  Acervo & Produções
                </h2>
                <p className="text-sm text-ink-muted">Gerencie versões, status de homologação e relatórios de leitura.</p>
              </div>
              <span className="chip bg-surface-high text-ink-muted">{summary.total} títulos registrados</span>
            </div>
            {data.works.length === 0 ? (
              <EmptyState
                title="Você ainda não submeteu nenhuma obra"
                description="Envie seu manuscrito ou graphic novel para a curadoria de acessibilidade da Livrin."
                action={
                  <Link to="/submit" className="btn-primary">
                    Submeter minha primeira obra
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-4">
                {data.works.map((w) => (
                  <li key={w.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                    <Cover url={w.coverUrl} title={w.title} className="h-24 w-16 shrink-0 rounded-md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-ink">{w.title}</h3>
                        <StatusBadge status={w.status} />
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">
                        {w.genre.name} · {w.pages} páginas
                        {w.publishedAt ? ` · Publicado em ${formatMonthYear(w.publishedAt)}` : ''}
                      </p>
                      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        {w.status === 'PUBLICADO' && (
                          <span className="flex items-center gap-1.5 text-ink">
                            <Eye className="h-4 w-4 text-ink-muted" aria-hidden /> <strong>{formatNumber(w.readsCount)}</strong> leituras
                          </span>
                        )}
                        {w.status !== 'RASCUNHO' && (
                          <span className="flex items-center gap-1.5 text-ink-muted">
                            <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden /> Acessibilidade:{' '}
                            <strong className="text-accent">{w.reviewProgress}%</strong>
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 text-ink-muted">
                          <Volume2 className="h-4 w-4" aria-hidden /> {w.hasAudioDesc ? 'AD Ativa' : 'Audiodescrição pendente'}
                        </span>
                        {!w.hasFile && <span className="text-warn">Arquivo da obra pendente</span>}
                      </p>
                      {w.status === 'REJEITADO' && w.rejectionReason && (
                        <p className="mt-2 rounded-lg bg-danger-container p-2 text-sm text-ink">
                          <strong className="text-danger">Ajustes solicitados:</strong> {w.rejectionReason}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">{workAction(w, setToPublish, setStats)}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="metricas" className="card scroll-mt-24 p-5" aria-labelledby="engagement-title">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 id="engagement-title" className="text-xl font-semibold text-ink">
                Engajamento por Recurso de Acessibilidade
              </h2>
              <span className="text-sm font-semibold text-ink-muted">Últimos 30 dias · {formatNumber(engagement.sessions)} sessões</span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { label: 'Audiodescrição Narrada', item: engagement.audioDesc, color: 'bg-accent', text: 'text-accent' },
                { label: 'Modo Alto Contraste', item: engagement.highContrast, color: 'bg-primary', text: 'text-primary' },
                { label: 'Fonte Dislexia / Zoom', item: engagement.dyslexiaZoom, color: 'bg-primary', text: 'text-primary' },
              ].map(({ label, item, color, text }) => (
                <div key={label} className="card-high p-4">
                  <p className="flex justify-between gap-2 text-sm font-semibold text-ink">
                    {label} <span className={text}>{item.percent}%</span>
                  </p>
                  <div className="my-2 h-2 overflow-hidden rounded-full bg-surface-low" role="progressbar" aria-label={label} aria-valuenow={item.percent} aria-valuemin={0} aria-valuemax={100}>
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${item.percent}%` }} />
                  </div>
                  <p className="text-sm text-ink-muted">{formatNumber(item.count)} sessões ativas</p>
                </div>
              ))}
            </div>
            {engagement.sessions === 0 && <p className="mt-3 text-sm text-ink-subtle">As métricas aparecem quando leitores abrirem suas obras publicadas.</p>}
          </section>
        </div>

        <aside className="space-y-4" aria-labelledby="voices-title">
          <div className="flex items-center justify-between gap-3">
            <h2 id="voices-title" className="text-2xl font-semibold text-ink">
              Voz dos Leitores
            </h2>
            <span className="chip bg-accent-container text-accent">Feedbacks Verificados</span>
          </div>
          <p className="text-sm text-ink-muted">Depoimentos enviados por pessoas que utilizaram as ferramentas acessíveis nas suas obras.</p>
          {data.feedbacks.length === 0 ? (
            <p className="card p-4 text-sm text-ink-muted">Ainda não há avaliações das suas obras.</p>
          ) : (
            data.feedbacks.map((f) => (
              <article key={f.id} className="card p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar name={f.user.name} />
                    <div>
                      <p className="font-semibold text-ink">{f.user.name}</p>
                      {f.user.headline && <p className="text-xs text-ink-subtle">{f.user.headline}</p>}
                    </div>
                  </div>
                  <Stars value={f.rating} size={14} />
                </div>
                <p className="text-sm italic leading-relaxed text-ink-muted">“{f.content}”</p>
                <p className="mt-3 text-xs font-semibold text-ink">
                  {f.aspect ? `${f.aspect} · ` : ''}Sobre: <Link to={`/reader/${f.work.id}`} className="text-primary underline">{f.work.title}</Link>
                </p>
              </article>
            ))
          )}
          <div className="card flex gap-3 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
            <div>
              <p className="font-semibold text-ink">Selo Comunitário Livrin</p>
              <p className="mt-1 text-sm text-ink-muted">
                Ao publicar definitivamente, sua obra recebe a certificação de acessibilidade digital da Livrin e passa a ser indexada no catálogo
                público para pessoas com deficiência.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={!!toPublish}
        title="Publicar obra no catálogo"
        message={
          <>
            <strong className="text-ink">{toPublish?.title}</strong> ficará disponível publicamente no catálogo Livrin, com o selo de acessibilidade.
            Deseja publicar agora?
          </>
        }
        confirmLabel="Publicar agora"
        busy={publish.isPending}
        onConfirm={confirmPublish}
        onClose={() => setToPublish(null)}
      />
      <Modal open={!!stats} title={`Estatísticas — ${stats?.title ?? ''}`} onClose={() => setStats(null)}>
        {stats && (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Sessões de leitura', formatNumber(stats.readsCount)],
              ['Avaliação média', stats.rating.count ? `${stats.rating.average.toFixed(1)} / 5` : '—'],
              ['Avaliações', String(stats.rating.count)],
              ['Publicada em', formatMonthYear(stats.publishedAt)],
              ['Checklist de acessibilidade', `${stats.reviewProgress}%`],
              ['Audiodescrição', stats.hasAudioDesc ? 'Ativa' : 'Não declarada'],
            ].map(([k, v]) => (
              <div key={k} className="card-high p-3">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="mt-1 text-lg font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>
    </div>
  );
}
