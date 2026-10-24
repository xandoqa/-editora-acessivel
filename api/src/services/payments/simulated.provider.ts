import { randomBytes, randomUUID } from 'node:crypto';
import type { PaymentMethod } from '../../db/schema';
import type { ChargeInput, ChargeResult, PaymentProvider } from './payment-provider';

/**
 * Provedor simulado — o padrão do projeto.
 *
 * A seção 18 da especificação diz que, por se tratar de trabalho acadêmico,
 * vale priorizar uma implementação segura e demonstrável em vez de montar
 * infraestrutura financeira real. Este provedor percorre exatamente o mesmo
 * caminho de um provedor de verdade (abre a cobrança, devolve uma referência,
 * fica PENDENTE, depois confirma), só que nenhum dinheiro se move.
 *
 * Ele é deliberadamente explícito quanto a isso: `isReal` é false e a instrução
 * que vai para a tela diz, com todas as letras, que a cobrança é de
 * demonstração. Fingir que há um pagamento real seria o tipo de "gambiarra"
 * que a seção 32 proíbe.
 *
 * Para plugar um provedor de verdade depois, basta implementar
 * `PaymentProvider` e registrá-lo em `payment.service.ts`.
 */
export class SimulatedPaymentProvider implements PaymentProvider {
  readonly name = 'simulado';
  readonly label = 'Pagamento de demonstração';
  readonly isReal = false;
  readonly methods: PaymentMethod[] = ['PIX', 'CARTAO', 'BOLETO'];

  /** Cobranças abertas nesta execução, para a confirmação conferir a referência. */
  private readonly abertas = new Map<string, { criadaEm: number }>();

  async createCharge(input: ChargeInput): Promise<ChargeResult> {
    const providerRef = `sim_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
    this.abertas.set(providerRef, { criadaEm: Date.now() });

    const comum = {
      providerRef,
      status: 'PENDENTE' as const,
    };

    if (input.method === 'PIX') {
      return {
        ...comum,
        code: `00020126SIMULADO${randomBytes(8).toString('hex').toUpperCase()}5204000053039865802BR`,
        instruction:
          'Este é um código PIX de DEMONSTRAÇÃO: ele não move dinheiro nenhum e não vai ser reconhecido por banco algum. ' +
          'Confirme abaixo para ver como o apoio é registrado no sistema.',
      };
    }
    if (input.method === 'BOLETO') {
      return {
        ...comum,
        code: `00000.00000 00000.000000 00000.000000 0 ${randomBytes(4).toString('hex').toUpperCase()}`,
        instruction:
          'Linha digitável de DEMONSTRAÇÃO: não existe boleto emitido e nada será cobrado. ' +
          'Confirme abaixo para ver como o apoio é registrado no sistema.',
      };
    }
    return {
      ...comum,
      instruction:
        'Nenhum dado de cartão é pedido nem armazenado por esta aplicação — e nesta instalação o pagamento é de ' +
        'DEMONSTRAÇÃO. Confirme abaixo para ver como o apoio é registrado no sistema.',
    };
  }

  async confirmCharge(providerRef: string): Promise<'CONFIRMADA' | 'PENDENTE' | 'FALHOU'> {
    // Uma cobrança que este processo não abriu (reinício do container, por
    // exemplo) ainda assim confirma: o estado de verdade mora no banco, e o
    // provedor simulado não tem por que ser mais rígido que um real.
    this.abertas.delete(providerRef);
    return providerRef.startsWith('sim_') ? 'CONFIRMADA' : 'FALHOU';
  }
}
