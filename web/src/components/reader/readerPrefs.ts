import { useEffect, useState } from 'react';
import { safeStorage } from '../../lib/api';

/** Preferências de visualização do Leitor Acessível ("Preferências de Visualização e Leitura"). */
export type Spacing = 'padrao' | 'amplo' | 'largo';
export type Typography = 'inter' | 'lexend' | 'opendyslexic';
export type Palette = 'escuro' | 'claro' | 'sepia' | 'amarelo';

export interface ReaderPrefs {
  scale: number;
  spacing: Spacing;
  typography: Typography;
  palette: Palette;
}

export const DEFAULT_READER_PREFS: ReaderPrefs = { scale: 100, spacing: 'amplo', typography: 'inter', palette: 'escuro' };
export const SCALE_MIN = 70;
export const SCALE_MAX = 200;

export const SPACING_LABEL: Record<Spacing, string> = { padrao: 'Padrão', amplo: 'Amplo', largo: 'Largo' };
export const SPACING_VALUES: Record<Spacing, { lineHeight: number; letterSpacing: string; wordSpacing: string }> = {
  padrao: { lineHeight: 1.5, letterSpacing: '0', wordSpacing: '0' },
  amplo: { lineHeight: 1.85, letterSpacing: '0.02em', wordSpacing: '0.06em' },
  largo: { lineHeight: 2.2, letterSpacing: '0.05em', wordSpacing: '0.16em' },
};

export const TYPOGRAPHY_LABEL: Record<Typography, string> = {
  inter: 'Inter Padrão (Sem Serifa)',
  lexend: 'Lexend (Leitura fluida)',
  opendyslexic: 'OpenDyslexic (Dislexia)',
};
export const TYPOGRAPHY_FAMILY: Record<Typography, string> = {
  inter: '"Inter Variable", Inter, system-ui, sans-serif',
  lexend: 'Lexend, system-ui, sans-serif',
  opendyslexic: 'OpenDyslexic, "Comic Sans MS", sans-serif',
};

export interface PaletteColors {
  label: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  swatch: string;
  /** Filtro aplicado às páginas em imagem (PDF/CBZ), já que não é possível recolorir arte. */
  imageFilter: string;
}

export const PALETTES: Record<Palette, PaletteColors> = {
  escuro: { label: 'Escuro', bg: '#14161b', surface: '#1f232a', text: '#e6e9ef', muted: '#bec4cf', accent: '#6ee7a8', swatch: '#0b0c0f', imageFilter: 'none' },
  // `accent` é cor de TEXTO (rótulo de audiodescrição e fala alternada), não só
  // de borda: por isso precisa de 7:1, e não dos 3:1 de elemento não textual.
  // Os valores anteriores (#0b6b3a e #7a4b0f) ficavam em 6,0–6,6:1 — passavam
  // em AA e reprovavam no AAA que o projeto declara. Medidos: 7,06 e 7,08.
  claro: { label: 'Claro', bg: '#f7f7f5', surface: '#ffffff', text: '#16181d', muted: '#3b4250', accent: '#0a6134', swatch: '#f1f1f1', imageFilter: 'none' },
  sepia: { label: 'Sépia', bg: '#f3e7cf', surface: '#faf1de', text: '#3d2a12', muted: '#5a4425', accent: '#6c420d', swatch: '#f0deb8', imageFilter: 'sepia(0.55)' },
  amarelo: { label: 'Amarelo/Preto', bg: '#000000', surface: '#000000', text: '#ffff00', muted: '#ffff00', accent: '#ffffff', swatch: '#ffd400', imageFilter: 'grayscale(1) contrast(1.35)' },
};

const KEY = 'livrin_reader_prefs';

export function useReaderPrefs() {
  const [prefs, setPrefs] = useState<ReaderPrefs>(() => {
    try {
      return { ...DEFAULT_READER_PREFS, ...(JSON.parse(safeStorage.get(KEY) ?? '{}') as Partial<ReaderPrefs>) };
    } catch {
      return DEFAULT_READER_PREFS;
    }
  });
  useEffect(() => safeStorage.set(KEY, JSON.stringify(prefs)), [prefs]);
  return [prefs, setPrefs] as const;
}

/** Estilos de texto do leitor (aplicados à audiodescrição, falas, texto de PDF e EPUB). */
export function textStyle(prefs: ReaderPrefs): React.CSSProperties {
  const s = SPACING_VALUES[prefs.spacing];
  return {
    fontFamily: TYPOGRAPHY_FAMILY[prefs.typography],
    fontSize: `${prefs.scale}%`,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
    wordSpacing: s.wordSpacing,
  };
}
