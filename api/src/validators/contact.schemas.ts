import { z } from 'zod';
import { ASSUNTOS } from '../services/contact.service';

/**
 * Validação do Fale Conosco.
 *
 * Sobre o antispam: a referência tinha reCAPTCHA. Aqui ele não entra, e a
 * razão é o próprio assunto do projeto. O reCAPTCHA v2 de caixinha é uma
 * barreira conhecida de acessibilidade — o desafio sonoro falha com frequência
 * para quem depende dele, o desafio visual é impossível para quem não enxerga,
 * e o modo invisível decide por comportamento de mouse, que quem navega só por
 * teclado não produz. Numa plataforma que existe para ser acessível, pôr na
 * porta de entrada justamente o controle que barra essas pessoas seria
 * contradizer a proposta na única tela em que alguém pede ajuda.
 *
 * No lugar vão três freios que não cobram nada de quem é humano:
 *
 *  1. **Campo-armadilha** (`website`): invisível e fora da ordem de tabulação.
 *     Pessoa nenhuma o preenche; robô que preenche tudo, sim.
 *  2. **Limitador por IP**, reaproveitando o que o projeto já tem.
 *  3. **Limites de tamanho**, que cortam o envio de mensagem gigante.
 *
 * Nenhum dos três é perfeito contra um atacante dedicado. Os três juntos
 * resolvem o problema real de um formulário de TCC, que é robô de varredura.
 */
export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Diga como podemos chamar você.').max(120),
  email: z.string().trim().toLowerCase().email('E-mail inválido.').max(255),
  subject: z.enum(ASSUNTOS, { message: 'Escolha um assunto.' }),
  orderRef: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v ? v : undefined)),
  message: z
    .string()
    .trim()
    .min(10, 'Escreva um pouco mais: pelo menos 10 caracteres.')
    .max(4000, 'Mensagem longa demais. Resuma em até 4000 caracteres.'),
  /**
   * Campo-armadilha. Precisa chegar vazio.
   *
   * O erro é deliberadamente vago ("não foi possível enviar"): dizer "você
   * preencheu o campo oculto" ensina o robô a não preencher da próxima vez.
   */
  website: z.string().max(0, 'Não foi possível enviar a mensagem.').optional(),
});

export const contactListSchema = z.object({
  status: z.enum(['NOVA', 'LIDA', 'RESPONDIDA', 'ARQUIVADA']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const contactStatusSchema = z.object({
  status: z.enum(['NOVA', 'LIDA', 'RESPONDIDA', 'ARQUIVADA']),
});
