import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Eye, Gavel, MessageSquarePlus, Plus, Save, Trash2 } from 'lucide-react';
import { useAdminWork } from '../../hooks/adminQueries';
import { api, errorMessage, fieldErrors } from '../../lib/api';
import { formatDateTime, formatRelative } from '../../lib/format';
import { CHECK_LABEL, STATUS_LABEL } from '../../lib/labels';
import type { AdminUser, AdminWorkDetail, CheckStatus, Paginated, Work, WorkStatus } from '../../types/api';
import WorkForm from '../../components/works/WorkForm';
import AudioDescriptionEditor from '../../components/works/AudioDescriptionEditor';
import { Avatar, ConfirmDialog, ErrorState, LoadingState, Modal, PageHeader, SelectInput, StatusBadge, TextArea, TextInput } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';

/** Espelho das transições permitidas pela API (api/src/services/work-policy.ts). A API é quem valida. */
const TRANSITIONS: Record<WorkStatus, { to: WorkStatus; label: string; tone: string }[]> = {
  RASCUNHO: [
    { to: 'EM_ANALISE', label: 'Enviar para análise', tone: 'btn-tonal' },
    { to: 'ARQUIVADO', label: 'Arquivar', tone: 'btn-secondary' },
  ],
  EM_ANALISE: [
    { to: 'APROVADO', label: 'Aprovar e publicar', tone: 'btn-primary' },
    { to: 'REJEITADO', label: 'Solicitar ajustes / Rejeitar', tone: 'btn-danger' },
    { to: 'RASCUNHO', label: 'Devolver como rascunho', tone: 'btn-secondary' },
  ],
  APROVADO: [
    { to: 'ARQUIVADO', label: 'Despublicar (arquivar)', tone: 'btn-danger' },
    { to: 'EM_ANALISE', label: 'Reabrir análise', tone: 'btn-secondary' },
    { to: 'REJEITADO', label: 'Rejeitar', tone: 'btn-danger' },
  ],
  REJEITADO: [
    { to: 'EM_ANALISE', label: 'Reabrir análise', tone: 'btn-tonal' },
    { to: 'ARQUIVADO', label: 'Arquivar', tone: 'btn-secondary' },
  ],
  ARQUIVADO: [
    { to: 'APROVADO', label: 'Republicar no catálogo', tone: 'btn-primary' },
    { to: 'RASCUNHO', label: 'Reabrir como rascunho', tone: 'btn-secondary' },
  ],
};

function useAuthorOptions() {
  return useQuery({
    queryKey: ['admin', 'author-options'],
    queryFn: async () => (await api.get<Paginated<AdminUser>>('/admin/users', { params: { pageSize: 100, sort: 'name', order: 'asc' } })).data.data,
  });
}

/* --------------------------------- Criação --------------------------------- */

export function AdminWorkCreate() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: authors = [] } = useAuthorOptions();
  const [authorId, setAuthorId] = useState('');
  const [status, setStatus] = useState<WorkStatus>('EM_ANALISE');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const onSubmit = async (fd: FormData) => {
    fd.append('authorId', authorId);
    fd.append('status', status);
    setBusy(true);
    try {
      const { data } = await api.post<Work>('/admin/works', fd);
      toast.success('Obra criada.');
      void qc.invalidateQueries({ queryKey: ['admin'] });
      navigate(`/admin/works/${data.id}`);
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/admin/works" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Obras
      </Link>
      <PageHeader eyebrow={<span className="text-admin">Nova obra</span>} title="Cadastrar obra" description="Cadastre uma obra em nome de um autor (ex.: acervo recebido por outros canais)." />
      <WorkForm
        errors={errors}
        busy={busy}
        onSubmit={(fd) => void onSubmit(fd)}
        showProcess={false}
        actions={[{ action: 'save', label: 'Cadastrar obra', variant: 'primary', icon: <Save className="h-5 w-5" aria-hidden /> }]}
        extraSlot={
          <div className="card grid gap-4 p-5 md:grid-cols-2">
            <SelectInput label="Autor" required value={authorId} onChange={(e) => setAuthorId(e.target.value)} error={errors.authorId}>
              <option value="" disabled>
                Selecione o autor...
              </option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.email})
                </option>
              ))}
            </SelectInput>
            <SelectInput label="Status inicial" value={status} onChange={(e) => setStatus(e.target.value as WorkStatus)} hint="“No catálogo” exige o arquivo da obra.">
              {(['RASCUNHO', 'EM_ANALISE', 'APROVADO'] as WorkStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </SelectInput>
          </div>
        }
      />
    </div>
  );
}

/* ------------------------------ Detalhe/edição ----------------------------- */

function Curadoria({ work }: { work: AdminWorkDetail }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [newCheck, setNewCheck] = useState('');
  const [note, setNote] = useState('');
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin'] });
  };
  const onError = (e: unknown) => toast.error(errorMessage(e));

  const updateCheck = useMutation({
    mutationFn: ({ id, status }: { id: number; status: CheckStatus }) => api.patch(`/admin/works/${work.id}/checks/${id}`, { status }),
    onSuccess: refresh,
    onError,
  });
  const addCheck = useMutation({
    mutationFn: () => api.post(`/admin/works/${work.id}/checks`, { label: newCheck }),
    onSuccess: () => {
      setNewCheck('');
      refresh();
    },
    onError,
  });
  const deleteCheck = useMutation({ mutationFn: (id: number) => api.delete(`/admin/works/${work.id}/checks/${id}`), onSuccess: refresh, onError });
  const addNote = useMutation({
    mutationFn: () => api.post(`/admin/works/${work.id}/notes`, { content: note }),
    onSuccess: () => {
      setNote('');
      toast.success('Nota registrada e visível para o autor.');
      refresh();
    },
    onError,
  });
  const deleteNote = useMutation({ mutationFn: (id: number) => api.delete(`/admin/notes/${id}`), onSuccess: refresh, onError });

  const submitCheck = (e: FormEvent) => {
    e.preventDefault();
    addCheck.mutate();
  };
  const submitNote = (e: FormEvent) => {
    e.preventDefault();
    addNote.mutate();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-5" aria-labelledby="checks-title">
        <h2 id="checks-title" className="mb-1 flex items-center gap-2 text-xl font-semibold text-ink">
          <CheckCircle2 className="h-5 w-5 text-accent" aria-hidden /> Checklist da Etapa 2
        </h2>
        <p className="mb-4 text-sm text-ink-muted">O autor acompanha cada item em tempo real na tela de análise.</p>
        <ul className="space-y-2">
          {work.checks.map((c) => (
            <li key={c.id} className="card-high flex flex-wrap items-center gap-2 p-3">
              <span className="flex-1 text-sm text-ink">{c.label}</span>
              <select
                className="input w-auto py-1.5 text-sm"
                aria-label={`Status de ${c.label}`}
                value={c.status}
                onChange={(e) => updateCheck.mutate({ id: c.id, status: e.target.value as CheckStatus })}
              >
                {(Object.keys(CHECK_LABEL) as CheckStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {CHECK_LABEL[s]}
                  </option>
                ))}
              </select>
              <button type="button" className="icon-btn hover:text-danger" aria-label={`Remover item ${c.label}`} onClick={() => deleteCheck.mutate(c.id)}>
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
          {work.checks.length === 0 && <li className="text-sm text-ink-muted">O checklist padrão é criado quando a obra é enviada para análise.</li>}
        </ul>
        <form onSubmit={submitCheck} className="mt-4 flex gap-2">
          <label htmlFor="new-check" className="sr-only">
            Novo item de verificação
          </label>
          <input id="new-check" className="input" placeholder="Novo item de verificação" value={newCheck} onChange={(e) => setNewCheck(e.target.value)} maxLength={120} />
          <button type="submit" className="btn-secondary" disabled={newCheck.trim().length < 2 || addCheck.isPending}>
            <Plus className="h-4 w-4" aria-hidden /> Adicionar
          </button>
        </form>
      </section>

      <section className="card p-5" aria-labelledby="notes-admin-title">
        <h2 id="notes-admin-title" className="mb-4 flex items-center gap-2 text-xl font-semibold text-ink">
          <MessageSquarePlus className="h-5 w-5 text-primary" aria-hidden /> Notas dos pareceristas
        </h2>
        <ul className="max-h-[360px] space-y-2 overflow-y-auto">
          {work.notes.map((n) => (
            <li key={n.id} className="card-high p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm">
                  <Avatar name={n.user.name} size="sm" />
                  <strong className="text-ink">{n.user.name}</strong>
                  <span className="text-xs text-ink-subtle">{n.user.role === 'ADMIN' ? 'Curadoria' : 'Autor'}</span>
                </p>
                <span className="flex items-center gap-1 text-xs text-ink-subtle">
                  {formatRelative(n.createdAt)}
                  <button type="button" className="icon-btn h-8 w-8 hover:text-danger" aria-label="Excluir nota" onClick={() => deleteNote.mutate(n.id)}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </span>
              </div>
              <p className="text-sm text-ink-muted">{n.content}</p>
            </li>
          ))}
          {work.notes.length === 0 && <li className="text-sm text-ink-muted">Nenhuma nota registrada.</li>}
        </ul>
        <form onSubmit={submitNote} className="mt-4 space-y-2">
          <TextArea label="Nova nota para o autor" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
          <button type="submit" className="btn-primary" disabled={note.trim().length < 2 || addNote.isPending}>
            Registrar nota
          </button>
        </form>
      </section>
    </div>
  );
}

export default function AdminWorkDetail() {
  const { id } = useParams();
  const workId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: work, isLoading, isError, error, refetch } = useAdminWork(workId);
  const { data: authors = [] } = useAuthorOptions();
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [target, setTarget] = useState<WorkStatus | null>(null);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin'] });
    void qc.invalidateQueries({ queryKey: ['catalog'] });
    void qc.invalidateQueries({ queryKey: ['work', workId] });
  };

  const changeStatus = useMutation({
    mutationFn: async () => (await api.patch<Work>(`/admin/works/${workId}/status`, { status: target, reason })).data,
    onSuccess: (w) => {
      toast.success(`Status alterado para “${STATUS_LABEL[w.status]}”.`);
      setTarget(null);
      setReason('');
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/admin/works/${workId}`),
    onSuccess: () => {
      toast.success('Obra excluída definitivamente.');
      refresh();
      navigate('/admin/works');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading) return <LoadingState />;
  if (isError || !work) return <ErrorState message={errorMessage(error, 'Obra não encontrada.')} onRetry={() => refetch()} />;

  const onSave = async (fd: FormData) => {
    if (authorId && Number(authorId) !== work.author.id) fd.append('authorId', authorId);
    setBusy(true);
    try {
      await api.patch(`/admin/works/${work.id}`, fd);
      toast.success('Dados da obra atualizados.');
      setErrors({});
      refresh();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/admin/works" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Obras
      </Link>
      <PageHeader
        eyebrow={<span className="text-admin">Obra #{work.id}</span>}
        title={work.title}
        description={
          <span className="flex flex-wrap items-center gap-3 text-base">
            <StatusBadge status={work.status} /> por {work.author.name} · enviada {formatDateTime(work.submittedAt)}
          </span>
        }
        actions={
          <>
            <Link to={`/reader/${work.id}`} className="btn-secondary">
              <Eye className="h-4 w-4" aria-hidden /> Abrir no leitor
            </Link>
            <button type="button" className="btn-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" aria-hidden /> Excluir
            </button>
          </>
        }
      />

      <section className="card p-5" aria-labelledby="decision-title">
        <h2 id="decision-title" className="mb-1 flex items-center gap-2 text-xl font-semibold text-ink">
          <Gavel className="h-5 w-5 text-admin" aria-hidden /> Decisão editorial
        </h2>
        <p className="mb-4 text-sm text-ink-muted">
          Status atual: <strong className="text-ink">{STATUS_LABEL[work.status]}</strong>.
          {work.rejectionReason && work.status === 'REJEITADO' && <> Motivo informado ao autor: “{work.rejectionReason}”.</>}
          {!work.hasFile && ' Esta obra ainda não tem arquivo — envio para análise e publicação ficam bloqueados.'}
        </p>
        <div className="flex flex-wrap gap-3">
          {TRANSITIONS[work.status].map((t) => (
            <button key={t.to} type="button" className={t.tone} onClick={() => setTarget(t.to)}>
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <Curadoria work={work} />

      <section aria-labelledby="edit-title" className="space-y-4">
        <h2 id="edit-title" className="text-2xl font-semibold text-ink">
          Dados da obra
        </h2>
        <WorkForm
          key={work.updatedAt}
          initial={work}
          errors={errors}
          busy={busy}
          onSubmit={(fd) => void onSave(fd)}
          showProcess={false}
          actions={[{ action: 'save', label: 'Salvar alterações', variant: 'primary', icon: <Save className="h-5 w-5" aria-hidden /> }]}
          extraSlot={
            <div className="card p-5">
              <SelectInput label="Autor responsável" value={authorId ?? String(work.author.id)} onChange={(e) => setAuthorId(e.target.value)} error={errors.authorId}>
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.email})
                  </option>
                ))}
                {!authors.some((a) => a.id === work.author.id) && <option value={work.author.id}>{work.author.name}</option>}
              </SelectInput>
            </div>
          }
        />
      </section>

      <AudioDescriptionEditor workId={work.id} descriptions={work.audioDescriptions} editable invalidate={[['admin', 'work', work.id], ['audio-descriptions', work.id]]} />

      <Modal
        open={!!target}
        title={target ? `Alterar status para “${STATUS_LABEL[target]}”` : ''}
        onClose={() => setTarget(null)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setTarget(null)}>
              Cancelar
            </button>
            <button type="button" className={target === 'REJEITADO' || target === 'ARQUIVADO' ? 'btn-danger' : 'btn-primary'} onClick={() => changeStatus.mutate()} disabled={changeStatus.isPending || (target === 'REJEITADO' && !reason.trim())}>
              Confirmar
            </button>
          </>
        }
      >
        <div className="space-y-4 text-sm text-ink-muted">
          {target === 'APROVADO' && (
            <p>
              Todos os itens do checklist passam a aprovados e <strong className="text-ink">a obra entra no catálogo público
              imediatamente</strong>.
            </p>
          )}
          {target === 'ARQUIVADO' && <p>A obra deixará de aparecer no catálogo (pode ser republicada depois). Nada é apagado.</p>}
          {target === 'EM_ANALISE' && <p>A obra volta para a fila de curadoria; itens não aprovados do checklist voltam a “Pendente”.</p>}
          {(target === 'REJEITADO' || target === 'RASCUNHO' || target === 'ARQUIVADO') && (
            <TextInput
              label={target === 'REJEITADO' ? 'Motivo (visível para o autor)' : 'Observação (opcional)'}
              required={target === 'REJEITADO'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={1000}
            />
          )}
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmDelete}
        danger
        title="Excluir obra definitivamente"
        message="A obra, seus arquivos, audiodescrição, avaliações, notas e métricas serão apagados. Prefira “Despublicar (arquivar)” se quiser apenas tirar do catálogo."
        confirmLabel="Excluir definitivamente"
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
