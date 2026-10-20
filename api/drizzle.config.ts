import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

/**
 * Configuração do drizzle-kit (geração de migrations a partir de src/db/schema.ts).
 * As migrations SQL geradas ficam versionadas em ./drizzle e são aplicadas
 * automaticamente na inicialização da API (src/db/migrate.ts).
 */
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
});
