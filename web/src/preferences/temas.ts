/**
 * Os temas do Livrin.
 *
 * Um tema é um conjunto de tokens de cor em `styles/global.css`, aplicado por
 * uma classe no elemento raiz. Nenhum componente conhece cor: todos leem token.
 * É por isso que acrescentar um tema não exige tocar em componente nenhum — e
 * é a razão de a lista morar aqui, e não espalhada pela interface.
 *
 * O **alto contraste não está nesta lista**, de propósito. Ele não é gosto, é
 * recurso de acessibilidade, vence qualquer tema escolhido e por isso continua
 * tendo botão próprio, alcançável num clique em vez de enterrado numa lista.
 *
 * Todos os pares de texto de todos os temas passam em AAA (7:1) sobre todas as
 * superfícies do próprio tema, e todo limite de componente passa no critério
 * 1.4.11 (3:1). Isso não é promessa: `ferramentas/conferir-contraste.py` mede
 * os 39 pares de cada tema e reprova se algum cair.
 */

import type { ChaveDeTraducao } from '../i18n/tipos';

export type Theme = 'papel' | 'noite' | 'sepia' | 'tinta' | 'grafite' | 'indigo';

export interface InfoDoTema {
  id: Theme;
  /** Classe aplicada em `<html>`. O Papel é o padrão do `:root`, sem classe. */
  classe: string | null;
  /** Claro ou escuro — agrupa a lista e escolhe o ícone. */
  tom: 'claro' | 'escuro';
  nome: ChaveDeTraducao;
  descricao: ChaveDeTraducao;
}

export const TEMAS: readonly InfoDoTema[] = [
  {
    id: 'papel',
    classe: null,
    tom: 'claro',
    nome: 'tema.papel.nome',
    descricao: 'tema.papel.descricao',
  },
  {
    id: 'sepia',
    classe: 'tema-sepia',
    tom: 'claro',
    nome: 'tema.sepia.nome',
    descricao: 'tema.sepia.descricao',
  },
  {
    id: 'tinta',
    classe: 'tema-tinta',
    tom: 'claro',
    nome: 'tema.tinta.nome',
    descricao: 'tema.tinta.descricao',
  },
  {
    id: 'noite',
    classe: 'tema-escuro',
    tom: 'escuro',
    nome: 'tema.noite.nome',
    descricao: 'tema.noite.descricao',
  },
  {
    id: 'grafite',
    classe: 'tema-grafite',
    tom: 'escuro',
    nome: 'tema.grafite.nome',
    descricao: 'tema.grafite.descricao',
  },
  {
    id: 'indigo',
    classe: 'tema-indigo',
    tom: 'escuro',
    nome: 'tema.indigo.nome',
    descricao: 'tema.indigo.descricao',
  },
] as const;

/** Todas as classes de tema, para limpar a raiz antes de aplicar a escolhida. */
export const CLASSES_DE_TEMA = TEMAS.map((t) => t.classe).filter((c): c is string => c !== null);

export const TEMAS_VALIDOS = new Set<string>(TEMAS.map((t) => t.id));

export const infoDoTema = (id: Theme): InfoDoTema => TEMAS.find((t) => t.id === id) ?? TEMAS[0];
