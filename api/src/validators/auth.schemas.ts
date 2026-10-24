import { z } from 'zod';
import { optionalText, requiredText } from './common';
import { passwordSchema } from './password-policy';

export { passwordSchema };

export const emailSchema = z
  .string({ required_error: 'E-mail é obrigatório' })
  .trim()
  .toLowerCase()
  .email('Informe um e-mail válido')
  .max(255);

/**
 * Cadastro público. A pessoa escolhe entre ler e publicar; ADMIN nunca é
 * aceito do cliente, só a própria administração promove alguém a esse papel.
 */
export const registerSchema = z
  .object({
    name: requiredText('Nome', 2, 120),
    email: emailSchema,
    password: passwordSchema,
    headline: optionalText(160),
    role: z
      .enum(['LEITOR', 'ESCRITOR'], { errorMap: () => ({ message: 'Escolha entre ler ou publicar obras' }) })
      .default('LEITOR'),
  })
  .strict();

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: 'Senha é obrigatória' }).min(1, 'Senha é obrigatória').max(200),
});

export const updateProfileSchema = z
  .object({
    name: requiredText('Nome', 2, 120).optional(),
    headline: optionalText(160),
  })
  .strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual'),
  newPassword: passwordSchema,
});
