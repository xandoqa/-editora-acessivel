import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { cleanupRequestFiles } from '../services/storage.service';
import { HttpError } from '../utils/http-error';
import { logger } from '../utils/logger';

/** Rota inexistente → 404 em JSON. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Rota não encontrada: ${req.method} ${req.path}` } });
}

/** Códigos do PostgreSQL que viram respostas HTTP legíveis em vez de 500. */
const PG_ERRORS: Record<string, { status: number; code: string; message: string }> = {
  '23505': { status: 409, code: 'CONFLICT', message: 'Já existe um registro com esses dados.' },
  '23503': { status: 409, code: 'CONFLICT', message: 'O registro está vinculado a outros dados e não pode ser alterado.' },
  '23514': { status: 400, code: 'BAD_REQUEST', message: 'Os dados enviados violam uma regra de validação.' },
  '22P02': { status: 400, code: 'BAD_REQUEST', message: 'Formato de dado inválido.' },
};

function findPgCode(err: unknown): string | undefined {
  let current: unknown = err;
  for (let depth = 0; current && depth < 4; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

/**
 * Tratamento central de erros. Nunca expõe stack traces ou SQL ao cliente;
 * os detalhes completos ficam apenas no log do servidor.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  void cleanupRequestFiles(req.files);

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos. Verifique os campos destacados.',
        details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }
  if ((err as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'JSON inválido no corpo da requisição.' } });
    return;
  }
  if ((err as { type?: string }).type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Corpo da requisição muito grande.' } });
    return;
  }

  const pgCode = findPgCode(err);
  if (pgCode && PG_ERRORS[pgCode]) {
    const mapped = PG_ERRORS[pgCode];
    res.status(mapped.status).json({ error: { code: mapped.code, message: mapped.message } });
    return;
  }

  logger.error(`Erro não tratado em ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor. Tente novamente.' } });
}
