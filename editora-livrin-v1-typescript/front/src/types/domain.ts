export type UserRole = "autor" | "leitor";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface AccessibilityFeatures {
  audiodescricao: boolean;
  altoContraste: boolean;
  fontesAcessiveis: boolean;
  librasNosDialogos: boolean;
  textoAlternativo: boolean;
  leitorDeTela: boolean;
}

export interface WorkSummary {
  id: string;
  title: string;
  genre: string;
  synopsis: string;
  pageCount: number;
  formats: string[];
  accessibility: AccessibilityFeatures;
  wcagLevel: "A" | "AA" | "AAA" | null;
  coverColor: string;
  readCount: number;
  rating: number | null;
  publishedAt?: string;
}

export type WorkStatus =
  | "rascunho"
  | "em_analise"
  | "aprovada"
  | "publicada"
  | "recusada";

export interface ReviewStage {
  id: 1 | 2 | 3;
  title: string;
  status: "concluido" | "em_andamento" | "pendente";
  detail?: string;
  completedAt?: string;
}

export interface ReviewNote {
  id: string;
  authorName: string;
  authorRole: string;
  message: string;
  createdAt: string;
}

export interface Work extends WorkSummary {
  authorId: string;
  status: WorkStatus;
  audiodescricaoProgress: number;
  reviewStages: ReviewStage[];
  reviewNotes: ReviewNote[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthorStats {
  activeWorks: number;
  totalReaders: number;
  accessibilityIndex: number;
  readyToLaunch: number;
}
