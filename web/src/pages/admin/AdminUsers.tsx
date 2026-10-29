import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Pencil, Plus, Power, Trash2, UserSearch } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useAdminUser, useAdminUsers } from '../../hooks/adminQueries';
import { useDebounced } from '../../hooks/useDebounced';
import { api, errorMessage, fieldErrors } from '../../lib/api';
import { formatDate, formatDateTime } from '../../lib/format';
import { ROLE_DESCRIPTION, ROLE_LABEL } from '../../lib/labels';
import type { AdminUser, Role, UserPlan } from '../../types/api';
import { SearchBox, SortHeader, TableShell, Th, rowClass, theadClass } from '../../components/admin/AdminTable';
import { Badge, ConfirmDialog, ErrorState, LoadingState, Modal, PageHeader, Pagination, SelectInput, StatusBadge, TextInput } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';

interface UserDraft {
  id?: number;
  name: string;
  email: string;
  role: Role;
  plan: UserPlan;
  headline: string;
  isActive: boolean;
  password: string;
}

function UserDetailModal({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { data } = useAdminUser(id ?? undefined);
  return (
    <Modal open={!!id} title={data ? data.name : 'Usuário'} onClose={onClose} wide>
      {!data ? (
        <LoadingState />
      ) : (
        <div className="space-y-4 text-sm">
          <dl className="grid gap-3 sm:grid-cols-3">
            {[
              ['E-mail', data.email],
              ['Papel', ROLE_LABEL[data.role]],
              ['Situação', data.isActive ? 'Ativo' : 'Desativado'],
              ['Cadastro', formatDate(data.createdAt)],
              ['Último acesso', formatDateTime(data.lastLoginAt)],
              ['Apresentação', data.headline ?? '—'],
              ['Avaliações feitas', String(data.activity.feedbacks)],
              ['Sessões de leitura', String(data.activity.sessions)],
              ['Notas/mensagens', String(data.activity.notes)],
            ].map(([k, v]) => (
              <div key={k} className="card-high p-3">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="mt-1 break-words font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <div>
            <h3 className="mb-2 font-semibold text-ink">Obras ({data.worksCount})</h3>
            {data.works.length === 0 ? (
              <p className="text-ink-muted">Nenhuma obra cadastrada.</p>
            ) : (
              <ul className="divide-y divide-outline/40">
                {data.works.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-2 py-2">
                    <Link to={`/admin/works/${w.id}`} className="text-primary hover:underline">
                      {w.title}
                    </Link>
                    <StatusBadge status={w.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Gestão de usuários: criar, editar, (des)ativar, redefinir senha e excluir — com regras de proteção na API. */
export default function AdminUsers() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const debouncedQ = useDebounced(q);
  const role = params.get('role') ?? '';
  const active = params.get('active') ?? '';
  const sort = params.get('sort') ?? 'createdAt';
  const order = (params.get('order') as 'asc' | 'desc') ?? 'desc';
  const page = Number(params.get('page')) || 1;
  const { data, isLoading, isError, error, refetch } = useAdminUsers({ q: debouncedQ, role, active, sort, order, page, pageSize: 20 });

  const [draft, setDraft] = useState<UserDraft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetFor, setResetFor] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [toDelete, setToDelete] = useState<AdminUser | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };
  const onSort = (field: string) => update({ sort: field, order: sort === field && order === 'desc' ? 'asc' : 'desc' });
  const refresh = () => void qc.invalidateQueries({ queryKey: ['admin'] });
  const onError = (e: unknown) => toast.error(errorMessage(e));

  const save = useMutation({
    mutationFn: async (d: UserDraft) => {
      const body = { name: d.name, email: d.email, role: d.role, plan: d.plan, headline: d.headline, isActive: d.isActive };
      return d.id ? api.patch(`/admin/users/${d.id}`, body) : api.post('/admin/users', { ...body, password: d.password });
    },
    onSuccess: () => {
      toast.success('Usuário salvo.');
      setDraft(null);
      setErrors({});
      refresh();
    },
    onError: (e) => {
      setErrors(fieldErrors(e));
      onError(e);
    },
  });
  const toggleActive = useMutation({
    mutationFn: (u: AdminUser) => api.patch(`/admin/users/${u.id}`, { isActive: !u.isActive }),
    onSuccess: () => {
      toast.success('Situação da conta atualizada.');
      refresh();
    },
    onError,
  });
  const resetPassword = useMutation({
    mutationFn: () => api.post(`/admin/users/${resetFor?.id}/reset-password`, { password: newPassword }),
    onSuccess: () => {
      toast.success('Senha redefinida. Informe a nova senha ao usuário por um canal seguro.');
      setResetFor(null);
      setNewPassword('');
      setErrors({});
    },
    onError: (e) => {
      setErrors(fieldErrors(e));
      onError(e);
    },
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      toast.success('Usuário excluído.');
      setToDelete(null);
      refresh();
    },
    onError: (e) => {
      setToDelete(null);
      onError(e);
    },
  });

  const submitDraft = (e: FormEvent) => {
    e.preventDefault();
    if (draft) save.mutate(draft);
  };

  return (
    <div>
      <PageHeader
        eyebrow={<span className="text-admin">Contas</span>}
        title="Usuários"
        description="Autores, leitores e administradores. Contas com obras não podem ser excluídas: desative-as para bloquear o acesso."
        actions={
          <button type="button" className="btn-primary" onClick={() => setDraft({ name: '', email: '', role: 'LEITOR', plan: 'GRATUITO', headline: '', isActive: true, password: '' })}>
            <Plus className="h-4 w-4" aria-hidden /> Novo usuário
          </button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="Buscar por nome ou e-mail" />
        <select className="input w-auto" aria-label="Filtrar por papel" value={role} onChange={(e) => update({ role: e.target.value })}>
          <option value="">Todos os papéis</option>
          <option value="LEITOR">Leitores</option>
          <option value="ESCRITOR">Escritores</option>
          <option value="ADMIN">Administradores</option>
        </select>
        <select className="input w-auto" aria-label="Filtrar por situação" value={active} onChange={(e) => update({ active: e.target.value })}>
          <option value="">Ativos e desativados</option>
          <option value="true">Somente ativos</option>
          <option value="false">Somente desativados</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError || !data ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : (
        <>
          <p className="mb-2 text-sm text-ink-muted">{data.meta.total} usuário(s)</p>
          <TableShell caption="Usuários cadastrados">
            <thead className={theadClass}>
              <tr>
                <SortHeader label="Nome" field="name" sort={sort} order={order} onSort={onSort} />
                <SortHeader label="E-mail" field="email" sort={sort} order={order} onSort={onSort} />
                <Th>Papel</Th>
                <Th>Obras</Th>
                <SortHeader label="Último acesso" field="lastLoginAt" sort={sort} order={order} onSort={onSort} />
                <SortHeader label="Cadastro" field="createdAt" sort={sort} order={order} onSort={onSort} />
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((u) => (
                <tr key={u.id} className={`${rowClass} ${u.isActive ? '' : 'opacity-60'}`}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{u.name}</p>
                    {!u.isActive && <Badge tone="danger">Desativado</Badge>}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={u.role === 'ADMIN' ? 'admin' : u.role === 'ESCRITOR' ? 'accent' : 'muted'}>{ROLE_LABEL[u.role]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{u.worksCount}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{formatDate(u.lastLoginAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" className="icon-btn" aria-label={`Detalhes de ${u.name}`} onClick={() => setDetailId(u.id)}>
                        <UserSearch className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Editar ${u.name}`}
                        onClick={() => setDraft({ id: u.id, name: u.name, email: u.email, role: u.role, plan: u.plan, headline: u.headline ?? '', isActive: u.isActive, password: '' })}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </button>
                      <button type="button" className="icon-btn" aria-label={`Redefinir senha de ${u.name}`} onClick={() => setResetFor(u)}>
                        <KeyRound className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={u.isActive ? `Desativar ${u.name}` : `Reativar ${u.name}`}
                        onClick={() => toggleActive.mutate(u)}
                        disabled={u.id === me?.id}
                      >
                        <Power className={`h-4 w-4 ${u.isActive ? '' : 'text-accent'}`} aria-hidden />
                      </button>
                      <button type="button" className="icon-btn hover:text-danger" aria-label={`Excluir ${u.name}`} onClick={() => setToDelete(u)} disabled={u.id === me?.id}>
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.data.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-ink-muted">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </TableShell>
          <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={(p) => update({ page: String(p) })} />
        </>
      )}

      <Modal
        open={!!draft}
        title={draft?.id ? 'Editar usuário' : 'Novo usuário'}
        onClose={() => {
          setDraft(null);
          setErrors({});
        }}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setDraft(null)}>
              Cancelar
            </button>
            <button type="submit" form="user-form" className="btn-primary" disabled={save.isPending}>
              Salvar
            </button>
          </>
        }
      >
        {draft && (
          <form id="user-form" onSubmit={submitDraft} className="space-y-4">
            <TextInput label="Nome" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} error={errors.name} maxLength={120} />
            <TextInput label="E-mail" type="email" required value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} error={errors.email} />
            {!draft.id && (
              <TextInput
                label="Senha inicial"
                type="password"
                required
                autoComplete="new-password"
                value={draft.password}
                onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                error={errors.password}
                hint="Mínimo de 8 caracteres, com letras e números."
              />
            )}
            <SelectInput label="Papel" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as Role })} disabled={draft.id === me?.id} hint={draft.id === me?.id ? 'Você não pode alterar o próprio papel.' : ROLE_DESCRIPTION[draft.role]}>
              <option value="LEITOR">Leitor</option>
              <option value="ESCRITOR">Escritor</option>
              <option value="ADMIN">Administrador</option>
            </SelectInput>
            <SelectInput
              label="Plano"
              value={draft.plan}
              onChange={(e) => setDraft({ ...draft, plan: e.target.value as UserPlan })}
              hint="Assinatura simulada: o premium apenas esconde os anúncios nas obras monetizadas por publicidade. Não libera obra paga."
            >
              <option value="GRATUITO">Gratuito</option>
              <option value="PREMIUM">Premium</option>
            </SelectInput>
            <TextInput label="Apresentação" value={draft.headline} onChange={(e) => setDraft({ ...draft, headline: e.target.value })} maxLength={160} />
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={draft.isActive} disabled={draft.id === me?.id} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
              Conta ativa
            </label>
          </form>
        )}
      </Modal>

      <Modal
        open={!!resetFor}
        title={`Redefinir senha de ${resetFor?.name ?? ''}`}
        onClose={() => setResetFor(null)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setResetFor(null)}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={() => resetPassword.mutate()} disabled={resetPassword.isPending || newPassword.length < 8}>
              Redefinir senha
            </button>
          </>
        }
      >
        <TextInput
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          error={errors.password}
          hint="Mínimo de 8 caracteres, com letras e números. Oriente o usuário a trocá-la em “Meu perfil”."
        />
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Excluir usuário"
        message={`A conta de ${toDelete?.name} será excluída definitivamente, com suas avaliações e mensagens. Contas com obras não podem ser excluídas.`}
        confirmLabel="Excluir"
        busy={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
      <UserDetailModal id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
