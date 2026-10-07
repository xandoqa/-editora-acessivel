import express from 'express';
import cors from 'cors';
import { eq, sql } from 'drizzle-orm';
import { db } from './db';
import { users, books } from './schema';

const app = express();
app.use(cors(), express.json());

app.post('/api/login', async (req, res) => {
  const [u] = await db.select().from(users).where(eq(users.email, req.body.email ?? ''));
  if (!u || u.password !== req.body.password) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  res.json({ id: u.id, name: u.name });
});

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const [u] = await db.insert(users).values({ name, email, password }).returning();
    res.status(201).json({ id: u.id, name: u.name });
  } catch { res.status(409).json({ error: 'E-mail já cadastrado.' }); }
});

app.get('/api/books', async (req, res) => {
  const q = db.select().from(books);
  const s = req.query.status as string | undefined;
  res.json(s ? await q.where(eq(books.status, s)) : await q);
});

app.post('/api/books', async (req, res) => {
  const { title, genre, pages, synopsis, authorId } = req.body;
  const [b] = await db.insert(books).values({ title, genre, pages: Number(pages), synopsis, authorId }).returning();
  res.status(201).json(b);
});

app.post('/api/books/:id/read', async (req, res) => {
  const [b] = await db.update(books).set({ reads: sql`${books.reads} + 1` }).where(eq(books.id, Number(req.params.id))).returning();
  b ? res.json(b) : res.status(404).json({ error: 'Não encontrado' });
});

app.post('/api/books/:id/approve', async (req, res) => {
  const [b] = await db.update(books).set({ status: 'publicado' }).where(eq(books.id, Number(req.params.id))).returning();
  b ? res.json(b) : res.status(404).json({ error: 'Não encontrado' });
});

app.delete('/api/books/:id', async (req, res) => {
  await db.delete(books).where(eq(books.id, Number(req.params.id)));
  res.status(204).end();
});

app.listen(3000, () => console.log('API :3000'));
