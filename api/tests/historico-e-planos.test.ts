import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb } from '../src/db/client';
import { PDF_BYTES, api, bearer, createUser, login, resetDatabase, workFields } from './helpers';

/**
 * Histórico de leitura, plano premium e descrição da capa.
 *
 * O que estes testes protegem, em uma frase cada:
 *  - o histórico pertence à conta, não ao navegador, e não vaza entre contas;
 *  - o plano só é ativado por uma confirmação do SERVIDOR, e cancelar o
 *    desfaz sem apagar o histórico financeiro;
 *  - o premium **não** libera obra paga.
 */

let autora: string;
let leitor: string;
let outro: string;
let admin: string;

function multipart(req: ReturnType<ReturnType<typeof api>['post']>, fields: Record<string, string>) {
  for (const [k, v] of Object.entries(fields)) req.field(k, v);
  return req;
}

async function publicar(extra: Record<string, string> = {}): Promise<number> {
  const criada = await multipart(
    api().post('/api/works').set(bearer(autora)).attach('file', PDF_BYTES, 'obra.pdf'),
    { ...workFields, action: 'submit', ...extra },
  );
  expect(criada.status).toBe(201);
  const id = criada.body.id as number;
  await api().patch(`/api/admin/works/${id}/status`).set(bearer(admin)).send({ status: 'APROVADO' });
  return id;
}

/**
 * Abre uma sessão de leitura e avança até uma página.
 *
 * É exatamente o que o leitor faz ao abrir a obra — e é o que alimenta o
 * histórico, porque o histórico lê as mesmas sessões que já existiam para as
 * métricas da autoria.
 */
async function ler(workId: number, autenticacao: string, lastPage = 1) {
  const aberta = await api().post(`/api/works/${workId}/sessions`).set(bearer(autenticacao));
  expect(aberta.status).toBe(201);
  const { id, token } = aberta.body as { id: string; token: string };
  const avancou = await api().patch(`/api/sessions/${id}`).set('x-session-token', token).send({ lastPage });
  expect(avancou.status).toBe(204);
  return id;
}

beforeAll(async () => {
  await resetDatabase();
  await createUser('autora.hist@teste.com', 'ESCRITOR');
  await createUser('leitor.hist@teste.com', 'LEITOR');
  await createUser('outro.hist@teste.com', 'LEITOR');
  await createUser('admin.hist@teste.com', 'ADMIN');
  autora = await login('autora.hist@teste.com');
  leitor = await login('leitor.hist@teste.com');
  outro = await login('outro.hist@teste.com');
  admin = await login('admin.hist@teste.com');
});
afterAll(closeDb);

describe('Histórico de leitura', () => {
  it('registra a obra lida, com a página alcançada, e sobrevive a novo login', async () => {
    const id = await publicar();
    await ler(id, leitor, 7);

    const hist = await api().get('/api/me/reading-history').set(bearer(leitor));
    expect(hist.status).toBe(200);
    const item = hist.body.find((h: { work: { id: number } }) => h.work.id === id);
    expect(item).toBeTruthy();
    expect(item.lastPage).toBe(7);
    expect(item.progresso).toBeGreaterThan(0);

    // "Sair e entrar": outro token, mesma conta. O histórico vem do banco.
    const novo = await login('leitor.hist@teste.com');
    const depois = await api().get('/api/me/reading-history').set(bearer(novo));
    expect(depois.body.some((h: { work: { id: number } }) => h.work.id === id)).toBe(true);
  });

  it('não mostra o que outra pessoa leu', async () => {
    const id = await publicar();
    await ler(id, leitor, 3);
    const doOutro = await api().get('/api/me/reading-history').set(bearer(outro));
    expect(doOutro.body.some((h: { work: { id: number } }) => h.work.id === id)).toBe(false);
  });

  it('agrupa por obra e guarda a página mais distante, não a última', async () => {
    const id = await publicar();
    await ler(id, leitor, 9);
    await ler(id, leitor, 2); // releu o começo

    const hist = await api().get('/api/me/reading-history').set(bearer(leitor));
    const desta = hist.body.filter((h: { work: { id: number } }) => h.work.id === id);
    expect(desta).toHaveLength(1);
    expect(desta[0].lastPage).toBe(9);
    expect(desta[0].sessions).toBeGreaterThanOrEqual(2);
  });

  it('apagar o histórico limpa a lista e exige conta', async () => {
    const id = await publicar();
    await ler(id, leitor, 4);

    expect((await api().get('/api/me/reading-history')).status).toBe(401);

    const apagou = await api().delete('/api/me/reading-history').set(bearer(leitor));
    expect(apagou.status).toBe(200);
    expect(apagou.body.removidas).toBeGreaterThan(0);

    const vazio = await api().get('/api/me/reading-history').set(bearer(leitor));
    expect(vazio.body).toHaveLength(0);
  });
});

describe('Plano premium', () => {
  it('a tela de planos é pública e não expõe preço do cliente', async () => {
    const opcoes = await api().get('/api/plans/options');
    expect(opcoes.status).toBe(200);
    expect(opcoes.body.precoCents).toBeGreaterThan(0);
    expect(opcoes.body.isReal).toBe(false);
  });

  it('assinar só ativa o plano depois da confirmação no servidor', async () => {
    const antes = await api().get('/api/auth/me').set(bearer(leitor));
    expect(antes.body.user.plan).toBe('GRATUITO');

    const aberta = await api().post('/api/me/plan/subscribe').set(bearer(leitor)).send({ method: 'PIX' });
    expect(aberta.status).toBe(201);
    expect(aberta.body.purchase.kind).toBe('PLANO');
    expect(aberta.body.purchase.workId).toBeNull();

    // Cobrança aberta e ainda não confirmada: o plano NÃO mudou.
    const durante = await api().get('/api/auth/me').set(bearer(leitor));
    expect(durante.body.user.plan).toBe('GRATUITO');

    const confirmada = await api().post(`/api/purchases/${aberta.body.purchase.id}/confirm`).set(bearer(leitor));
    expect(confirmada.body.status).toBe('CONFIRMADA');

    const depois = await api().get('/api/auth/me').set(bearer(leitor));
    expect(depois.body.user.plan).toBe('PREMIUM');
    expect(depois.body.user.planSince).toBeTruthy();
  });

  it('o cliente não escolhe o preço da mensalidade', async () => {
    await createUser('preco.plano@teste.com', 'LEITOR');
    const token = await login('preco.plano@teste.com');
    const resposta = await api().post('/api/me/plan/subscribe').set(bearer(token)).send({ method: 'PIX', priceCents: 1 });
    expect(resposta.status).toBe(400);
  });

  it('premium NÃO libera obra paga', async () => {
    const paga = await publicar({ monetization: 'PAGA', priceCents: '2500' });
    // `leitor` está premium desde o teste anterior.
    expect((await api().get(`/api/works/${paga}/file`).set(bearer(leitor))).status).toBe(403);
  });

  it('assinar duas vezes é recusado, e cancelar devolve ao gratuito', async () => {
    const denovo = await api().post('/api/me/plan/subscribe').set(bearer(leitor)).send({ method: 'PIX' });
    expect(denovo.status).toBe(409);

    const cancelado = await api().post('/api/me/plan/cancel').set(bearer(leitor));
    expect(cancelado.status).toBe(200);
    expect(cancelado.body.plan).toBe('GRATUITO');

    const perfil = await api().get('/api/auth/me').set(bearer(leitor));
    expect(perfil.body.user.plan).toBe('GRATUITO');

    // Cancelar de novo não faz sentido.
    expect((await api().post('/api/me/plan/cancel').set(bearer(leitor))).status).toBe(409);
  });

  it('cancelar mantém o histórico de pagamento', async () => {
    const historico = await api().get('/api/me/purchases').set(bearer(leitor));
    const doPlano = historico.body.filter((p: { kind: string }) => p.kind === 'PLANO');
    expect(doPlano.length).toBeGreaterThan(0);
    expect(doPlano.some((p: { status: string }) => p.status === 'CONFIRMADA')).toBe(true);
  });

  /*
   * Quem cancelou pode assinar de novo.
   *
   * Parece óbvio, e é justamente por isso que merece teste: a cobrança
   * anterior continua `CONFIRMADA` depois do cancelamento, porque cancelar
   * assinatura não apaga o que foi pago. Qualquer tentativa de impedir
   * assinatura duplicada com um índice único sobre assinaturas confirmadas
   * quebraria exatamente este caminho — trocaria uma corrida improvável por um
   * defeito garantido. Este teste existe para que a tentação seja descoberta
   * aqui, e não por uma pessoa que não consegue voltar a ser premium.
   */
  it('quem cancelou pode assinar de novo, e o pagamento anterior continua no histórico', async () => {
    const perfil = await api().get('/api/auth/me').set(bearer(leitor));
    expect(perfil.body.user.plan).toBe('GRATUITO');

    const aberta = await api().post('/api/me/plan/subscribe').set(bearer(leitor)).send({ method: 'PIX' });
    expect(aberta.status).toBe(201);
    await api().post(`/api/purchases/${aberta.body.purchase.id}/confirm`).set(bearer(leitor));

    expect((await api().get('/api/auth/me').set(bearer(leitor))).body.user.plan).toBe('PREMIUM');

    const historico = await api().get('/api/me/purchases').set(bearer(leitor));
    const confirmadas = historico.body.filter(
      (p: { kind: string; status: string }) => p.kind === 'PLANO' && p.status === 'CONFIRMADA',
    );
    expect(confirmadas.length).toBe(2);
  });

  it('exige conta', async () => {
    expect((await api().post('/api/me/plan/subscribe').send({ method: 'PIX' })).status).toBe(401);
    expect((await api().post('/api/me/plan/cancel')).status).toBe(401);
  });
});

describe('Descrição da capa', () => {
  it('é gravada e devolvida no detalhe da obra', async () => {
    const descricao = 'Campo verde-escuro com um círculo grande vazado à direita.';
    const id = await publicar({ coverAlt: descricao });
    const detalhe = await api().get(`/api/works/${id}`);
    expect(detalhe.body.coverAlt).toBe(descricao);
  });

  it('é opcional: sem ela a obra continua válida', async () => {
    const id = await publicar();
    const detalhe = await api().get(`/api/works/${id}`);
    expect(detalhe.body.coverAlt).toBeNull();
  });
});
