// Tipos de domínio da Editora Livrin
// Refletem as telas do protótipo: catálogo público, painel do autor,
// submissão de obra e fluxo de avaliação editorial.

export type UserRole = "autor" | "leitor";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
}

export type PublicUser = Omit<User, "passwordHash">;

export type AccessibilityFeatureKey =
  | "audiodescricao"
  | "altoContraste"
  | "fontesAcessiveis"
  | "librasNosDialogos"
  | "textoAlternativo"
  | "leitorDeTela";

export interface AccessibilityFeatures {
  audiodescricao: boolean;
  altoContraste: boolean;
  fontesAcessiveis: boolean;
  librasNosDialogos: boolean;
  textoAlternativo: boolean;
  leitorDeTela: boolean;
}

export type WorkStatus =
  | "rascunho" // em edição pelo autor, ainda não enviado
  | "em_analise" // enviado, etapas 1-3 do fluxo editorial em andamento
  | "aprovada" // aprovada pelo comitê, pronta para publicar
  | "publicada" // disponível no catálogo público
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

export interface Work {
  id: string;
  authorId: string;
  title: string;
  genre: string;
  synopsis: string;
  pageCount: number;
  formats: string[]; // ex: ["PDF", "EPUB 3", "DAISY 2.02", "MP3"]
  accessibility: AccessibilityFeatures;
  status: WorkStatus;
  wcagLevel: "A" | "AA" | "AAA" | null;
  audiodescricaoProgress: number; // 0-100
  reviewStages: ReviewStage[];
  reviewNotes: ReviewNote[];
  coverColor: string; // usado no front para gerar a capa enquanto não há upload de imagem
  readCount: number;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface AuthorStats {
  activeWorks: number;
  totalReaders: number;
  accessibilityIndex: number; // média de rating das obras publicadas
  readyToLaunch: number;
}
