import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { feedbacks, readingSessions, reviewChecks, works, type WorkStatus } from '../db/schema';
import { listFeedbacksForAuthor } from './feedbacks.service';
import { baseWorkQuery, toWorkDto } from './work-queries';

const count = sql<number>`count(*)`.mapWith(Number);

/** Progresso do checklist da curadoria por obra (percentual de itens aprovados). */
async function checkProgressByWork(workIds: number[]) {
  if (!workIds.length) return new Map<number, { total: number; approved: number }>();
  const rows = await db
    .select({
      workId: reviewChecks.workId,
      total: count,
      approved: sql<number>`count(*) filter (where ${reviewChecks.status} = 'APROVADO')`.mapWith(Number),
    })
    .from(reviewChecks)
    .where(inArray(reviewChecks.workId, workIds))
    .groupBy(reviewChecks.workId);
  return new Map(rows.map((r) => [r.workId, { total: r.total, approved: r.approved }]));
}

/** Obras do autor logado com métricas por obra ("Acervo & Produções"). */
export async function listMyWorks(authorId: number) {
  const rows = await baseWorkQuery().where(eq(works.authorId, authorId)).orderBy(desc(works.updatedAt));
  const progress = await checkProgressByWork(rows.map((r) => r.work.id));
  return rows.map((row) => {
    const p = progress.get(row.work.id);
    const reviewProgress = p && p.total ? Math.round((p.approved / p.total) * 100) : 0;
    return { ...toWorkDto(row), reviewProgress };
  });
}

/** Contadores leves usados na navegação lateral (ex.: badge "Em Análise"). */
export async function getMySummary(authorId: number) {
  const rows = await db
    .select({ status: works.status, total: count })
    .from(works)
    .where(eq(works.authorId, authorId))
    .groupBy(works.status);
  const by = Object.fromEntries(rows.map((r) => [r.status, r.total])) as Partial<Record<WorkStatus, number>>;
  return {
    drafts: by.RASCUNHO ?? 0,
    inReview: by.EM_ANALISE ?? 0,
    /** Obras no catálogo. Aprovar já publica, então APROVADO é o estado público. */
    published: by.APROVADO ?? 0,
    rejected: by.REJEITADO ?? 0,
    archived: by.ARQUIVADO ?? 0,
    total: rows.reduce((acc, r) => acc + r.total, 0),
  };
}

/** Métricas reais do "Painel Editorial do Autor". */
export async function getAuthorDashboard(authorId: number) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const authorWorks = db.select({ id: works.id }).from(works).where(eq(works.authorId, authorId));

  const [summary, [readers], [rating], [engagement], feedbackList, worksList] = await Promise.all([
    getMySummary(authorId),
    db
      .select({ sessions: count, works: sql<number>`count(distinct ${readingSessions.workId})`.mapWith(Number) })
      .from(readingSessions)
      .where(inArray(readingSessions.workId, authorWorks)),
    db
      .select({
        average: sql<number>`coalesce(round(avg(${feedbacks.rating})::numeric, 1), 0)`.mapWith(Number),
        count,
      })
      .from(feedbacks)
      .where(and(inArray(feedbacks.workId, authorWorks), eq(feedbacks.isVisible, true))),
    db
      .select({
        total: count,
        audioDesc: sql<number>`count(*) filter (where ${readingSessions.usedAudioDesc})`.mapWith(Number),
        highContrast: sql<number>`count(*) filter (where ${readingSessions.usedHighContrast})`.mapWith(Number),
        dyslexiaZoom: sql<number>`count(*) filter (where ${readingSessions.usedDyslexicFont} or ${readingSessions.usedZoom})`.mapWith(Number),
      })
      .from(readingSessions)
      .where(and(inArray(readingSessions.workId, authorWorks), gte(readingSessions.startedAt, since))),
    listFeedbacksForAuthor(authorId),
    listMyWorks(authorId),
  ]);

  const pct = (n: number) => (engagement.total ? Math.round((n / engagement.total) * 100) : 0);
  const highlight = worksList.find((w) => w.status === 'APROVADO') ?? null;

  return {
    summary,
    totalReads: readers.sessions,
    worksWithReads: readers.works,
    accessibilityIndex: rating,
    engagement: {
      sessions: engagement.total,
      audioDesc: { count: engagement.audioDesc, percent: pct(engagement.audioDesc) },
      highContrast: { count: engagement.highContrast, percent: pct(engagement.highContrast) },
      dyslexiaZoom: { count: engagement.dyslexiaZoom, percent: pct(engagement.dyslexiaZoom) },
    },
    highlight,
    feedbacks: feedbackList,
    works: worksList,
  };
}
