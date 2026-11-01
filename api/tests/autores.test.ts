import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '../src/db/client';
import { users, works } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { api, createUser, resetDatabase } from './helpers';

/**
 * Coleções por autor.
 *
 * O que estes testes seguram: a lista é DERIVADA das obras aprovadas, não um
 * cadastro à parte. Logo, quem só tem rascunho não pode aparecer, e quem não
 * publicou nada não pode nem sequer ter página — nem com 200 e coleção vazia,
 * porque isso contaria a um visitante quem tem conta aqui.
 */

let autoraId: number;
let estreanteId: number;
let leitorId: number;

async function criarObra(fields: {
  title: string;
  authorId: number;
  pages?: number;
  status?: 'RASCUNHO' | 'APROVADO';
  format?: 'QUADRINHO' | 'LIVRO' | 'ZINE';
  publishedAt?: Date;
}) {
  const [linha] = await db
    .insert(works)
    .values({
      title: fields.title,
      authorId: fields.authorId,
      genreId: 1,
      format: fields.format ?? 'LIVRO',
      pages: fields.pages ?? 100,
      synopsis: 'Sinopse de teste com tamanho suficiente para passar na validação mínima.',
      status: fields.status ?? 'APROVADO',
      tags: [],
      filePath: 'works/fake.pdf',
      fileType: 'PDF',
      publishedAt: fields.publishedAt ?? new Date(),
    })
    .returning();
  return linha;
}

beforeAll(async () => {
  await resetDatabase();

  const autora = await createUser('autores-publicada@teste.com', 'ESCRITOR');
  const estreante = await createUser('autores-estreante@teste.com', 'ESCRITOR');
  const leitor = await createUser('autores-leitor@teste.com', 'LEITOR');
  autoraId = autora.id;
  estreanteId = estreante.id;
  leitorId = leitor.id;

  await db
    .update(users)
    .set({ headline: 'Quadrinista independente', bio: 'Biografia de demonstração.' })
    .where(eq(users.id, autoraId));

  await criarObra({
    title: 'Primeira da Coleção',
    authorId: autoraId,
    pages: 120,
    format: 'QUADRINHO',
    publishedAt: new Date('2026-01-10'),
  });
  await criarObra({
    title: 'Segunda da Coleção',
    authorId: autoraId,
    pages: 80,
    format: 'ZINE',
    publishedAt: new Date('2026-03-20'),
  });
  // Rascunho: não conta para a coleção pública, nem na soma de páginas.
  await criarObra({ title: 'Guardada na Gaveta', authorId: autoraId, pages: 999, status: 'RASCUNHO' });
  // Estreante tem só rascunho — logo, não é autor público.
  await criarObra({ title: 'Ainda Escrevendo', authorId: estreanteId, status: 'RASCUNHO' });
});
afterAll(closeDb);

describe('GET /api/authors', () => {
  it('lista quem tem obra aprovada e ninguém mais', async () => {
    const res = await api().get('/api/authors');
    expect(res.status).toBe(200);

    const ids = res.body.map((a: { id: number }) => a.id);
    expect(ids).toContain(autoraId);
    expect(ids).not.toContain(estreanteId);
    expect(ids).not.toContain(leitorId);
  });

  it('conta apenas as obras públicas no resumo', async () => {
    const res = await api().get('/api/authors');
    const autora = res.body.find((a: { id: number }) => a.id === autoraId);

    expect(autora.worksCount).toBe(2);
    // 120 + 80. O rascunho de 999 páginas ficaria gritante se entrasse.
    expect(autora.pagesTotal).toBe(200);
    expect(autora.formats).toEqual(['QUADRINHO', 'ZINE']);
    expect(autora.headline).toBe('Quadrinista independente');
    expect(autora.bio).toBe('Biografia de demonstração.');
    expect(autora.covers.length).toBeLessThanOrEqual(3);
  });
});

describe('GET /api/authors/:id', () => {
  it('devolve a coleção completa, da obra mais recente para a mais antiga', async () => {
    const res = await api().get(`/api/authors/${autoraId}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBeTruthy();

    const titulos = res.body.works.map((w: { title: string }) => w.title);
    expect(titulos).toEqual(['Segunda da Coleção', 'Primeira da Coleção']);
    expect(titulos).not.toContain('Guardada na Gaveta');
  });

  it('responde 404 para quem existe mas não publicou nada', async () => {
    const res = await api().get(`/api/authors/${estreanteId}`);
    expect(res.status).toBe(404);
  });

  it('responde 404 para quem nem conta de autor tem', async () => {
    const res = await api().get(`/api/authors/${leitorId}`);
    expect(res.status).toBe(404);
  });

  it('responde 404 para id inexistente', async () => {
    const res = await api().get('/api/authors/999999');
    expect(res.status).toBe(404);
  });
});
