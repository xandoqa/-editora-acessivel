import { env } from '../../config/env';
import type { PaymentMethod } from '../../db/schema';
import { badGateway } from '../../utils/http-error';
import { logger } from '../../utils/logger';
import type { ChargeInput, ChargeResult, PaymentProvider } from './payment-provider';

/**
 * AbacatePay — cobrança PIX de verdade, por HTTP.
 *
 * Por que só PIX
 * --------------
 * A regra da interface `PaymentProvider` é que dado de cartão NUNCA passa por
 * esta aplicação. PIX cumpre isso sem esforço: o que volta do provedor é um
 * código copiável e uma imagem de QR Code, e quem paga paga no aplicativo do
 * próprio banco. Nenhum número, nenhum CVV, nada que precise ser guardado ou
 * mascarado em log. Por isso `methods` tem um item só — e, como o serviço
 * confere `methods` antes de abrir a cobrança, pedir CARTAO nesta instalação
 * devolve um 400 explicado, não um erro de dentro daqui.
 *
 * Também não mandamos o objeto `customer`: ele exige CPF (`taxId`) quando
 * presente, e apoio ao projeto não é motivo para pedir CPF de ninguém.
 *
 * Modo de desenvolvimento
 * -----------------------
 * A chave de API é que decide se a cobrança é real: a resposta de cada
 * cobrança traz `devMode`, dizendo em qual ambiente ela nasceu. Declaramos o
 * ambiente esperado em `ABACATEPAY_DEV_MODE` e **conferimos contra o que o
 * provedor respondeu** — declaração e realidade discordando é exatamente o
 * caso em que alguém acha que está demonstrando e está movimentando dinheiro.
 * O texto que vai para a tela sai do `devMode` que o provedor devolveu, nunca
 * da declaração, porque é a resposta que diz a verdade.
 *
 * Em modo de desenvolvimento, confirmar uma cobrança ainda pendente dispara
 * `simulate-payment` antes de reconsultar. Sem isso a demonstração empacaria:
 * o botão de confirmar consulta a situação real, e a situação real de uma
 * cobrança que ninguém pagou é "pendente" para sempre. A simulação só existe
 * no ambiente de desenvolvimento do próprio AbacatePay, fica registrada no log
 * em cada uso, e nunca roda com `ABACATEPAY_DEV_MODE=false`.
 *
 * O que este provedor NÃO faz
 * ---------------------------
 * Não recebe webhook. A confirmação acontece quando alguém aperta confirmar,
 * porque é assim que o fluxo do projeto já funciona e webhook exige endereço
 * público e verificação de assinatura — trabalho que não cabe sem alguém para
 * testá-lo de verdade. Está anotado na ADR 023 como próximo passo, não como
 * coisa feita.
 */

const BASE_PADRAO = 'https://api.abacatepay.com/v1';

/**
 * Oito segundos. O provedor entra no caminho de uma requisição que a pessoa
 * está esperando, e a lição do Fale Conosco é que dependência externa sem
 * tempo limite trava a resposta inteira.
 */
const TEMPO_LIMITE_PADRAO_MS = 8_000;

/** Uma hora para pagar. Depois disso o AbacatePay marca como `EXPIRED`. */
const VALIDADE_SEGUNDOS = 3_600;

/**
 * O campo `description` aceita 37 caracteres; o que passa disso é descartado
 * no registro da cobrança. Cortamos aqui para que o texto que a pessoa vê no
 * aplicativo do banco seja o que escolhemos, e não o que sobrou.
 */
const LIMITE_DESCRICAO = 37;

/**
 * Texto que a pessoa lê no aplicativo do banco ao pagar.
 *
 * O nome de quem apoia NÃO entra aqui: ele já fica registrado na doação, e
 * repeti-lo num campo que viaja pelo arranjo de pagamento seria espalhar dado
 * pessoal sem nenhum ganho. O `slice` é cinto de segurança para o dia em que
 * alguém editar este texto sem lembrar do limite de 37 caracteres.
 */
const DESCRICAO = 'Apoio ao projeto Livrin'.slice(0, LIMITE_DESCRICAO);

/** Situações que o AbacatePay usa para uma cobrança PIX. */
type SituacaoAbacate = 'PENDING' | 'EXPIRED' | 'CANCELLED' | 'PAID' | 'REFUNDED';

/** Resposta de criação e de simulação. */
interface CobrancaPix {
  id: string;
  amount: number;
  status: SituacaoAbacate;
  devMode: boolean;
  brCode: string;
  brCodeBase64: string;
  expiresAt: string;
}

/** `GET /pixQrCode/check` devolve só a situação e o vencimento. */
interface SituacaoConsultada {
  status: SituacaoAbacate;
  expiresAt: string;
}

/** Toda resposta vem embrulhada assim, com `error` em vez de status HTTP. */
interface Envelope<T> {
  data: T | null;
  error: string | null;
}

export interface OpcoesAbacatePay {
  apiKey?: string;
  baseUrl?: string;
  devMode?: boolean;
  tempoLimiteMs?: number;
}

export class AbacatePayProvider implements PaymentProvider {
  readonly name = 'abacatepay';
  readonly label: string;
  readonly isReal: boolean;
  readonly methods: PaymentMethod[] = ['PIX'];

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly devMode: boolean;
  private readonly tempoLimiteMs: number;

  /** Evita repetir o mesmo aviso de divergência em cada cobrança. */
  private modoDivergenteAvisado = false;

  constructor(opcoes: OpcoesAbacatePay = {}) {
    this.apiKey = opcoes.apiKey ?? env.ABACATEPAY_API_KEY ?? '';
    this.baseUrl = opcoes.baseUrl ?? BASE_PADRAO;
    this.devMode = opcoes.devMode ?? env.ABACATEPAY_DEV_MODE;
    this.tempoLimiteMs = opcoes.tempoLimiteMs ?? TEMPO_LIMITE_PADRAO_MS;

    this.isReal = !this.devMode;
    this.label = this.devMode
      ? 'PIX via AbacatePay (ambiente de desenvolvimento)'
      : 'PIX via AbacatePay';
  }

  /** Sem chave não há provedor. Quem registra confere isto antes. */
  get configurado(): boolean {
    return this.apiKey.length > 0;
  }

  async createCharge(input: ChargeInput): Promise<ChargeResult> {
    const cobranca = await this.chamar<CobrancaPix>('/pixQrCode/create', {
      method: 'POST',
      body: JSON.stringify({
        amount: input.amountCents,
        expiresIn: VALIDADE_SEGUNDOS,
        description: DESCRICAO,
      }),
    });

    this.conferirModo(cobranca.devMode);

    const situacao = this.traduzir(cobranca.status);
    logger.info(
      `AbacatePay: cobrança ${cobranca.id} aberta (${cobranca.amount} centavos, ` +
        `devMode=${cobranca.devMode}, status=${cobranca.status}).`,
    );

    return {
      providerRef: cobranca.id,
      status: situacao === 'CONFIRMADA' ? 'CONFIRMADA' : 'PENDENTE',
      code: cobranca.brCode,
      instruction: cobranca.devMode
        ? 'Este código PIX foi emitido no ambiente de DESENVOLVIMENTO do AbacatePay: ele é ' +
          'um código real, de formato válido, mas nenhum dinheiro se move e banco nenhum vai ' +
          'liquidá-lo. Confirme abaixo para ver o apoio sendo registrado no sistema.'
        : 'Copie o código e pague no aplicativo do seu banco. Nenhum dado de cartão é pedido ' +
          'nem guardado por esta aplicação — o pagamento acontece no seu banco, pelo PIX. ' +
          'Depois de pagar, confirme abaixo para o apoio ser registrado.',
    };
  }

  async confirmCharge(providerRef: string): Promise<'CONFIRMADA' | 'PENDENTE' | 'FALHOU'> {
    const consulta = await this.chamar<SituacaoConsultada>(
      `/pixQrCode/check?id=${encodeURIComponent(providerRef)}`,
      { method: 'GET' },
    );

    if (consulta.status !== 'PENDING' || !this.devMode) {
      return this.traduzir(consulta.status);
    }

    // Ainda pendente, e estamos no ambiente de desenvolvimento: simular o
    // pagamento é o que torna o fluxo demonstrável de ponta a ponta.
    try {
      const simulada = await this.chamar<CobrancaPix>(
        `/pixQrCode/simulate-payment?id=${encodeURIComponent(providerRef)}`,
        { method: 'POST', body: JSON.stringify({ metadata: {} }) },
      );
      this.conferirModo(simulada.devMode);
      logger.warn(
        `AbacatePay: pagamento da cobrança ${providerRef} SIMULADO (ambiente de ` +
          `desenvolvimento). Nenhum dinheiro foi movimentado. status=${simulada.status}.`,
      );
      return this.traduzir(simulada.status);
    } catch (erro) {
      // Simulação que falha não pode derrubar a confirmação: a cobrança existe
      // e continua pendente, e é isso que devolvemos.
      logger.error(
        `AbacatePay: não foi possível simular o pagamento da cobrança ${providerRef}. ` +
          `A cobrança segue pendente. Motivo: ${(erro as Error).message}`,
      );
      return 'PENDENTE';
    }
  }

  /* ------------------------------- Internos ------------------------------- */

  private traduzir(situacao: SituacaoAbacate | string): 'CONFIRMADA' | 'PENDENTE' | 'FALHOU' {
    switch (situacao) {
      case 'PAID':
        return 'CONFIRMADA';
      case 'PENDING':
        return 'PENDENTE';
      case 'EXPIRED':
      case 'CANCELLED':
      case 'REFUNDED':
        return 'FALHOU';
      default:
        // Situação nova no provedor. Tratar desconhecido como falha é mais
        // seguro que tratar como confirmado: na dúvida, ninguém ganha acesso.
        logger.warn(`AbacatePay: situação desconhecida "${situacao}". Tratando como FALHOU.`);
        return 'FALHOU';
    }
  }

  /**
   * Confere o ambiente declarado contra o que o provedor respondeu.
   *
   * Os dois lados importam, por motivos diferentes: declarar desenvolvimento e
   * receber cobrança real significa que dinheiro de verdade está em jogo numa
   * instalação que se acha de teste — é erro grave e vai para o log como tal.
   * O contrário é só uma instalação que se acha real e não arrecada nada.
   */
  private conferirModo(devModeReal: boolean): void {
    if (devModeReal === this.devMode || this.modoDivergenteAvisado) return;
    this.modoDivergenteAvisado = true;

    if (this.devMode && !devModeReal) {
      logger.error(
        'AbacatePay: ABACATEPAY_DEV_MODE=true, mas o provedor está emitindo cobranças REAIS ' +
          '(devMode=false). A chave em uso é de produção. Pare e troque a chave: as cobranças ' +
          'desta instalação movimentam dinheiro de verdade.',
      );
      return;
    }
    logger.warn(
      'AbacatePay: ABACATEPAY_DEV_MODE=false, mas o provedor respondeu devMode=true. A chave em ' +
        'uso é de desenvolvimento e nenhuma cobrança desta instalação movimenta dinheiro.',
    );
  }

  /**
   * Uma requisição ao AbacatePay.
   *
   * O provedor responde 200 com `error` preenchido em alguns casos e status
   * HTTP de erro em outros, então os dois caminhos são tratados. Nenhuma
   * mensagem de erro daqui inclui a chave de API.
   */
  private async chamar<T>(caminho: string, init: RequestInit): Promise<T> {
    if (!this.configurado) {
      throw badGateway('O AbacatePay não está configurado nesta instalação (falta ABACATEPAY_API_KEY).');
    }

    let resposta: Response;
    try {
      resposta = await fetch(`${this.baseUrl}${caminho}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(this.tempoLimiteMs),
      });
    } catch (erro) {
      const motivo = (erro as Error).name === 'TimeoutError' || (erro as Error).name === 'AbortError'
        ? `não respondeu em ${this.tempoLimiteMs / 1000} segundos`
        : `não pôde ser alcançado (${(erro as Error).message})`;
      logger.error(`AbacatePay: ${caminho} ${motivo}.`);
      throw badGateway(`O provedor de pagamento ${motivo}. Tente novamente em instantes.`);
    }

    const texto = await resposta.text();
    let envelope: Envelope<T> | undefined;
    try {
      envelope = texto ? (JSON.parse(texto) as Envelope<T>) : undefined;
    } catch {
      // Resposta que não é JSON: página de erro, proxy, manutenção.
      envelope = undefined;
    }

    if (!resposta.ok) {
      const detalhe = envelope?.error ?? texto.slice(0, 200) ?? '';
      logger.error(`AbacatePay: ${caminho} respondeu ${resposta.status}. ${detalhe}`);
      if (resposta.status === 401 || resposta.status === 403) {
        throw badGateway('A chave de API do AbacatePay foi recusada. Confira ABACATEPAY_API_KEY.');
      }
      throw badGateway(`O provedor de pagamento recusou a operação (HTTP ${resposta.status}).`);
    }

    if (!envelope || envelope.error || envelope.data == null) {
      const detalhe = envelope?.error ?? 'resposta sem conteúdo';
      logger.error(`AbacatePay: ${caminho} respondeu 200 com erro. ${detalhe}`);
      throw badGateway(`O provedor de pagamento recusou a operação: ${detalhe}`);
    }

    return envelope.data;
  }
}
