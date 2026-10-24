import { useId, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { CloudUpload, FileCheck2, FolderOpen, X } from 'lucide-react';
import { formatBytes } from '../../lib/format';

interface Props {
  label: string;
  required?: boolean;
  accept: string;
  extensions: string[];
  maxMb: number;
  file: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  /** Arquivo já existente no servidor (modo edição). */
  current?: ReactNode;
  title?: string;
  description?: string;
  badges?: string[];
  disabled?: boolean;
  compact?: boolean;
}

/** Área de upload com arrastar-e-soltar e botão acessível por teclado ("Explorar arquivos locais"). */
export default function FileDropzone({
  label,
  required,
  accept,
  extensions,
  maxMb,
  file,
  onChange,
  error,
  current,
  title = 'Arraste o arquivo aqui ou escolha no computador',
  description,
  badges,
  disabled,
  compact,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState('');

  const pick = (f: File | undefined) => {
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (!extensions.includes(ext)) {
      setLocalError(`Formato não suportado. Envie: ${extensions.map((e) => e.toUpperCase()).join(', ')}.`);
      return;
    }
    if (f.size > maxMb * 1024 * 1024) {
      setLocalError(`Arquivo maior que o limite de ${maxMb} MB.`);
      return;
    }
    setLocalError('');
    onChange(f);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) pick(e.dataTransfer.files[0]);
  };

  const shownError = localError || error;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span id={`${id}-label`} className="label mb-0">
          {label}
          {required && <span className="ml-1 text-danger" aria-hidden>*</span>}
        </span>
        <span className="text-xs font-semibold text-ink-subtle">Limite máx. {maxMb}MB</span>
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-2xl border border-dashed text-center transition-colors ${compact ? 'p-5' : 'p-8 md:p-10'} ${
          dragging ? 'border-primary bg-primary-container/30' : shownError ? 'border-danger' : 'border-outline-strong/60'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        {file ? (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <FileCheck2 className="h-8 w-8 text-accent" aria-hidden />
            <div className="text-left">
              <p className="font-semibold text-ink">{file.name}</p>
              <p className="text-sm text-ink-muted">{formatBytes(file.size)} · pronto para envio</p>
            </div>
            <button type="button" className="icon-btn" onClick={() => onChange(null)} aria-label={`Remover ${file.name}`} disabled={disabled}>
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        ) : (
          <>
            {!compact && (
              <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-primary" aria-hidden>
                <CloudUpload className="h-7 w-7" />
              </span>
            )}
            <p className={`font-display font-semibold text-ink ${compact ? 'text-base' : 'text-xl'}`}>{title}</p>
            {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
            {current && <div className="mt-2 text-sm text-accent">{current}</div>}
            <button
              type="button"
              className="btn-secondary mt-4"
              onClick={() => inputRef.current?.click()}
              aria-describedby={`${id}-label`}
              disabled={disabled}
            >
              <FolderOpen className="h-4 w-4" aria-hidden /> {current ? 'Substituir arquivo' : 'Explorar arquivos locais'}
            </button>
            {badges && (
              <p className="mt-4 flex flex-wrap justify-center gap-2">
                {badges.map((b) => (
                  <span key={b} className="chip bg-surface-highest text-[11px] uppercase tracking-wider text-ink-muted">
                    {b}
                  </span>
                ))}
              </p>
            )}
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          tabIndex={-1}
          aria-labelledby={`${id}-label`}
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {shownError && (
        <p className="mt-1.5 text-sm font-medium text-danger" role="alert">
          {shownError}
        </p>
      )}
    </div>
  );
}
