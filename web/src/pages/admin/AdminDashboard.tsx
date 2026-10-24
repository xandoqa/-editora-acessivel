import { Link } from 'react-router-dom';
import { ArrowRight, BookCopy, Clock, Eye, MessageSquareQuote, Tags, Users } from 'lucide-react';
import { useAdminStats } from '../../hooks/adminQueries';
import { errorMessage } from '../../lib/api';
import { formatDate, formatNumber } from '../../lib/format';
import { FORMAT_LABEL, ROLE_LABEL, STATUS_LABEL } from '../../lib/labels';
import type { WorkFormat, WorkStatus } from '../../types/api';
import { Badge, ErrorState, LoadingState, PageHeader, StatusBadge } from '../../components/ui';

function Kpi({ icon, label, value, detail, to }: { icon: React.ReactNode; label: string; value: React.ReactNode; detail?: React.ReactNode; to?: string }) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        <span className="text-admin" aria-hidden>
          {icon}
        </span>
      </div>
      <p className="mt-2 font-display text-4xl font-bold text-ink">{value}</p>
      {detail && <p className="mt-1 text-sm text-ink-muted">{detail}</p>}
    </>
  );
  return to ? (
    <Link to={to} className="card block p-5 hover:bg-surface-high">
      {body}
    </Link>
  ) : (
    <div className="card p-5">{body}</div>
  );
}

const STATUS_ORDER: WorkStatus[] = ['EM_ANALISE', 'APROVADO', 'RASCUNHO', 'REJEITADO', 'ARQUIVADO'];

/** Dashboard administrativo: todos os números vêm de agregações SQL reais (GET /api/admin/stats). */
export default function AdminDashboard() {
  const { data, isLoading, isError, error, refetch } = useAdminStats();
  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;
  const maxStatus = Math.max(1, ...Object.values(data.works.byStatus));

  return (
    <div>
      <PageHeader eyebrow={<span className="text-admin">Acesso restrito</span>} title="Painel de Administração Livrin" description="Visão geral do acervo, da fila de curadoria e da comunidade de leitores." />

      <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores">
        <Kpi icon={<Users className="h-5 w-5" />} label="Usuários" value={formatNumber(data.users.total)} detail={`${data.users.active} ativos · ${data.users.admins} admins · +${data.users.newLast30} em 30 dias`} to="/admin/users" />
        <Kpi icon={<BookCopy className="h-5 w-5" />} label="Obras no catálogo" value={formatNumber(data.works.byStatus.APROVADO)} detail={`${data.works.total} obras cadastradas no total`} to="/admin/works?status=APROVADO" />
        <Kpi icon={<Clock className="h-5 w-5" />} label="Fila de curadoria" value={formatNumber(data.works.byStatus.EM_ANALISE)} detail={`${data.works.byStatus.REJEITADO} com ajustes solicitados`} to="/admin/works?status=EM_ANALISE" />
        <Kpi icon={<Eye className="h-5 w-5" />} label="Sessões de leitura (30 dias)" value={formatNumber(data.sessions.last30)} detail={`${formatNumber(data.sessions.total)} no total · ${formatNumber(data.sessions.audioDesc)} com audiodescrição`} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="card p-5" aria-labelledby="queue-title">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="queue-title" className="text-xl font-semibold text-ink">
              Fila de curadoria (mais antigas primeiro)
            </h2>
            <Link to="/admin/works?status=EM_ANALISE" className="text-sm font-semibold text-primary hover:underline">
              Ver todas
            </Link>
          </div>
          {data.pendingQueue.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhuma obra aguardando análise. 🎉</p>
          ) : (
            <ul className="divide-y divide-outline/40">
              {data.pendingQueue.map((w) => (
                <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold text-ink">{w.title}</p>
                    <p className="text-sm text-ink-muted">
                      {w.author.name} · {w.genre.name} · enviada em {formatDate(w.submittedAt)}
                    </p>
                  </div>
                  <Link to={`/admin/works/${w.id}`} className="btn-secondary">
                    Avaliar <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5" aria-labelledby="status-title">
          <h2 id="status-title" className="mb-4 text-xl font-semibold text-ink">
            Obras por status
          </h2>
          <ul className="space-y-3">
            {STATUS_ORDER.map((s) => (
              <li key={s}>
                <Link to={`/admin/works?status=${s}`} className="block rounded-lg p-1 hover:bg-surface-high">
                  <div className="flex items-center justify-between text-sm">
                    <StatusBadge status={s} />
                    <span className="font-semibold text-ink">{data.works.byStatus[s]}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-high" aria-hidden>
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(data.works.byStatus[s] / maxStatus) * 100}%` }} />
                  </div>
                  <span className="sr-only">{STATUS_LABEL[s]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card p-5" aria-labelledby="users-title">
          <h2 id="users-title" className="mb-3 text-lg font-semibold text-ink">
            Cadastros recentes
          </h2>
          <ul className="space-y-2 text-sm">
            {data.recentUsers.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2">
                <Link to={`/admin/users?q=${encodeURIComponent(u.email)}`} className="truncate text-ink hover:underline">
                  {u.name}
                </Link>
                <span className="flex shrink-0 items-center gap-2 text-ink-subtle">
                  <Badge tone={u.role === 'ADMIN' ? 'admin' : u.role === 'ESCRITOR' ? 'accent' : 'muted'}>{ROLE_LABEL[u.role]}</Badge>
                  {formatDate(u.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-5" aria-labelledby="formats-title">
          <h2 id="formats-title" className="mb-3 text-lg font-semibold text-ink">
            Acervo por formato
          </h2>
          <ul className="space-y-2 text-sm">
            {(Object.keys(FORMAT_LABEL) as WorkFormat[]).map((f) => (
              <li key={f} className="flex justify-between">
                <span className="text-ink-muted">{FORMAT_LABEL[f]}</span>
                <span className="font-semibold text-ink">{data.works.byFormat[f] ?? 0}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-5" aria-labelledby="community-title">
          <h2 id="community-title" className="mb-3 text-lg font-semibold text-ink">
            Comunidade
          </h2>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <Link to="/admin/feedbacks" className="flex items-center gap-2 text-ink-muted hover:underline">
                <MessageSquareQuote className="h-4 w-4" aria-hidden /> Avaliações
              </Link>
              <span className="font-semibold text-ink">
                {data.feedbacks.total} (média {data.feedbacks.average.toFixed(1)})
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-ink-muted">Avaliações ocultas</span>
              <span className="font-semibold text-ink">{data.feedbacks.hidden}</span>
            </li>
            <li className="flex justify-between">
              <Link to="/admin/genres" className="flex items-center gap-2 text-ink-muted hover:underline">
                <Tags className="h-4 w-4" aria-hidden /> Gêneros ativos
              </Link>
              <span className="font-semibold text-ink">
                {data.genres.active} de {data.genres.total}
              </span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
