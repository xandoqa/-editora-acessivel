import type { CheckStatus, FeatureFlag, Role, Work, WorkFormat, WorkStatus } from '../types/api';

export const ROLE_LABEL: Record<Role, string> = {
  LEITOR: 'Leitor',
  ESCRITOR: 'Escritor',
  ADMIN: 'Administrador',
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  LEITOR: 'Acessa o catálogo, lê as obras e avalia. Não publica.',
  ESCRITOR: 'Tudo do leitor e mais: cadastra, envia e acompanha as próprias obras.',
  ADMIN: 'Tudo do escritor e mais: painel administrativo, curadoria e decisão editorial.',
};

/** Hierarquia: cada perfil pode tudo do anterior. Espelha api/src/middlewares/auth.ts. */
const ROLE_RANK: Record<Role, number> = { LEITOR: 0, ESCRITOR: 1, ADMIN: 2 };

export const hasAtLeast = (role: Role | undefined, required: Role): boolean =>
  !!role && ROLE_RANK[role] >= ROLE_RANK[required];

export const STATUS_LABEL: Record<WorkStatus, string> = {
  RASCUNHO: 'Rascunho em Edição',
  EM_ANALISE: 'Em Análise',
  APROVADO: 'No catálogo',
  REJEITADO: 'Ajustes Solicitados',
  ARQUIVADO: 'Arquivado',
};

export const STATUS_TONE: Record<WorkStatus, 'primary' | 'warn' | 'accent' | 'danger' | 'muted'> = {
  RASCUNHO: 'primary',
  EM_ANALISE: 'warn',
  APROVADO: 'accent',
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
  /*
   * O rótulo dizia "Janela de Libras — intérprete de Libras nos diálogos
   * principais", mas a plataforma não hospeda vídeo: não há campo, rota nem
   * armazenamento para isso. Era uma promessa que o sistema não cumpria, e o
   * catálogo exibia o selo para obras sem nada por trás.
   *
   * O que a marcação de fato significa é isto: a AUTORIA declara que a obra
   * traz Libras no próprio conteúdo, e a curadoria confere. Quem quiser
   * tradução para qualquer texto do site liga a janela do VLibras na barra
   * superior — que é automática, e a interface diz isso.
   */
  { flag: 'hasLibras', label: 'Libras no conteúdo', short: 'Libras', description: 'A autoria declara que a obra traz sinalização em Libras em suas páginas.', catalogKey: 'libras' },
  { flag: 'hasFacilLeitura', label: 'Leitura fácil', short: 'Fácil leitura', description: 'Vocabulário simplificado e frases curtas.', catalogKey: 'facil-leitura' },
  { flag: 'hasAltoContraste', label: 'Alto contraste', short: 'Alto contraste', description: 'A autoria declara ter trabalhado o contraste da arte.', catalogKey: 'alto-contraste' },
];

export function workFeatures(work: Pick<Work, FeatureFlag>): FeatureInfo[] {
  return FEATURES.filter((f) => work[f.flag]);
}

export const AGE_RATINGS = ['L', '10', '12', '14', '16', '18'] as const;
export const ageRatingLabel = (r: string) => (r === 'L' ? 'Livre' : `${r} Anos`);
