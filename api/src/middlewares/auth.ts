import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { env } from '../config/env';
import { db } from '../db/client';
import { users, type UserRole } from '../db/schema';
import { forbidden, unauthorized } from '../utils/http-error';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

declare global {
  // Aumenta a tipagem do Express para que `req.user` exista em toda a aplicação.
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface TokenPayload {
  sub: string;
  role: UserRole;
}

export function signToken(user: { id: number; role: UserRole }): string {
  return jwt.sign({ role: user.role } satisfies Omit<TokenPayload, 'sub'>, env.JWT_SECRET, {
    subject: String(user.id),
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

function readBearer(req: Request): string | undefined {
  const header = req.header('authorization');
  if (!header) return undefined;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
}

/**
 * Valida o token e carrega o usuário do banco a cada requisição. Assim, uma conta
 * desativada ou rebaixada de ADMIN perde o acesso imediatamente, sem esperar o
 * token expirar. O papel usado nas checagens é sempre o do banco, não o do token.
 */
async function resolveUser(token: string): Promise<AuthUser> {
  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as TokenPayload;
  } catch {
    throw unauthorized('Sessão inválida ou expirada. Faça login novamente.');
  }
  const id = Number(payload.sub);
  if (!Number.isInteger(id)) throw unauthorized('Sessão inválida. Faça login novamente.');

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, id));
  if (!user) throw unauthorized('Usuário não encontrado. Faça login novamente.');
  if (!user.isActive) throw unauthorized('Sua conta está desativada. Contate a administração da Livrin.');
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

/** Exige um usuário autenticado (401 caso contrário). */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = readBearer(req);
  if (!token) throw unauthorized();
  req.user = await resolveUser(token);
  next();
}

/** Identifica o usuário se houver token válido, mas não exige login (rotas públicas). */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = readBearer(req);
  if (token) {
    try {
      req.user = await resolveUser(token);
    } catch {
      req.user = undefined; // token inválido em rota pública: segue como visitante
    }
  }
  next();
}

/**
 * Hierarquia dos três perfis (seção 7 da especificação): cada um pode tudo do
 * anterior. O escritor é um leitor que também publica; o administrador é um
 * escritor que também faz curadoria.
 */
const ROLE_RANK: Record<UserRole, number> = { LEITOR: 0, ESCRITOR: 1, ADMIN: 2 };

const ROLE_DENIED: Record<UserRole, string> = {
  LEITOR: 'Você precisa estar autenticado para continuar.',
  ESCRITOR:
    'Sua conta é de leitor e leitores não publicam obras. ' +
    'Ative o perfil de escritor em "Meu perfil" para enviar suas próprias obras.',
  ADMIN: 'Acesso restrito à administração da Livrin.',
};

/** O usuário tem este papel ou um acima dele? */
export function hasAtLeast(user: AuthUser | undefined, role: UserRole): boolean {
  return !!user && ROLE_RANK[user.role] >= ROLE_RANK[role];
}

/**
 * Exige um papel mínimo. Deve ser usado após `authenticate`.
 * A verificação é sempre do papel que está no banco, nunca do que veio no token.
 */
export function requireRole(role: UserRole) {
  return function roleGuard(req: Request, _res: Response, next: NextFunction): void {
    if (!req.user) throw unauthorized();
    if (!hasAtLeast(req.user, role)) throw forbidden(ROLE_DENIED[role]);
    next();
  };
}

/** Exige papel ADMIN. */
export const requireAdmin = requireRole('ADMIN');
/** Exige papel ESCRITOR (ou ADMIN): quem pode cadastrar e enviar obras. */
export const requireWriter = requireRole('ESCRITOR');

/** Atalho tipado para controllers que rodam após `authenticate`. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}
