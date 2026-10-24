import { sql } from 'drizzle-orm';
import request from 'supertest';
import { createApp } from '../src/app';
import { db } from '../src/db/client';
import { runMigrations } from '../src/db/migrate';
import { runSeed } from '../src/db/seed';
import { users, type UserRole } from '../src/db/schema';
import { hashPassword } from '../src/utils/password';

export const app = createApp();
export const api = () => request(app);

/** Recria o schema do banco de teste do zero (migrations + gêneros padrão). */
export async function resetDatabase() {
  if (!process.env.DATABASE_URL?.includes('test')) throw new Error('Recusado: o banco de testes precisa conter "test" no nome.');
  await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
  await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await runMigrations();
  await runSeed();
}

export async function createUser(email: string, role: UserRole = 'LEITOR', password = 'Senha12345') {
  const [u] = await db
    .insert(users)
    .values({ name: email.split('@')[0], email, role, passwordHash: await hashPassword(password) })
    .returning();
  return u;
}

export async function login(email: string, password = 'Senha12345'): Promise<string> {
  const res = await api().post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login falhou: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.token as string;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** PDF mínimo válido (assinatura %PDF-) para testes de upload. */
export const PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

export const workFields = {
  title: 'Obra de Teste',
  genreId: '1',
  format: 'QUADRINHO',
  pages: '42',
  synopsis: 'Uma sinopse longa o suficiente para passar na validação mínima.',
  hasAudioDesc: 'true',
};
