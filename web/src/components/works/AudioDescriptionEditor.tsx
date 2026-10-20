import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AudioLines, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api, errorMessage, fieldErrors } from '../../lib/api';
import type { AudioDescription, Dialogue } from '../../types/api';
import { ConfirmDialog, Modal, TextArea, TextInput } from '../ui';
import { useToast } from '../ui/Toast';

interface Props {
  workId: number;
  descriptions: AudioDescription[];
  editable: boolean;
  /** Chaves de cache a invalidar após alterações. */
  invalidate: unknown[][];
}

type Draft = Omit<AudioDescription, 'id' | 'workId' | 'pageNumber'> & { id?: number; pageNumber: string };

const empty = (page: number): Draft => ({
  pageNumber: String(page),
  chapterLabel: '',
  chapterTitle: '',
  panelLabel: '',
  description: '',
  dialogues: [],
});

/**
 * Editor da audiodescrição página a página (descrição do quadro + falas).
 * Usado pelo autor (rascunho/análise) e pela curadoria (qualquer status).
 */
export default function AudioDescriptionEditor({ workId, descriptions, editable, invalidate }: Props) {
  const qc = useQueryClient();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<AudioDescription | null>(null);

  const refresh = () => invalidate.forEach((key) => void qc.invalidateQueries({ queryKey: key }));

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const body = {
        pageNumber: Number(d.pageNumber),
        chapterLabel: d.chapterLabel,
        chapterTitle: d.chapterTitle,
        panelLabel: d.panelLabel,
        description: d.description,
        dialogues: d.dialogues.filter((x) => x.speaker.trim() || x.text.trim()),
      };
      return d.id ? api.put(`/works/${workId}/audio-descriptions/${d.id}`, body) : api.post(`/works/${workId}/audio-descriptions`, body);
    },
    onSuccess: () => {
      toast.success('Audiodescrição salva.');
      setDraft(null);
      setErrors({});
      refresh();
    },
    onError: (err) => {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    },
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/works/${workId}/audio-descriptions/${id}`),
    onSuccess: () => {
      toast.success('Audiodescrição removida.');
      setToDelete(null);
      refresh();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const nextPage = descriptions.length ? Math.max(...descriptions.map((d) => d.pageNumber)) + 1 : 1;
  const setD = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const setDialogue = (i: number, patch: Partial<Dialogue>) =>
    setDraft((d) => (d ? { ...d, dialogues: d.dialogues.map((x, j) => (j === i ? { ...x, ...patch } : x)) } : d));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (draft) save.mutate(draft);
  };

  return (
    <section className="card p-5 md:p-7" aria-labelledby="ad-editor-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="ad-editor-title" className="flex items-center gap-2 text-2xl font-semibold text-ink">
            <AudioLines className="h-6 w-6 text-accent" aria-hidden /> Audiodescrição por página
          </h2>
          <p className="text-sm text-ink-muted">
            Descreva cada quadro e transcreva as falas. O Leitor Acessível exibe e narra este conteúdo em sincronia com as páginas.
          </p>
        </div>
        {editable && (
          <button type="button" className="btn-tonal" onClick={() => setDraft(empty(nextPage))}>
            <Plus className="h-4 w-4" aria-hidden /> Adicionar página
          </button>
        )}
      </div>

      {descriptions.length === 0 ? (
        <p className="rounded-xl bg-surface-high p-4 text-sm text-ink-muted">Nenhuma página com audiodescrição cadastrada.</p>
      ) : (
        <ul className="space-y-3">
          {descriptions.map((ad) => (
            <li key={ad.id} className="card-high flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
              <span className="inline-flex h-10 min-w-[64px] items-center justify-center rounded-lg bg-surface-highest text-sm font-bold text-ink">
                Pág {ad.pageNumber}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">
                  {[ad.chapterLabel, ad.chapterTitle].filter(Boolean).join(' — ') || 'Sem capítulo'}
                  {ad.panelLabel && <span className="font-normal text-ink-subtle"> · {ad.panelLabel}</span>}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{ad.description}</p>
                {ad.dialogues.length > 0 && <p className="mt-1 text-xs text-ink-subtle">{ad.dialogues.length} fala(s)</p>}
              </div>
              {editable && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Editar audiodescrição da página ${ad.pageNumber}`}
                    onClick={() =>
                      setDraft({
                        ...ad,
                        pageNumber: String(ad.pageNumber),
                        chapterLabel: ad.chapterLabel ?? '',
                        chapterTitle: ad.chapterTitle ?? '',
                        panelLabel: ad.panelLabel ?? '',
                      })
                    }
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                  <button type="button" className="icon-btn hover:text-danger" aria-label={`Excluir audiodescrição da página ${ad.pageNumber}`} onClick={() => setToDelete(ad)}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {!editable && <p className="mt-3 text-xs text-ink-subtle">A audiodescrição só pode ser alterada pela curadoria no status atual da obra.</p>}

      <Modal
        open={!!draft}
        wide
        title={draft?.id ? `Editar página ${draft.pageNumber}` : 'Nova página com audiodescrição'}
        onClose={() => setDraft(null)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setDraft(null)}>
              Cancelar
            </button>
            <button type="submit" form="ad-form" className="btn-primary" disabled={save.isPending}>
              Salvar audiodescrição
            </button>
          </>
        }
      >
        {draft && (
          <form id="ad-form" onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[120px_1fr_1fr]">
              <TextInput label="Página" type="number" min={1} required value={draft.pageNumber} onChange={(e) => setD('pageNumber', e.target.value)} error={errors.pageNumber} />
              <TextInput label="Capítulo" placeholder="Capítulo 1" maxLength={60} value={draft.chapterLabel ?? ''} onChange={(e) => setD('chapterLabel', e.target.value)} />
              <TextInput label="Título do capítulo" maxLength={120} value={draft.chapterTitle ?? ''} onChange={(e) => setD('chapterTitle', e.target.value)} />
            </div>
            <TextInput label="Rótulo do quadro" placeholder="Painel 1 • Plano Aberto" maxLength={80} value={draft.panelLabel ?? ''} onChange={(e) => setD('panelLabel', e.target.value)} />
            <TextArea
              label="Audiodescrição do quadro"
              required
              rows={4}
              maxLength={4000}
              value={draft.description}
              onChange={(e) => setD('description', e.target.value)}
              error={errors.description}
            />
            <fieldset className="space-y-3">
              <legend className="label">Falas dos personagens</legend>
              {draft.dialogues.map((d, i) => (
                <div key={i} className="card-high grid gap-3 p-3 sm:grid-cols-[1fr_1fr_auto]">
                  <TextInput label="Personagem" value={d.speaker} maxLength={60} onChange={(e) => setDialogue(i, { speaker: e.target.value })} />
                  <TextInput label="Tom de voz" value={d.tone ?? ''} maxLength={40} placeholder="Voz firme" onChange={(e) => setDialogue(i, { tone: e.target.value })} />
                  <button
                    type="button"
                    className="icon-btn self-end"
                    aria-label={`Remover fala ${i + 1}`}
                    onClick={() => setD('dialogues', draft.dialogues.filter((_, j) => j !== i))}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                  <div className="sm:col-span-3">
                    <TextArea label="Fala" rows={2} maxLength={600} value={d.text} onChange={(e) => setDialogue(i, { text: e.target.value })} />
                  </div>
                </div>
              ))}
              {errors.dialogues && <p className="text-sm text-danger">{errors.dialogues}</p>}
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setD('dialogues', [...draft.dialogues, { speaker: '', tone: '', text: '' }])}
                disabled={draft.dialogues.length >= 12}
              >
                <Plus className="h-4 w-4" aria-hidden /> Adicionar fala
              </button>
            </fieldset>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Excluir audiodescrição"
        message={`A audiodescrição da página ${toDelete?.pageNumber} será removida.`}
        confirmLabel="Excluir"
        busy={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </section>
  );
}
