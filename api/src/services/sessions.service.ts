import { createHmac, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { z } from 'zod';
import { env } from '../config/env';
import { db } from '../db/client';
import { readingSessions } from '../db/schema';
import type { AuthUser } from '../middlewares/auth';
import { forbidden, notFound } from '../utils/http-error';
import type { sessionUpdateSchema } from '../validators/works.schemas';
import { PUBLIC_STATUS, canView } from './work-policy';
import { findWork } from './work-queries';

/**
 * Sessões de leitura: criadas quando o Leitor Acessível abre uma obra e
 * atualizadas conforme o leitor usa os recursos (audiodescrição, contraste,
 * fonte para dislexia, zoom). Alimentam as métricas do painel do autor e do
 * dashboard administrativo.
 *
 * A leitura é aberta a visitantes, então a sessão não pode exigir login. Para
 * que ela também não fique aberta a qualquer um, cada sessão sai acompanhada de
 * um token assinado (HMAC do id com o JWT_SECRET) que só quem criou a sessão
 * recebe. Sem esse token, `PATCH /sessions/:id` é recusado — antes a rota não
 * tinha autenticação nem checagem de dono, e dava para inflar as métricas de
 * qualquer obra em laço.
 */

function sessionToken(sessionId: string): string {
  return createHmac('sha256', env.JWT_SECRET).update(`reading-session:${sessionId}`).digest('base64url');
}

function tokenMatches(sessionId: string, provided: string | undefined): boolean {
  if (!provided) return false;
  const expected = Buffer.from(sessionToken(sessionId));
  const received = Buffer.from(provided);
  // Comprimentos diferentes já reprovam; timingSafeEqual exige tamanhos iguais.
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function startSession(workId: number, viewer?: AuthUser) {
  const work = await findWork(workId);
  if (!canView(work, viewer)) throw notFound('Obra não encontrada.');
  // Métricas só contam leituras reais do catálogo (prévias de rascunhos não entram).
  if (work.status !== PUBLIC_STATUS) throw notFound('Sessões de leitura só são registradas para obras do catálogo.');
  const [session] = await db
    .insert(readingSessions)
    .values({ workId, userId: viewer?.id ?? null })
    .returning({ id: readingSessions.id });
  return { id: session.id, token: sessionToken(session.id) };
}

export async function updateSession(
  sessionId: string,
  token: string | undefined,
  input: z.infer<typeof sessionUpdateSchema>,
) {
  if (!tokenMatches(sessionId, token)) {
    throw forbidden('Esta sessão de leitura não pertence a você.');
  }
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
