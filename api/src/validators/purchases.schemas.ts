import { z } from 'zod';
import { paymentMethodEnum } from '../db/schema';

/**
 * Abertura de uma aquisição.
 *
 * O que este schema NÃO tem é o mais importante: **não existe campo de valor**.
 * O preço é lido da obra, no banco, pelo serviço. Mandar `priceCents` na
 * requisição não muda nada, porque nada aqui lê esse campo — é assim que
 * "alterar o preço no navegador" deixa de ser um ataque possível, em vez de
 * ser apenas desencorajado.
 */

/**
 * Dados do cartão, aceitos apenas para a simulação da tela.
 *
 * São validados em FORMATO e descartados em seguida pelo controller: nenhum
 * número, validade ou código de segurança é gravado em banco, escrito em log
 * ou devolvido na resposta. Como a aplicação não fala com adquirente nenhuma,
 * guardar isso não traria utilidade alguma e traria obrigação de PCI-DSS.
 */
const cardSchema = z
  .object({
    holder: z.string().trim().min(2, 'Informe o nome do titular').max(120),
    // Só dígitos, 13 a 19 — a faixa real dos cartões. Espaços são tolerados
    // porque o formulário os insere para facilitar a leitura.
    number: z
      .string()
      .transform((v) => v.replace(/\s+/g, ''))
      .pipe(z.string().regex(/^\d{13,19}$/, 'Número de cartão inválido')),
    expiry: z
      .string()
      .trim()
      .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Validade inválida (use MM/AA)'),
    cvv: z
      .string()
      .trim()
      .regex(/^\d{3,4}$/, 'Código de segurança inválido'),
  })
  .strict();

export const createPurchaseSchema = z
  .object({
    method: z.enum(paymentMethodEnum.enumValues, {
      errorMap: () => ({ message: 'Escolha um meio de pagamento válido' }),
    }),
    card: cardSchema.optional(),
  })
  .strict()
  .superRefine((valor, ctx) => {
    if (valor.method === 'CARTAO' && !valor.card) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['card'],
        message: 'Preencha os dados do cartão de demonstração.',
      });
    }
  });

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
