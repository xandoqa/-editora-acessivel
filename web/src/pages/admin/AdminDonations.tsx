import { Link, useSearchParams } from 'react-router-dom';
import { HandHeart, Info } from 'lucide-react';
import { useAdminDonationStats, useAdminDonations } from '../../hooks/adminQueries';
import { errorMessage } from '../../lib/api';
import { formatCents, formatDateTime, formatNumber } from '../../lib/format';
import type { DonationStatus, PaymentMethod } from '../../types/api';
import { TableShell, Th, rowClass, theadClass } from '../../components/admin/AdminTable';
import { Badge, ErrorState, LoadingState, PageHeader, Pagination } from '../../components/ui';

/** Acompanhamento do apoio voluntário (seções 17 a 20 da especificação). */

const METODO_LABEL: Record<PaymentMethod, string> = { PIX: 'Pix', CARTAO: 'Cartão', BOLETO: 'Boleto' };

const STATUS_LABEL: Record<DonationStatus, string> = {
  PENDENTE: 'Aguardando pagamento',
  CONFIRMADA: 'Confirmada',
  FALHOU: 'Falhou',
  CANCELADA: 'Cancelada',
};

const STATUS_TONE: Record<DonationStatus, 'accent' | 'warn' | 'danger' | 'muted'> = {
  PENDENTE: 'warn',
  CONFIRMADA: 'accent',
  FALHOU: 'danger',
  CANCELADA: 'muted',
};

export default function AdminDonations() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const method = params.get('method') ?? '';
  const page = Number(params.get('page')) || 1;

  const { data: stats } = useAdminDonationStats();
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminDonations({ status, method, page, pageSize: 20 });

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  return (
    <div>
      <PageHeader
        eyebrow={<span className="text-admin">Sustentação</span>}
        icon={<HandHeart className="h-4 w-4" aria-hidden />}
        title="Apoios recebidos"
        description="O apoio é voluntário e nunca condiciona a leitura. Aqui ficam os registros das cobranças abertas e confirmadas."
      />

      {stats && !stats.isReal && (
        <p className="mb-6 flex items-start gap-3 rounded-xl border border-warn/50 bg-warn-container p-4 text-sm text-ink" role="note">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden />
          <span>
            Provedor de pagamento <strong>{stats.provider}</strong>: nenhuma cobrança real é feita nesta instalação. Os valores abaixo existem
            apenas para demonstrar o fluxo.
          </span>
        </p>
      )}

      {stats && (
        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores de apoio">
          <div className="card p-5">
            <p className="text-sm font-medium text-ink-muted">Total arrecadado</p>
            <p className="mt-2 font-display text-3xl sm:text-4xl font-bold text-ink">{formatCents(stats.centavosConfirmados)}</p>
            <p className="mt-1 text-sm text-ink-muted">somente apoios confirmados</p>
          </div>
          <div className="card p-5">
            <p className="text-sm font-medium text-ink-muted">Apoios confirmados</p>
            <p className="mt-2 font-display text-3xl sm:text-4xl font-bold text-ink">{formatNumber(stats.confirmadas)}</p>
            <p className="mt-1 text-sm text-ink-muted">de {formatNumber(stats.total)} abertos</p>
          </div>
          <div className="card p-5">
            <p className="text-sm font-medium text-ink-muted">Pessoas apoiadoras</p>
            <p className="mt-2 font-display text-3xl sm:text-4xl font-bold text-ink">{formatNumber(stats.apoiadores)}</p>
            <p className="mt-1 text-sm text-ink-muted">contas identificadas</p>
          </div>
          <div className="card p-5">
            <p className="text-sm font-medium text-ink-muted">Ticket médio</p>
            <p className="mt-2 font-display text-3xl sm:text-4xl font-bold text-ink">
              {stats.confirmadas ? formatCents(Math.round(stats.centavosConfirmados / stats.confirmadas)) : '—'}
            </p>
            <p className="mt-1 text-sm text-ink-muted">por apoio confirmado</p>
          </div>
        </section>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <select className="input w-auto" aria-label="Filtrar por situação" value={status} onChange={(e) => update({ status: e.target.value })}>
          <option value="">Todas as situações</option>
          {(Object.keys(STATUS_LABEL) as DonationStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select className="input w-auto" aria-label="Filtrar por forma de pagamento" value={method} onChange={(e) => update({ method: e.target.value })}>
          <option value="">Todas as formas</option>
          {(Object.keys(METODO_LABEL) as PaymentMethod[]).map((m) => (
            <option key={m} value={m}>
              {METODO_LABEL[m]}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError || !data ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : data.data.length === 0 ? (
        <p className="card p-6 text-center text-ink-muted">Nenhum apoio registrado com esses filtros.</p>
      ) : (
        <>
          <p className="mb-2 text-sm text-ink-muted" aria-live="polite">
            {data.meta.total} apoio(s){isFetching ? '…' : ''}
          </p>
          <TableShell caption="Apoios recebidos">
            <thead className={theadClass}>
              <tr>
                <Th>Valor</Th>
                <Th>Quem apoiou</Th>
                <Th>Obra</Th>
                <Th>Forma</Th>
                <Th>Situação</Th>
                <Th>Aberto em</Th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((d) => (
                <tr key={d.id} className={rowClass}>
                  <td className="whitespace-nowrap px-4 py-3 font-display font-bold text-ink">{formatCents(d.amountCents)}</td>
                  <td className="px-4 py-3">
                    <p className="text-ink">{d.user?.name ?? d.donorName ?? 'Anônimo'}</p>
                    {d.user && <p className="text-xs text-ink-subtle">{d.user.email}</p>}
                    {d.message && <p className="mt-1 max-w-xs text-xs italic text-ink-muted">“{d.message}”</p>}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {d.work ? (
                      <Link to={`/admin/works/${d.work.id}`} className="font-semibold text-primary hover:underline">
                        {d.work.title}
                      </Link>
                    ) : (
                      'Projeto Livrin'
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{METODO_LABEL[d.method]}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{formatDateTime(d.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={(p) => update({ page: String(p) })} />
        </>
      )}
    </div>
  );
}
