import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { safeStorage } from '../lib/api';
import { CLASSES_DE_TEMA, TEMAS_VALIDOS, infoDoTema, type Theme } from './temas';

/**
 * Preferências globais de acessibilidade (barra superior e tela de login):
 *  - theme: um dos seis temas de `temas.ts` — "papel" é o padrão;
 *  - highContrast: amarelo/preto, que vence QUALQUER tema escolhido;
 *  - fontScale: botões A- / A+ (escala de toda a interface, de 87,5% a 150%);
 *  - readerOptimized: "Leitor Otimizado" (foco reforçado, links sublinhados, sem animações).
 * Ficam salvas no navegador do usuário.
 *
 * O alto contraste continua separado da lista de temas de propósito: é recurso
 * de acessibilidade, não gosto, e precisa continuar a um clique de distância.
 */
export type { Theme };

export interface Preferences {
  theme: Theme;
  /** O último tema claro e o último escuro, para o atalho de alternar. */
  ultimoClaro: Theme;
  ultimoEscuro: Theme;
  highContrast: boolean;
  fontScale: number;
  readerOptimized: boolean;
}

interface PreferencesContextValue extends Preferences {
  setTheme: (tema: Theme) => void;
  toggleTheme: () => void;
  toggleHighContrast: () => void;
  increaseFont: () => void;
  decreaseFont: () => void;
  toggleReaderOptimized: () => void;
}

const KEY = 'livrin_prefs';
const DEFAULTS: Preferences = {
  theme: 'papel',
  ultimoClaro: 'papel',
  ultimoEscuro: 'noite',
  highContrast: false,
  fontScale: 1,
  readerOptimized: false,
};
export const FONT_MIN = 0.875;
export const FONT_MAX = 1.5;
const FONT_STEP = 0.125;

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function load(): Preferences {
  try {
    const salvo = { ...DEFAULTS, ...(JSON.parse(safeStorage.get(KEY) ?? '{}') as Partial<Preferences>) };
    // Tema desconhecido vindo do navegador — versão antiga, armazenamento
    // adulterado, nome que deixou de existir — cai no padrão em vez de deixar
    // a interface sem classe de tema nenhuma.
    if (!TEMAS_VALIDOS.has(salvo.theme)) salvo.theme = DEFAULTS.theme;
    if (!TEMAS_VALIDOS.has(salvo.ultimoClaro) || infoDoTema(salvo.ultimoClaro).tom !== 'claro') {
      salvo.ultimoClaro = DEFAULTS.ultimoClaro;
    }
    if (!TEMAS_VALIDOS.has(salvo.ultimoEscuro) || infoDoTema(salvo.ultimoEscuro).tom !== 'escuro') {
      salvo.ultimoEscuro = DEFAULTS.ultimoEscuro;
    }
    return salvo;
  } catch {
    return DEFAULTS;
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(load);

  useEffect(() => {
    const root = document.documentElement;
    // Tira todas as classes de tema antes de pôr a escolhida: dois temas
    // aplicados ao mesmo tempo deixariam a vitória por ordem de declaração no
    // CSS, que é o tipo de coisa que funciona até alguém reordenar o arquivo.
    root.classList.remove(...CLASSES_DE_TEMA);
    const classe = infoDoTema(prefs.theme).classe;
    if (classe) root.classList.add(classe);
    root.classList.toggle('hc', prefs.highContrast);
    root.classList.toggle('reader-optimized', prefs.readerOptimized);
    root.style.setProperty('--font-scale', String(prefs.fontScale));
    safeStorage.set(KEY, JSON.stringify(prefs));
  }, [prefs]);

  const setTheme = useCallback((theme: Theme) => setPrefs((p) => ({ ...p, theme })), []);
  /**
   * Alterna entre claro e escuro, preservando a escolha dentro de cada lado.
   *
   * Quem está no Sépia e aperta o atalho vai para o escuro e, ao voltar,
   * volta para o Sépia — não para o Papel. Um atalho que descarta a escolha da
   * pessoa é um atalho que ensina a não usá-lo.
   */
  const toggleTheme = useCallback(
    () =>
      setPrefs((p) => {
        const indoParaEscuro = infoDoTema(p.theme).tom === 'claro';
        return {
          ...p,
          theme: indoParaEscuro ? p.ultimoEscuro : p.ultimoClaro,
          ultimoClaro: indoParaEscuro ? p.theme : p.ultimoClaro,
          ultimoEscuro: indoParaEscuro ? p.ultimoEscuro : p.theme,
        };
      }),
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
    () => ({ ...prefs, setTheme, toggleTheme, toggleHighContrast, increaseFont, decreaseFont, toggleReaderOptimized }),
    [prefs, setTheme, toggleTheme, toggleHighContrast, increaseFont, decreaseFont, toggleReaderOptimized],
  );
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences deve ser usado dentro de <PreferencesProvider>');
  return ctx;
}
