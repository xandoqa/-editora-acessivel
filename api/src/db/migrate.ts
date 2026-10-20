import path from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { closeDb, db, pool } from './client';
import { logger } from '../utils/logger';

/** Pasta com as migrations SQL versionadas (gerada por `npm run db:generate`). */
export const MIGRATIONS_FOLDER = path.resolve(__dirname, '../../drizzle');

/**
 * Aguarda o PostgreSQL aceitar conexões. Útil no Docker, onde a API pode
 * iniciar alguns segundos antes do banco estar pronto.
 */
export async function waitForDatabase(retries = 30, delayMs = 2000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      logger.warn(`Banco indisponível (tentativa ${attempt}/${retries}). Nova tentativa em ${delayMs / 1000}s...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

export async function runMigrations(): Promise<void> {
  await waitForDatabase();
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}

if (require.main === module) {
  runMigrations()
    .then(() => logger.info('Migrations aplicadas com sucesso.'))
    .catch((err) => {
      logger.error('Falha ao aplicar migrations', err);
      process.exitCode = 1;
    })
    .finally(() => closeDb());
}
