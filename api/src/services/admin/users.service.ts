import { and, asc, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { db } from '../../db/client';
import { feedbacks, readingSessions, reviewNotes, users, works, type User } from '../../db/schema';
import type { AuthUser } from '../../middlewares/auth';
import { badRequest, conflict, notFound } from '../../utils/http-error';
import { hashPassword } from '../../utils/password';
import { escapeLike } from '../../utils/text';
import { paginated } from '../../validators/common';
import type {
  adminCreateUserSchema,
  adminUpdateUserSchema,
  adminUserListSchema,
} from '../../validators/admin.schemas';

const worksCountSql = sql<number>`(select count(*) from works w where w.author_id = "users"."id")`.mapWith(Number);

const userSelect = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  plan: users.plan,
  planSince: users.planSince,
  headline: users.headline,
  isActive: users.isActive,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  worksCount: worksCountSql,
};

const SORT_COLUMNS = {
  createdAt: users.createdAt,
  name: users.name,
  email: users.email,
  lastLoginAt: users.lastLoginAt,
};

export async function listUsers(query: z.infer<typeof adminUserListSchema>) {
  const pattern = query.q ? `%${escapeLike(query.q)}%` : undefined;
  const where = and(
    pattern ? or(ilike(users.name, pattern), ilike(users.email, pattern)) : undefined,
    query.role ? eq(users.role, query.role) : undefined,
    query.active !== undefined ? eq(users.isActive, query.active) : undefined,
  );
  const column = SORT_COLUMNS[query.sort];
  const [rows, [{ total }]] = await Promise.all([
    db
      .select(userSelect)
      .from(users)
      .where(where)
      .orderBy(query.order === 'asc' ? asc(column) : desc(column), desc(users.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(users).where(where),
  ]);
  return paginated(rows, total, query.page, query.pageSize);
}

export async function getUser(id: number) {
  const [user] = await db.select(userSelect).from(users).where(eq(users.id, id));
  if (!user) throw notFound('Usuário não encontrado.');
  const [[activity], recentWorks] = await Promise.all([
    db
      .select({
        feedbacks: sql<number>`(select count(*) from ${feedbacks} where ${feedbacks.userId} = ${id})`.mapWith(Number),
        sessions: sql<number>`(select count(*) from ${readingSessions} where ${readingSessions.userId} = ${id})`.mapWith(Number),
        notes: sql<number>`(select count(*) from ${reviewNotes} where ${reviewNotes.userId} = ${id})`.mapWith(Number),
      })
      .from(sql`(select 1) as one`),
    db
      .select({ id: works.id, title: works.title, status: works.status, updatedAt: works.updatedAt })
      .from(works)
      .where(eq(works.authorId, id))
      .orderBy(desc(works.updatedAt))
      .limit(20),
  ]);
  return { ...user, activity, works: recentWorks };
}

async function assertEmailFree(email: string, exceptId?: number) {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(exceptId ? and(eq(users.email, email), ne(users.id, exceptId)) : eq(users.email, email));
  if (existing) throw conflict('Já existe um usuário com este e-mail.');
}

export async function createUser(input: z.infer<typeof adminCreateUserSchema>) {
  await assertEmailFree(input.email);
  const [user] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email,
      role: input.role,
      headline: input.headline ?? null,
      isActive: input.isActive,
      passwordHash: await hashPassword(input.password),
    })
    .returning({ id: users.id });
  return getUser(user.id);
}

async function countActiveAdmins(exceptId?: number): Promise<number> {
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(users)
    .where(and(eq(users.role, 'ADMIN'), eq(users.isActive, true), exceptId ? ne(users.id, exceptId) : undefined));
  return total;
}

/**
 * Regras de proteção: o administrador não pode rebaixar ou desativar a própria
 * conta, e o sistema nunca fica sem pelo menos um administrador ativo.
 */
export async function updateUser(id: number, actor: AuthUser, input: z.infer<typeof adminUpdateUserSchema>) {
  const [target] = await db.select().from(users).where(eq(users.id, id));
  if (!target) throw notFound('Usuário não encontrado.');
  const losesAdmin = target.role === 'ADMIN' && ((input.role && input.role !== 'ADMIN') || input.isActive === false);
  if (losesAdmin) {
    if (id === actor.id) throw badRequest('Você não pode remover o próprio acesso administrativo ou desativar a própria conta.');
    if ((await countActiveAdmins(id)) === 0) throw conflict('O sistema precisa de pelo menos um administrador ativo.');
  }
  if (input.email) await assertEmailFree(input.email, id);
  const values: Partial<User> = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
  if (Object.keys(values).length) await db.update(users).set(values).where(eq(users.id, id));
  return getUser(id);
}

export async function resetPassword(id: number, password: string) {
  const [updated] = await db
    .update(users)
    .set({ passwordHash: await hashPassword(password) })
    .where(eq(users.id, id))
    .returning({ id: users.id });
  if (!updated) throw notFound('Usuário não encontrado.');
}

/**
 * Exclusão definitiva apenas para contas sem obras (as obras têm FK RESTRICT
 * para preservar o acervo). Para as demais, use a desativação (soft delete).
 */
export async function deleteUser(id: number, actor: AuthUser) {
  if (id === actor.id) throw badRequest('Você não pode excluir a própria conta.');
  const [target] = await db.select({ id: users.id, role: users.role, isActive: users.isActive }).from(users).where(eq(users.id, id));
  if (!target) throw notFound('Usuário não encontrado.');
  const [{ owned }] = await db.select({ owned: sql<number>`count(*)`.mapWith(Number) }).from(works).where(eq(works.authorId, id));
  if (owned > 0) throw conflict(`Este usuário é autor de ${owned} obra(s). Desative a conta em vez de excluí-la.`);
  if (target.role === 'ADMIN' && target.isActive && (await countActiveAdmins(id)) === 0) {
    throw conflict('O sistema precisa de pelo menos um administrador ativo.');
  }
  await db.delete(users).where(eq(users.id, id));
}
