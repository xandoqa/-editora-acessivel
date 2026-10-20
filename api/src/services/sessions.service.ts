import { eq } from 'drizzle-orm';
import type { z } from 'zod';
import { db } from '../db/client';
import { readingSessions } from '../db/schema';
import type { AuthUser } from '../middlewares/auth';
import { notFound } from '../utils/http-error';
import type { sessionUpdateSchema } from '../validators/works.schemas';
import { canView } from './work-policy';
import { findWork } from './work-queries';

/**
 * Sessões de leitura: criadas quando o Leitor Acessível abre uma obra e
 * atualizadas conforme o leitor usa os recursos (audiodescrição, contraste,
 * fonte para dislexia, zoom). O ID é um UUID aleatório, então só quem abriu a
 * sessão consegue atualizá-la.
 */
export async function startSession(workId: number, viewer?: AuthUser) {
  const work = await findWork(workId);
  if (!canView(work, viewer)) throw notFound('Obra não encontrada.');
  // Métricas só contam leituras reais do catálogo (prévias de rascunhos não entram).
  if (work.status !== 'PUBLICADO') throw notFound('Sessões de leitura só são registradas para obras publicadas.');
  const [session] = await db
    .insert(readingSessions)
    .values({ workId, userId: viewer?.id ?? null })
    .returning({ id: readingSessions.id });
  return session;
}

export async function updateSession(sessionId: string, input: z.infer<typeof sessionUpdateSchema>) {
  // Flags só "ligam": uma vez usado o recurso na sessão, permanece registrado.
  const set: Partial<typeof readingSessions.$inferInsert> = { lastActivityAt: new Date() };
  if (input.lastPage !== undefined) set.lastPage = input.lastPage;
  if (input.usedAudioDesc) set.usedAudioDesc = true;
  if (input.usedHighContrast) set.usedHighContrast = true;
  if (input.usedDyslexicFont) set.usedDyslexicFont = true;
  if (input.usedZoom) set.usedZoom = true;
  const [updated] = await db
    .update(readingSessions)
    .set(set)
    .where(eq(readingSessions.id, sessionId))
    .returning({ id: readingSessions.id });
  if (!updated) throw notFound('Sessão de leitura não encontrada.');
}
