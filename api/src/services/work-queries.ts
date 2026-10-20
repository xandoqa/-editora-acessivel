import { and, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../db/client';
import { genres, users, works, type Work } from '../db/schema';
import { notFound } from '../utils/http-error';
import { escapeLike } from '../utils/text';
import { coverUrl } from './storage.service';

/**
 * Consultas de leitura sobre obras e o formato (DTO) devolvido pela API.
 * Caminhos de arquivo internos nunca saem daqui: o cliente recebe apenas
 * `coverUrl`, metadados do arquivo e flags `hasFile`/`hasAudio`.
 */

/**
 * Média e quantidade de avaliações visíveis (subconsultas correlacionadas).
 * A coluna externa é escrita qualificada ("works"."id") de propósito: em consultas de
 * uma só tabela o Drizzle omite o nome da tabela, e a subconsulta passaria a
 * comparar com a coluna de mesmo nome da tabela interna.
 */
export const ratingAvgSql = sql<number>`(
  select coalesce(round(avg(f.rating)::numeric, 1), 0) from feedbacks f
  where f.work_id = "works"."id" and f.is_visible = true
)`.mapWith(Number);

export const ratingCountSql = sql<number>`(
  select count(*) from feedbacks f where f.work_id = "works"."id" and f.is_visible = true
)`.mapWith(Number);

export const readsCountSql = sql<number>`(
  select count(*) from reading_sessions rs where rs.work_id = "works"."id"
)`.mapWith(Number);

export const workRowSelect = {
  work: works,
  authorName: users.name,
  authorHeadline: users.headline,
  genreName: genres.name,
  ratingAvg: ratingAvgSql,
  ratingCount: ratingCountSql,
  readsCount: readsCountSql,
};

export type WorkRow = {
  work: Work;
  authorName: string;
  authorHeadline: string | null;
  genreName: string;
  ratingAvg: number;
  ratingCount: number;
  readsCount: number;
};

export function toWorkDto(row: WorkRow) {
  const w = row.work;
  return {
    id: w.id,
    title: w.title,
    subtitle: w.subtitle,
    status: w.status,
    format: w.format,
    pages: w.pages,
    synopsis: w.synopsis,
    editionLabel: w.editionLabel,
    isbn: w.isbn,
    ageRating: w.ageRating,
    authorNotes: w.authorNotes,
    tags: w.tags,
    hasAudioDesc: w.hasAudioDesc,
    hasLeitorTela: w.hasLeitorTela,
    hasTextoAlt: w.hasTextoAlt,
    hasLibras: w.hasLibras,
    hasFacilLeitura: w.hasFacilLeitura,
    hasAltoContraste: w.hasAltoContraste,
    audioDescriber: w.audioDescriber,
    audioNarrator: w.audioNarrator,
    audioReviewer: w.audioReviewer,
    coverUrl: coverUrl(w.coverPath),
    hasFile: !!w.filePath,
    file: w.filePath
      ? { type: w.fileType, sizeBytes: w.fileSizeBytes, originalName: w.fileOriginalName }
      : null,
    hasAudio: !!w.audioPath,
    rejectionReason: w.rejectionReason,
    submittedAt: w.submittedAt,
    reviewedAt: w.reviewedAt,
    publishedAt: w.publishedAt,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
    author: { id: w.authorId, name: row.authorName, headline: row.authorHeadline },
    genre: { id: w.genreId, name: row.genreName },
    rating: { average: row.ratingAvg, count: row.ratingCount },
    readsCount: row.readsCount,
  };
}

export type WorkDto = ReturnType<typeof toWorkDto>;

export function baseWorkQuery() {
  return db
    .select(workRowSelect)
    .from(works)
    .innerJoin(users, eq(users.id, works.authorId))
    .innerJoin(genres, eq(genres.id, works.genreId));
}

export function countWorkQuery() {
  return db
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(works)
    .innerJoin(users, eq(users.id, works.authorId))
    .innerJoin(genres, eq(genres.id, works.genreId));
}

/** Busca textual por título, subtítulo, autor, gênero e tags (case/acentos do usuário preservados). */
export function searchCondition(q: string | undefined): SQL | undefined {
  if (!q) return undefined;
  const pattern = `%${escapeLike(q)}%`;
  return or(
    ilike(works.title, pattern),
    ilike(works.subtitle, pattern),
    ilike(users.name, pattern),
    ilike(genres.name, pattern),
    sql`array_to_string(${works.tags}, ' ') ilike ${pattern}`,
  );
}

export async function findWorkRow(id: number): Promise<WorkRow> {
  const [row] = await baseWorkQuery().where(eq(works.id, id));
  if (!row) throw notFound('Obra não encontrada.');
  return row;
}

/** Busca a linha crua da obra (para checagens de permissão e mutações). */
export async function findWork(id: number): Promise<Work> {
  const [work] = await db.select().from(works).where(eq(works.id, id));
  if (!work) throw notFound('Obra não encontrada.');
  return work;
}

export const orderings = {
  recent: [desc(works.publishedAt), desc(works.id)],
  title: [asc(works.title)],
  rating: [desc(ratingAvgSql), desc(ratingCountSql)],
};

/** Combina condições opcionais ignorando as indefinidas. */
export function allOf(...conditions: (SQL | undefined)[]): SQL | undefined {
  const defined = conditions.filter((c): c is SQL => !!c);
  return defined.length ? and(...defined) : undefined;
}
