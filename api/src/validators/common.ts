import { z, type ZodTypeAny } from 'zod';

/**
 * Executa a validação e devolve os dados tipados. Em caso de erro lança ZodError,
 * convertido em HTTP 400 com a lista de campos inválidos pelo errorHandler.
 */
export function parse<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  return schema.parse(data);
}

/** Parâmetro de rota numérico (/:id). IDs não numéricos → 400, nunca um erro de SQL. */
export const idParam = z.coerce
  .number({ invalid_type_error: 'ID inválido' })
  .int('ID inválido')
  .positive('ID inválido')
  .max(2_147_483_647, 'ID inválido');

export const idParams = z.object({ id: idParam });

/** Booleanos vindos de formulários multipart chegam como string. */
export const formBoolean = z.preprocess((v) => {
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === '1' || v === 'on') return true;
  if (v === 'false' || v === '0' || v === '' || v === 'off') return false;
  return v;
}, z.boolean());

/** Texto opcional: string vazia vira null (limpa o campo no banco). */
export const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : typeof v === 'string' ? v.trim() : v),
    z.string().max(max, `Máximo de ${max} caracteres`).nullable().optional(),
  );

export const requiredText = (label: string, min: number, max: number) =>
  z
    .string({ required_error: `${label} é obrigatório`, invalid_type_error: `${label} é obrigatório` })
    .trim()
    .min(min, min <= 1 ? `${label} é obrigatório` : `${label}: mínimo de ${min} caracteres`)
    .max(max, `${label}: máximo de ${max} caracteres`);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
});

export const searchTerm = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((v) => (v ? v : undefined));

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export function paginated<T>(data: T[], total: number, page: number, pageSize: number): Paginated<T> {
  return { data, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
}
