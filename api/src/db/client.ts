import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env';
import * as schema from './schema';

/**
 * Pool de conexões único da aplicação. Todas as consultas passam pelo Drizzle,
 * que gera SQL parametrizado (proteção contra SQL Injection).
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
});

export const db = drizzle(pool, { schema, casing: undefined });

export type Database = typeof db;
/** Tipo de transação aceito pelos serviços que precisam de atomicidade. */
export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

export async function closeDb(): Promise<void> {
  await pool.end();
}
