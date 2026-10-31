import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { safeStorage } from '../lib/api';
import { ptBR } from './pt-BR';
import { en } from './en';
import { fr } from './fr';
import {
  IDIOMAS_VALIDOS,
  IDIOMA_PADRAO,
  infoDoIdioma,
  type ChaveDeTraducao,
  type Dicionario,
  type Idioma,
  type Valores,
} from './tipos';

/**
 * Internacionalização do Livrin.
 *
 * Feito à mão, sem biblioteca, e por dois motivos — nesta ordem:
 *
 *  1. **Chave inexistente e tradução faltando viram erro de compilação.** O
 *     dicionário de português é a referência, os outros são tipados a partir
 *     dele, e `t()` só aceita chave que existe. Com biblioteca, chave errada é
 *     uma string qualquer que aparece crua na tela em produção.
 *
 *  2. É um arquivo de cem linhas. Uma dependência a mais precisa ser
 *     auditada, atualizada e explicada, e aqui pagaria por pouco: não há
 *     pluralização complexa, gênero gramatical dinâmico nem carregamento
 *     remoto de catálogo.
 *
 * Se um dia o projeto precisar de ICU MessageFormat ou de catálogos baixados
 * sob demanda, trocar por `react-i18next` não toca em componente nenhum: o
 * formato de chave é o mesmo e só este arquivo muda.
 *
 * **O que NÃO é traduzido:** conteúdo escrito por gente. Título de obra,
 * sinopse, avaliação, nome de autoria e nota da curadoria aparecem como foram
 * escritos, em qualquer idioma. Traduzir obra por máquina seria deturpar o
 * trabalho de quem publicou — e este projeto existe para publicar esse
 * trabalho, não para reescrevê-lo.
 */

const DICIONARIOS: Record<Idioma, Dicionario> = {
  'pt-BR': ptBR,
  en,
  fr,
};

const CHAVE = 'livrin_idioma';

interface I18nContextValue {
  idioma: Idioma;
  definirIdioma: (id: Idioma) => void;
  t: (chave: ChaveDeTraducao, valores?: Valores) => string;
  /** Para `toLocaleDateString` e afins. */
  tag: string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Idioma inicial: o que foi escolhido antes; senão, o do navegador, se for um
 * dos três; senão, português.
 *
 * Português é o padrão declarado do projeto, então ele é o destino de qualquer
 * dúvida — nunca o inglês por ser "neutro".
 */
function idiomaInicial(): Idioma {
  const salvo = safeStorage.get(CHAVE);
  if (salvo && IDIOMAS_VALIDOS.has(salvo)) return salvo as Idioma;

  const doNavegador = typeof navigator !== 'undefined' ? navigator.language : '';
  if (doNavegador.startsWith('pt')) return 'pt-BR';
  if (doNavegador.startsWith('en')) return 'en';
  if (doNavegador.startsWith('fr')) return 'fr';
  return IDIOMA_PADRAO;
}

/** Troca `{nome}` pelo valor correspondente. O que não for passado fica como está. */
function interpolar(texto: string, valores?: Valores): string {
  if (!valores) return texto;
  return texto.replace(/\{(\w+)\}/g, (inteiro, chave: string) =>
    chave in valores ? String(valores[chave]) : inteiro,
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [idioma, setIdioma] = useState<Idioma>(idiomaInicial);

  useEffect(() => {
    safeStorage.set(CHAVE, idioma);
    // O `lang` do documento não é detalhe: é o que faz o leitor de tela trocar
    // de voz e o navegador hifenizar certo. Interface em francês com
    // `lang="pt-BR"` é lida com sotaque português, palavra por palavra.
    document.documentElement.lang = infoDoIdioma(idioma).tag;
  }, [idioma]);

  const definirIdioma = useCallback((id: Idioma) => setIdioma(id), []);

  const t = useCallback(
    (chave: ChaveDeTraducao, valores?: Valores) => {
      const dicionario = DICIONARIOS[idioma];
      // O acesso é tipado, então a ausência só aconteceria com dado corrompido
      // em `localStorage`. Cair no português é melhor do que mostrar a chave.
      const texto = dicionario[chave] ?? ptBR[chave];
      return interpolar(texto, valores);
    },
    [idioma],
  );

  const valor = useMemo(
    () => ({ idioma, definirIdioma, t, tag: infoDoIdioma(idioma).tag }),
    [idioma, definirIdioma, t],
  );

  return <I18nContext.Provider value={valor}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n deve ser usado dentro de <I18nProvider>');
  return ctx;
}

/** Atalho para quem só precisa traduzir: `const t = useT()`. */
export function useT(): I18nContextValue['t'] {
  return useI18n().t;
}
