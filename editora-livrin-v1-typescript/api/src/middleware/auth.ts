import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { findUserById } from "../data/store";

const JWT_SECRET = process.env.JWT_SECRET ?? "livrin-dev-secret-troque-em-producao";

export interface AuthPayload {
  sub: string; // user id
  role: "autor" | "leitor";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de acesso ausente." });
  }
  const token = header.slice("Bearer ".length);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    const user = findUserById(decoded.sub);
    if (!user) {
      return res.status(401).json({ error: "Usuário não encontrado para este token." });
    }
    req.auth = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

export function requireRole(role: "autor" | "leitor") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.auth?.role !== role) {
      return res.status(403).json({ error: `Ação restrita a usuários do tipo "${role}".` });
    }
    next();
  };
}
