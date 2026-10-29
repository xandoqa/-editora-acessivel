import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb } from '../src/db/client';
import { PDF_BYTES, api, bearer, createUser, login, resetDatabase, workFields } from './helpers';

/**
 * Aquisição de obras pagas.
 *
 * Os testes aqui cobrem exatamente o que não pode depender da tela: preço lido
 * do servidor, acesso concedido só após aprovação, e idempotência de cliques
 * repetidos. São as três regras que, se existissem apenas no frontend,
 * poderiam ser contornadas com o navegador aberto.
 */

let autora: string;
let leitor: string;
let outroLeitor: string;
let admin: string;

function multipart(req: ReturnType<ReturnType<typeof api>['post']>, fields: Record<string, string>) {
  for (const [k, v] of Object.entries(fields)) req.field(k, v);
  return req;
}

/** Cadastra, envia para análise e aprova — devolve o id da obra publicada. */
async function publicarObra(extra: Record<string, string> = {}): Promise<number> {
  const criada = await multipart(
    api().post('/api/works').set(bearer(autora)).attach('file', PDF_BYTES, 'obra.pdf'),
    { ...workFields, action: 'submit', ...extra },
  );
  expect(criada.status).toBe(201);
  const id = criada.body.id as number;
  const aprovada = await api().patch(`/api/admin/works/${id}/status`).set(bearer(admin)).send({ status: 'APROVADO' });
  expect(aprovada.status).toBe(200);
  return id;
}

beforeAll(async () => {
  await resetDatabase();
  await createUser('autora.venda@teste.com', 'ESCRITOR');
  await createUser('leitor.compra@teste.com', 'LEITOR');
  await createUser('outro.leitor@teste.com', 'LEITOR');
  await createUser('curadoria.venda@teste.com', 'ADMIN');
  autora = await login('autora.venda@teste.com');
  leitor = await login('leitor.compra@teste.com');
  outroLeitor = await login('outro.leitor@teste.com');
  admin = await login('curadoria.venda@teste.com');
});
afterAll(closeDb);

describe('Regras de preço', () => {
  it('recusa preço acima do teto de R$ 50,00', async () => {
    const resposta = await multipart(
      api().post('/api/works').set(bearer(autora)).attach('file', PDF_BYTES, 'obra.pdf'),
      { ...workFields, action: 'draft', monetization: 'PAGA', priceCents: '5001' },
    );
    expect(resposta.status).toBe(400);
  });

  it('aceita preço no limite exato do teto', async () => {
    const resposta = await multipart(
      api().post('/api/works').set(bearer(autora)).attach('file', PDF_BYTES, 'obra.pdf'),
      { ...workFields, action: 'draft', monetization: 'PAGA', priceCents: '5000' },
    );
    expect(resposta.status).toBe(201);
    expect(resposta.body.priceCents).toBe(5000);
  });

  it('recusa obra paga sem preço', async () => {
    const resposta = await multipart(
      api().post('/api/works').set(bearer(autora)).attach('file', PDF_BYTES, 'obra.pdf'),
      { ...workFields, action: 'draft', monetization: 'PAGA' },
    );
    expect(resposta.status).toBe(400);
  });

  it('recusa preço em obra que não é paga', async () => {
    const resposta = await multipart(
      api().post('/api/works').set(bearer(autora)).attach('file', PDF_BYTES, 'obra.pdf'),
      { ...workFields, action: 'draft', monetization: 'GRATUITA', priceCents: '1000' },
    );
    expect(resposta.status).toBe(400);
  });
});

describe('Acesso a obra paga', () => {
  it('nega o arquivo a quem não adquiriu, e libera depois da confirmação', async () => {
    const id = await publicarObra({ monetization: 'PAGA', priceCents: '2500' });

    const semCompra = await api().get(`/api/works/${id}/file`).set(bearer(leitor));
    expect(semCompra.status).toBe(403);

    const aberta = await api().post(`/api/works/${id}/purchase`).set(bearer(leitor)).send({ method: 'PIX' });
    expect(aberta.status).toBe(201);
    expect(aberta.body.purchase.status).toBe('PENDENTE');
    // O preço cobrado veio do banco, não da requisição.
    expect(aberta.body.purchase.priceCents).toBe(2500);

    // Enquanto pendente, continua negado: pagar é confirmar, não abrir.
    expect((await api().get(`/api/works/${id}/file`).set(bearer(leitor))).status).toBe(403);

    const confirmada = await api()
      .post(`/api/purchases/${aberta.body.purchase.id}/confirm`)
      .set(bearer(leitor));
    expect(confirmada.status).toBe(200);
    expect(confirmada.body.status).toBe('CONFIRMADA');

    expect((await api().get(`/api/works/${id}/file`).set(bearer(leitor))).status).toBe(200);
    // A liberação é de quem comprou, e de mais ninguém.
    expect((await api().get(`/api/works/${id}/file`).set(bearer(outroLeitor))).status).toBe(403);
  });

  it('a autoria lê a própria obra paga sem comprar', async () => {
    const id = await publicarObra({ monetization: 'PAGA', priceCents: '1500' });
    expect((await api().get(`/api/works/${id}/file`).set(bearer(autora))).status).toBe(200);
  });

  it('obra gratuita continua aberta a qualquer leitor', async () => {
    const id = await publicarObra();
    expect((await api().get(`/api/works/${id}/file`).set(bearer(leitor))).status).toBe(200);
  });

  it('não deixa adquirir obra de leitura livre', async () => {
    const id = await publicarObra();
    const resposta = await api().post(`/api/works/${id}/purchase`).set(bearer(leitor)).send({ method: 'PIX' });
    expect(resposta.status).toBe(400);
  });
});

describe('O cliente não controla o preço', () => {
  it('ignora priceCents enviado na requisição de compra', async () => {
    const id = await publicarObra({ monetization: 'PAGA', priceCents: '4000' });
    // O schema é estrito: campo desconhecido é recusado em vez de ignorado em
    // silêncio — e, mesmo que passasse, nada no serviço lê valor do cliente.
    const resposta = await api()
      .post(`/api/works/${id}/purchase`)
      .set(bearer(leitor))
      .send({ method: 'PIX', priceCents: 1 });
    expect(resposta.status).toBe(400);

    const legitima = await api().post(`/api/works/${id}/purchase`).set(bearer(leitor)).send({ method: 'PIX' });
    expect(legitima.body.purchase.priceCents).toBe(4000);
  });
});

describe('Idempotência', () => {
  it('cliques repetidos reaproveitam a cobrança em vez de criar outra', async () => {
    const id = await publicarObra({ monetization: 'PAGA', priceCents: '1000' });

    const primeira = await api().post(`/api/works/${id}/purchase`).set(bearer(leitor)).send({ method: 'PIX' });
    const segunda = await api().post(`/api/works/${id}/purchase`).set(bearer(leitor)).send({ method: 'PIX' });

    expect(primeira.status).toBe(201);
    expect(segunda.status).toBe(200);
    expect(segunda.body.purchase.id).toBe(primeira.body.purchase.id);
    expect(segunda.body.reaproveitada).toBe(true);
  });

  it('confirmar duas vezes não gera segunda aquisição nem segundo pagamento', async () => {
    const id = await publicarObra({ monetization: 'PAGA', priceCents: '1200' });
    const aberta = await api().post(`/api/works/${id}/purchase`).set(bearer(leitor)).send({ method: 'PIX' });
    const pid = aberta.body.purchase.id;

    const um = await api().post(`/api/purchases/${pid}/confirm`).set(bearer(leitor));
    const dois = await api().post(`/api/purchases/${pid}/confirm`).set(bearer(leitor));

    expect(um.status).toBe(200);
    expect(dois.status).toBe(200);
    expect(dois.body.id).toBe(um.body.id);
    expect(dois.body.confirmedAt).toBe(um.body.confirmedAt);

    const historico = await api().get('/api/me/purchases').set(bearer(leitor));
    const desta = historico.body.filter((p: { work: { id: number } }) => p.work.id === id);
    expect(desta).toHaveLength(1);
  });

  it('recusa comprar de novo uma obra já adquirida', async () => {
    const id = await publicarObra({ monetization: 'PAGA', priceCents: '900' });
    const aberta = await api().post(`/api/works/${id}/purchase`).set(bearer(leitor)).send({ method: 'PIX' });
    await api().post(`/api/purchases/${aberta.body.purchase.id}/confirm`).set(bearer(leitor));

    const denovo = await api().post(`/api/works/${id}/purchase`).set(bearer(leitor)).send({ method: 'PIX' });
    expect(denovo.status).toBe(409);
  });
});

describe('Biblioteca pessoal', () => {
  it('guarda a obra adquirida e não mostra a de outra pessoa', async () => {
    const id = await publicarObra({ monetization: 'PAGA', priceCents: '2000' });
    const aberta = await api().post(`/api/works/${id}/purchase`).set(bearer(leitor)).send({ method: 'BOLETO' });
    await api().post(`/api/purchases/${aberta.body.purchase.id}/confirm`).set(bearer(leitor));

    const minha = await api().get('/api/me/library').set(bearer(leitor));
    expect(minha.status).toBe(200);
    expect(minha.body.some((l: { work: { id: number } }) => l.work.id === id)).toBe(true);

    const doOutro = await api().get('/api/me/library').set(bearer(outroLeitor));
    expect(doOutro.body.some((l: { work: { id: number } }) => l.work.id === id)).toBe(false);
  });

  it('exige conta para adquirir', async () => {
    const id = await publicarObra({ monetization: 'PAGA', priceCents: '800' });
    expect((await api().post(`/api/works/${id}/purchase`).send({ method: 'PIX' })).status).toBe(401);
    expect((await api().get('/api/me/library')).status).toBe(401);
  });
});

describe('Cartão de demonstração', () => {
  it('exige os dados do cartão e recusa formato inválido', async () => {
    const id = await publicarObra({ monetization: 'PAGA', priceCents: '1100' });

    const semCartao = await api().post(`/api/works/${id}/purchase`).set(bearer(leitor)).send({ method: 'CARTAO' });
    expect(semCartao.status).toBe(400);

    const invalido = await api()
      .post(`/api/works/${id}/purchase`)
      .set(bearer(leitor))
      .send({ method: 'CARTAO', card: { holder: 'Fulana', number: '123', expiry: '13/30', cvv: 'abc' } });
    expect(invalido.status).toBe(400);

    const valido = await api()
      .post(`/api/works/${id}/purchase`)
      .set(bearer(leitor))
      .send({
        method: 'CARTAO',
        card: { holder: 'Fulana de Teste', number: '4111 1111 1111 1111', expiry: '12/30', cvv: '123' },
      });
    expect(valido.status).toBe(201);
    // Nenhum dado do cartão volta na resposta. O número completo é a checagem
    // confiável: um trecho curto como o CVV poderia aparecer por acaso dentro
    // de um identificador e tornar o teste instável.
    expect(JSON.stringify(valido.body)).not.toContain('4111111111111111');
    expect(valido.body.purchase).not.toHaveProperty('card');
  });
});

describe('Cancelamento', () => {
  it('cancelar não libera a obra', async () => {
    const id = await publicarObra({ monetization: 'PAGA', priceCents: '1300' });
    const aberta = await api().post(`/api/works/${id}/purchase`).set(bearer(leitor)).send({ method: 'PIX' });

    const cancelada = await api().post(`/api/purchases/${aberta.body.purchase.id}/cancel`).set(bearer(leitor));
    expect(cancelada.status).toBe(200);
    expect(cancelada.body.status).toBe('CANCELADA');

    expect((await api().get(`/api/works/${id}/file`).set(bearer(leitor))).status).toBe(403);

    // Cobrança cancelada não confirma depois.
    const tentativa = await api().post(`/api/purchases/${aberta.body.purchase.id}/confirm`).set(bearer(leitor));
    expect(tentativa.status).toBe(409);
  });

  it('não deixa ver nem confirmar aquisição de outra pessoa', async () => {
    const id = await publicarObra({ monetization: 'PAGA', priceCents: '1400' });
    const aberta = await api().post(`/api/works/${id}/purchase`).set(bearer(leitor)).send({ method: 'PIX' });
    const pid = aberta.body.purchase.id;

    expect((await api().get(`/api/purchases/${pid}`).set(bearer(outroLeitor))).status).toBe(404);
    expect((await api().post(`/api/purchases/${pid}/confirm`).set(bearer(outroLeitor))).status).toBe(404);
  });
});

describe('Monetização não substitui a curadoria', () => {
  it('obra paga em rascunho não aparece no catálogo nem pode ser adquirida', async () => {
    const criada = await multipart(
      api().post('/api/works').set(bearer(autora)).attach('file', PDF_BYTES, 'obra.pdf'),
      { ...workFields, action: 'draft', monetization: 'PAGA', priceCents: '3000' },
    );
    expect(criada.status).toBe(201);
    const id = criada.body.id as number;

    // Para um terceiro a obra nem existe — e, portanto, não se compra.
    expect((await api().post(`/api/works/${id}/purchase`).set(bearer(leitor)).send({ method: 'PIX' })).status).toBe(404);
  });
});
