import type { AuthUser } from '../middlewares/auth';
import type { Work, WorkStatus } from '../db/schema';

/**
 * Regras de negócio de permissão sobre obras, concentradas em um só lugar.
 * Documentadas em docs/business-rules.md — mantenha os dois sincronizados.
 */

export const isAdmin = (user?: AuthUser) => user?.role === 'ADMIN';
export const isOwner = (work: Pick<Work, 'authorId'>, user?: AuthUser) => !!user && work.authorId === user.id;

/** Obras publicadas são públicas; as demais só são visíveis ao autor e à administração. */
export function canView(work: Pick<Work, 'status' | 'authorId'>, user?: AuthUser): boolean {
  return work.status === 'PUBLICADO' || isOwner(work, user) || isAdmin(user);
}

/** Status em que o autor pode editar tudo, inclusive substituir o arquivo. */
export const AUTHOR_FULL_EDIT: WorkStatus[] = ['RASCUNHO', 'REJEITADO'];
/** Status em que o autor só pode editar metadados de divulgação ("Editar Metadados"). */
export const AUTHOR_METADATA_EDIT: WorkStatus[] = ['APROVADO', 'PUBLICADO'];
/** Campos considerados "metadados" (não exigem nova curadoria). */
export const METADATA_FIELDS = ['subtitle', 'synopsis', 'authorNotes', 'tags', 'editionLabel'] as const;
/** Status em que o autor pode manter a audiodescrição página a página. */
export const AUTHOR_AUDIO_DESC_EDIT: WorkStatus[] = ['RASCUNHO', 'REJEITADO', 'EM_ANALISE'];
/** Status em que o autor pode excluir a obra. */
export const AUTHOR_DELETABLE: WorkStatus[] = ['RASCUNHO', 'REJEITADO'];

/**
 * Transições de status permitidas à administração. O autor só tem duas ações
 * de status: enviar para análise (submit) e publicar uma obra aprovada (publish).
 */
export const ADMIN_TRANSITIONS: Record<WorkStatus, WorkStatus[]> = {
  RASCUNHO: ['EM_ANALISE', 'ARQUIVADO'],
  EM_ANALISE: ['APROVADO', 'REJEITADO', 'RASCUNHO'],
  APROVADO: ['PUBLICADO', 'EM_ANALISE', 'REJEITADO'],
  PUBLICADO: ['ARQUIVADO', 'EM_ANALISE'],
  REJEITADO: ['EM_ANALISE', 'ARQUIVADO'],
  ARQUIVADO: ['PUBLICADO', 'RASCUNHO'],
};

export const DEFAULT_REVIEW_CHECKS = [
  'Contraste de balões & onomatopeias',
  'Audiodescrição das cenas de ação',
  'Ordem de foco para leitor de tela',
  'Classificação etária & sensibilidade',
];
