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
  // eslint-disable-next-line @typescript-eslint/no-namespace
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

/** Exige papel ADMIN. Deve ser usado após `authenticate`. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) throw unauthorized();
  if (req.user.role !== 'ADMIN') throw forbidden('Acesso restrito à administração da Livrin.');
  next();
}

/** Atalho tipado para controllers que rodam após `authenticate`. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}
