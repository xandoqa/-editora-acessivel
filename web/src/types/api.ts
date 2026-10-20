/** Tipos das respostas da API (espelham os DTOs de api/src/services). */

export type Role = 'USER' | 'ADMIN';
export type WorkStatus = 'RASCUNHO' | 'EM_ANALISE' | 'APROVADO' | 'PUBLICADO' | 'REJEITADO' | 'ARQUIVADO';
export type WorkFormat = 'QUADRINHO' | 'LIVRO' | 'MANGA_WEBCOMIC' | 'ZINE';
export type FileType = 'PDF' | 'EPUB' | 'CBZ' | 'CBR';
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
  readyToLaunch: number;
  published: number;
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
