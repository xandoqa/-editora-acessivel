import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { reviewChecks, reviewNotes, users, type CheckStatus } from '../db/schema';
import type { AuthUser } from '../middlewares/auth';
import { notFound } from '../utils/http-error';
import { isAdmin, isOwner } from './work-policy';
import { findWork } from './work-queries';

/**
 * Fluxo de avaliação editorial ("Seu livro em processo editorial"):
 *   Etapa 1 – Recebimento do arquivo  (concluída quando a obra é submetida)
 *   Etapa 2 – Revisão de conteúdo & testes de acessibilidade (checklist abaixo)
 *   Etapa 3 – Aprovação final (status APROVADO/PUBLICADO)
 */

async function assertReviewAccess(workId: number, user: AuthUser) {
  const work = await findWork(workId);
  if (!isOwner(work, user) && !isAdmin(user)) throw notFound('Obra não encontrada.');
  return work;
}

export async function listChecks(workId: number) {
  return db
    .select({ id: reviewChecks.id, label: reviewChecks.label, status: reviewChecks.status, position: reviewChecks.position, updatedAt: reviewChecks.updatedAt })
    .from(reviewChecks)
    .where(eq(reviewChecks.workId, workId))
    .orderBy(asc(reviewChecks.position), asc(reviewChecks.id));
}

export async function listNotes(workId: number) {
  return db
    .select({
      id: reviewNotes.id,
      content: reviewNotes.content,
      createdAt: reviewNotes.createdAt,
      user: { id: users.id, name: users.name, role: users.role, headline: users.headline },
    })
    .from(reviewNotes)
    .innerJoin(users, eq(users.id, reviewNotes.userId))
    .where(eq(reviewNotes.workId, workId))
    .orderBy(desc(reviewNotes.createdAt), desc(reviewNotes.id));
}

export async function getReview(workId: number, user: AuthUser) {
  const work = await assertReviewAccess(workId, user);
  const [checks, notes] = await Promise.all([listChecks(workId), listNotes(workId)]);
  const approved = checks.filter((c) => c.status === 'APROVADO').length;
  const stage =
    work.status === 'APROVADO' || work.status === 'PUBLICADO' ? 3 : work.status === 'EM_ANALISE' ? 2 : work.submittedAt ? 2 : 1;
  return {
    workId,
    status: work.status,
    stage,
    protocol: `LVR-${String(88200 + workId).padStart(5, '0')}`,
    progress: checks.length ? Math.round((approved / checks.length) * 100) : 0,
    checks,
    notes,
  };
}

/** Nota da curadoria ou mensagem do autor para o time de acessibilidade. */
export async function addNote(workId: number, user: AuthUser, content: string) {
  await assertReviewAccess(workId, user);
  const [note] = await db.insert(reviewNotes).values({ workId, userId: user.id, content }).returning();
  const [full] = (await listNotes(workId)).filter((n) => n.id === note.id);
  return full;
}

export async function deleteNote(noteId: number) {
  const [deleted] = await db.delete(reviewNotes).where(eq(reviewNotes.id, noteId)).returning({ id: reviewNotes.id });
  if (!deleted) throw notFound('Nota não encontrada.');
}

/* ------------------------- Checklist (administração) ------------------------ */

export async function addCheck(workId: number, label: string) {
  await findWork(workId);
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${reviewChecks.position}), -1) + 1`.mapWith(Number) })
    .from(reviewChecks)
    .where(eq(reviewChecks.workId, workId));
  const [check] = await db.insert(reviewChecks).values({ workId, label, position: next }).returning();
  return check;
}

export async function updateCheck(workId: number, checkId: number, patch: { status?: CheckStatus; label?: string }) {
  const [check] = await db
    .update(reviewChecks)
    .set(patch)
    .where(and(eq(reviewChecks.id, checkId), eq(reviewChecks.workId, workId)))
    .returning();
  if (!check) throw notFound('Item de verificação não encontrado.');
  return check;
}

export async function deleteCheck(workId: number, checkId: number) {
  const [deleted] = await db
    .delete(reviewChecks)
    .where(and(eq(reviewChecks.id, checkId), eq(reviewChecks.workId, workId)))
    .returning({ id: reviewChecks.id });
  if (!deleted) throw notFound('Item de verificação não encontrado.');
}
