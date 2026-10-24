import { z } from 'zod';
import { donationStatusEnum, paymentMethodEnum } from '../db/schema';
import { idParam, optionalText, paginationSchema } from './common';

/**
 * Validação das doações. O valor chega em CENTAVOS, inteiro: dinheiro não é
 * número de ponto flutuante e o cliente não decide arredondamento.
 */
export const donationSchema = z.object({
  amountCents: z.coerce
    .number({ invalid_type_error: 'Informe um valor válido' })
    .int('O valor precisa ser um número inteiro de centavos')
    .positive('Informe um valor maior que zero'),
  method: z.enum(paymentMethodEnum.enumValues, { errorMap: () => ({ message: 'Escolha uma forma de apoiar' }) }),
  /** Obra que motivou o apoio. Opcional: dá para apoiar o projeto inteiro. */
  workId: idParam.optional(),
  donorName: optionalText(120),
  message: optionalText(400),
});

export const adminDonationListSchema = paginationSchema.extend({
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(donationStatusEnum.enumValues).optional(),
  method: z.enum(paymentMethodEnum.enumValues).optional(),
});
