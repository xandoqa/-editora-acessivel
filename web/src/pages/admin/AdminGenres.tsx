import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Plus, Power, Trash2, X } from 'lucide-react';
import { useAdminGenres } from '../../hooks/adminQueries';
import { api, errorMessage } from '../../lib/api';
import type { Genre } from '../../types/api';
import { TableShell, Th, rowClass, theadClass } from '../../components/admin/AdminTable';
import { Badge, ConfirmDialog, ErrorState, LoadingState, PageHeader } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';

/** Gêneros literários disponíveis no formulário de submissão. Gêneros em uso só podem ser desativados. */
export default function AdminGenres() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data = [], isLoading, isError, error, refetch } = useAdminGenres();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [toDelete, setToDelete] = useState<Genre | null>(null);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'genres'] });
    void qc.invalidateQueries({ queryKey: ['genres'] });
  };
  const onError = (e: unknown) => toast.error(errorMessage(e));

  const create = useMutation({
    mutationFn: () => api.post('/admin/genres', { name }),
    onSuccess: () => {
      setName('');
      toast.success('Gênero criado.');
      refresh();
    },
    onError,
  });
  const update = useMutation({
    mutationFn: (p: { id: number; name?: string; isActive?: boolean }) => api.patch(`/admin/genres/${p.id}`, { name: p.name, isActive: p.isActive }),
    onSuccess: () => {
      setEditing(null);
      toast.success('Gênero atualizado.');
      refresh();
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/genres/${id}`),
    onSuccess: () => {
      setToDelete(null);
      toast.success('Gênero excluído.');
      refresh();
    },
    onError: (e) => {
      setToDelete(null);
      onError(e);
    },
  });

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={<span className="text-admin">Catálogo</span>} title="Gêneros literários" description="Categorias oferecidas aos autores na submissão e usadas nos filtros do catálogo." />
      <form onSubmit={onCreate} className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="genre-name" className="label">
            Novo gênero
          </label>
          <input id="genre-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Ex.: Suspense" />
        </div>
        <button type="submit" className="btn-primary" disabled={name.trim().length < 2 || create.isPending}>
          <Plus className="h-4 w-4" aria-hidden /> Adicionar
        </button>
      </form>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : (
        <TableShell caption="Gêneros literários">
          <thead className={theadClass}>
            <tr>
              <Th>Nome</Th>
              <Th>Obras</Th>
              <Th>Situação</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((g) => (
              <tr key={g.id} className={rowClass}>
                <td className="px-4 py-3">
                  {editing?.id === g.id ? (
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        update.mutate({ id: g.id, name: editing.name });
                      }}
                    >
                      <label htmlFor={`edit-${g.id}`} className="sr-only">
                        Nome do gênero
                      </label>
                      <input id={`edit-${g.id}`} className="input py-1.5" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
                      <button type="submit" className="icon-btn text-accent" aria-label="Salvar nome">
                        <Check className="h-4 w-4" aria-hidden />
                      </button>
                      <button type="button" className="icon-btn" aria-label="Cancelar edição" onClick={() => setEditing(null)}>
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </form>
                  ) : (
                    <span className="font-semibold text-ink">{g.name}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-muted">{g.worksCount}</td>
                <td className="px-4 py-3">{g.isActive ? <Badge tone="accent">Ativo</Badge> : <Badge>Inativo</Badge>}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button type="button" className="icon-btn" aria-label={`Renomear ${g.name}`} onClick={() => setEditing({ id: g.id, name: g.name })}>
                      <Pencil className="h-4 w-4" aria-hidden />
                    </button>
                    <button type="button" className="icon-btn" aria-label={g.isActive ? `Desativar ${g.name}` : `Ativar ${g.name}`} onClick={() => update.mutate({ id: g.id, isActive: !g.isActive })}>
                      <Power className={`h-4 w-4 ${g.isActive ? '' : 'text-accent'}`} aria-hidden />
                    </button>
                    <button type="button" className="icon-btn hover:text-danger" aria-label={`Excluir ${g.name}`} onClick={() => setToDelete(g)} disabled={g.worksCount > 0} title={g.worksCount > 0 ? 'Em uso: desative em vez de excluir' : undefined}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Excluir gênero"
        message={`O gênero “${toDelete?.name}” será excluído.`}
        confirmLabel="Excluir"
        busy={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
