import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Eye, FilePen, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useAudioDescriptions, useWork } from '../hooks/queries';
import { api, errorMessage, fieldErrors } from '../lib/api';
import type { Work } from '../types/api';
import WorkForm, { type WorkFormAction } from '../components/works/WorkForm';
import AudioDescriptionEditor from '../components/works/AudioDescriptionEditor';
import { useWorkActions } from '../components/works/workActions';
import { ConfirmDialog, ErrorState, LoadingState, PageHeader, StatusBadge } from '../components/ui';
import { useToast } from '../components/ui/Toast';

/** Edição de obra pelo autor: rascunho, correção após rejeição ou metadados de obra aprovada/publicada. */
export default function EditWork() {
  const { id } = useParams();
  const workId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const { data: work, isLoading, isError, error, refetch } = useWork(workId);
  const { data: descriptions = [] } = useAudioDescriptions(work ? workId : undefined);
  const { remove } = useWorkActions();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) return <LoadingState />;
  if (isError || !work) return <ErrorState message={errorMessage(error, 'Obra não encontrada.')} onRetry={() => refetch()} />;
  if (work.author.id !== user?.id) return <ErrorState message="Apenas o autor pode editar esta obra." />;

  const fullEdit = work.status === 'RASCUNHO' || work.status === 'REJEITADO';
  const metadataOnly = work.status === 'APROVADO';
  const adEditable = ['RASCUNHO', 'REJEITADO', 'EM_ANALISE'].includes(work.status);

  if (!fullEdit && !metadataOnly) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <ErrorState message="Esta obra está em análise ou arquivada e não pode ser editada agora. Você ainda pode ajustar a audiodescrição enquanto ela estiver em análise." />
        {adEditable && <AudioDescriptionEditor workId={work.id} descriptions={descriptions} editable invalidate={[['audio-descriptions', work.id]]} />}
      </div>
    );
  }

  const onSubmit = async (data: FormData, action: string) => {
    setBusy(true);
    setErrors({});
    setProgress(0);
    try {
      await api.patch<Work>(`/works/${work.id}`, data, {
        onUploadProgress: (e) => e.total && setProgress(Math.round((e.loaded / e.total) * 100)),
      });
      if (action === 'submit') {
        await api.post(`/works/${work.id}/submit`);
        toast.success('Obra enviada para análise!');
        await qc.invalidateQueries({ queryKey: ['work', work.id] });
        void qc.invalidateQueries({ queryKey: ['me'] });
        navigate(`/review/${work.id}`);
        return;
      }
      toast.success('Alterações salvas.');
      void qc.invalidateQueries({ queryKey: ['work', work.id] });
      void qc.invalidateQueries({ queryKey: ['me'] });
      void qc.invalidateQueries({ queryKey: ['catalog'] });
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const actions: WorkFormAction[] = metadataOnly
    ? [{ action: 'save', label: 'Salvar metadados', variant: 'primary', icon: <Save className="h-5 w-5" aria-hidden /> }]
    : [
        { action: 'save', label: work.status === 'RASCUNHO' ? 'Salvar rascunho' : 'Salvar alterações', variant: 'secondary', icon: <Save className="h-5 w-5" aria-hidden /> },
        { action: 'submit', label: work.status === 'REJEITADO' ? 'Salvar e reenviar para análise' : 'Salvar e enviar para análise', variant: 'primary', requiresFile: true },
      ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar ao painel
      </Link>
      <PageHeader
        eyebrow={metadataOnly ? 'Editar metadados' : 'Continuar envio'}
        icon={<FilePen className="h-4 w-4" aria-hidden />}
        title={work.title}
        description={
          <span className="flex flex-wrap items-center gap-3">
            <StatusBadge status={work.status} />
            {work.status === 'REJEITADO' && work.rejectionReason && <span className="text-base">Ajustes solicitados: {work.rejectionReason}</span>}
          </span>
        }
        actions={
          <>
            <Link to={`/reader/${work.id}`} className="btn-secondary">
              <Eye className="h-4 w-4" aria-hidden /> Prévia no Leitor Web
            </Link>
            {fullEdit && (
              <button type="button" className="btn-danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" aria-hidden /> Excluir
              </button>
            )}
          </>
        }
      />
      <WorkForm key={work.updatedAt} initial={work} metadataOnly={metadataOnly} errors={errors} busy={busy} uploadProgress={progress} onSubmit={onSubmit} actions={actions} showProcess={!metadataOnly} />
      <AudioDescriptionEditor workId={work.id} descriptions={descriptions} editable={adEditable} invalidate={[['audio-descriptions', work.id]]} />
      <ConfirmDialog
        open={confirmDelete}
        danger
        title="Excluir obra"
        message={`“${work.title}” e seus arquivos serão excluídos definitivamente.`}
        confirmLabel="Excluir definitivamente"
        busy={remove.isPending}
        onConfirm={() => remove.mutate(work.id, { onSuccess: () => navigate('/dashboard') })}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
