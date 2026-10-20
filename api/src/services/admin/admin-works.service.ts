import { asc, desc, eq } from 'drizzle-orm';
import type { z } from 'zod';
import { works } from '../../db/schema';
import { paginated } from '../../validators/common';
import type { adminWorkListSchema } from '../../validators/admin.schemas';
import { listAudioDescriptions } from '../audio-descriptions.service';
import { listChecks, listNotes } from '../review.service';
import { allOf, baseWorkQuery, countWorkQuery, findWorkRow, searchCondition, toWorkDto } from '../work-queries';
import type { AuthUser } from '../../middlewares/auth';

const SORT_COLUMNS = {
  createdAt: works.createdAt,
  updatedAt: works.updatedAt,
  title: works.title,
  submittedAt: works.submittedAt,
  status: works.status,
};

/** Listagem administrativa: todas as obras, de qualquer status. */
export async function listWorksAdmin(query: z.infer<typeof adminWorkListSchema>) {
  const where = allOf(
    searchCondition(query.q),
    query.status ? eq(works.status, query.status) : undefined,
    query.format ? eq(works.format, query.format) : undefined,
    query.genreId ? eq(works.genreId, query.genreId) : undefined,
    query.authorId ? eq(works.authorId, query.authorId) : undefined,
  );
  const column = SORT_COLUMNS[query.sort];
  const [rows, [{ total }]] = await Promise.all([
    baseWorkQuery()
      .where(where)
      .orderBy(query.order === 'asc' ? asc(column) : desc(column), desc(works.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    countWorkQuery().where(where),
  ]);
  return paginated(rows.map(toWorkDto), total, query.page, query.pageSize);
}

/** Detalhe completo para a tela de curadoria: obra + checklist + notas + audiodescrição. */
export async function getWorkAdmin(id: number, admin: AuthUser) {
  const row = await findWorkRow(id);
  const [checks, notes, audioDescriptions] = await Promise.all([
    listChecks(id),
    listNotes(id),
    listAudioDescriptions(id, admin),
  ]);
  return { ...toWorkDto(row), checks, notes, audioDescriptions };
}
