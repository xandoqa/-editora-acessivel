import fs from 'node:fs/promises';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { closeDb, db } from './client';
import { runMigrations } from './migrate';
import { runSeed } from './seed';

/**
 * APAGA todo o banco e os uploads e recria do zero (migrations + seed).
 * Somente para desenvolvimento: bloqueado quando NODE_ENV=production.
 */
async function reset() {
  if (env.isProduction) throw new Error('db:reset é bloqueado em produção.');
  await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
  await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  for (const dir of ['covers', 'works', 'audio', 'tmp']) {
    await fs.rm(path.join(env.uploadDir, dir), { recursive: true, force: true });
  }
  await runMigrations();
  await runSeed();
}

reset()
  .then(() => logger.info('Banco recriado com sucesso.'))
  .catch((err) => {
    logger.error('Falha ao resetar o banco', err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
