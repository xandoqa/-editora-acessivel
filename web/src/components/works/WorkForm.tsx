import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ListChecks, Lock, NotebookPen, PersonStanding, Send, Settings2 } from 'lucide-react';
import { useGenres } from '../../hooks/queries';
import { AGE_RATINGS, FEATURES, FORMAT_LABEL, ageRatingLabel } from '../../lib/labels';
import { formatBytes } from '../../lib/format';
import type { FeatureFlag, Work, WorkFormat } from '../../types/api';
import { SelectInput, TextArea, TextInput } from '../ui';
import FileDropzone from './FileDropzone';

export interface WorkFormAction {
  action: string;
  label: string;
  variant: 'primary' | 'secondary' | 'tonal';
  icon?: ReactNode;
  /** Exige o arquivo da obra (envio para análise). */
  requiresFile?: boolean;
}

interface Props {
  initial?: Work;
  /** Obras aprovadas/publicadas: o autor só edita metadados de divulgação e capa. */
  metadataOnly?: boolean;
  errors: Record<string, string>;
  busy: boolean;
  uploadProgress?: number;
  actions: WorkFormAction[];
  onSubmit: (data: FormData, action: string) => void;
  /** Campos extras no topo (ex.: autor e status na área administrativa). */
  extraSlot?: ReactNode;
  showProcess?: boolean;
}

const METADATA_FIELDS = new Set(['subtitle', 'synopsis', 'authorNotes', 'tags', 'editionLabel']);
const WORK_EXTS = ['pdf', 'docx', 'epub', 'cbz', 'cbr'];
const MAX_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB) || 180;

type FormState = {
  title: string;
  subtitle: string;
  genreId: string;
  format: WorkFormat;
  pages: string;
  synopsis: string;
  editionLabel: string;
  isbn: string;
  ageRating: string;
  authorNotes: string;
  tags: string;
  audioDescriber: string;
  audioNarrator: string;
  audioReviewer: string;
} & Record<FeatureFlag, boolean>;

function initialState(w?: Work): FormState {
  return {
    title: w?.title ?? '',
    subtitle: w?.subtitle ?? '',
    genreId: w ? String(w.genre.id) : '',
    format: w?.format ?? 'QUADRINHO',
    pages: w ? String(w.pages) : '',
    synopsis: w?.synopsis ?? '',
    editionLabel: w?.editionLabel ?? '',
    isbn: w?.isbn ?? '',
    ageRating: w?.ageRating ?? 'L',
    authorNotes: w?.authorNotes ?? '',
    tags: w?.tags.join(', ') ?? '',
    audioDescriber: w?.audioDescriber ?? '',
    audioNarrator: w?.audioNarrator ?? '',
    audioReviewer: w?.audioReviewer ?? '',
    hasAudioDesc: w?.hasAudioDesc ?? false,
    hasLeitorTela: w?.hasLeitorTela ?? false,
    hasTextoAlt: w?.hasTextoAlt ?? false,
    hasLibras: w?.hasLibras ?? false,
    hasFacilLeitura: w?.hasFacilLeitura ?? false,
    hasAltoContraste: w?.hasAltoContraste ?? false,
  };
}

/** Formulário de obra (submissão, edição pelo autor e criação/edição pela administração). */
export default function WorkForm({ initial, metadataOnly, errors, busy, uploadProgress, actions, onSubmit, extraSlot, showProcess = true }: Props) {
  const { data: genres = [] } = useGenres();
  const [form, setForm] = useState<FormState>(() => initialState(initial));
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [removeAudio, setRemoveAudio] = useState(false);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const coverPreview = useMemo(() => (cover ? URL.createObjectURL(cover) : null), [cover]);

  const allErrors = { ...errors, ...localErrors };
  const locked = (field: string) => !!metadataOnly && !METADATA_FIELDS.has(field);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const text = (key: keyof FormState) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(key, e.target.value as never),
    disabled: locked(key) || busy,
    error: allErrors[key],
  });

  const submit = (action: WorkFormAction) => (e?: FormEvent) => {
    e?.preventDefault();
    if (action.requiresFile && !file && !initial?.hasFile) {
      setLocalErrors({ file: 'Envie o arquivo original da obra para submetê-la à análise.' });
      document.getElementById('work-file-zone')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setLocalErrors({});
    const fd = new FormData();
    const tags = form.tags.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean);
    for (const [key, value] of Object.entries(form)) {
      if (locked(key)) continue;
      if (key === 'tags') fd.append('tags', JSON.stringify(tags));
      else fd.append(key, typeof value === 'boolean' ? String(value) : value);
    }
    if (file && !metadataOnly) fd.append('file', file);
    if (audio && !metadataOnly) fd.append('audio', audio);
    if (cover) fd.append('cover', cover);
    if (removeCover && !cover) fd.append('removeCover', 'true');
    if (removeAudio && !audio && !metadataOnly) fd.append('removeAudio', 'true');
    onSubmit(fd, action.action);
  };

  const primary = actions.find((a) => a.variant === 'primary') ?? actions[0];
  const btnClass = { primary: 'btn-primary', secondary: 'btn-secondary', tonal: 'btn-tonal' } as const;

  return (
    <form onSubmit={submit(primary)} className="space-y-8" noValidate>
      {metadataOnly && (
        <p className="flex items-start gap-3 rounded-xl border border-primary/40 bg-primary-container/40 p-4 text-sm text-ink" role="note">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          Esta obra já foi aprovada pela curadoria. Você pode atualizar subtítulo, sinopse, notas, tags, rótulo editorial e capa. Para mudar o
          arquivo, título ou recursos de acessibilidade, fale com a equipe Livrin.
        </p>
      )}

      {extraSlot}

      <div id="work-file-zone">
        <FileDropzone
          label="Arquivo Original da Obra"
          required={!initial?.hasFile}
          accept=".pdf,.docx,.epub,.cbz,.cbr,application/pdf,application/epub+zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          extensions={WORK_EXTS}
          maxMb={MAX_MB}
          file={file}
          onChange={setFile}
          error={allErrors.file}
          disabled={metadataOnly || busy}
          title="Arraste o arquivo da obra aqui ou escolha no computador"
          description="Aceita PDF, DOCX (Word), EPUB, CBZ ou CBR. O DOCX é o mais acessível: o texto reflui e obedece à tipografia de quem lê."
          badges={['DOCX com texto que reflui', 'PDF/UA', 'EPUB 3', 'CBZ com metadata']}
          current={initial?.file ? `Arquivo atual: ${initial.file.originalName} (${formatBytes(initial.file.sizeBytes)})` : undefined}
        />
        {uploadProgress !== undefined && busy && (
          <div className="mt-3" role="progressbar" aria-label="Progresso do envio" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-2 overflow-hidden rounded-full bg-surface-high">
              <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="mt-1 text-xs text-ink-muted">Enviando... {uploadProgress}%</p>
          </div>
        )}
      </div>

      <section className="card space-y-6 p-5 md:p-7" aria-labelledby="info-title">
        <h2 id="info-title" className="flex items-center gap-2 text-2xl font-semibold text-ink">
          <NotebookPen className="h-6 w-6 text-primary" aria-hidden /> Informações da Publicação
        </h2>
        <TextInput label="Título do livro ou HQ" required maxLength={120} placeholder="Meu livro incrível..." aside={`${form.title.length}/120`} {...text('title')} />
        <div className="grid gap-6 md:grid-cols-3">
          <SelectInput label="Gênero literário" required {...text('genreId')}>
            <option value="" disabled>
              Selecione uma categoria...
            </option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
            {initial && !genres.some((g) => g.id === initial.genre.id) && <option value={initial.genre.id}>{initial.genre.name}</option>}
          </SelectInput>
          <SelectInput label="Formato" required {...text('format')}>
            {(Object.keys(FORMAT_LABEL) as WorkFormat[]).map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABEL[f]}
              </option>
            ))}
          </SelectInput>
          <div className="relative">
            <TextInput label="Nº de páginas" required type="number" inputMode="numeric" min={1} placeholder="240" className="pr-24" {...text('pages')} />
            <span className="pointer-events-none absolute right-4 top-[43px] text-sm font-semibold text-ink-subtle" aria-hidden>
              páginas
            </span>
          </div>
        </div>
        <TextArea
          label="Sinopse da obra"
          required
          rows={5}
          maxLength={2000}
          placeholder="Uma história sobre..."
          aside={`Recomendado: 100 a 800 caracteres · ${form.synopsis.length}`}
          {...text('synopsis')}
        />
      </section>

      <section className="card p-5 md:p-7" aria-labelledby="a11y-title">
        <h2 id="a11y-title" className="flex items-center gap-2 text-2xl font-semibold text-ink">
          <PersonStanding className="h-6 w-6 text-accent" aria-hidden /> Recursos de Acessibilidade Pré-existentes
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Identifique os recursos já incorporados no seu arquivo. A curadoria confere cada um antes de publicar.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {FEATURES.map((f) => (
            <label key={f.flag} className={`card-high flex cursor-pointer items-start gap-3 p-4 ${locked(f.flag) ? 'cursor-not-allowed opacity-60' : 'hover:bg-surface-highest'}`}>
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0 accent-[rgb(var(--c-primary))]"
                checked={form[f.flag]}
                onChange={(e) => set(f.flag, e.target.checked)}
                disabled={locked(f.flag) || busy}
              />
              <span>
                <span className="block font-semibold text-ink">{f.label}</span>
                <span className="text-sm text-ink-muted">{f.description}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <details className="card group p-5 md:p-7" open={!!initial}>
        <summary className="flex cursor-pointer list-none items-center gap-2 text-xl font-semibold text-ink">
          <Settings2 className="h-5 w-5 text-primary" aria-hidden /> Detalhes editoriais, capa e audiodescrição
          <span className="ml-2 text-sm font-normal text-ink-subtle">(opcional)</span>
        </summary>
        <div className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-[200px_1fr]">
            <div>
              <p className="label">Capa</p>
              <div className="aspect-[3/4] overflow-hidden rounded-xl bg-surface-high">
                {coverPreview || (initial?.coverUrl && !removeCover) ? (
                  <img src={coverPreview ?? initial!.coverUrl!} alt="Pré-visualização da capa" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center p-4 text-center text-sm text-ink-subtle">Sem capa</div>
                )}
              </div>
              {initial?.coverUrl && !cover && (
                <label className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
                  <input type="checkbox" checked={removeCover} onChange={(e) => setRemoveCover(e.target.checked)} /> Remover capa atual
                </label>
              )}
            </div>
            <FileDropzone
              compact
              label="Imagem da capa"
              accept="image/jpeg,image/png,image/webp"
              extensions={['jpg', 'jpeg', 'png', 'webp']}
              maxMb={5}
              file={cover}
              onChange={setCover}
              error={allErrors.cover}
              disabled={busy}
              title="JPG, PNG ou WEBP"
              description="Proporção recomendada 3:4"
            />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <TextInput label="Subtítulo" maxLength={160} {...text('subtitle')} />
            <TextInput label="Rótulo editorial" maxLength={60} placeholder="Ex.: Edição especial, Webcomic serial" {...text('editionLabel')} />
            <TextInput label="ISBN" maxLength={20} placeholder="978-65-0000-00-0" {...text('isbn')} />
            <SelectInput label="Classificação indicativa" {...text('ageRating')}>
              {AGE_RATINGS.map((r) => (
                <option key={r} value={r}>
                  {ageRatingLabel(r)}
                </option>
              ))}
            </SelectInput>
          </div>
          <TextInput label="Tags" placeholder="EspaçoProfundo, ProtagonistaPCD" hint="Separe por vírgulas (até 10)." {...text('tags')} />
          <TextArea label="Notas da autoria (adaptação universal)" rows={4} maxLength={3000} {...text('authorNotes')} />
          <div className="grid gap-6 md:grid-cols-3">
            <TextInput label="Roteirista de audiodescrição" maxLength={120} {...text('audioDescriber')} />
            <TextInput label="Voz / narração" maxLength={120} {...text('audioNarrator')} />
            <TextInput label="Revisão de audiodescrição" maxLength={160} {...text('audioReviewer')} />
          </div>
          <FileDropzone
            compact
            label="Faixa de audiodescrição gravada (opcional)"
            accept="audio/mpeg,audio/ogg,audio/mp4,.mp3,.ogg,.m4a"
            extensions={['mp3', 'ogg', 'm4a']}
            maxMb={MAX_MB}
            file={audio}
            onChange={setAudio}
            error={allErrors.audio}
            disabled={metadataOnly || busy}
            title="MP3, OGG ou M4A"
            description="Sem faixa gravada, o leitor narra a audiodescrição com voz sintetizada."
            current={initial?.hasAudio && !removeAudio ? 'Faixa de áudio enviada' : undefined}
          />
          {initial?.hasAudio && !audio && !metadataOnly && (
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input type="checkbox" checked={removeAudio} onChange={(e) => setRemoveAudio(e.target.checked)} /> Remover faixa de áudio atual
            </label>
          )}
        </div>
      </details>

      {showProcess && (
        <div className="flex flex-col gap-4 rounded-2xl bg-surface-low p-5 md:flex-row md:items-center">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-container text-accent" aria-hidden>
            <ListChecks className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-ink">Processo de Curadoria Transparente</p>
            <p className="text-sm text-ink-muted">Seu título será testado em softwares NVDA, TalkBack e leitor de alto contraste.</p>
          </div>
          <ol className="flex items-center gap-3 text-xs font-semibold" aria-label="Etapas">
            {['Envio', 'Revisão', 'Catálogo'].map((s, i) => (
              <li key={s} className="flex items-center gap-3">
                {i > 0 && <span className="h-1 w-8 rounded bg-surface-highest" aria-hidden />}
                <span className="flex flex-col items-center gap-1">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${i === 0 ? 'bg-primary text-primary-on' : 'bg-surface-highest text-ink-muted'}`}>{i + 1}</span>
                  <span className={i === 0 ? 'text-ink' : 'text-ink-subtle'}>{s}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <Lock className="h-4 w-4" aria-hidden /> Seus direitos autorais permanecem 100% sob seu controle.
        </p>
        <div className="flex flex-wrap gap-3">
          {actions.map((a) => (
            <button
              key={a.action}
              type={a === primary ? 'submit' : 'button'}
              onClick={a === primary ? undefined : () => submit(a)()}
              className={`${btnClass[a.variant]} px-6 py-3 text-base`}
              disabled={busy}
            >
              {a.icon ?? (a.variant === 'primary' ? <Send className="h-5 w-5" aria-hidden /> : null)}
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
