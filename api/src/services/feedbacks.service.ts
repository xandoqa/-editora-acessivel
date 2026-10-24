import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { db } from '../db/client';
import { feedbacks, users, works } from '../db/schema';
import type { AuthUser } from '../middlewares/auth';
import { conflict, notFound } from '../utils/http-error';
import { escapeLike } from '../utils/text';
import { paginated } from '../validators/common';
import type { adminFeedbackListSchema } from '../validators/admin.schemas';
import type { feedbackSchema } from '../validators/works.schemas';
import { PUBLIC_STATUS } from './work-policy';
import { findWork } from './work-queries';

const feedbackSelect = {
  id: feedbacks.id,
  rating: feedbacks.rating,
  content: feedbacks.content,
  aspect: feedbacks.aspect,
  isVisible: feedbacks.isVisible,
  createdAt: feedbacks.createdAt,
  user: { id: users.id, name: users.name, headline: users.headline },
  work: { id: works.id, title: works.title },
};

function baseFeedbackQuery() {
  return db
    .select(feedbackSelect)
    .from(feedbacks)
    .innerJoin(users, eq(users.id, feedbacks.userId))
    .innerJoin(works, eq(works.id, feedbacks.workId));
}

/** Avaliações visíveis de uma obra que está no catálogo. */
export async function listWorkFeedbacks(workId: number) {
  const work = await findWork(workId);
  if (work.status !== PUBLIC_STATUS) return [];
  return baseFeedbackQuery()
    .where(and(eq(feedbacks.workId, workId), eq(feedbacks.isVisible, true)))
    .orderBy(desc(feedbacks.createdAt))
    .limit(50);
}

/** Leitor avalia uma obra do catálogo (uma avaliação por leitor; reenviar atualiza a anterior). */
export async function upsertFeedback(workId: number, user: AuthUser, input: z.infer<typeof feedbackSchema>) {
  const work = await findWork(workId);
  if (work.status !== PUBLIC_STATUS) throw notFound('Obra não encontrada.');
  if (work.authorId === user.id) throw conflict('Autores não podem avaliar as próprias obras.');
  await db
    .insert(feedbacks)
    .values({ workId, userId: user.id, rating: input.rating, content: input.content, aspect: input.aspect ?? null })
    .onConflictDoUpdate({
      target: [feedbacks.workId, feedbacks.userId],
      set: { rating: input.rating, content: input.content, aspect: input.aspect ?? null, updatedAt: new Date() },
    });
  const [saved] = await baseFeedbackQuery().where(and(eq(feedbacks.workId, workId), eq(feedbacks.userId, user.id)));
  return saved;
}

/** Avaliação do próprio usuário para a obra (para preencher o formulário). */
export async function getMyFeedback(workId: number, user: AuthUser) {
  const [mine] = await baseFeedbackQuery().where(and(eq(feedbacks.workId, workId), eq(feedbacks.userId, user.id)));
  return mine ?? null;
}

/** Avaliações recebidas pelas obras de um autor ("Voz dos Leitores"). */
export async function listFeedbacksForAuthor(authorId: number, limit = 6) {
  return baseFeedbackQuery()
    .where(and(eq(works.authorId, authorId), eq(feedbacks.isVisible, true)))
    .orderBy(desc(feedbacks.createdAt))
    .limit(limit);
}

/* ------------------------------ Administração ------------------------------ */

export async function listFeedbacksAdmin(query: z.infer<typeof adminFeedbackListSchema>) {
  const pattern = query.q ? `%${escapeLike(query.q)}%` : undefined;
  const where = and(
    pattern ? or(ilike(feedbacks.content, pattern), ilike(users.name, pattern), ilike(works.title, pattern)) : undefined,
    query.visible !== undefined ? eq(feedbacks.isVisible, query.visible) : undefined,
    query.workId ? eq(feedbacks.workId, query.workId) : undefined,
    query.rating ? eq(feedbacks.rating, query.rating) : undefined,
  );
  const [rows, [{ total }]] = await Promise.all([
    baseFeedbackQuery()
      .where(where)
      .orderBy(query.order === 'asc' ? feedbacks.createdAt : desc(feedbacks.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(feedbacks)
      .innerJoin(users, eq(users.id, feedbacks.userId))
      .innerJoin(works, eq(works.id, feedbacks.workId))
      .where(where),
  ]);
  return paginated(rows, total, query.page, query.pageSize);
}

export async function setFeedbackVisibility(id: number, isVisible: boolean) {
  const [updated] = await db.update(feedbacks).set({ isVisible }).where(eq(feedbacks.id, id)).returning({ id: feedbacks.id });
  if (!updated) throw notFound('Avaliação não encontrada.');
  const [full] = await baseFeedbackQuery().where(eq(feedbacks.id, id));
  return full;
}

export async function deleteFeedback(id: number) {
  const [deleted] = await db.delete(feedbacks).where(eq(feedbacks.id, id)).returning({ id: feedbacks.id });
  if (!deleted) throw notFound('Avaliação não encontrada.');
}
