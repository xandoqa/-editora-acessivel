import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '../src/db/client';
import { contactMessages } from '../src/db/schema';
import { api, bearer, createUser, login, resetDatabase } from './helpers';

/**
 * Fale Conosco.
 *
 * A regra que estes testes seguram é a mais importante do recurso: **a
 * mensagem é gravada mesmo quando o e-mail não sai**. Sem isso, um servidor
 * SMTP fora do ar transforma cada pedido de ajuda em silêncio — e quem
 * escreveu nunca fica sabendo.
 *
 * Nos testes não há SMTP configurado, o que é exatamente o cenário da
 * apresentação sem internet: tudo precisa continuar funcionando.
 */

let admin: string;
let leitor: string;

const MENSAGEM_VALIDA = {
  name: 'Fulana de Tal',
  email: 'Fulana@Exemplo.COM',
  subject: 'ACESSIBILIDADE',
  message: 'A audiodescrição da obra Raízes não inicia no meu leitor de tela.',
};

beforeAll(async () => {
  await resetDatabase();
  await createUser('contato-admin@teste.com', 'ADMIN');
  await createUser('contato-leitor@teste.com', 'LEITOR');
  admin = await login('contato-admin@teste.com');
  leitor = await login('contato-leitor@teste.com');
});
afterAll(closeDb);

describe('POST /api/contato', () => {
  it('grava a mensagem e diz a verdade sobre a entrega', async () => {
    const res = await api().post('/api/contato').send(MENSAGEM_VALIDA);

    expect(res.status).toBe(201);
    expect(res.body.gravada).toBe(true);
    // Sem SMTP configurado, `entregue` precisa ser false — e não um "sucesso"
    // genérico que faria a tela prometer um e-mail que não saiu.
    expect(res.body.entregue).toBe(false);
    expect(res.body.id).toBeGreaterThan(0);

    const linhas = await db.select().from(contactMessages);
    expect(linhas).toHaveLength(1);
    // O e-mail é normalizado para minúsculas, como no resto do projeto.
    expect(linhas[0].email).toBe('fulana@exemplo.com');
    expect(linhas[0].status).toBe('NOVA');
    expect(linhas[0].deliveredAt).toBeNull();
  });

  it('aceita visitante sem conta', async () => {
    const res = await api().post('/api/contato').send({ ...MENSAGEM_VALIDA, message: 'Mensagem de visitante sem conta.' });
    expect(res.status).toBe(201);
  });

  it('guarda quem estava logado, quando havia alguém', async () => {
    const res = await api()
      .post('/api/contato')
      .set(bearer(leitor))
      .send({ ...MENSAGEM_VALIDA, message: 'Mensagem de quem está logado no site.' });

    expect(res.status).toBe(201);
    const [linha] = await db.select().from(contactMessages).orderBy(contactMessages.id);
    expect(linha).toBeTruthy();
    const enviadas = await db.select().from(contactMessages);
    expect(enviadas.find((m) => m.id === res.body.id)?.userId).not.toBeNull();
  });

  it('recusa mensagem curta demais, e-mail inválido e assunto inventado', async () => {
    const curta = await api().post('/api/contato').send({ ...MENSAGEM_VALIDA, message: 'oi' });
    expect(curta.status).toBe(422);

    const email = await api().post('/api/contato').send({ ...MENSAGEM_VALIDA, email: 'não-é-email' });
    expect(email.status).toBe(422);

    const assunto = await api().post('/api/contato').send({ ...MENSAGEM_VALIDA, subject: 'QUALQUER_COISA' });
    expect(assunto.status).toBe(422);
  });

  it('recusa quando o campo-armadilha vem preenchido', async () => {
    const antes = (await db.select().from(contactMessages)).length;

    const res = await api()
      .post('/api/contato')
      .send({ ...MENSAGEM_VALIDA, website: 'http://spam.example' });

    expect(res.status).toBe(422);
    // E nada foi gravado: o robô não entra na caixa de entrada.
    expect((await db.select().from(contactMessages)).length).toBe(antes);
  });
});

describe('Caixa de entrada (admin)', () => {
  it('lista as mensagens para a administração', async () => {
    const res = await api().get('/api/admin/contact-messages').set(bearer(admin));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.novas).toBeGreaterThan(0);
    // A tela precisa saber se a entrega por e-mail está ligada, para explicar
    // ao administrador por que `entregue` está falso em tudo.
    expect(res.body.entregaConfigurada).toBe(false);
  });

  it('recusa leitor e visitante', async () => {
    expect((await api().get('/api/admin/contact-messages')).status).toBe(401);
    expect((await api().get('/api/admin/contact-messages').set(bearer(leitor))).status).toBe(403);
  });

  it('marca como lida', async () => {
    const lista = await api().get('/api/admin/contact-messages').set(bearer(admin));
    const id = lista.body.data[0].id;

    const res = await api().patch(`/api/admin/contact-messages/${id}`).set(bearer(admin)).send({ status: 'LIDA' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('LIDA');

    const filtrada = await api().get('/api/admin/contact-messages?status=LIDA').set(bearer(admin));
    expect(filtrada.body.data.map((m: { id: number }) => m.id)).toContain(id);
  });

  it('apaga e responde 404 na segunda vez', async () => {
    const lista = await api().get('/api/admin/contact-messages').set(bearer(admin));
    const id = lista.body.data[0].id;

    expect((await api().delete(`/api/admin/contact-messages/${id}`).set(bearer(admin))).status).toBe(204);
    expect((await api().delete(`/api/admin/contact-messages/${id}`).set(bearer(admin))).status).toBe(404);
  });
});
