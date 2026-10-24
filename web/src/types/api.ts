/** Tipos das respostas da API (espelham os DTOs de api/src/services). */

/**
 * Três perfis (seção 7 da especificação), em ordem de permissão crescente:
 * LEITOR lê e avalia; ESCRITOR também publica; ADMIN também faz curadoria.
 */
export type Role = 'LEITOR' | 'ESCRITOR' | 'ADMIN';
/** APROVADO é o estado visível no catálogo: aprovar já publica (seção 8). */
export type WorkStatus = 'RASCUNHO' | 'EM_ANALISE' | 'APROVADO' | 'REJEITADO' | 'ARQUIVADO';
export type WorkFormat = 'QUADRINHO' | 'LIVRO' | 'MANGA_WEBCOMIC' | 'ZINE';
export type FileType = 'PDF' | 'DOCX' | 'EPUB' | 'CBZ' | 'CBR';
export type CheckStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'APROVADO' | 'REPROVADO';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  headline: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Genre {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  worksCount: number;
}

export type FeatureFlag = 'hasAudioDesc' | 'hasLeitorTela' | 'hasTextoAlt' | 'hasLibras' | 'hasFacilLeitura' | 'hasAltoContraste';

export interface Work extends Record<FeatureFlag, boolean> {
  id: number;
  title: string;
  subtitle: string | null;
  status: WorkStatus;
  format: WorkFormat;
  pages: number;
  synopsis: string;
  editionLabel: string | null;
  isbn: string | null;
  ageRating: string;
  authorNotes: string | null;
  tags: string[];
  audioDescriber: string | null;
  audioNarrator: string | null;
  audioReviewer: string | null;
  coverUrl: string | null;
  hasFile: boolean;
  file: { type: FileType; sizeBytes: number; originalName: string } | null;
  hasAudio: boolean;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: number; name: string; headline: string | null };
  genre: { id: number; name: string };
  rating: { average: number; count: number };
  readsCount: number;
  /**
   * Selo de Qualidade Livrin: o resumo do que a curadoria verificou.
   * `checks` só vem no detalhe da obra (GET /works/:id), não na listagem.
   */
  seal: {
    granted: boolean;
    grantedAt: string | null;
    reviewer: string | null;
    checks?: ReviewCheck[];
  };
}

export interface MyWork extends Work {
  reviewProgress: number;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface CatalogResponse extends Paginated<Work> {
  catalogTotal: number;
}

export interface Dialogue {
  speaker: string;
  tone?: string;
  text: string;
}

export interface AudioDescription {
  id: number;
  workId: number;
  pageNumber: number;
  chapterLabel: string | null;
  chapterTitle: string | null;
  panelLabel: string | null;
  description: string;
  dialogues: Dialogue[];
}

export interface ReviewCheck {
  id: number;
  label: string;
  status: CheckStatus;
  position: number;
  updatedAt: string;
}

export interface ReviewNote {
  id: number;
  content: string;
  createdAt: string;
  user: { id: number; name: string; role: Role; headline: string | null };
}

export interface Review {
  workId: number;
  status: WorkStatus;
  stage: 1 | 2 | 3;
  protocol: string;
  progress: number;
  checks: ReviewCheck[];
  notes: ReviewNote[];
}

export interface Feedback {
  id: number;
  rating: number;
  content: string;
  aspect: string | null;
  isVisible: boolean;
  createdAt: string;
  user: { id: number; name: string; headline: string | null };
  work: { id: number; title: string };
}

export interface MySummary {
  drafts: number;
  inReview: number;
  /** Obras no catálogo (status APROVADO). */
  published: number;
  archived: number;
  rejected: number;
  total: number;
}

export interface EngagementItem {
  count: number;
  percent: number;
}

export interface AuthorDashboard {
  summary: MySummary;
  totalReads: number;
  worksWithReads: number;
  accessibilityIndex: { average: number; count: number };
  engagement: { sessions: number; audioDesc: EngagementItem; highContrast: EngagementItem; dyslexiaZoom: EngagementItem };
  highlight: MyWork | null;
  feedbacks: Feedback[];
  works: MyWork[];
}

export interface AdminStats {
  users: { total: number; active: number; admins: number; newLast30: number };
  works: { total: number; byStatus: Record<WorkStatus, number>; byFormat: Partial<Record<WorkFormat, number>> };
  feedbacks: { total: number; hidden: number; average: number };
  sessions: { total: number; last30: number; audioDesc: number };
  genres: { total: number; active: number };
  pendingQueue: Work[];
  recentUsers: Pick<User, 'id' | 'name' | 'email' | 'role' | 'createdAt'>[];
}

export interface AdminUser extends Omit<User, 'createdAt'> {
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  worksCount: number;
}

export interface AdminUserDetail extends AdminUser {
  activity: { feedbacks: number; sessions: number; notes: number };
  works: { id: number; title: string; status: WorkStatus; updatedAt: string }[];
}

export interface AdminWorkDetail extends Work {
  checks: ReviewCheck[];
  notes: ReviewNote[];
  audioDescriptions: AudioDescription[];
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: { field: string; message: string }[] | unknown };
}

/* --------------------------------- Apoio --------------------------------- */

export type PaymentMethod = 'PIX' | 'CARTAO' | 'BOLETO';
export type DonationStatus = 'PENDENTE' | 'CONFIRMADA' | 'FALHOU' | 'CANCELADA';

/** O que a API informa antes de montar o formulário de apoio. */
export interface DonationOptions {
  provider: string;
  label: string;
  /** false quando nenhum dinheiro de verdade é movimentado. */
  isReal: boolean;
  methods: PaymentMethod[];
  minCents: number;
  maxCents: number;
  currency: string;
}

export interface Donation {
  id: number;
  amountCents: number;
  currency: string;
  method: PaymentMethod;
  status: DonationStatus;
  provider: string;
  donorName: string | null;
  message: string | null;
  workId: number | null;
  createdAt: string;
  confirmedAt: string | null;
}

/** Resposta de `POST /donations`: o registro e o que fazer em seguida. */
export interface DonationCheckout {
  donation: Donation;
  checkout: {
    checkoutUrl?: string;
    code?: string;
    instruction?: string;
    isReal: boolean;
  };
}

/** Linha da listagem administrativa: inclui quem apoiou e a obra, quando houver. */
export interface AdminDonation extends Omit<Donation, 'workId'> {
  user: { id: number; name: string; email: string } | null;
  work: { id: number; title: string } | null;
}

export interface AdminDonationStats {
  total: number;
  confirmadas: number;
  centavosConfirmados: number;
  apoiadores: number;
  provider: string;
  isReal: boolean;
}
