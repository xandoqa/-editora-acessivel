import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb } from '../src/db/client';
import { PDF_BYTES, api, bearer, createUser, login, resetDatabase, workFields } from './helpers';

/**
 * Os cenários A–L pedidos na especificação, verificados onde eles de fato
 * valem: na API.
 *
 * O teste E ("usuário manipula o frontend") é testado da única forma que faz
 * sentido — ignorando o frontend por completo e batendo direto na API. Se o
 * acesso depende só do servidor, nenhuma alteração no navegador muda nada; e
 * é exatamente isso que estas requisições diretas comprovam.
 */

let autora: string;
let leitor: string;
let premium: string;
let admin: string;
let premiumId: number;

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
  const aprovada = await api().patch(`/api/admin/works/${id}/status`).set(bearer(admin)).send({ status: 'APROVADO' });
  expect(aprovada.status).toBe(200);
  return id;
}

/** Abre e confirma uma aquisição. Devolve o status final. */
async function comprar(workId: number, token: string): Promise<string> {
  const aberta = await api().post(`/api/works/${workId}/purchase`).set(bearer(token)).send({ method: 'PIX' });
  expect(aberta.status).toBe(201);
  const confirmada = await api().post(`/api/purchases/${aberta.body.purchase.id}/confirm`).set(bearer(token));
  return confirmada.body.status as string;
}

beforeAll(async () => {
  await resetDatabase();
  await createUser('autora.acesso@teste.com', 'ESCRITOR');
  await createUser('leitor.acesso@teste.com', 'LEITOR');
  await createUser('premium.acesso@teste.com', 'LEITOR');
  await createUser('admin.acesso@teste.com', 'ADMIN');
  autora = await login('autora.acesso@teste.com');
  leitor = await login('leitor.acesso@teste.com');
  premium = await login('premium.acesso@teste.com');
  admin = await login('admin.acesso@teste.com');

  const lista = await api().get('/api/admin/users?q=premium.acesso').set(bearer(admin));
  premiumId = lista.body.data[0].id as number;
});
afterAll(closeDb);

describe('A — obra gratuita continua acessível', () => {
  it('leitor lê e baixa sem nenhuma barreira', async () => {
    const id = await publicar();
    expect((await api().get(`/api/works/${id}/file`).set(bearer(leitor))).status).toBe(200);
    expect((await api().get(`/api/works/${id}/file?download=1`).set(bearer(leitor))).status).toBe(200);
    // E a audiodescrição, que é conteúdo, também continua aberta.
    expect((await api().get(`/api/works/${id}/audio-descriptions`).set(bearer(leitor))).status).toBe(200);
  });
});

describe('B — obra paga sem compra: leitura bloqueada', () => {
  it('nega o arquivo e mantém as informações públicas visíveis', async () => {
    const id = await publicar({ monetization: 'PAGA', priceCents: '2500' });

    expect((await api().get(`/api/works/${id}/file`).set(bearer(leitor))).status).toBe(403);

    // O que NÃO é conteúdo continua público: capa, título, sinopse, preço.
    const detalhe = await api().get(`/api/works/${id}`).set(bearer(leitor));
    expect(detalhe.status).toBe(200);
    expect(detalhe.body.priceCents).toBe(2500);
    expect(detalhe.body.access).toEqual({ required: true, granted: false, reason: 'NEGADO' });
  });
});

describe('C — obra paga sem compra: download bloqueado pelo backend', () => {
  it('nega também o endpoint de download direto', async () => {
    const id = await publicar({ monetization: 'PAGA', priceCents: '1900' });
    expect((await api().get(`/api/works/${id}/file?download=1`).set(bearer(leitor))).status).toBe(403);
    // Sem token nenhum também não passa.
    expect((await api().get(`/api/works/${id}/file?download=1`)).status).toBe(403);
  });
});

describe('D — pagamento aprovado libera a obra', () => {
  it('libera leitura, download e audiodescrição após a confirmação', async () => {
    const id = await publicar({ monetization: 'PAGA', priceCents: '1500' });
    expect(await comprar(id, leitor)).toBe('CONFIRMADA');

    expect((await api().get(`/api/works/${id}/file`).set(bearer(leitor))).status).toBe(200);
    expect((await api().get(`/api/works/${id}/file?download=1`).set(bearer(leitor))).status).toBe(200);
    expect((await api().get(`/api/works/${id}/audio-descriptions`).set(bearer(leitor))).status).toBe(200);

    const detalhe = await api().get(`/api/works/${id}`).set(bearer(leitor));
    expect(detalhe.body.access).toEqual({ required: true, granted: true, reason: 'COMPRADA' });
  });
});

describe('E — manipular o cliente não libera nada', () => {
  it('ignora qualquer afirmação do cliente sobre preço, acesso ou aprovação', async () => {
    const id = await publicar({ monetization: 'PAGA', priceCents: '3000' });

    // Dizer que o acesso está liberado não liberta: o servidor não lê isso.
    const comCabecalhos = await api()
      .get(`/api/works/${id}/file`)
      .set(bearer(leitor))
      .set('X-Access-Granted', 'true')
      .query({ access: 'granted', paid: 'true' });
    expect(comCabecalhos.status).toBe(403);

    // Mandar um preço ridículo é erro, não desconto.
    const comPreco = await api()
      .post(`/api/works/${id}/purchase`)
      .set(bearer(leitor))
      .send({ method: 'PIX', priceCents: 1 });
    expect(comPreco.status).toBe(400);

    // Forjar o status da aquisição direto no corpo também não funciona.
    const aberta = await api().post(`/api/works/${id}/purchase`).set(bearer(leitor)).send({ method: 'PIX' });
    const forjada = await api()
      .post(`/api/purchases/${aberta.body.purchase.id}/confirm`)
      .set(bearer(leitor))
      .send({ status: 'CONFIRMADA', priceCents: 0 });
    // Confirmou porque o PROVEDOR aprovou, com o preço do banco — não porque
    // o corpo da requisição pediu.
    expect(forjada.body.priceCents).toBe(3000);
  });
});

describe('F — pagamento recusado ou cancelado mantém o bloqueio', () => {
  it('cobrança cancelada não entra na biblioteca nem abre a obra', async () => {
    const id = await publicar({ monetization: 'PAGA', priceCents: '1700' });
    const aberta = await api().post(`/api/works/${id}/purchase`).set(bearer(leitor)).send({ method: 'BOLETO' });
    await api().post(`/api/purchases/${aberta.body.purchase.id}/cancel`).set(bearer(leitor));

    expect((await api().get(`/api/works/${id}/file`).set(bearer(leitor))).status).toBe(403);
    const biblioteca = await api().get('/api/me/library').set(bearer(leitor));
    expect(biblioteca.body.some((l: { work: { id: number } }) => l.work.id === id)).toBe(false);
  });
});

describe('G, H, I — a modalidade é de cada obra', () => {
  it('cada obra guarda e devolve a própria modalidade', async () => {
    const comAnuncio = await publicar({ monetization: 'PUBLICIDADE' });
    const gratuita = await publicar();
    const paga = await publicar({ monetization: 'PAGA', priceCents: '1000' });

    const g = await api().get(`/api/works/${comAnuncio}`);
    expect(g.body.monetization).toBe('PUBLICIDADE');
    expect(g.body.priceCents).toBeNull();
    // Leitura livre, mesmo sem conta: publicidade não cobra do leitor.
    expect((await api().get(`/api/works/${comAnuncio}/file`)).status).toBe(200);

    const h = await api().get(`/api/works/${gratuita}`);
    expect(h.body.monetization).toBe('GRATUITA');

    const i = await api().get(`/api/works/${paga}`);
    expect(i.body.monetization).toBe('PAGA');
    // Obra paga NÃO é tratada como monetizada por publicidade.
    expect(i.body.monetization).not.toBe('PUBLICIDADE');
  });
});

describe('J — plano premium', () => {
  it('a administração ativa o premium, e ele não desbloqueia obra paga', async () => {
    const paga = await publicar({ monetization: 'PAGA', priceCents: '2200' });

    const antes = await api().get('/api/auth/me').set(bearer(premium));
    expect(antes.body.user.plan).toBe('GRATUITO');

    const ativado = await api().patch(`/api/admin/users/${premiumId}`).set(bearer(admin)).send({ plan: 'PREMIUM' });
    expect(ativado.status).toBe(200);
    expect(ativado.body.plan).toBe('PREMIUM');

    const depois = await api().get('/api/auth/me').set(bearer(premium));
    expect(depois.body.user.plan).toBe('PREMIUM');

    // Premium tira anúncio, não paga a conta de ninguém: a obra paga continua
    // exigindo aquisição.
    expect((await api().get(`/api/works/${paga}/file`).set(bearer(premium))).status).toBe(403);
  });
});

describe('K — permissões sobrevivem a sair e entrar de novo', () => {
  it('a aquisição continua valendo com um token novo', async () => {
    const id = await publicar({ monetization: 'PAGA', priceCents: '1250' });
    expect(await comprar(id, leitor)).toBe('CONFIRMADA');

    /*
     * "Sair e entrar" é exatamente isto: autenticar de novo e usar o token
     * resultante.
     *
     * Não dá para exigir que o token NOVO seja diferente do anterior: o `iat`
     * do JWT tem resolução de um segundo, então dois logins da mesma conta no
     * mesmo segundo produzem exatamente a mesma string. Isso não é defeito, e
     * o que este teste precisa provar é outra coisa — que o acesso vem da
     * aquisição registrada no banco, e não de algo guardado na sessão.
     */
    const novoToken = await login('leitor.acesso@teste.com');
    expect((await api().get(`/api/works/${id}/file`).set(bearer(novoToken))).status).toBe(200);

    const biblioteca = await api().get('/api/me/library').set(bearer(novoToken));
    expect(biblioteca.body.some((l: { work: { id: number } }) => l.work.id === id)).toBe(true);
  });
});

describe('L — acesso direto às rotas protegidas', () => {
  it('a audiodescrição de obra paga não é uma porta dos fundos', async () => {
    const id = await publicar({ monetization: 'PAGA', priceCents: '2800' });

    /*
     * Esta era a brecha real: a audiodescrição traz a descrição de cada
     * quadro e as falas, ou seja, a obra em texto. O endpoint do arquivo
     * recusava, e este entregava o mesmo conteúdo em outro formato.
     */
    expect((await api().get(`/api/works/${id}/audio-descriptions`).set(bearer(leitor))).status).toBe(403);
    expect((await api().get(`/api/works/${id}/audio-descriptions`)).status).toBe(403);
    expect((await api().get(`/api/works/${id}/audio`).set(bearer(leitor))).status).toBe(403);

    // Depois de comprar, abre.
    expect(await comprar(id, leitor)).toBe('CONFIRMADA');
    expect((await api().get(`/api/works/${id}/audio-descriptions`).set(bearer(leitor))).status).toBe(200);
  });

  it('autoria e administração abrem obra paga, e o motivo é declarado', async () => {
    const id = await publicar({ monetization: 'PAGA', priceCents: '3300' });

    const daAutora = await api().get(`/api/works/${id}`).set(bearer(autora));
    expect(daAutora.body.access.reason).toBe('AUTORIA');
    expect((await api().get(`/api/works/${id}/file`).set(bearer(autora))).status).toBe(200);

    const daAdmin = await api().get(`/api/works/${id}`).set(bearer(admin));
    expect(daAdmin.body.access.reason).toBe('ADMINISTRACAO');
    expect((await api().get(`/api/works/${id}/file`).set(bearer(admin))).status).toBe(200);
  });
});
