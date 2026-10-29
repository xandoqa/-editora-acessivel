import type { AuthUser } from '../middlewares/auth';
import type { Work, WorkStatus } from '../db/schema';

/**
 * Regras de negócio de permissão sobre obras, concentradas em um só lugar.
 * Documentadas em docs/business-rules.md — mantenha os dois sincronizados.
 */

export const isAdmin = (user?: AuthUser) => user?.role === 'ADMIN';
export const isOwner = (work: Pick<Work, 'authorId'>, user?: AuthUser) => !!work && !!user && work.authorId === user.id;

/**
 * Único estado em que a obra aparece publicamente.
 *
 * Aprovar é o que publica (seção 8 da especificação). Antes existia um estado
 * PUBLICADO separado e o catálogo só mostrava ele: o administrador aprovava, a
 * obra ficava em APROVADO e nunca aparecia, porque faltava uma segunda ação do
 * autor. Esta constante existe para que esse acoplamento fique em um lugar só.
 */
export const PUBLIC_STATUS: WorkStatus = 'APROVADO';

/** Obras aprovadas são públicas; as demais só são visíveis ao autor e à administração. */
export function canView(work: Pick<Work, 'status' | 'authorId'>, user?: AuthUser): boolean {
  return work.status === PUBLIC_STATUS || isOwner(work, user) || isAdmin(user);
}

/** Status em que o autor pode editar tudo, inclusive substituir o arquivo. */
export const AUTHOR_FULL_EDIT: WorkStatus[] = ['RASCUNHO', 'REJEITADO'];
/** Status em que o autor só pode editar metadados de divulgação ("Editar Metadados"). */
export const AUTHOR_METADATA_EDIT: WorkStatus[] = ['APROVADO'];
/**
 * Campos considerados "metadados" (não exigem nova curadoria).
 *
 * A monetização entra aqui porque é decisão comercial da autoria, não
 * conteúdo: mudar o preço de uma obra já aprovada não altera o que a curadoria
 * examinou, e portanto não derruba o Selo Livrin. O contrário também vale —
 * escolher um preço nunca publica nem aprova nada (ver ADR 014).
 */
export const METADATA_FIELDS = [
  'subtitle',
  'synopsis',
  'authorNotes',
  'tags',
  'editionLabel',
  'monetization',
  'priceCents',
  'adRevenueAuthorShare',
] as const;
/** Status em que o autor pode manter a audiodescrição página a página. */
export const AUTHOR_AUDIO_DESC_EDIT: WorkStatus[] = ['RASCUNHO', 'REJEITADO', 'EM_ANALISE'];
/** Status em que o autor pode excluir a obra. */
export const AUTHOR_DELETABLE: WorkStatus[] = ['RASCUNHO', 'REJEITADO'];

/**
 * Transições de status permitidas à administração.
 *
 * O autor tem uma única ação de status: enviar para análise (submit). A partir
 * daí quem decide é a curadoria — inclusive a publicação, que acontece junto
 * com a aprovação.
 */
export const ADMIN_TRANSITIONS: Record<WorkStatus, WorkStatus[]> = {
  RASCUNHO: ['EM_ANALISE', 'ARQUIVADO'],
  EM_ANALISE: ['APROVADO', 'REJEITADO', 'RASCUNHO'],
  APROVADO: ['ARQUIVADO', 'EM_ANALISE', 'REJEITADO'],
  REJEITADO: ['EM_ANALISE', 'ARQUIVADO'],
  ARQUIVADO: ['APROVADO', 'RASCUNHO'],
};

export const DEFAULT_REVIEW_CHECKS = [
  'Contraste de balões & onomatopeias',
  'Audiodescrição das cenas de ação',
  'Ordem de foco para leitor de tela',
  'Classificação etária & sensibilidade',
];
