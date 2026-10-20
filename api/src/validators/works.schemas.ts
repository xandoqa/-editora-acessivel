import { z } from 'zod';
import { workFormatEnum } from '../db/schema';
import { formBoolean, idParam, optionalText, paginationSchema, requiredText, searchTerm } from './common';

export const AGE_RATINGS = ['L', '10', '12', '14', '16', '18'] as const;

/** Aceita tags como array JSON, lista separada por vírgula ou repetida no form-data. */
const tagsSchema = z.preprocess(
  (v) => {
    if (v === undefined) return undefined;
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
      const s = v.trim();
      if (s.startsWith('[')) {
        try {
          return JSON.parse(s);
        } catch {
          return s;
        }
      }
      return s === '' ? [] : s.split(',');
    }
    return v;
  },
  z
    .array(
      z
        .string()
        .trim()
        .transform((t) => t.replace(/^#/, ''))
        .pipe(z.string().min(1).max(30, 'Cada tag pode ter até 30 caracteres')),
    )
    .max(10, 'Máximo de 10 tags')
    .optional(),
);

const pagesSchema = z.coerce
  .number({ invalid_type_error: 'Nº de páginas inválido' })
  .int('Nº de páginas deve ser inteiro')
  .min(1, 'Nº de páginas deve ser maior que zero')
  .max(20000, 'Nº de páginas muito alto');

/** Campos editáveis de uma obra (autor e administração). */
export const workFieldsSchema = z.object({
  title: requiredText('Título', 1, 120),
  subtitle: optionalText(160),
  genreId: idParam,
  format: z.enum(workFormatEnum.enumValues, { errorMap: () => ({ message: 'Formato inválido' }) }).default('LIVRO'),
  pages: pagesSchema,
  synopsis: requiredText('Sinopse', 20, 2000),
  editionLabel: optionalText(60),
  isbn: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z
      .string()
      .trim()
      .regex(/^[0-9Xx-]{10,20}$/, 'ISBN inválido (use apenas números e hífens)')
      .nullable()
      .optional(),
  ),
  ageRating: z.enum(AGE_RATINGS, { errorMap: () => ({ message: 'Classificação indicativa inválida' }) }).default('L'),
  authorNotes: optionalText(3000),
  tags: tagsSchema,
  hasAudioDesc: formBoolean.default(false),
  hasLeitorTela: formBoolean.default(false),
  hasTextoAlt: formBoolean.default(false),
  hasLibras: formBoolean.default(false),
  hasFacilLeitura: formBoolean.default(false),
  hasAltoContraste: formBoolean.default(false),
  audioDescriber: optionalText(120),
  audioNarrator: optionalText(120),
  audioReviewer: optionalText(160),
});

export type WorkFields = z.infer<typeof workFieldsSchema>;

/** Criação pelo autor: `action=draft` salva rascunho; `action=submit` envia para análise. */
export const createWorkSchema = workFieldsSchema.extend({
  action: z.enum(['draft', 'submit']).default('submit'),
});

/** Atualização parcial: todos os campos opcionais (sem defaults para não sobrescrever valores). */
export const updateWorkSchema = z.object({
  title: requiredText('Título', 1, 120).optional(),
  subtitle: optionalText(160),
  genreId: idParam.optional(),
  format: z.enum(workFormatEnum.enumValues).optional(),
  pages: pagesSchema.optional(),
  synopsis: requiredText('Sinopse', 20, 2000).optional(),
  editionLabel: optionalText(60),
  isbn: workFieldsSchema.shape.isbn,
  ageRating: z.enum(AGE_RATINGS).optional(),
  authorNotes: optionalText(3000),
  tags: tagsSchema,
  hasAudioDesc: formBoolean.optional(),
  hasLeitorTela: formBoolean.optional(),
  hasTextoAlt: formBoolean.optional(),
  hasLibras: formBoolean.optional(),
  hasFacilLeitura: formBoolean.optional(),
  hasAltoContraste: formBoolean.optional(),
  audioDescriber: optionalText(120),
  audioNarrator: optionalText(120),
  audioReviewer: optionalText(160),
  removeCover: formBoolean.optional(),
  removeAudio: formBoolean.optional(),
});

export type WorkUpdate = z.infer<typeof updateWorkSchema>;

export const CATALOG_FEATURES = [
  'audiodescricao',
  'leitor-tela',
  'texto-alt',
  'libras',
  'facil-leitura',
  'alto-contraste',
] as const;

export const catalogQuerySchema = paginationSchema.extend({
  q: searchTerm,
  format: z.enum(workFormatEnum.enumValues).optional(),
  feature: z.enum(CATALOG_FEATURES).optional(),
  genreId: idParam.optional(),
  sort: z.enum(['recent', 'title', 'rating']).default('recent'),
});

export const dialogueSchema = z.object({
  speaker: requiredText('Personagem', 1, 60),
  tone: optionalText(40).transform((v) => v ?? undefined),
  text: requiredText('Fala', 1, 600),
});

export const audioDescriptionSchema = z.object({
  pageNumber: z.coerce.number().int().min(1, 'Página deve ser maior que zero').max(20000),
  chapterLabel: optionalText(60),
  chapterTitle: optionalText(120),
  panelLabel: optionalText(80),
  description: requiredText('Descrição', 1, 4000),
  dialogues: z.array(dialogueSchema).max(12, 'Máximo de 12 falas por página').default([]),
});

export const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Nota mínima: 1').max(5, 'Nota máxima: 5'),
  content: requiredText('Comentário', 10, 1500),
  aspect: optionalText(80),
});

export const reviewNoteSchema = z.object({
  content: requiredText('Mensagem', 2, 2000),
});

export const sessionUpdateSchema = z.object({
  lastPage: z.coerce.number().int().min(1).max(20000).optional(),
  usedAudioDesc: z.boolean().optional(),
  usedHighContrast: z.boolean().optional(),
  usedDyslexicFont: z.boolean().optional(),
  usedZoom: z.boolean().optional(),
});
