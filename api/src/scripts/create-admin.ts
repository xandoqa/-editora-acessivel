import { eq } from 'drizzle-orm';
import { closeDb, db } from '../db/client';
import { users } from '../db/schema';
import { logger } from '../utils/logger';
import { hashPassword } from '../utils/password';
import { emailSchema, passwordSchema } from '../validators/auth.schemas';

/**
 * Cria um administrador ou promove um usuário existente a ADMIN.
 *
 * Uso:
 *   npm run admin:create -- --email admin@exemplo.com --password "SenhaForte123" --name "Fulana"   (desenvolvimento)
 *   docker compose exec api node dist/scripts/create-admin.js --email ... --password ...         (container de produção)
 *
 * Se o e-mail já existir, o usuário é promovido a ADMIN, reativado e (se
 * --password for informado) tem a senha redefinida.
 */
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = emailSchema.parse(arg('email'));
  const name = arg('name') ?? 'Administrador Livrin';
  const rawPassword = arg('password');
  const [existing] = await db.select().from(users).where(eq(users.email, email));

  if (existing) {
    await db
      .update(users)
      .set({
        role: 'ADMIN',
        isActive: true,
        ...(rawPassword && { passwordHash: await hashPassword(passwordSchema.parse(rawPassword)) }),
      })
      .where(eq(users.id, existing.id));
    logger.info(`Usuário ${email} promovido a ADMIN.`);
    return;
  }
  const password = passwordSchema.parse(rawPassword);
  await db.insert(users).values({ name, email, role: 'ADMIN', passwordHash: await hashPassword(password) });
  logger.info(`Administrador ${email} criado.`);
}

main()
  .catch((err) => {
    logger.error('Não foi possível criar o administrador', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
