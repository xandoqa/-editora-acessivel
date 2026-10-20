import type { CheckStatus, FeatureFlag, Work, WorkFormat, WorkStatus } from '../types/api';

export const STATUS_LABEL: Record<WorkStatus, string> = {
  RASCUNHO: 'Rascunho em Edição',
  EM_ANALISE: 'Em Análise',
  APROVADO: 'Aprovado pelo Comitê',
  PUBLICADO: 'Publicado',
  REJEITADO: 'Ajustes Solicitados',
  ARQUIVADO: 'Arquivado',
};

export const STATUS_TONE: Record<WorkStatus, 'primary' | 'warn' | 'accent' | 'danger' | 'muted'> = {
  RASCUNHO: 'primary',
  EM_ANALISE: 'warn',
  APROVADO: 'accent',
  PUBLICADO: 'accent',
  REJEITADO: 'danger',
  ARQUIVADO: 'muted',
};

export const FORMAT_LABEL: Record<WorkFormat, string> = {
  QUADRINHO: 'Quadrinho / HQ',
  LIVRO: 'Livro / Ficção',
  MANGA_WEBCOMIC: 'Mangá / Webcomic',
  ZINE: 'Zine',
};

export const FORMAT_SHORT: Record<WorkFormat, string> = {
  QUADRINHO: 'HQ',
  LIVRO: 'Livro',
  MANGA_WEBCOMIC: 'Webcomic',
  ZINE: 'Zine',
};

export const CHECK_LABEL: Record<CheckStatus, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
};

export interface FeatureInfo {
  flag: FeatureFlag;
  label: string;
  short: string;
  description: string;
  catalogKey: string;
}

/** Recursos de acessibilidade, na ordem em que aparecem nos selos e filtros. */
export const FEATURES: FeatureInfo[] = [
  { flag: 'hasAudioDesc', label: 'Audiodescrição', short: 'Audio HQ', description: 'Descrição narrada de cada quadro/cena.', catalogKey: 'audiodescricao' },
  { flag: 'hasLeitorTela', label: 'Compatível com Leitores de Tela', short: 'Leitor de tela', description: 'Estrutura de títulos H1–H6 com ordem de leitura lógica.', catalogKey: 'leitor-tela' },
  { flag: 'hasTextoAlt', label: 'Texto alternativo', short: 'Texto alt.', description: 'Descrições semânticas em todos os quadros e balões.', catalogKey: 'texto-alt' },
  { flag: 'hasLibras', label: 'Janela de Libras', short: 'Vídeo Libras', description: 'Intérprete de Libras nos diálogos principais.', catalogKey: 'libras' },
  { flag: 'hasFacilLeitura', label: 'Leitura fácil', short: 'Fácil leitura', description: 'Vocabulário simplificado e frases curtas.', catalogKey: 'facil-leitura' },
  { flag: 'hasAltoContraste', label: 'Alto contraste', short: 'WCAG AAA', description: 'Paleta testada com contraste mínimo de 7:1.', catalogKey: 'alto-contraste' },
];

export function workFeatures(work: Pick<Work, FeatureFlag>): FeatureInfo[] {
  return FEATURES.filter((f) => work[f.flag]);
}

export const AGE_RATINGS = ['L', '10', '12', '14', '16', '18'] as const;
export const ageRatingLabel = (r: string) => (r === 'L' ? 'Livre' : `${r} Anos`);
