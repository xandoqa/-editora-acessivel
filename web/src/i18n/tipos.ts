/**
 * Tipos do sistema de tradução.
 *
 * O dicionário de português é a referência, e tudo aqui é derivado dele. É o
 * que transforma "faltou traduzir" em erro de compilação: um idioma declarado
 * como `Dicionario` precisa ter **exatamente** as mesmas chaves, nem a mais
 * nem a menos. Chave inventada na chamada de `t()` também não passa.
 */

import type { ptBR } from './pt-BR';

export type ChaveDeTraducao = keyof typeof ptBR;

/** Um idioma completo. Faltar chave é erro de tipo, não defeito em produção. */
export type Dicionario = Record<ChaveDeTraducao, string>;

export type Idioma = 'pt-BR' | 'en' | 'fr';

export const IDIOMA_PADRAO: Idioma = 'pt-BR';

export interface InfoDoIdioma {
  id: Idioma;
  /** Como o idioma se chama no próprio idioma — nunca traduzido. */
  nomeNativo: string;
  /** Vai para o atributo `lang` do documento e para a formatação de datas. */
  tag: string;
}

/**
 * O nome de cada idioma aparece **no próprio idioma**, sempre.
 *
 * É a convenção de todo seletor de idioma sério, e a razão é prática: quem
 * caiu numa interface que não entende precisa reconhecer a própria língua na
 * lista. "Francês" não ajuda quem só lê francês; "Français" ajuda.
 */
export const IDIOMAS: readonly InfoDoIdioma[] = [
  { id: 'pt-BR', nomeNativo: 'Português (Brasil)', tag: 'pt-BR' },
  { id: 'en', nomeNativo: 'English', tag: 'en' },
  { id: 'fr', nomeNativo: 'Français', tag: 'fr' },
] as const;

export const IDIOMAS_VALIDOS = new Set<string>(IDIOMAS.map((i) => i.id));

export const infoDoIdioma = (id: Idioma): InfoDoIdioma => IDIOMAS.find((i) => i.id === id) ?? IDIOMAS[0];

/** Valores interpolados em `{chave}` dentro do texto. */
export type Valores = Record<string, string | number>;
