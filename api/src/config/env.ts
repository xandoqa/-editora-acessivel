import 'dotenv/config';
import path from 'node:path';
import { z } from 'zod';
import { PASSWORD_RULE_TEXT, checkEnvPassword } from '../validators/password-policy';

/**
 * Todas as configurações da API vêm de variáveis de ambiente, validadas aqui na
 * inicialização. Se algo obrigatório estiver faltando ou inválido, a API
 * encerra com uma mensagem clara em vez de falhar mais tarde de forma obscura.
 */
const booleanFromString = z
  .enum(['true', 'false', '1', '0', 'yes', 'no'])
  .transform((v) => v === 'true' || v === '1' || v === 'yes');

/**
 * Segredos que já circularam em arquivos de exemplo deste projeto. Quem conhece
 * o repositório conhece esses valores, então aceitá-los equivaleria a não ter
 * segredo nenhum: qualquer pessoa assinaria um token válido para qualquer conta.
 */
const LEAKED_JWT_SECRETS = new Set([
  'troque-por-um-segredo-aleatorio-com-pelo-menos-32-caracteres',
  'abfb450b40d5f38f7ced859904ff64b7ba4e590acbefaec410d0b050478c6548',
]);

/** Começos típicos de marcador de exemplo ("troque-por...", "your-secret..."). */
const PLACEHOLDER_PREFIX = /^(troque|altere|mude|insira|coloque|exemplo|example|change|changeme|your|seu-|placeholder)/i;

const HOW_TO_GENERATE =
  'Gere um segredo novo com:  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"';

const jwtSecretSchema = z
  .string()
  .min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres')
  .refine((v) => !LEAKED_JWT_SECRETS.has(v.trim()), {
    message: `este é um valor de exemplo do próprio projeto e não pode ser usado como segredo. ${HOW_TO_GENERATE}`,
  })
  .refine((v) => !PLACEHOLDER_PREFIX.test(v.trim()), {
    message: `parece um marcador de exemplo, não um segredo. ${HOW_TO_GENERATE}`,
  })
  .refine((v) => new Set(v.trim()).size >= 8, {
    message: `tem variedade de caracteres baixa demais para ser aleatório. ${HOW_TO_GENERATE}`,
  });

/**
 * Senha opcional vinda do ambiente. Vazia conta como ausente; preenchida precisa
 * passar na MESMA política dos formulários — antes o seed aceitava senhas que o
 * próprio sistema recusaria na tela de cadastro.
 */
const optionalEnvPassword = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v.trim() === '' ? undefined : v))
  .refine((v) => v === undefined || checkEnvPassword(v) === null, {
    message: `não atende à política de senha do sistema (${PASSWORD_RULE_TEXT}).`,
  });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL deve ser uma URL postgres:// válida' }),
  JWT_SECRET: jwtSecretSchema,
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
  ADMIN_PASSWORD: optionalEnvPassword,
  /** Popular o banco com obras e usuários de demonstração. */
  SEED_DEMO_DATA: booleanFromString.default('false'),
  DEMO_USER_PASSWORD: optionalEnvPassword,
  LOG_REQUESTS: booleanFromString.default('true'),
  /**
   * Provedor de pagamento das doações. "simulado" não movimenta dinheiro algum
   * e deixa isso explícito na interface (ver services/payments).
   */
  PAYMENT_PROVIDER: z.string().default('simulado'),

  /*
   * AbacatePay (PIX). As duas são opcionais: sem chave, o provedor nem entra no
   * registro e a instalação segue no simulado, com aviso no log.
   *
   * `ABACATEPAY_API_KEY` não tem valor padrão escrito aqui de propósito — chave
   * de API em repositório público é chave vazada. Ela mora no `.env`, que não é
   * versionado.
   *
   * `ABACATEPAY_DEV_MODE` declara em que ambiente a chave está. Quem decide de
   * verdade é a chave, e cada cobrança volta com `devMode` dizendo o que
   * aconteceu; o provedor confere um contra o outro e grita no log se
   * discordarem. O padrão é `true` porque a opção segura é a que não movimenta
   * dinheiro por engano.
   */
  ABACATEPAY_API_KEY: z.string().optional().or(z.literal('').transform(() => undefined)),
  ABACATEPAY_DEV_MODE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),

  /*
   * Fale Conosco.
   *
   * Todas opcionais, de propósito: sem nenhuma delas o formulário continua
   * funcionando por inteiro — a mensagem é gravada e aparece na caixa de
   * entrada da administração. O que as variáveis acrescentam é a SEGUNDA
   * etapa, o e-mail saindo para uma caixa de verdade.
   *
   * `CONTATO_EMAIL_DESTINO` não tem valor padrão escrito aqui de propósito:
   * endereço de e-mail pessoal em repositório público vira alimento de robô
   * de spam em questão de dias. Ele mora no `.env`, que não é versionado.
   *
   * `SMTP_PASS` é SENHA DE APP do provedor, nunca a senha da conta. No Gmail,
   * ela é gerada em Conta Google → Segurança → Senhas de app, e só funciona
   * com a verificação em duas etapas ligada.
   */
  CONTATO_EMAIL_DESTINO: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  SMTP_HOST: z.string().optional().or(z.literal('').transform(() => undefined)),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_USER: z.string().optional().or(z.literal('').transform(() => undefined)),
  SMTP_PASS: z.string().optional().or(z.literal('').transform(() => undefined)),
  SMTP_FROM_NAME: z.string().default('Livrin — Fale Conosco'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  // `console` de propósito: o logger ainda não existe quando a configuração falha.
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
