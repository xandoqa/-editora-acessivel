import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/** Limita tentativas de login/cadastro por IP (proteção básica contra força bruta). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 1000 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' } },
});

/** Limite geral da API, generoso, apenas para conter abusos. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.isTest ? 10_000 : 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Muitas requisições. Tente novamente em instantes.' } },
});
