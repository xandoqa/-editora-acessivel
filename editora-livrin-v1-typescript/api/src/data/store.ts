import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import type {
  User,
  Work,
  WorkStatus,
  ReviewStage,
} from "../types/domain";

// Store em memória para a primeira versão da API.
// Substituir por Postgres/Prisma numa próxima iteração sem mudar as rotas,
// já que todo acesso a dados passa pelas funções exportadas abaixo.

export const users: User[] = [];
export const works: Work[] = [];

function defaultReviewStages(status: WorkStatus): ReviewStage[] {
  const base: ReviewStage[] = [
    {
      id: 1,
      title: "Recebimento do PDF / Arquivo",
      status: "pendente",
      detail:
        "Validação de integridade de arquivos, fontes embutidas e metadados de leitura universal.",
    },
    {
      id: 2,
      title: "Revisão de conteúdo & testes de acessibilidade",
      status: "pendente",
      detail:
        "Avaliação semântica das pranchas, contraste de cores, fontes para dislexia e sintetizadores de voz.",
    },
    {
      id: 3,
      title: "Aprovação final",
      status: "pendente",
      detail:
        "Emissão do selo de certificação Livrin Acessível e liberação no catálogo global.",
    },
  ];

  if (status === "em_analise") {
    base[0].status = "concluido";
    base[0].completedAt = new Date().toISOString();
    base[1].status = "em_andamento";
  }
  if (status === "aprovada" || status === "publicada") {
    base[0].status = "concluido";
    base[1].status = "concluido";
    base[2].status = "concluido";
  }
  return base;
}

function seed() {
  const passwordHash = bcrypt.hashSync("livrin123", 8);

  const marina: User = {
    id: randomUUID(),
    name: "Marina Bastos",
    email: "marina@livrin.app",
    passwordHash,
    role: "autor",
    createdAt: new Date().toISOString(),
  };
  const lorena: User = {
    id: randomUUID(),
    name: "Lorena Campolina",
    email: "lorena@livrin.app",
    passwordHash,
    role: "autor",
    createdAt: new Date().toISOString(),
  };
  users.push(marina, lorena);

  const seedWorks: Array<Partial<Work> & Pick<Work, "title" | "authorId">> = [
    {
      title: "O Último Mapa",
      authorId: marina.id,
      genre: "Ficção",
      synopsis:
        "Em uma metrópole submersa, navegadores cegos desvendam rotas esquecidas para salvar a cidade.",
      pageCount: 234,
      formats: ["PDF", "EPUB 3", "DAISY 2.02", "MP3"],
      status: "publicada",
      wcagLevel: "AAA",
      audiodescricaoProgress: 100,
      readCount: 1420,
      rating: 4.9,
      coverColor: "#3b5bdb",
    },
    {
      title: "Além das Estrelas: Crônicas do Espaço",
      authorId: lorena.id,
      genre: "Ficção Científica",
      synopsis:
        "No ano estelar de 2384, a tripulação da nave Alvorada mapeia setores esquecidos da Nebulosa Carina e desvenda memórias sensoriais perdidas no vácuo.",
      pageCount: 148,
      formats: ["PDF/UA", "EPUB 3", "DAISY 2.02", "MP3"],
      status: "publicada",
      wcagLevel: "AAA",
      audiodescricaoProgress: 100,
      readCount: 2600,
      rating: 4.9,
      coverColor: "#7048e8",
    },
    {
      title: "Raízes",
      authorId: marina.id,
      genre: "Ficção Histórica",
      synopsis:
        "Uma crônica de três gerações no sertão baiano contada com tipografia inclusiva e suporte a braile.",
      pageCount: 310,
      formats: ["PDF", "EPUB 3"],
      status: "publicada",
      wcagLevel: "AA",
      audiodescricaoProgress: 100,
      readCount: 980,
      rating: 4.7,
      coverColor: "#8d6e63",
    },
    {
      title: "Terra Nova",
      authorId: lorena.id,
      genre: "Aventura",
      synopsis:
        "Vocabulário simplificado segundo normas internacionais de leitura fácil, para jovens adultos.",
      pageCount: 142,
      formats: ["PDF", "EPUB 3"],
      status: "publicada",
      wcagLevel: "AA",
      audiodescricaoProgress: 60,
      readCount: 540,
      rating: 4.5,
      coverColor: "#2f9e44",
    },
    {
      title: "Chamas de Agosto",
      authorId: marina.id,
      genre: "Drama",
      synopsis:
        "Narrativa densa sobre reconstrução urbana com roteiro de audiodescrição completo.",
      pageCount: 278,
      formats: ["PDF", "EPUB 3", "MP3"],
      status: "publicada",
      wcagLevel: "AAA",
      audiodescricaoProgress: 100,
      readCount: 1180,
      rating: 4.8,
      coverColor: "#e03131",
    },
    {
      title: "Vozes do Mar",
      authorId: lorena.id,
      genre: "Poesia",
      synopsis:
        "Poemas visuais acompanhados por intérprete de Libras em vídeo integrado.",
      pageCount: 88,
      formats: ["PDF", "EPUB 3", "Vídeo Libras"],
      status: "publicada",
      wcagLevel: "AA",
      audiodescricaoProgress: 40,
      readCount: 310,
      rating: 4.6,
      coverColor: "#1098ad",
    },
    {
      title: "Crônicas Urbanas",
      authorId: marina.id,
      genre: "Slice of Life",
      synopsis: "85 páginas enviadas, em diagramação. Linguagem simples pendente.",
      pageCount: 85,
      formats: ["PDF"],
      status: "rascunho",
      wcagLevel: null,
      audiodescricaoProgress: 62,
      readCount: 0,
      rating: null,
      coverColor: "#495057",
    },
    {
      title: "Meu Livro Incrível",
      authorId: marina.id,
      genre: "Ficção Científica",
      synopsis:
        "Volume 1: A Travessia das Vozes Silenciosas. Uma jovem astronauta no fim do universo.",
      pageCount: 132,
      formats: ["PDF", "EPUB 3", "MP3"],
      status: "aprovada",
      wcagLevel: "AAA",
      audiodescricaoProgress: 100,
      readCount: 0,
      rating: null,
      coverColor: "#0b1220",
    },
  ];

  for (const w of seedWorks) {
    const now = new Date().toISOString();
    const status = w.status ?? "rascunho";
    const work: Work = {
      id: randomUUID(),
      authorId: w.authorId,
      title: w.title,
      genre: w.genre ?? "Não informado",
      synopsis: w.synopsis ?? "",
      pageCount: w.pageCount ?? 0,
      formats: w.formats ?? ["PDF"],
      accessibility: {
        audiodescricao: (w.audiodescricaoProgress ?? 0) > 0,
        altoContraste: true,
        fontesAcessiveis: true,
        librasNosDialogos: (w.formats ?? []).includes("Vídeo Libras"),
        textoAlternativo: true,
        leitorDeTela: true,
      },
      status,
      wcagLevel: w.wcagLevel ?? null,
      audiodescricaoProgress: w.audiodescricaoProgress ?? 0,
      reviewStages: defaultReviewStages(status),
      reviewNotes: [],
      coverColor: w.coverColor ?? "#343a40",
      readCount: w.readCount ?? 0,
      rating: w.rating ?? null,
      createdAt: now,
      updatedAt: now,
      publishedAt: status === "publicada" ? now : undefined,
    };
    works.push(work);
  }

  // Uma obra "em análise" para popular a tela de acompanhamento
  const meuLivro = works.find((w) => w.title === "Meu Livro Incrível");
  const emAnalise: Work = {
    id: randomUUID(),
    authorId: marina.id,
    title: "Meu livro incrível (2ª edição)",
    genre: "Ficção Científica & Aventura",
    synopsis: "Nova edição revisada, em avaliação técnica.",
    pageCount: 240,
    formats: ["PDF", "EPUB 3.3"],
    accessibility: {
      audiodescricao: true,
      altoContraste: true,
      fontesAcessiveis: true,
      librasNosDialogos: false,
      textoAlternativo: true,
      leitorDeTela: true,
    },
    status: "em_analise",
    wcagLevel: null,
    audiodescricaoProgress: 78,
    reviewStages: defaultReviewStages("em_analise"),
    reviewNotes: [
      {
        id: randomUUID(),
        authorName: "Camila Fontes",
        authorRole: "Especialista em Acessibilidade Visual",
        message:
          "As descrições dos quadros de abertura do Capítulo 2 estão exemplares! Sugerimos detalhar mais as expressões faciais na página 48.",
        createdAt: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        authorName: "Rodrigo Santana",
        authorRole: "Parecerista Editorial de Quadrinhos",
        message:
          "Excelente ritmo narrativo. A diagramação mantém a legibilidade mesmo no modo de alto contraste invertido.",
        createdAt: new Date().toISOString(),
      },
    ],
    coverColor: "#161b22",
    readCount: 0,
    rating: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (meuLivro) works.push(emAnalise);
}

seed();

export function findUserByEmail(email: string): User | undefined {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id: string): User | undefined {
  return users.find((u) => u.id === id);
}

export function toPublicUser(user: User) {
  const { passwordHash, ...rest } = user;
  return rest;
}
