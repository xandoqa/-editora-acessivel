import { and, asc, eq } from 'drizzle-orm';
import type { z } from 'zod';
import { db } from '../db/client';
import { audioDescriptions } from '../db/schema';
import type { AuthUser } from '../middlewares/auth';
import { forbidden, notFound } from '../utils/http-error';
import type { audioDescriptionSchema } from '../validators/works.schemas';
import { exigirAcessoDeLeitura } from './purchases.service';
import { AUTHOR_AUDIO_DESC_EDIT, canView, isAdmin, isOwner } from './work-policy';
import { findWork } from './work-queries';

type AudioDescriptionInput = z.infer<typeof audioDescriptionSchema>;

/** Lista a audiodescrição página a página (mesma visibilidade da obra). */
export async function listAudioDescriptions(workId: number, viewer?: AuthUser) {
  const work = await findWork(workId);
  if (!canView(work, viewer)) throw notFound('Obra não encontrada.');
  /*
   * A audiodescrição É o conteúdo da obra, em texto.
   *
   * Num quadrinho ela traz a descrição de cada quadro e as falas de cada
   * personagem — ou seja, quem baixasse só este JSON leria a história inteira
   * sem abrir o arquivo. Sem esta verificação, `/works/:id/audio-descriptions`
   * era uma porta dos fundos para obra paga: o endpoint do arquivo recusava,
   * e este entregava o mesmo conteúdo em outro formato.
   *
   * Pior: era uma porta dos fundos que atingia justamente o público que mais
   * depende da audiodescrição.
   */
  await exigirAcessoDeLeitura(work, viewer);
  return db
    .select()
    .from(audioDescriptions)
    .where(eq(audioDescriptions.workId, workId))
    .orderBy(asc(audioDescriptions.pageNumber));
}

async function assertCanEdit(workId: number, user: AuthUser) {
  const work = await findWork(workId);
  if (isAdmin(user)) return work;
  if (!isOwner(work, user)) throw notFound('Obra não encontrada.');
  if (!AUTHOR_AUDIO_DESC_EDIT.includes(work.status)) {
    throw forbidden('A audiodescrição desta obra só pode ser alterada pela curadoria neste status.');
  }
  return work;
}

export async function createAudioDescription(workId: number, user: AuthUser, input: AudioDescriptionInput) {
  await assertCanEdit(workId, user);
  const [created] = await db.insert(audioDescriptions).values({ ...input, workId }).returning();
  return created;
}

export async function updateAudioDescription(workId: number, adId: number, user: AuthUser, input: AudioDescriptionInput) {
  await assertCanEdit(workId, user);
  const [updated] = await db
    .update(audioDescriptions)
    .set(input)
    .where(and(eq(audioDescriptions.id, adId), eq(audioDescriptions.workId, workId)))
    .returning();
  if (!updated) throw notFound('Audiodescrição não encontrada.');
  return updated;
}

export async function deleteAudioDescription(workId: number, adId: number, user: AuthUser) {
  await assertCanEdit(workId, user);
  const [deleted] = await db
    .delete(audioDescriptions)
    .where(and(eq(audioDescriptions.id, adId), eq(audioDescriptions.workId, workId)))
    .returning({ id: audioDescriptions.id });
  if (!deleted) throw notFound('Audiodescrição não encontrada.');
}
