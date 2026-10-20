import { createApp } from './app';
import { env } from './config/env';
import { closeDb } from './db/client';
import { waitForDatabase } from './db/migrate';
import { logger } from './utils/logger';

async function main() {
  await waitForDatabase();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`API Livrin rodando na porta ${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} recebido. Encerrando...`);
    server.close(() => {
      void closeDb().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Falha ao iniciar a API', err);
  process.exit(1);
});
