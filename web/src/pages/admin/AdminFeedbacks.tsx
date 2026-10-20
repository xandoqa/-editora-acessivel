import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { useAdminFeedbacks } from '../../hooks/adminQueries';
import { useDebounced } from '../../hooks/useDebounced';
import { api, errorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';
import type { Feedback } from '../../types/api';
import { SearchBox } from '../../components/admin/AdminTable';
import { Badge, ConfirmDialog, ErrorState, LoadingState, PageHeader, Pagination, Stars } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';

/** Moderação das avaliações dos leitores: ocultar/exibir (reversível) ou excluir. */
export default function AdminFeedbacks() {
  const qc = useQueryClient();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const debouncedQ = useDebounced(q);
  const visible = params.get('visible') ?? '';
  const rating = params.get('rating') ?? '';
  const order = params.get('order') ?? 'desc';
  const page = Number(params.get('page')) || 1;
  const { data, isLoading, isError, error, refetch } = useAdminFeedbacks({ q: debouncedQ, visible, rating, order, page, pageSize: 20 });
  const [toDelete, setToDelete] = useState<Feedback | null>(null);

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin'] });
    void qc.invalidateQueries({ queryKey: ['feedbacks'] });
  };

  const toggle = useMutation({
    mutationFn: (f: Feedback) => api.patch(`/admin/feedbacks/${f.id}`, { isVisible: !f.isVisible }),
    onSuccess: () => {
      toast.success('Visibilidade atualizada.');
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/feedbacks/${id}`),
    onSuccess: () => {
      toast.success('Avaliação excluída.');
      setToDelete(null);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div>
      <PageHeader eyebrow={<span className="text-admin">Comunidade</span>} title="Avaliações dos leitores" description="Avaliações ocultas deixam de aparecer na obra e no painel do autor, mas podem ser reexibidas." />
      <div className="mb-4 flex flex-wrap gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="Buscar por texto, leitor ou obra" />
        <select className="input w-auto" aria-label="Filtrar por visibilidade" value={visible} onChange={(e) => update({ visible: e.target.value })}>
          <option value="">Todas</option>
          <option value="true">Visíveis</option>
          <option value="false">Ocultas</option>
        </select>
        <select className="input w-auto" aria-label="Filtrar por nota" value={rating} onChange={(e) => update({ rating: e.target.value })}>
          <option value="">Todas as notas</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} estrela(s)
            </option>
          ))}
        </select>
        <select className="input w-auto" aria-label="Ordenação" value={order} onChange={(e) => update({ order: e.target.value })}>
          <option value="desc">Mais recentes</option>
          <option value="asc">Mais antigas</option>
        </select>
      </div>
      {isLoading ? (
        <LoadingState />
      ) : isError || !data ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : data.data.length === 0 ? (
        <p className="card p-6 text-center text-ink-muted">Nenhuma avaliação encontrada.</p>
      ) : (
        <>
          <ul className="space-y-3">
            {data.data.map((f) => (
              <li key={f.id} className={`card p-4 ${f.isVisible ? '' : 'opacity-70'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm">
                      <strong className="text-ink">{f.user.name}</strong>{' '}
                      <span className="text-ink-subtle">sobre</span>{' '}
                      <Link to={`/admin/works/${f.work.id}`} className="font-semibold text-primary hover:underline">
                        {f.work.title}
                      </Link>
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-ink-subtle">
                      <Stars value={f.rating} size={13} /> {formatDate(f.createdAt)} {f.aspect && `· ${f.aspect}`}
                      {!f.isVisible && <Badge tone="danger">Oculta</Badge>}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" className="btn-secondary min-h-[36px] py-1.5" onClick={() => toggle.mutate(f)}>
                      {f.isVisible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                      {f.isVisible ? 'Ocultar' : 'Exibir'}
                    </button>
                    <button type="button" className="icon-btn hover:text-danger" aria-label="Excluir avaliação" onClick={() => setToDelete(f)}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-ink-muted">“{f.content}”</p>
              </li>
            ))}
          </ul>
          <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={(p) => update({ page: String(p) })} />
        </>
      )}
      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Excluir avaliação"
        message="A avaliação será removida definitivamente. Para apenas escondê-la, use “Ocultar”."
        confirmLabel="Excluir"
        busy={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
