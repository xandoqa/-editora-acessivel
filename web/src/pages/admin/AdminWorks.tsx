import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAdminGenres, useAdminWorks } from '../../hooks/adminQueries';
import { useDebounced } from '../../hooks/useDebounced';
import { errorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { FORMAT_SHORT, STATUS_LABEL } from '../../lib/labels';
import type { WorkStatus } from '../../types/api';
import { SearchBox, SortHeader, TableShell, Th, rowClass, theadClass } from '../../components/admin/AdminTable';
import { Cover, ErrorState, LoadingState, PageHeader, Pagination, StatusBadge } from '../../components/ui';

/** Listagem administrativa de obras com busca, filtros, ordenação e paginação no servidor. */
export default function AdminWorks() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const debouncedQ = useDebounced(q);
  const status = params.get('status') ?? '';
  const genreId = params.get('genreId') ?? '';
  const sort = params.get('sort') ?? 'updatedAt';
  const order = (params.get('order') as 'asc' | 'desc') ?? 'desc';
  const page = Number(params.get('page')) || 1;
  // A administração precisa ver também os gêneros desativados, que a rota pública omite.
  const { data: genres = [] } = useAdminGenres();
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminWorks({ q: debouncedQ, status, genreId, sort, order, page, pageSize: 20 });

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };
  const onSort = (field: string) => update({ sort: field, order: sort === field && order === 'desc' ? 'asc' : 'desc' });

  return (
    <div>
      <PageHeader
        eyebrow={<span className="text-admin">Curadoria</span>}
        title="Obras & Curadoria"
        description="Todas as obras cadastradas, em qualquer status. Abra uma obra para avaliar, editar, mudar o status ou gerenciar a audiodescrição."
        actions={
          <Link to="/admin/works/new" className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden /> Nova obra
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="Buscar por título, autor, gênero ou tag" />
        <select className="input w-auto" aria-label="Filtrar por status" value={status} onChange={(e) => update({ status: e.target.value })}>
          <option value="">Todos os status</option>
          {(Object.keys(STATUS_LABEL) as WorkStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select className="input w-auto" aria-label="Filtrar por gênero" value={genreId} onChange={(e) => update({ genreId: e.target.value })}>
          <option value="">Todos os gêneros</option>
          {genres.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
              {g.isActive ? '' : ' (desativado)'}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError || !data ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : (
        <>
          <p className="mb-2 text-sm text-ink-muted" aria-live="polite">
            {data.meta.total} obra(s) encontrada(s){isFetching ? '…' : ''}
          </p>
          <TableShell caption="Obras cadastradas">
            <thead className={theadClass}>
              <tr>
                <SortHeader label="Obra" field="title" sort={sort} order={order} onSort={onSort} />
                <Th>Autor</Th>
                <SortHeader label="Status" field="status" sort={sort} order={order} onSort={onSort} />
                <SortHeader label="Enviada" field="submittedAt" sort={sort} order={order} onSort={onSort} />
                <SortHeader label="Atualizada" field="updatedAt" sort={sort} order={order} onSort={onSort} />
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((w) => (
                <tr key={w.id} className={rowClass}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Cover url={w.coverUrl} title={w.title} className="h-12 w-9 shrink-0 rounded" alt="" />
                      <div>
                        <p className="font-semibold text-ink">{w.title}</p>
                        <p className="text-xs text-ink-subtle">
                          #{w.id} · {FORMAT_SHORT[w.format]} · {w.genre.name} · {w.file?.type ?? 'sem arquivo'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{w.author.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={w.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{formatDate(w.submittedAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{formatDate(w.updatedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/admin/works/${w.id}`} className="btn-secondary min-h-[36px] py-1.5">
                      Gerenciar
                    </Link>
                  </td>
                </tr>
              ))}
              {data.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">
                    Nenhuma obra encontrada com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </TableShell>
          <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={(p) => update({ page: String(p) })} />
        </>
      )}
    </div>
  );
}
