import { useEffect, useId, useRef, useState, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, Star, X } from 'lucide-react';
import { STATUS_LABEL, STATUS_TONE } from '../../lib/labels';
import { PilhaDeLivros } from './Ornamentos';
import { initials } from '../../lib/format';
import type { WorkStatus } from '../../types/api';

/* --------------------------------- Badges --------------------------------- */

const TONES = {
  primary: 'bg-primary-container text-primary-onContainer',
  warn: 'bg-warn-container text-warn',
  accent: 'bg-accent-container text-accent',
  danger: 'bg-danger-container text-danger',
  muted: 'bg-surface-highest text-ink-muted',
  admin: 'bg-admin-container text-admin',
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = 'muted', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={`chip hc-border border border-transparent ${TONES[tone]} ${className}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: WorkStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

/* --------------------------------- Estados -------------------------------- */

export function Spinner({ label = 'Carregando...' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-ink-muted" role="status">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span>{label}</span>
    </span>
  );
}

export function LoadingState({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[30vh] items-center justify-center">
      <Spinner label={label} />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card mx-auto my-10 max-w-lg p-8 text-center" role="alert">
      <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-danger" aria-hidden />
      <p className="mb-4 text-ink">{message}</p>
      {onRetry && (
        <button type="button" className="btn-secondary" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-4 p-10 text-center">
      <PilhaDeLivros className="h-24 w-28 text-primary" />
      <p className="font-display text-xl font-extrabold text-ink">{title}</p>
      {description && <p className="max-w-md text-sm text-ink-muted">{description}</p>}
      {action}
    </div>
  );
}

/* ------------------------------ Formulários ------------------------------- */

interface FieldWrapProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  aside?: ReactNode;
  children: (ids: { id: string; describedBy?: string }) => ReactNode;
}

export function Field({ label, error, hint, required, aside, children }: FieldWrapProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="label">
          {label}
          {required && <span className="ml-1 text-danger" aria-hidden>*</span>}
        </label>
        {aside && <span className="text-xs font-semibold text-ink-subtle">{aside}</span>}
      </div>
      {children({ id, describedBy: [hintId, errId].filter(Boolean).join(' ') || undefined })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-ink-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: ReactNode; aside?: ReactNode };
export function TextInput({ label, error, hint, aside, required, className = '', ...rest }: InputProps) {
  return (
    <Field label={label} error={error} hint={hint} required={required} aside={aside}>
      {({ id, describedBy }) => (
        <input id={id} aria-describedby={describedBy} aria-invalid={!!error} required={required} className={`input ${className}`} {...rest} />
      )}
    </Field>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; hint?: ReactNode };
export function SelectInput({ label, error, hint, required, children, className = '', ...rest }: SelectProps) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {({ id, describedBy }) => (
        <select id={id} aria-describedby={describedBy} aria-invalid={!!error} required={required} className={`input ${className}`} {...rest}>
          {children}
        </select>
      )}
    </Field>
  );
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: ReactNode; aside?: ReactNode };
export function TextArea({ label, error, hint, aside, required, className = '', ...rest }: TextAreaProps) {
  return (
    <Field label={label} error={error} hint={hint} required={required} aside={aside}>
      {({ id, describedBy }) => (
        <textarea id={id} aria-describedby={describedBy} aria-invalid={!!error} required={required} className={`input ${className}`} {...rest} />
      )}
    </Field>
  );
}

/* --------------------------------- Diálogo -------------------------------- */

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

/** Modal acessível baseado no <dialog> nativo (foco preso e Esc para fechar). */
export function Modal({ open, title, onClose, children, footer, wide }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto border border-outline bg-surface p-0 text-ink shadow-card backdrop:bg-black/70"
      style={{ width: `min(94vw, ${wide ? 760 : 520}px)` }}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-center justify-between border-b border-outline/25 px-6 py-4">
            <h2 id={titleId} className="text-lg font-bold">
              {title}
            </h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-3 border-t border-outline/25 px-6 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', danger, busy, onConfirm, onClose }: ConfirmProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-ink-muted">{message}</div>
    </Modal>
  );
}

/* ------------------------------- Paginação -------------------------------- */

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Paginação">
      <button type="button" className="btn-secondary" onClick={() => onChange(page - 1)} disabled={page <= 1}>
        <ChevronLeft className="h-4 w-4" aria-hidden /> Anterior
      </button>
      <span className="text-sm text-ink-muted" aria-current="page">
        Página {page} de {totalPages}
      </span>
      <button type="button" className="btn-secondary" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
        Próxima <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </nav>
  );
}

/* ---------------------------------- Misc ---------------------------------- */

export function Avatar({ name, size = 'md', tone = 'primary' }: { name: string; size?: 'sm' | 'md' | 'lg'; tone?: 'primary' | 'accent' }) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base' };
  const tones = { primary: 'bg-primary-container text-primary-onContainer', accent: 'bg-accent-container text-accent' };
  return (
    <span className={`hc-border inline-flex shrink-0 items-center justify-center rounded-full border border-transparent font-bold ${sizes[size]} ${tones[tone]}`} aria-hidden>
      {initials(name)}
    </span>
  );
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-accent" role="img" aria-label={`${value.toFixed(1)} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} style={{ width: size, height: size }} className={n <= Math.round(value) ? 'fill-current' : 'opacity-40'} aria-hidden />
      ))}
    </span>
  );
}

/**
 * Capa da obra com fallback tipográfico.
 *
 * O fallback vale tanto para obra sem capa quanto para capa que não carrega:
 * sem o `onError`, um arquivo ausente no volume de uploads deixava o ícone de
 * imagem quebrada do navegador espalhado pelo catálogo.
 */
export function Cover({ url, title, className = '', alt }: { url: string | null; title: string; className?: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);

  if (url && !failed) {
    return (
      <img
        src={url}
        alt={alt ?? `Capa da obra ${title}`}
        className={`object-cover ${className}`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-primary-container to-surface-highest p-3 text-center ${className}`}
      role="img"
      aria-label={`Obra ${title} sem capa`}
    >
      <span className="font-display text-sm font-bold text-primary-onContainer">{title}</span>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions, icon }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        {eyebrow && (
          <p className="eyebrow mb-2 flex items-center gap-2 text-accent">
            {icon}
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">{title}</h1>
        {description && <p className="mt-3 text-base leading-relaxed text-ink-muted md:text-lg">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}
