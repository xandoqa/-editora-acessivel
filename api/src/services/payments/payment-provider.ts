import type { PaymentMethod } from '../../db/schema';

/**
 * Contrato de um provedor de pagamento.
 *
 * A arquitetura pedida pela seção 18 da especificação é
 *     PaymentService → PaymentProvider → método de pagamento
 * justamente para que trocar de provedor seja implementar esta interface, sem
 * reescrever a aplicação. Nada aqui conhece HTTP, banco ou Express.
 *
 * Regra que vale para qualquer implementação futura: dados de cartão NUNCA
 * passam por esta aplicação. O provedor real devolve uma URL de checkout ou um
 * código (PIX/boleto) e a pessoa paga do lado dele. O que guardamos é a
 * referência da cobrança.
 */

export interface ChargeInput {
  /** Em centavos. Dinheiro não é número de ponto flutuante. */
  amountCents: number;
  currency: string;
  method: PaymentMethod;
  /** Nome exibido para quem recebe, só para conferência. */
  donorName?: string | null;
  /** Texto curto que a pessoa deixou junto do apoio. */
  message?: string | null;
}

export interface ChargeResult {
  /** Identificador da cobrança no provedor. */
  providerRef: string;
  /** PENDENTE quando ainda falta a pessoa concluir o pagamento. */
  status: 'PENDENTE' | 'CONFIRMADA';
  /** Para onde mandar a pessoa, quando o provedor tem checkout próprio. */
  checkoutUrl?: string;
  /** Código copiável (PIX) ou linha digitável (boleto). */
  code?: string;
  /** Instrução curta para a tela, escrita pelo provedor. */
  instruction?: string;
}

export interface PaymentProvider {
  /** Nome curto, gravado em cada doação. */
  readonly name: string;
  /** Aparece na interface para deixar claro o que está acontecendo. */
  readonly label: string;
  /** false quando nenhum dinheiro de verdade é movimentado. */
  readonly isReal: boolean;
  /** Meios que este provedor aceita. */
  readonly methods: PaymentMethod[];
  /** Abre uma cobrança. */
  createCharge(input: ChargeInput): Promise<ChargeResult>;
  /** Consulta/encerra a cobrança. Usado pela confirmação e por webhooks. */
  confirmCharge(providerRef: string): Promise<'CONFIRMADA' | 'PENDENTE' | 'FALHOU'>;
}
