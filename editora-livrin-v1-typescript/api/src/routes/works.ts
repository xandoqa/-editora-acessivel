import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { works } from "../data/store";
import { requireAuth, requireRole } from "../middleware/auth";
import type { AuthorStats, ReviewStage, Work } from "../types/domain";

export const worksRouter = Router();

function publicWorkSummary(w: Work) {
  return {
    id: w.id,
    title: w.title,
    genre: w.genre,
    synopsis: w.synopsis,
    pageCount: w.pageCount,
    formats: w.formats,
    accessibility: w.accessibility,
    wcagLevel: w.wcagLevel,
    coverColor: w.coverColor,
    readCount: w.readCount,
    rating: w.rating,
    publishedAt: w.publishedAt,
  };
}

// GET /api/works — catálogo público (equivalente à tela "Início / Catálogo")
// Suporta ?genre= e ?q= para os filtros de formato/busca do topo da tela.
worksRouter.get("/", (req, res) => {
  const { genre, q } = req.query as { genre?: string; q?: string };

  let list = works.filter((w) => w.status === "publicada");

  if (genre && genre !== "todos") {
    list = list.filter((w) => w.genre.toLowerCase() === genre.toLowerCase());
  }
  if (q) {
    const needle = q.toLowerCase();
    list = list.filter(
      (w) =>
        w.title.toLowerCase().includes(needle) ||
        w.synopsis.toLowerCase().includes(needle)
    );
  }

  res.json({
    total: list.length,
    works: list.map(publicWorkSummary),
  });
});

// GET /api/works/:id — tela de detalhe / leitor acessível
worksRouter.get("/:id", (req, res) => {
  const work = works.find((w) => w.id === req.params.id);
  if (!work) return res.status(404).json({ error: "Obra não encontrada." });
  if (work.status !== "publicada") {
    return res.status(403).json({ error: "Esta obra ainda não está publicada no catálogo." });
  }
  res.json({ work: publicWorkSummary(work) });
});

const submitSchema = z.object({
  title: z.string().min(1, "Título é obrigatório.").max(120),
  genre: z.string().min(1, "Gênero literário é obrigatório."),
  synopsis: z
    .string()
    .min(100, "A sinopse deve ter entre 100 e 800 caracteres.")
    .max(800, "A sinopse deve ter entre 100 e 800 caracteres."),
  pageCount: z.number().int().positive("Número de páginas inválido."),
  formats: z.array(z.string()).default(["PDF"]),
  preExisting: z
    .object({
      textoAlternativo: z.boolean().default(false),
      leitorDeTela: z.boolean().default(false),
      audiodescricao: z.boolean().default(false),
    })
    .default({ textoAlternativo: false, leitorDeTela: false, audiodescricao: false }),
});

function initialReviewStages(): ReviewStage[] {
  return [
    {
      id: 1,
      title: "Recebimento do PDF / Arquivo",
      status: "concluido",
      detail:
        "Arquivo validado com sucesso. Integridade de fontes embutidas e metadados de leitura universal conferidos.",
      completedAt: new Date().toISOString(),
    },
    {
      id: 2,
      title: "Revisão de conteúdo & testes de acessibilidade",
      status: "em_andamento",
      detail:
        "Avaliação semântica das pranchas, contraste de cores e suporte a fontes para dislexia.",
    },
    {
      id: 3,
      title: "Aprovação final",
      status: "pendente",
      detail:
        "Emissão do selo de certificação Livrin Acessível e liberação da publicação no catálogo.",
    },
  ];
}

// POST /api/works — "Publicar meu livro ou quadrinho" (envio para análise)
worksRouter.post("/", requireAuth, requireRole("autor"), (req, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." });
  }
  const { title, genre, synopsis, pageCount, formats, preExisting } = parsed.data;
  const now = new Date().toISOString();

  const work: Work = {
    id: randomUUID(),
    authorId: req.auth!.sub,
    title,
    genre,
    synopsis,
    pageCount,
    formats,
    accessibility: {
      audiodescricao: preExisting.audiodescricao,
      altoContraste: false,
      fontesAcessiveis: false,
      librasNosDialogos: false,
      textoAlternativo: preExisting.textoAlternativo,
      leitorDeTela: preExisting.leitorDeTela,
    },
    status: "em_analise",
    wcagLevel: null,
    audiodescricaoProgress: preExisting.audiodescricao ? 20 : 0,
    reviewStages: initialReviewStages(),
    reviewNotes: [],
    coverColor: "#161b22",
    readCount: 0,
    rating: null,
    createdAt: now,
    updatedAt: now,
  };
  works.push(work);

  res.status(201).json({ work });
});

// GET /api/works/me/dashboard — "Meu Painel"
worksRouter.get("/me/dashboard", requireAuth, requireRole("autor"), (req, res) => {
  const mine = works.filter((w) => w.authorId === req.auth!.sub);
  const published = mine.filter((w) => w.status === "publicada");

  const stats: AuthorStats = {
    activeWorks: mine.filter((w) => w.status !== "recusada").length,
    totalReaders: published.reduce((sum, w) => sum + w.readCount, 0),
    accessibilityIndex: published.length
      ? Number(
          (
            published.reduce((sum, w) => sum + (w.rating ?? 0), 0) / published.length
          ).toFixed(1)
        )
      : 0,
    readyToLaunch: mine.filter((w) => w.status === "aprovada").length,
  };

  res.json({ stats, works: mine });
});

// GET /api/works/me/pending — tela "Em Análise" (fluxo de avaliação editorial)
worksRouter.get("/me/pending", requireAuth, requireRole("autor"), (req, res) => {
  const pending = works.filter(
    (w) => w.authorId === req.auth!.sub && w.status === "em_analise"
  );
  res.json({ works: pending });
});

// GET /api/works/me/:id/review — detalhe do fluxo de avaliação de uma obra
worksRouter.get("/me/:id/review", requireAuth, requireRole("autor"), (req, res) => {
  const work = works.find((w) => w.id === req.params.id && w.authorId === req.auth!.sub);
  if (!work) return res.status(404).json({ error: "Obra não encontrada." });
  res.json({ work });
});
