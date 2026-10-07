import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
export const db = drizzle(new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://livrin:livrin@localhost:5432/livrin' }));
