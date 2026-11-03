import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { AbacatePayProvider } from '../src/services/payments/abacatepay.provider';

/**
 * O provedor AbacatePay, conversando com um AbacatePay de mentira.
 *
 * Nenhum teste aqui toca a internet. Há um servidor HTTP de brinquedo que
 * responde no formato do provedor (`{ data, error }`) e grava o que recebeu,
 * para o teste conferir o que foi enviado — chave no cabeçalho, valor em
 * centavos, tamanho da descrição — e não só o que voltou.
 *
 * O que estes testes seguram, e que já foi defeito em integração de pagamento
 * de todo mundo:
 *
 * - valor enviado em reais onde o provedor espera centavos (cobrança de R$ 0,50
 *   em vez de R$ 50,00);
 * - resposta 200 com `error` preenchido tratada como sucesso;
 * - situação desconhecida caindo em "confirmada", liberando acesso de graça;
 * - provedor fora do ar travando a resposta da aplicação sem tempo limite;
 * - simulação de pagamento disparando em produção.
 */

let servidor: http.Server | undefined;

interface Registro {
  metodo: string;
  caminho: string;
  autorizacao: string | undefined;
  corpo: string;
}

/** Sobe o servidor falso e devolve a URL base e o registro do que ele recebeu. */
async function subir(
  responder: (req: http.IncomingMessage, res: http.ServerResponse, n: number) => void,
): Promise<{ baseUrl: string; recebidos: Registro[] }> {
  const recebidos: Registro[] = [];
  servidor = http.createServer((req, res) => {
    let corpo = '';
    req.on('data', (p) => {
      corpo += p;
    });
    req.on('end', () => {
      recebidos.push({
        metodo: req.method ?? '',
        caminho: req.url ?? '',
        autorizacao: req.headers.authorization,
        corpo,
      });
      responder(req, res, recebidos.length);
    });
  });
  await new Promise<void>((ok) => servidor!.listen(0, '127.0.0.1', ok));
  const { port } = servidor!.address() as AddressInfo;
  return { baseUrl: `http://127.0.0.1:${port}`, recebidos };
}

/** Resposta de sucesso no envelope do provedor. */
function enviar(res: http.ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ data, error: null }));
}

function cobranca(over: Record<string, unknown> = {}) {
  return {
    id: 'pix_char_123456',
    amount: 2500,
    status: 'PENDING',
    devMode: true,
    brCode: '00020126580014br.gov.bcb.pix...6304ABCD',
    brCodeBase64: 'data:image/png;base64,iVBORw0KGgo=',
    platformFee: 80,
    createdAt: '2026-11-03T12:00:00.000Z',
    updatedAt: '2026-11-03T12:00:00.000Z',
    expiresAt: '2026-11-03T13:00:00.000Z',
    ...over,
  };
}

function provedor(baseUrl: string, over: Record<string, unknown> = {}) {
  return new AbacatePayProvider({
    apiKey: 'abc_dev_chavedeteste',
    baseUrl,
    devMode: true,
    tempoLimiteMs: 1_000,
    ...over,
  });
}

afterEach(async () => {
  if (servidor) {
    await new Promise<void>((ok) => servidor!.close(() => ok()));
    servidor = undefined;
  }
});

describe('AbacatePayProvider — abrir cobrança', () => {
  it('manda o valor em CENTAVOS, autentica com a chave e devolve o código copiável', async () => {
    const { baseUrl, recebidos } = await subir((_req, res) => enviar(res, cobranca()));

    const resultado = await provedor(baseUrl).createCharge({
      amountCents: 2500,
      currency: 'BRL',
      method: 'PIX',
      donorName: 'Alexandre',
      message: null,
    });

    expect(recebidos).toHaveLength(1);
    expect(recebidos[0].metodo).toBe('POST');
    expect(recebidos[0].caminho).toBe('/pixQrCode/create');
    expect(recebidos[0].autorizacao).toBe('Bearer abc_dev_chavedeteste');

    const enviado = JSON.parse(recebidos[0].corpo);
    // 2500 centavos = R$ 25,00. Mandar 25 aqui cobraria R$ 0,25.
    expect(enviado.amount).toBe(2500);
    expect(enviado.expiresIn).toBe(3600);

    expect(resultado.providerRef).toBe('pix_char_123456');
    expect(resultado.status).toBe('PENDENTE');
    expect(resultado.code).toBe('00020126580014br.gov.bcb.pix...6304ABCD');
  });

  it('corta a descrição em 37 caracteres, que é o que o provedor registra', async () => {
    const { baseUrl, recebidos } = await subir((_req, res) => enviar(res, cobranca()));

    await provedor(baseUrl).createCharge({
      amountCents: 500,
      currency: 'BRL',
      method: 'PIX',
      message: 'uma mensagem qualquer bem comprida para o projeto',
    });

    const { description } = JSON.parse(recebidos[0].corpo);
    expect(description.length).toBeLessThanOrEqual(37);
  });

  it('não envia `customer`: apoio ao projeto não é motivo para pedir CPF', async () => {
    const { baseUrl, recebidos } = await subir((_req, res) => enviar(res, cobranca()));

    await provedor(baseUrl).createCharge({
      amountCents: 500,
      currency: 'BRL',
      method: 'PIX',
      donorName: 'Alexandre',
    });

    const enviado = JSON.parse(recebidos[0].corpo);
    expect(enviado.customer).toBeUndefined();
    expect(recebidos[0].corpo).not.toContain('taxId');
  });

  it('aceita só PIX, para que dado de cartão nunca passe pela aplicação', () => {
    expect(provedor('http://127.0.0.1:1').methods).toEqual(['PIX']);
  });

  it('declara `isReal` a partir do modo: desenvolvimento não é dinheiro real', () => {
    expect(provedor('http://127.0.0.1:1', { devMode: true }).isReal).toBe(false);
    expect(provedor('http://127.0.0.1:1', { devMode: false }).isReal).toBe(true);
  });
});

describe('AbacatePayProvider — confirmar cobrança', () => {
  it('traduz PAID para CONFIRMADA sem simular nada', async () => {
    const { baseUrl, recebidos } = await subir((_req, res) =>
      enviar(res, { status: 'PAID', expiresAt: '2026-11-03T13:00:00.000Z' }),
    );

    const situacao = await provedor(baseUrl).confirmCharge('pix_char_123456');

    expect(situacao).toBe('CONFIRMADA');
    expect(recebidos).toHaveLength(1);
    expect(recebidos[0].caminho).toContain('/pixQrCode/check');
    expect(recebidos[0].caminho).toContain('id=pix_char_123456');
  });

  it.each([
    ['EXPIRED', 'FALHOU'],
    ['CANCELLED', 'FALHOU'],
    ['REFUNDED', 'FALHOU'],
    ['SITUACAO_NOVA_QUE_NAO_EXISTIA', 'FALHOU'],
  ])('traduz %s para %s — na dúvida, ninguém ganha acesso', async (abacate, esperado) => {
    const { baseUrl } = await subir((_req, res) =>
      enviar(res, { status: abacate, expiresAt: '2026-11-03T13:00:00.000Z' }),
    );

    await expect(provedor(baseUrl).confirmCharge('pix_char_1')).resolves.toBe(esperado);
  });

  it('em desenvolvimento, simula o pagamento quando a cobrança está pendente', async () => {
    const { baseUrl, recebidos } = await subir((_req, res, n) => {
      if (n === 1) return enviar(res, { status: 'PENDING', expiresAt: '2026-11-03T13:00:00.000Z' });
      return enviar(res, cobranca({ status: 'PAID' }));
    });

    const situacao = await provedor(baseUrl, { devMode: true }).confirmCharge('pix_char_123456');

    expect(situacao).toBe('CONFIRMADA');
    expect(recebidos).toHaveLength(2);
    expect(recebidos[1].metodo).toBe('POST');
    expect(recebidos[1].caminho).toContain('/pixQrCode/simulate-payment');
    expect(recebidos[1].caminho).toContain('id=pix_char_123456');
  });

  it('FORA de desenvolvimento, nunca simula: pendente continua pendente', async () => {
    const { baseUrl, recebidos } = await subir((_req, res) =>
      enviar(res, { status: 'PENDING', expiresAt: '2026-11-03T13:00:00.000Z' }),
    );

    const situacao = await provedor(baseUrl, { devMode: false }).confirmCharge('pix_char_123456');

    expect(situacao).toBe('PENDENTE');
    expect(recebidos).toHaveLength(1);
    expect(recebidos.some((r) => r.caminho.includes('simulate-payment'))).toBe(false);
  });

  it('simulação que falha devolve PENDENTE em vez de derrubar a confirmação', async () => {
    const { baseUrl } = await subir((_req, res, n) => {
      if (n === 1) return enviar(res, { status: 'PENDING', expiresAt: '2026-11-03T13:00:00.000Z' });
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: null, error: 'cobrança não é de desenvolvimento' }));
    });

    await expect(provedor(baseUrl, { devMode: true }).confirmCharge('pix_char_1')).resolves.toBe(
      'PENDENTE',
    );
  });
});

describe('AbacatePayProvider — quando o provedor falha', () => {
  it('200 com `error` preenchido NÃO é sucesso', async () => {
    const { baseUrl } = await subir((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: null, error: 'valor abaixo do mínimo' }));
    });

    await expect(
      provedor(baseUrl).createCharge({ amountCents: 1, currency: 'BRL', method: 'PIX' }),
    ).rejects.toMatchObject({ status: 502 });
  });

  it('chave recusada vira erro que diz qual variável conferir, sem vazar a chave', async () => {
    const { baseUrl } = await subir((_req, res) => {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid token' }));
    });

    const erro = await provedor(baseUrl)
      .createCharge({ amountCents: 500, currency: 'BRL', method: 'PIX' })
      .then(() => undefined)
      .catch((e: Error) => e);

    expect(erro).toBeInstanceOf(Error);
    expect((erro as Error).message).toMatch(/ABACATEPAY_API_KEY/);
    expect((erro as Error).message).not.toContain('abc_dev_chavedeteste');
  });

  it('resposta que não é JSON não derruba o processo com erro de parse', async () => {
    const { baseUrl } = await subir((_req, res) => {
      res.writeHead(503, { 'Content-Type': 'text/html' });
      res.end('<html><body>502 Bad Gateway</body></html>');
    });

    await expect(
      provedor(baseUrl).createCharge({ amountCents: 500, currency: 'BRL', method: 'PIX' }),
    ).rejects.toMatchObject({ status: 502 });
  });

  it('provedor que não responde esgota o tempo limite em vez de travar a requisição', async () => {
    // O servidor recebe e nunca responde: é o caso que, sem tempo limite,
    // deixa a pessoa olhando para uma tela carregando até o navegador desistir.
    const { baseUrl } = await subir(() => {
      /* silêncio de propósito */
    });

    const comeco = Date.now();
    await expect(
      provedor(baseUrl, { tempoLimiteMs: 300 }).createCharge({
        amountCents: 500,
        currency: 'BRL',
        method: 'PIX',
      }),
    ).rejects.toThrow(/segundos/);
    expect(Date.now() - comeco).toBeLessThan(3_000);
  });

  it('sem chave, o provedor se declara não configurado e não tenta falar com ninguém', async () => {
    const semChave = new AbacatePayProvider({ apiKey: '', baseUrl: 'http://127.0.0.1:1' });

    expect(semChave.configurado).toBe(false);
    await expect(
      semChave.createCharge({ amountCents: 500, currency: 'BRL', method: 'PIX' }),
    ).rejects.toThrow(/ABACATEPAY_API_KEY/);
  });
});
