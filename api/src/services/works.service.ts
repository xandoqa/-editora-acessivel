import { and, eq, ne, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { db, type Tx } from '../db/client';
import { genres, reviewChecks, works, type NewWork, type Work, type WorkStatus } from '../db/schema';
import type { AuthUser } from '../middlewares/auth';
import { badRequest, conflict, forbidden, notFound, unprocessable } from '../utils/http-error';
import { paginated } from '../validators/common';
import { listChecks } from './review.service';
import type { catalogQuerySchema, WorkFields, WorkUpdate } from '../validators/works.schemas';
import { exigirAcessoDeLeitura, temAcessoDeLeitura } from './purchases.service';
import { absolutePath, commitUpload, removeFile, storedFileExists, type StoredFile } from './storage.service';
import {
  ADMIN_TRANSITIONS,
  AUTHOR_DELETABLE,
  AUTHOR_FULL_EDIT,
  AUTHOR_METADATA_EDIT,
  DEFAULT_REVIEW_CHECKS,
  METADATA_FIELDS,
  PUBLIC_STATUS,
  canView,
  isAdmin,
  isOwner,
} from './work-policy';
import {
  allOf,
  baseWorkQuery,
  countWorkQuery,
  findWork,
  findWorkRow,
  orderings,
  searchCondition,
  toWorkDto,
  type WorkDto,
} from './work-queries';

export interface WorkFiles {
  file?: Express.Multer.File;
  cover?: Express.Multer.File;
  audio?: Express.Multer.File;
}

interface CommittedFiles {
  file?: StoredFile;
  cover?: StoredFile;
  audio?: StoredFile;
}

/* -------------------------------------------------------------------------- */
/*                                  Catálogo                                  */
/* -------------------------------------------------------------------------- */

const FEATURE_COLUMN = {
  audiodescricao: works.hasAudioDesc,
  'leitor-tela': works.hasLeitorTela,
  'texto-alt': works.hasTextoAlt,
  libras: works.hasLibras,
  'facil-leitura': works.hasFacilLeitura,
  'alto-contraste': works.hasAltoContraste,
} as const;

/** Catálogo público: somente obras APROVADAS, com busca, filtros, ordenação e paginação. */
export async function listCatalog(query: z.infer<typeof catalogQuerySchema>) {
  const where = allOf(
    eq(works.status, PUBLIC_STATUS),
    searchCondition(query.q),
    query.format ? eq(works.format, query.format) : undefined,
    query.feature ? eq(FEATURE_COLUMN[query.feature], true) : undefined,
    query.genreId ? eq(works.genreId, query.genreId) : undefined,
  );
  const offset = (query.page - 1) * query.pageSize;
  const [rows, [{ total }], [{ published }]] = await Promise.all([
    baseWorkQuery()
      .where(where)
      .orderBy(...orderings[query.sort])
      .limit(query.pageSize)
      .offset(offset),
    countWorkQuery().where(where),
    db.select({ published: sql<number>`count(*)`.mapWith(Number) }).from(works).where(eq(works.status, PUBLIC_STATUS)),
  ]);
  return { ...paginated(rows.map(toWorkDto), total, query.page, query.pageSize), catalogTotal: published };
}

/** Detalhe de uma obra. Não aprovadas retornam 404 para quem não é autor/admin (não revela existência). */
export async function getWork(id: number, viewer?: AuthUser) {
  const row = await findWorkRow(id);
  if (!canView(row.work, viewer)) throw notFound('Obra não encontrada.');
  const dto = toWorkDto(row);
  /*
   * Se esta pessoa já pode ler a obra.
   *
   * Vai no detalhe para que a tela saiba o que oferecer — "ler" ou "adquirir"
   * — antes de tentar baixar o arquivo e esbarrar num 403. Note que isto é
   * informação para a INTERFACE: quem decide continua sendo o endpoint do
   * arquivo, que refaz a verificação por conta própria.
   */
  const access = {
    required: row.work.monetization === 'PAGA',
    granted: await temAcessoDeLeitura(row.work, viewer),
  };
  // No detalhe da obra o selo vem com a lista do que a curadoria verificou: o
  // leitor vê no que confiar e o autor vê o que foi cobrado. É público de
  // propósito — um selo cujo critério ninguém pode ler não vale nada.
  if (!dto.seal.granted) return { ...dto, access };
  const checks = await listChecks(id);
  return { ...dto, access, seal: { ...dto.seal, checks } };
}

/** Arquivo original da obra (para o leitor e para download). */
export async function getWorkFileInfo(id: number, viewer?: AuthUser) {
  const work = await findWork(id);
  if (!canView(work, viewer)) throw notFound('Obra não encontrada.');
  // Obra paga exige aquisição confirmada. A verificação é aqui, no caminho do
  // ARQUIVO, e não só na tela: é este endpoint que entrega o conteúdo, e é ele
  // que precisa recusar. Autoria e administração passam direto.
  await exigirAcessoDeLeitura(work, viewer);
  if (!work.filePath || !work.fileType) throw notFound('Esta obra ainda não possui arquivo enviado.');
  if (!storedFileExists(work.filePath)) {
    throw notFound(
      'O arquivo desta obra está registrado no banco, mas não foi encontrado no volume de uploads. ' +
        'Isso acontece quando o banco e o volume saem de sincronia — por exemplo, ao alternar entre o modo ' +
        'de produção e o de desenvolvimento, que usam volumes diferentes. Reenvie o arquivo pela interface, ' +
        'ou rode `npm run db:verify` na API para conferir todos os arquivos de uma vez.',
    );
  }
  const ext = work.fileType.toLowerCase();
  const safeTitle = work.title.normalize('NFD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'obra';
  return { absPath: absolutePath(work.filePath), fileType: work.fileType, downloadName: `${safeTitle}.${ext}` };
}

export async function getWorkAudioInfo(id: number, viewer?: AuthUser) {
  const work = await findWork(id);
  if (!canView(work, viewer)) throw notFound('Obra não encontrada.');
  // A faixa de audiodescrição É a obra, para quem depende dela. Deixá-la aberta
  // numa obra paga seria uma porta dos fundos justamente para o público que a
  // plataforma existe para servir.
  await exigirAcessoDeLeitura(work, viewer);
  if (!work.audioPath) throw notFound('Esta obra não possui faixa de audiodescrição.');
  if (!storedFileExists(work.audioPath)) {
    throw notFound('A faixa de audiodescrição está registrada no banco, mas não está no volume de uploads. Reenvie o arquivo.');
  }
  return { absPath: absolutePath(work.audioPath) };
}

/* -------------------------------------------------------------------------- */
/*                                 Utilidades                                 */
/* -------------------------------------------------------------------------- */

async function assertGenreUsable(genreId: number, allowInactive = false): Promise<void> {
  const [genre] = await db.select().from(genres).where(eq(genres.id, genreId));
  if (!genre) throw badRequest('Gênero literário inválido.');
  if (!genre.isActive && !allowInactive) throw badRequest('Este gênero literário não está mais disponível.');
}

async function commitFiles(files: WorkFiles): Promise<CommittedFiles> {
  const committed: CommittedFiles = {};
  try {
    if (files.file) committed.file = await commitUpload(files.file, 'work');
    if (files.cover) committed.cover = await commitUpload(files.cover, 'cover');
    if (files.audio) committed.audio = await commitUpload(files.audio, 'audio');
    return committed;
  } catch (err) {
    await discardFiles(committed);
    throw err;
  }
}

async function discardFiles(committed: CommittedFiles): Promise<void> {
  await Promise.all([committed.file, committed.cover, committed.audio].map((f) => removeFile(f?.relativePath)));
}

function fileColumns(committed: CommittedFiles): Partial<NewWork> {
  return {
    ...(committed.file && {
      filePath: committed.file.relativePath,
      fileType: committed.file.fileType,
      fileSizeBytes: committed.file.sizeBytes,
      fileOriginalName: committed.file.originalName,
    }),
    ...(committed.cover && { coverPath: committed.cover.relativePath }),
    ...(committed.audio && { audioPath: committed.audio.relativePath }),
  };
}

/** Cria os itens padrão de verificação da curadoria (se ainda não existirem) e reabre os reprovados. */
async function prepareReviewChecks(tx: Tx, workId: number): Promise<void> {
  const existing = await tx.select({ id: reviewChecks.id }).from(reviewChecks).where(eq(reviewChecks.workId, workId));
  if (existing.length === 0) {
    await tx.insert(reviewChecks).values(DEFAULT_REVIEW_CHECKS.map((label, position) => ({ workId, label, position })));
  } else {
    await tx
      .update(reviewChecks)
      .set({ status: 'PENDENTE' })
      .where(and(eq(reviewChecks.workId, workId), ne(reviewChecks.status, 'APROVADO')));
  }
}

/** Efeitos colaterais de entrar em cada status (datas, checklist). */
async function applyStatusEffects(
  tx: Tx,
  work: Work,
  status: WorkStatus,
  reason?: string | null,
  /** Quem assinou a decisão. Fica registrado para dar responsável ao Selo Livrin. */
  reviewer?: AuthUser,
): Promise<Partial<NewWork>> {
  const now = new Date();
  switch (status) {
    case 'EM_ANALISE':
      if (!work.filePath) throw unprocessable('Envie o arquivo original da obra antes de submetê-la para análise.');
      await prepareReviewChecks(tx, work.id);
      return { status, submittedAt: now, rejectionReason: null, reviewedAt: null };
    case 'APROVADO':
      // Aprovar É publicar: a obra entra no catálogo na mesma ação (seção 8).
      if (!work.filePath) throw unprocessable('Não é possível aprovar uma obra sem o arquivo original.');
      // A aprovação conclui a Etapa 2: todos os itens do checklist passam a "APROVADO".
      await tx.update(reviewChecks).set({ status: 'APROVADO' }).where(eq(reviewChecks.workId, work.id));
      return {
        status,
        reviewedAt: now,
        reviewedBy: reviewer?.id ?? work.reviewedBy,
        rejectionReason: null,
        publishedAt: work.publishedAt ?? now,
      };
    case 'REJEITADO':
      return {
        status,
        reviewedAt: now,
        reviewedBy: reviewer?.id ?? work.reviewedBy,
        rejectionReason: reason ?? 'Obra rejeitada pela curadoria.',
      };
    case 'ARQUIVADO':
    case 'RASCUNHO':
      return { status };
  }
}

/* -------------------------------------------------------------------------- */
/*                               Ações do autor                               */
/* -------------------------------------------------------------------------- */

/** Autor cria uma obra como rascunho ou já envia para análise (exige arquivo). */
export async function createWork(
  author: AuthUser,
  fields: WorkFields & { action: 'draft' | 'submit' },
  files: WorkFiles,
): Promise<WorkDto> {
  await assertGenreUsable(fields.genreId);
  if (fields.action === 'submit' && !files.file) {
    throw unprocessable('Envie o arquivo original da obra (PDF, DOCX, EPUB, CBZ ou CBR) para submetê-la à análise.', [
      { field: 'file', message: 'Arquivo obrigatório para envio à análise' },
    ]);
  }
  const committed = await commitFiles(files);
  try {
    const { action, tags, ...data } = fields;
    const id = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(works)
        .values({ ...data, tags: tags ?? [], authorId: author.id, status: 'RASCUNHO', ...fileColumns(committed) })
        .returning();
      if (action === 'submit') {
        const effects = await applyStatusEffects(tx, created, 'EM_ANALISE');
        await tx.update(works).set(effects).where(eq(works.id, created.id));
      }
      return created.id;
    });
    return toWorkDto(await findWorkRow(id));
  } catch (err) {
    await discardFiles(committed);
    throw err;
  }
}

/**
 * Atualização feita pelo autor, respeitando o status:
 *  - RASCUNHO/REJEITADO: tudo (inclusive arquivos);
 *  - APROVADO (no catálogo): apenas metadados de divulgação e capa;
 *  - EM_ANALISE/ARQUIVADO: bloqueado.
 */
export async function updateWorkAsAuthor(id: number, user: AuthUser, patch: WorkUpdate, files: WorkFiles) {
  const work = await findWork(id);
  if (!isOwner(work, user)) throw notFound('Obra não encontrada.');

  if (AUTHOR_METADATA_EDIT.includes(work.status)) {
    const allowed = new Set<string>([...METADATA_FIELDS, 'removeCover']);
    const forbiddenFields = Object.keys(patch).filter((k) => patch[k as keyof WorkUpdate] !== undefined && !allowed.has(k));
    if (forbiddenFields.length || files.file || files.audio) {
      throw forbidden(
        'Obras já no catálogo só permitem editar subtítulo, sinopse, notas, tags, rótulo e capa. Para outras mudanças, fale com a curadoria.',
      );
    }
  } else if (!AUTHOR_FULL_EDIT.includes(work.status)) {
    throw forbidden('Esta obra está em análise ou arquivada e não pode ser editada no momento.');
  }
  return applyUpdate(work, patch, files);
}

/** Atualização sem restrições de status (administração). */
export async function updateWorkAsAdmin(id: number, patch: WorkUpdate & { authorId?: number }, files: WorkFiles) {
  const work = await findWork(id);
  return applyUpdate(work, patch, files, true);
}

async function applyUpdate(work: Work, patch: WorkUpdate & { authorId?: number }, files: WorkFiles, admin = false) {
  if (patch.genreId && patch.genreId !== work.genreId) await assertGenreUsable(patch.genreId, admin);
  const committed = await commitFiles(files);
  const { removeCover, removeAudio, ...fields } = patch;
  const values: Partial<NewWork> = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
  if (removeCover && !committed.cover) values.coverPath = null;
  if (removeAudio && !committed.audio) values.audioPath = null;
  Object.assign(values, fileColumns(committed));

  try {
    if (Object.keys(values).length) await db.update(works).set(values).where(eq(works.id, work.id));
  } catch (err) {
    await discardFiles(committed);
    throw err;
  }
  // Remove os arquivos substituídos somente após o banco confirmar a alteração.
  if (committed.file || values.filePath === null) await removeFile(work.filePath);
  if (committed.cover || values.coverPath === null) await removeFile(work.coverPath);
  if (committed.audio || values.audioPath === null) await removeFile(work.audioPath);
  return toWorkDto(await findWorkRow(work.id));
}

/** Autor envia (ou reenvia, após rejeição) a obra para a curadoria. */
export async function submitWork(id: number, user: AuthUser) {
  const work = await findWork(id);
  if (!isOwner(work, user)) throw notFound('Obra não encontrada.');
  if (!AUTHOR_FULL_EDIT.includes(work.status)) throw conflict('Somente rascunhos ou obras rejeitadas podem ser enviadas para análise.');
  await db.transaction(async (tx) => {
    const effects = await applyStatusEffects(tx, work, 'EM_ANALISE');
    await tx.update(works).set(effects).where(eq(works.id, id));
  });
  return toWorkDto(await findWorkRow(id));
}

/* A antiga `publishWork` (botão "Lançar Agora" do autor) foi removida: a
 * aprovação da curadoria já coloca a obra no catálogo. Ver docs/business-rules.md. */

/** Exclusão definitiva (autor: apenas rascunhos/rejeitadas; admin: qualquer obra). */
export async function deleteWork(id: number, user: AuthUser): Promise<void> {
  const work = await findWork(id);
  if (!isAdmin(user)) {
    if (!isOwner(work, user)) throw notFound('Obra não encontrada.');
    if (!AUTHOR_DELETABLE.includes(work.status)) {
      throw conflict('Apenas rascunhos ou obras rejeitadas podem ser excluídas pelo autor.');
    }
  }
  await db.delete(works).where(eq(works.id, id));
  await Promise.all([removeFile(work.filePath), removeFile(work.coverPath), removeFile(work.audioPath)]);
}

/* -------------------------------------------------------------------------- */
/*                           Ações da administração                           */
/* -------------------------------------------------------------------------- */

export async function createWorkAsAdmin(
  fields: WorkFields & { authorId: number; status: WorkStatus },
  files: WorkFiles,
  actor: AuthUser,
): Promise<WorkDto> {
  await assertGenreUsable(fields.genreId, true);
  const committed = await commitFiles(files);
  try {
    const { status, tags, ...data } = fields;
    const id = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(works)
        .values({ ...data, tags: tags ?? [], status: 'RASCUNHO', ...fileColumns(committed) })
        .returning();
      if (status !== 'RASCUNHO') {
        // Aplica os mesmos efeitos de uma transição normal (datas, checklist, exigência de arquivo).
        let current: Work = created;
        const path: WorkStatus[] = status === 'APROVADO' ? ['EM_ANALISE', 'APROVADO'] : [status];
        for (const step of path) {
          const effects = await applyStatusEffects(tx, current, step, null, actor);
          [current] = await tx.update(works).set(effects).where(eq(works.id, created.id)).returning();
        }
      }
      return created.id;
    });
    return toWorkDto(await findWorkRow(id));
  } catch (err) {
    await discardFiles(committed);
    throw err;
  }
}

/** Decisão editorial / ciclo de vida, validando a transição. */
export async function changeStatusAsAdmin(id: number, status: WorkStatus, reason: string | null | undefined, actor: AuthUser) {
  const work = await findWork(id);
  if (work.status === status) throw conflict(`A obra já está com o status ${status}.`);
  if (!ADMIN_TRANSITIONS[work.status].includes(status)) {
    throw conflict(`Transição não permitida: ${work.status} → ${status}.`, { allowed: ADMIN_TRANSITIONS[work.status] });
  }
  if (work.status === 'ARQUIVADO' && status === 'APROVADO' && !work.filePath) {
    throw conflict('Esta obra não tem arquivo original; envie-a para análise antes de republicar.');
  }
  await db.transaction(async (tx) => {
    const effects = await applyStatusEffects(tx, work, status, reason, actor);
    await tx.update(works).set(effects).where(eq(works.id, id));
  });
  return toWorkDto(await findWorkRow(id));
}

/** Contagem de obras por status (dashboard administrativo). */
export async function countByStatus() {
  const rows = await db
    .select({ status: works.status, total: sql<number>`count(*)`.mapWith(Number) })
    .from(works)
    .groupBy(works.status);
  const result: Record<WorkStatus, number> = {
    RASCUNHO: 0,
    EM_ANALISE: 0,
    APROVADO: 0,
    REJEITADO: 0,
    ARQUIVADO: 0,
  };
  for (const r of rows) result[r.status] = r.total;
  return result;
}
