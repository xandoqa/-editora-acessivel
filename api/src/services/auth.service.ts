import { eq } from 'drizzle-orm';
import type { z } from 'zod';
import { db } from '../db/client';
import { users, type User } from '../db/schema';
import { signToken } from '../middlewares/auth';
import { conflict, notFound, unauthorized, badRequest } from '../utils/http-error';
import { logger } from '../utils/logger';
import { DUMMY_HASH, hashPassword, verifyPassword } from '../utils/password';
import type { changePasswordSchema, loginSchema, registerSchema, updateProfileSchema } from '../validators/auth.schemas';

/** Representação pública de um usuário (nunca inclui o hash da senha). */
export type PublicUser = Pick<User, 'id' | 'name' | 'email' | 'role' | 'headline' | 'isActive' | 'createdAt'>;

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    headline: u.headline,
    isActive: u.isActive,
    createdAt: u.createdAt,
  };
}

async function findByEmail(email: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user;
}

export async function register(input: z.infer<typeof registerSchema>) {
  if (await findByEmail(input.email)) throw conflict('Este e-mail já está cadastrado. Faça login ou recupere o acesso.');
  const [user] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      headline: input.headline ?? null,
      // A pessoa escolhe entre ler e publicar; ADMIN nunca vem do cadastro público.
      role: input.role,
    })
    .returning();
  return { token: signToken(user), user: toPublicUser(user) };
}

/**
 * Leitor passa a poder publicar as próprias obras.
 *
 * É a mesma escolha oferecida no cadastro, feita depois. Não dá acesso a nada
 * da administração: ESCRITOR só acrescenta o direito de cadastrar e enviar as
 * próprias obras. A administração pode reverter em Administração → Usuários.
 */
export async function enableWriterRole(userId: number): Promise<PublicUser> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw notFound('Usuário não encontrado.');
  if (user.role !== 'LEITOR') throw conflict('Sua conta já pode publicar obras.');
  const [updated] = await db.update(users).set({ role: 'ESCRITOR' }).where(eq(users.id, userId)).returning();
  logger.info(`Perfil de escritor ativado para ${updated.email} (id ${updated.id}).`);
  return toPublicUser(updated);
}

export async function login(input: z.infer<typeof loginSchema>) {
  const user = await findByEmail(input.email);
  // Compara mesmo quando o usuário não existe, para não revelar e-mails cadastrados pelo tempo de resposta.
  const ok = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw unauthorized('E-mail ou senha incorretos.');
  if (!user.isActive) throw unauthorized('Sua conta está desativada. Contate a administração da Livrin.');
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  return { token: signToken(user), user: toPublicUser(user) };
}

export async function getProfile(userId: number): Promise<PublicUser> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw notFound('Usuário não encontrado.');
  return toPublicUser(user);
}

export async function updateProfile(userId: number, input: z.infer<typeof updateProfileSchema>): Promise<PublicUser> {
  const [user] = await db
    .update(users)
    .set({ ...(input.name !== undefined && { name: input.name }), ...(input.headline !== undefined && { headline: input.headline }) })
    .where(eq(users.id, userId))
    .returning();
  if (!user) throw notFound('Usuário não encontrado.');
  return toPublicUser(user);
}

export async function changePassword(userId: number, input: z.infer<typeof changePasswordSchema>): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw notFound('Usuário não encontrado.');
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) throw badRequest('A senha atual está incorreta.');
  await db.update(users).set({ passwordHash: await hashPassword(input.newPassword) }).where(eq(users.id, userId));
}
