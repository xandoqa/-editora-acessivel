import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { closeDb, db } from '../src/db/client';
import { works } from '../src/db/schema';
import { api, bearer, createUser, login, resetDatabase } from './helpers';

/**
 * Catálogo público — a área onde estava o defeito relatado na seção 11 da
 * especificação ("os livros existentes nas estantes não aparecem corretamente").
 *
 * Estes testes existem para que a regressão não volte em silêncio: o que o
 * catálogo mostra, o que ele esconde, e se os filtros e a busca realmente
 * filtram. Antes da correção não havia nenhum teste cobrindo esta rota.
 */

let admin: string;
let escritor: string;

/** Cria uma obra direto no banco, no estado desejado, sem passar pelo upload. */
async function criarObra(fields: {
  title: string;
  authorId: number;
  format?: 'QUADRINHO' | 'LIVRO' | 'MANGA_WEBCOMIC' | 'ZINE';
  status?: 'RASCUNHO' | 'EM_ANALISE' | 'APROVADO' | 'REJEITADO' | 'ARQUIVADO';
  hasAudioDesc?: boolean;
  tags?: string[];
}) {
  const [linha] = await db
    .insert(works)
    .values({
      title: fields.title,
      authorId: fields.authorId,
      genreId: 1,
      format: fields.format ?? 'LIVRO',
      pages: 100,
      synopsis: 'Sinopse de teste com tamanho suficiente para passar na validação mínima.',
      status: fields.status ?? 'APROVADO',
      hasAudioDesc: fields.hasAudioDesc ?? false,
      tags: fields.tags ?? [],
      filePath: 'works/fake.pdf',
      fileType: 'PDF',
      publishedAt: new Date(),
    })
    .returning();
  return linha;
}

beforeAll(async () => {
  await resetDatabase();
  const autora = await createUser('catalogo-autora@teste.com', 'ESCRITOR');
  await createUser('catalogo-admin@teste.com', 'ADMIN');
  escritor = await login('catalogo-autora@teste.com');
  admin = await login('catalogo-admin@teste.com');

  await criarObra({ title: 'Quadrinho Audiodescrito', authorId: autora.id, format: 'QUADRINHO', hasAudioDesc: true, tags: ['espaco'] });
  await criarObra({ title: 'Romance Aprovado', authorId: autora.id, format: 'LIVRO' });
  await criarObra({ title: 'Zine Aprovado', authorId: autora.id, format: 'ZINE' });
  await criarObra({ title: 'Ainda Em Analise', authorId: autora.id, status: 'EM_ANALISE' });
  await criarObra({ title: 'Rascunho Guardado', authorId: autora.id, status: 'RASCUNHO' });
  await criarObra({ title: 'Obra Arquivada', authorId: autora.id, status: 'ARQUIVADO' });
});
afterAll(closeDb);

describe('Catálogo público', () => {
  it('mostra as obras aprovadas e nenhuma das outras', async () => {
    const res = await api().get('/api/works');
    expect(res.status).toBe(200);

    const titulos = res.body.data.map((w: { title: string }) => w.title);
    expect(titulos).toContain('Quadrinho Audiodescrito');
    expect(titulos).toContain('Romance Aprovado');
    expect(titulos).toContain('Zine Aprovado');
    // Rascunho, em análise e arquivada nunca aparecem para o público.
    expect(titulos).not.toContain('Ainda Em Analise');
    expect(titulos).not.toContain('Rascunho Guardado');
    expect(titulos).not.toContain('Obra Arquivada');
    expect(res.body.catalogTotal).toBe(3);
  });

  it('não vaza obra não aprovada nem para visitante nem para outro usuário', async () => {
    const [rascunho] = await db.select().from(works).where(eq(works.title, 'Rascunho Guardado'));
    await createUser('xereta@teste.com', 'LEITOR');
    const xereta = await login('xereta@teste.com');

    expect((await api().get(`/api/works/${rascunho.id}`)).status).toBe(404);
    expect((await api().get(`/api/works/${rascunho.id}`).set(bearer(xereta))).status).toBe(404);
    // O autor e a administração continuam vendo.
    expect((await api().get(`/api/works/${rascunho.id}`).set(bearer(escritor))).status).toBe(200);
    expect((await api().get(`/api/works/${rascunho.id}`).set(bearer(admin))).status).toBe(200);
  });

  it('filtra por formato', async () => {
    const res = await api().get('/api/works').query({ format: 'ZINE' });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Zine Aprovado');
  });

  it('filtra por recurso de acessibilidade', async () => {
    const res = await api().get('/api/works').query({ feature: 'audiodescricao' });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Quadrinho Audiodescrito');
  });

  it('busca por título e por tag', async () => {
    const porTitulo = await api().get('/api/works').query({ q: 'Romance' });
    expect(porTitulo.body.data.map((w: { title: string }) => w.title)).toEqual(['Romance Aprovado']);

    const porTag = await api().get('/api/works').query({ q: 'espaco' });
    expect(porTag.body.data.map((w: { title: string }) => w.title)).toEqual(['Quadrinho Audiodescrito']);
  });

  it('trata caracteres de busca como texto, não como curinga de SQL', async () => {
    const res = await api().get('/api/works').query({ q: '%' });
    expect(res.status).toBe(200);
    // "%" escapado não casa com nada; sem escape traria o catálogo inteiro.
    expect(res.body.data).toHaveLength(0);
  });

  it('pagina e recusa parâmetros inválidos', async () => {
    const pagina = await api().get('/api/works').query({ page: 1, pageSize: 2 });
    expect(pagina.body.data).toHaveLength(2);
    expect(pagina.body.meta.total).toBe(3);
    expect(pagina.body.meta.totalPages).toBe(2);

    expect((await api().get('/api/works').query({ sort: 'inexistente' })).status).toBe(400);
    expect((await api().get('/api/works').query({ pageSize: 0 })).status).toBe(400);
  });

  it('arquivar tira a obra do catálogo e reaprovar devolve', async () => {
    const [obra] = await db.select().from(works).where(eq(works.title, 'Romance Aprovado'));

    const arquivou = await api().patch(`/api/admin/works/${obra.id}/status`).set(bearer(admin)).send({ status: 'ARQUIVADO' });
    expect(arquivou.status).toBe(200);
    expect((await api().get('/api/works')).body.catalogTotal).toBe(2);

    const reaprovou = await api().patch(`/api/admin/works/${obra.id}/status`).set(bearer(admin)).send({ status: 'APROVADO' });
    expect(reaprovou.status).toBe(200);
    expect((await api().get('/api/works')).body.catalogTotal).toBe(3);
  });
});
