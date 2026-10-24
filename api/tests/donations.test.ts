import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '../src/db/client';
import { works } from '../src/db/schema';
import { MAX_CENTAVOS, MIN_CENTAVOS } from '../src/services/payments/payment.service';
import { api, bearer, createUser, login, resetDatabase } from './helpers';

/**
 * Apoio voluntário (seções 17 a 19 da especificação).
 *
 * O que estes testes garantem: o apoio nunca é obrigatório para ler, o valor é
 * validado no servidor, a confirmação é idempotente e ninguém enxerga o apoio
 * de outra pessoa.
 */

let leitor: string;
let admin: string;
let obraId: number;

beforeAll(async () => {
  await resetDatabase();
  const autora = await createUser('apoio-autora@teste.com', 'ESCRITOR');
  await createUser('apoio-leitor@teste.com', 'LEITOR');
  await createUser('apoio-admin@teste.com', 'ADMIN');
  leitor = await login('apoio-leitor@teste.com');
  admin = await login('apoio-admin@teste.com');

  const [obra] = await db
    .insert(works)
    .values({
      title: 'Obra Apoiada',
      authorId: autora.id,
      genreId: 1,
      format: 'LIVRO',
      pages: 50,
      synopsis: 'Sinopse de teste com tamanho suficiente para passar na validação mínima.',
      status: 'APROVADO',
      publishedAt: new Date(),
    })
    .returning();
  obraId = obra.id;
});
afterAll(closeDb);

describe('Apoio ao projeto', () => {
  it('informa os meios aceitos e deixa claro que o provedor é simulado', async () => {
    const res = await api().get('/api/donations/options');
    expect(res.status).toBe(200);
    expect(res.body.isReal).toBe(false);
    expect(res.body.methods).toContain('PIX');
    expect(res.body.minCents).toBe(MIN_CENTAVOS);
    expect(res.body.maxCents).toBe(MAX_CENTAVOS);
  });

  it('aceita apoio anônimo e devolve um código de pagamento', async () => {
    const res = await api().post('/api/donations').send({ amountCents: 2500, method: 'PIX' });
    expect(res.status).toBe(201);
    expect(res.body.donation.status).toBe('PENDENTE');
    expect(res.body.donation.userId).toBeUndefined();
    expect(res.body.checkout.isReal).toBe(false);
    expect(typeof res.body.checkout.code).toBe('string');
    // A instrução precisa dizer que é demonstração: esconder isso seria enganar.
    expect(res.body.checkout.instruction).toMatch(/DEMONSTRA/i);
  });

  it('recusa valores fora da faixa e método inexistente', async () => {
    expect((await api().post('/api/donations').send({ amountCents: MIN_CENTAVOS - 1, method: 'PIX' })).status).toBe(400);
    expect((await api().post('/api/donations').send({ amountCents: MAX_CENTAVOS + 1, method: 'PIX' })).status).toBe(400);
    expect((await api().post('/api/donations').send({ amountCents: 0, method: 'PIX' })).status).toBe(400);
    expect((await api().post('/api/donations').send({ amountCents: 1000, method: 'CHEQUE' })).status).toBe(400);
  });

  it('recusa apoio apontando para obra inexistente', async () => {
    const res = await api().post('/api/donations').send({ amountCents: 1000, method: 'PIX', workId: 999999 });
    expect(res.status).toBe(404);
  });

  it('registra o apoio vinculado a uma obra e à conta de quem apoiou', async () => {
    const criado = await api()
      .post('/api/donations')
      .set(bearer(leitor))
      .send({ amountCents: 5000, method: 'BOLETO', workId: obraId, message: 'Obrigado pela audiodescrição!' });
    expect(criado.status).toBe(201);
    expect(criado.body.donation.workId).toBe(obraId);

    const confirmado = await api().post(`/api/donations/${criado.body.donation.id}/confirm`).set(bearer(leitor));
    expect(confirmado.status).toBe(200);
    expect(confirmado.body.status).toBe('CONFIRMADA');
    expect(confirmado.body.confirmedAt).not.toBeNull();

    // Confirmar de novo não duplica nem quebra.
    const outraVez = await api().post(`/api/donations/${criado.body.donation.id}/confirm`).set(bearer(leitor));
    expect(outraVez.status).toBe(200);
    expect(outraVez.body.status).toBe('CONFIRMADA');

    const meus = await api().get('/api/me/donations').set(bearer(leitor));
    expect(meus.status).toBe(200);
    expect(meus.body).toHaveLength(1);
    expect(meus.body[0].amountCents).toBe(5000);
  });

  it('não deixa uma pessoa confirmar o apoio de outra', async () => {
    const criado = await api().post('/api/donations').set(bearer(leitor)).send({ amountCents: 1500, method: 'PIX' });
    await createUser('apoio-intruso@teste.com', 'LEITOR');
    const intruso = await login('apoio-intruso@teste.com');

    const res = await api().post(`/api/donations/${criado.body.donation.id}/confirm`).set(bearer(intruso));
    expect(res.status).toBe(404);
  });

  it('o painel administrativo soma apenas os apoios confirmados', async () => {
    const stats = await api().get('/api/admin/donations/stats').set(bearer(admin));
    expect(stats.status).toBe(200);
    expect(stats.body.isReal).toBe(false);
    // Só o apoio de R$ 50,00 foi confirmado; os demais ficaram pendentes.
    expect(stats.body.centavosConfirmados).toBe(5000);
    expect(stats.body.confirmadas).toBe(1);

    const lista = await api().get('/api/admin/donations').set(bearer(admin)).query({ status: 'CONFIRMADA' });
    expect(lista.status).toBe(200);
    expect(lista.body.data).toHaveLength(1);
    expect(lista.body.data[0].work.title).toBe('Obra Apoiada');
  });

  it('bloqueia a listagem administrativa para quem não é administrador', async () => {
    expect((await api().get('/api/admin/donations')).status).toBe(401);
    expect((await api().get('/api/admin/donations').set(bearer(leitor))).status).toBe(403);
  });

  it('ler uma obra continua não exigindo apoio nenhum', async () => {
    // A obra aprovada é pública para qualquer visitante, sem passar por doação.
    const res = await api().get(`/api/works/${obraId}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Obra Apoiada');
  });
});
