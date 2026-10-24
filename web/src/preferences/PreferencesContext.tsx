import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { safeStorage } from '../lib/api';

/**
 * Preferências globais de acessibilidade (barra superior e tela de login):
 *  - theme: "papel" (claro, padrão) ou "noite" (escuro);
 *  - highContrast: tema amarelo/preto, que vence os outros dois;
 *  - fontScale: botões A- / A+ (escala de toda a interface, de 87,5% a 150%);
 *  - readerOptimized: "Leitor Otimizado" (foco reforçado, links sublinhados, sem animações).
 * Ficam salvas no navegador do usuário.
 */
export type Theme = 'papel' | 'noite';

export interface Preferences {
  theme: Theme;
  highContrast: boolean;
  fontScale: number;
  readerOptimized: boolean;
}

interface PreferencesContextValue extends Preferences {
  toggleTheme: () => void;
  toggleHighContrast: () => void;
  increaseFont: () => void;
  decreaseFont: () => void;
  toggleReaderOptimized: () => void;
}

const KEY = 'livrin_prefs';
const DEFAULTS: Preferences = { theme: 'papel', highContrast: false, fontScale: 1, readerOptimized: false };
export const FONT_MIN = 0.875;
export const FONT_MAX = 1.5;
const FONT_STEP = 0.125;

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function load(): Preferences {
  try {
    return { ...DEFAULTS, ...(JSON.parse(safeStorage.get(KEY) ?? '{}') as Partial<Preferences>) };
  } catch {
    return DEFAULTS;
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(load);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('tema-escuro', prefs.theme === 'noite');
    root.classList.toggle('hc', prefs.highContrast);
    root.classList.toggle('reader-optimized', prefs.readerOptimized);
    root.style.setProperty('--font-scale', String(prefs.fontScale));
    safeStorage.set(KEY, JSON.stringify(prefs));
  }, [prefs]);

  const toggleTheme = useCallback(
    () => setPrefs((p) => ({ ...p, theme: p.theme === 'papel' ? 'noite' : 'papel' })),
    [],
  );
  const toggleHighContrast = useCallback(() => setPrefs((p) => ({ ...p, highContrast: !p.highContrast })), []);
  const toggleReaderOptimized = useCallback(() => setPrefs((p) => ({ ...p, readerOptimized: !p.readerOptimized })), []);
  const increaseFont = useCallback(
    () => setPrefs((p) => ({ ...p, fontScale: Math.min(FONT_MAX, +(p.fontScale + FONT_STEP).toFixed(3)) })),
    [],
  );
  const decreaseFont = useCallback(
    () => setPrefs((p) => ({ ...p, fontScale: Math.max(FONT_MIN, +(p.fontScale - FONT_STEP).toFixed(3)) })),
    [],
  );

  const value = useMemo(
    () => ({ ...prefs, toggleTheme, toggleHighContrast, increaseFont, decreaseFont, toggleReaderOptimized }),
    [prefs, toggleTheme, toggleHighContrast, increaseFont, decreaseFont, toggleReaderOptimized],
  );
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences deve ser usado dentro de <PreferencesProvider>');
  return ctx;
}
