import { z } from 'zod';
import { optionalText, requiredText } from './common';

export const passwordSchema = z
  .string({ required_error: 'Senha é obrigatória' })
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  .max(72, 'A senha deve ter no máximo 72 caracteres') // limite do bcrypt
  .regex(/[A-Za-z]/, 'A senha deve conter letras')
  .regex(/[0-9]/, 'A senha deve conter números');

export const emailSchema = z
  .string({ required_error: 'E-mail é obrigatório' })
  .trim()
  .toLowerCase()
  .email('Informe um e-mail válido')
  .max(255);

/** Cadastro público: o papel NUNCA é aceito do cliente (sempre USER). */
export const registerSchema = z
  .object({
    name: requiredText('Nome', 2, 120),
    email: emailSchema,
    password: passwordSchema,
    headline: optionalText(160),
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
