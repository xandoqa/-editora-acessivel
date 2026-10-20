import 'dotenv/config';
import path from 'node:path';
import { z } from 'zod';

/**
 * Todas as configurações da API vêm de variáveis de ambiente, validadas aqui na
 * inicialização. Se algo obrigatório estiver faltando ou inválido, a API
 * encerra com uma mensagem clara em vez de falhar mais tarde de forma obscura.
 */
const booleanFromString = z
  .enum(['true', 'false', '1', '0', 'yes', 'no'])
  .transform((v) => v === 'true' || v === '1' || v === 'yes');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL deve ser uma URL postgres:// válida' }),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  /** Lista separada por vírgulas das origens autorizadas a chamar a API (CORS). */
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(180),
  /** Quando true, a API confia no cabeçalho X-Forwarded-For (atrás do Nginx). */
  TRUST_PROXY: booleanFromString.default('false'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
  /** Administrador inicial criado pelo seed (opcional; ver docs/admin.md). */
  ADMIN_NAME: z.string().default('Administrador Livrin'),
  ADMIN_EMAIL: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  ADMIN_PASSWORD: z.string().optional().or(z.literal('').transform(() => undefined)),
  /** Popular o banco com obras e usuários de demonstração. */
  SEED_DEMO_DATA: booleanFromString.default('false'),
  DEMO_USER_PASSWORD: z.string().optional().or(z.literal('').transform(() => undefined)),
  LOG_REQUESTS: booleanFromString.default('true'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  // eslint-disable-next-line no-console
  console.error(`\n[config] Variáveis de ambiente inválidas:\n${issues}\n\nConsulte .env.example e docs/environment.md.\n`);
  process.exit(1);
}

const data = parsed.data;

export const env = {
  ...data,
  isProduction: data.NODE_ENV === 'production',
  isTest: data.NODE_ENV === 'test',
  corsOrigins: data.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
  uploadDir: path.resolve(data.UPLOAD_DIR),
  maxUploadBytes: data.MAX_UPLOAD_MB * 1024 * 1024,
};

export type Env = typeof env;
