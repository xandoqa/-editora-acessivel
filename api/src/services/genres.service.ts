import { asc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { genres, works } from '../db/schema';
import { conflict, notFound } from '../utils/http-error';
import { slugify } from '../utils/text';

export async function listGenres(includeInactive = false) {
  const usage = sql<number>`(select count(*) from works w where w.genre_id = "genres"."id")`.mapWith(Number);
  const query = db
    .select({ id: genres.id, name: genres.name, slug: genres.slug, isActive: genres.isActive, worksCount: usage })
    .from(genres)
    .orderBy(asc(genres.name));
  return includeInactive ? query : query.where(eq(genres.isActive, true));
}

export async function createGenre(input: { name: string; isActive: boolean }) {
  const [genre] = await db.insert(genres).values({ name: input.name, slug: slugify(input.name), isActive: input.isActive }).returning();
  return genre;
}

export async function updateGenre(id: number, input: { name?: string; isActive?: boolean }) {
  const [genre] = await db
    .update(genres)
    .set({ ...(input.name && { name: input.name, slug: slugify(input.name) }), ...(input.isActive !== undefined && { isActive: input.isActive }) })
    .where(eq(genres.id, id))
    .returning();
  if (!genre) throw notFound('Gênero não encontrado.');
  return genre;
}

/** Gêneros em uso não podem ser excluídos (apenas desativados), preservando as obras. */
export async function deleteGenre(id: number) {
  const [{ used }] = await db.select({ used: sql<number>`count(*)`.mapWith(Number) }).from(works).where(eq(works.genreId, id));
  if (used > 0) throw conflict(`Este gênero está associado a ${used} obra(s). Desative-o em vez de excluir.`);
  const [deleted] = await db.delete(genres).where(eq(genres.id, id)).returning({ id: genres.id });
  if (!deleted) throw notFound('Gênero não encontrado.');
}
