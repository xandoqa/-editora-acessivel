/**
 * Erro de domínio com status HTTP. Lançado pelos serviços e convertido em
 * resposta JSON padronizada pelo middleware de erros:
 *   { "error": { "code": "NOT_FOUND", "message": "...", "details"?: ... } }
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, 'BAD_REQUEST', message, details);
export const unauthorized = (message = 'Autenticação necessária.') => new HttpError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'Você não tem permissão para realizar esta ação.') =>
  new HttpError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Recurso não encontrado.') => new HttpError(404, 'NOT_FOUND', message);
export const conflict = (message: string, details?: unknown) => new HttpError(409, 'CONFLICT', message, details);
export const unprocessable = (message: string, details?: unknown) =>
  new HttpError(422, 'UNPROCESSABLE', message, details);
