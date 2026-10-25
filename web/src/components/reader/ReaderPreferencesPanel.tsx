import { SlidersHorizontal } from 'lucide-react';
import {
  PALETTES,
  SCALE_MAX,
  SCALE_MIN,
  SPACING_LABEL,
  TYPOGRAPHY_LABEL,
  type Palette,
  type ReaderPrefs,
  type Spacing,
  type Typography,
} from './readerPrefs';

interface Props {
  prefs: ReaderPrefs;
  onChange: (next: ReaderPrefs) => void;
}

const seg = (active: boolean) =>
  `min-h-[40px] rounded-lg px-3 text-sm font-semibold transition-colors ${active ? 'bg-surface-highest text-primary' : 'text-ink-muted hover:text-ink'}`;

/** Painel "Preferências de Visualização e Leitura" — alterações aplicadas em tempo real. */
export default function ReaderPreferencesPanel({ prefs, onChange }: Props) {
  const set = <K extends keyof ReaderPrefs>(key: K, value: ReaderPrefs[K]) => onChange({ ...prefs, [key]: value });
  return (
    <section className="border-b border-outline/25 pb-6" aria-labelledby="prefs-title">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="prefs-title" className="eyebrow flex items-center gap-2 text-ink-muted">
          <SlidersHorizontal className="h-4 w-4" aria-hidden /> Preferências de visualização e leitura
        </h2>
        <span className="text-xs text-ink-subtle">aplicado em tempo real</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        <fieldset className="rounded-[10px_14px_10px_14px] border border-outline/40 p-3">
          <legend className="sr-only">Escala do texto</legend>
          <p className="mb-2 text-sm font-medium text-ink-muted" aria-hidden>
            Escala do Texto
          </p>
          <div className="flex items-center justify-between rounded-lg bg-surface-low p-1">
            <button type="button" className={seg(false)} onClick={() => set('scale', Math.max(SCALE_MIN, prefs.scale - 10))} disabled={prefs.scale <= SCALE_MIN} aria-label="Diminuir escala do texto">
              A-
            </button>
            <output className="font-semibold text-primary" aria-live="polite">
              {prefs.scale}%
            </output>
            <button type="button" className={seg(false)} onClick={() => set('scale', Math.min(SCALE_MAX, prefs.scale + 10))} disabled={prefs.scale >= SCALE_MAX} aria-label="Aumentar escala do texto">
              A+
            </button>
          </div>
        </fieldset>

        <fieldset className="rounded-[10px_14px_10px_14px] border border-outline/40 p-3">
          <legend className="float-left mb-2 w-full text-sm font-medium text-ink-muted">Espaçamento Vertical</legend>
          <div className="clear-both flex rounded-lg bg-surface-low p-1" role="radiogroup" aria-label="Espaçamento vertical">
            {(Object.keys(SPACING_LABEL) as Spacing[]).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={prefs.spacing === s} className={`${seg(prefs.spacing === s)} flex-1`} onClick={() => set('spacing', s)}>
                {SPACING_LABEL[s]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="rounded-[10px_14px_10px_14px] border border-outline/40 p-3 sm:col-span-2 2xl:col-span-1">
          <label htmlFor="typography" className="mb-2 block text-sm font-medium text-ink-muted">
            Tipografia
          </label>
          <select id="typography" className="input py-2 text-sm" value={prefs.typography} onChange={(e) => set('typography', e.target.value as Typography)}>
            {(Object.keys(TYPOGRAPHY_LABEL) as Typography[]).map((t) => (
              <option key={t} value={t}>
                {TYPOGRAPHY_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="mt-4 flex flex-wrap items-center gap-2">
        <legend className="mb-2 mr-3 float-left pt-2 text-sm font-medium text-ink-muted">Paleta Visual da Página:</legend>
        {(Object.keys(PALETTES) as Palette[]).map((p) => {
          const active = prefs.palette === p;
          return (
            <button
              key={p}
              type="button"
              aria-pressed={active}
              onClick={() => set('palette', p)}
              className={`flex min-h-[44px] items-center gap-2 border-b-2 px-2 text-sm transition-colors ${
                active ? 'border-primary font-semibold text-ink' : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              <span className="h-3.5 w-3.5 rounded-full border border-outline-strong" style={{ background: PALETTES[p].swatch }} aria-hidden />
              {PALETTES[p].label}
            </button>
          );
        })}
      </fieldset>
    </section>
  );
}
