import { defineConfig } from 'drizzle-kit';
export default defineConfig({ dialect: 'postgresql', schema: './src/schema.ts',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgres://livrin:livrin@localhost:5432/livrin' } });
