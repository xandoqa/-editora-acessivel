import { z } from 'zod';
import { checkStatusEnum, userRoleEnum, workFormatEnum, workStatusEnum } from '../db/schema';
import { emailSchema, passwordSchema } from './auth.schemas';
import { formBoolean, idParam, optionalText, paginationSchema, requiredText, searchTerm } from './common';
import { workFieldsSchema } from './works.schemas';

const sortOrder = z.enum(['asc', 'desc']).default('desc');
const booleanQuery = z.enum(['true', 'false']).transform((v) => v === 'true').optional();

/* --------------------------------- Usuários -------------------------------- */

export const adminUserListSchema = paginationSchema.extend({
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: searchTerm,
  role: z.enum(userRoleEnum.enumValues).optional(),
  active: booleanQuery,
  sort: z.enum(['createdAt', 'name', 'email', 'lastLoginAt']).default('createdAt'),
  order: sortOrder,
});

export const adminCreateUserSchema = z.object({
  name: requiredText('Nome', 2, 120),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(userRoleEnum.enumValues).default('LEITOR'),
  headline: optionalText(160),
  isActive: z.boolean().default(true),
});

export const adminUpdateUserSchema = z
  .object({
    name: requiredText('Nome', 2, 120).optional(),
    email: emailSchema.optional(),
    role: z.enum(userRoleEnum.enumValues).optional(),
    headline: optionalText(160),
    isActive: z.boolean().optional(),
  })
  .strict();

export const adminResetPasswordSchema = z.object({ password: passwordSchema });

/* ---------------------------------- Obras ---------------------------------- */

export const adminWorkListSchema = paginationSchema.extend({
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: searchTerm,
  status: z.enum(workStatusEnum.enumValues).optional(),
  format: z.enum(workFormatEnum.enumValues).optional(),
  genreId: idParam.optional(),
  authorId: idParam.optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'title', 'submittedAt', 'status']).default('updatedAt'),
  order: sortOrder,
});

/** Criação pela administração: escolhe o autor e o status inicial. */
export const adminCreateWorkSchema = workFieldsSchema.extend({
  authorId: idParam,
  status: z.enum(workStatusEnum.enumValues).default('EM_ANALISE'),
});

export const adminStatusSchema = z
  .object({
    status: z.enum(workStatusEnum.enumValues, { errorMap: () => ({ message: 'Status inválido' }) }),
    reason: optionalText(1000),
  })
  .superRefine((v, ctx) => {
    if (v.status === 'REJEITADO' && !v.reason) {
      ctx.addIssue({ code: 'custom', path: ['reason'], message: 'Informe o motivo da rejeição para o autor.' });
    }
  });

export const checkCreateSchema = z.object({ label: requiredText('Item', 2, 120) });
export const checkUpdateSchema = z.object({
  status: z.enum(checkStatusEnum.enumValues).optional(),
  label: requiredText('Item', 2, 120).optional(),
});

/* --------------------------------- Gêneros --------------------------------- */

export const genreSchema = z.object({
  name: requiredText('Nome', 2, 80),
  isActive: formBoolean.default(true),
});
export const genreUpdateSchema = z.object({
  name: requiredText('Nome', 2, 80).optional(),
  isActive: z.boolean().optional(),
});

/* -------------------------------- Avaliações ------------------------------- */

export const adminFeedbackListSchema = paginationSchema.extend({
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: searchTerm,
  visible: booleanQuery,
  workId: idParam.optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  order: sortOrder,
});

export const adminFeedbackUpdateSchema = z.object({ isVisible: z.boolean() });
