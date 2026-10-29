import { z } from 'zod';
import { monetizationEnum, workFormatEnum } from '../db/schema';
import { formBoolean, idParam, optionalText, paginationSchema, requiredText, searchTerm } from './common';

export const AGE_RATINGS = ['L', '10', '12', '14', '16', '18'] as const;

/** Teto e piso do preço definido pelo autor, em centavos (R$ 1,00 a R$ 50,00). */
export const MAX_PRECO_CENTAVOS = 5_000;
export const MIN_PRECO_CENTAVOS = 100;

/**
 * Preço em centavos, vindo de form-data (portanto, texto).
 *
 * Campo vazio vira `null`, e não `0`: "sem preço" e "de graça" são estados
 * diferentes, e só o primeiro é válido fora da modalidade PAGA.
 */
const precoCentavosSchema = z.preprocess(
  (v) => {
    if (v === undefined) return undefined;
    if (v === null) return null;
    if (typeof v === 'string') {
      const s = v.trim();
      if (s === '') return null;
      const n = Number(s);
      return Number.isNaN(n) ? s : n;
    }
    return v;
  },
  z
    .number({ invalid_type_error: 'Preço inválido' })
    .int('O preço deve estar em centavos, sem casas decimais')
    .min(MIN_PRECO_CENTAVOS, `O preço mínimo é de ${MIN_PRECO_CENTAVOS / 100} real`)
    .max(MAX_PRECO_CENTAVOS, `O preço máximo permitido é de R$ ${MAX_PRECO_CENTAVOS / 100},00`)
    .nullable()
    .optional(),
);

/** Percentual da receita publicitária simulada que fica com a autoria. */
const adShareSchema = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v),
  z.number().int().min(0, 'Percentual inválido').max(100, 'Percentual inválido').optional(),
);

/**
 * Coerência entre modalidade e preço, verificada no SERVIDOR.
 *
 * O mesmo par de regras existe como CHECK no banco. Aqui ela devolve uma
 * mensagem legível para o formulário; lá, ela impede que qualquer caminho —
 * inclusive um bug futuro — grave a combinação inválida.
 */
export function validaMonetizacao(
  valor: { monetization?: string; priceCents?: number | null },
  ctx: z.RefinementCtx,
): void {
  if (valor.monetization === 'PAGA') {
    if (valor.priceCents === null || valor.priceCents === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['priceCents'],
        message: 'Defina o preço da obra para publicá-la como obra paga.',
      });
    }
    return;
  }
  if (valor.monetization !== undefined && valor.priceCents !== null && valor.priceCents !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['priceCents'],
      message: 'Só obras pagas têm preço. Escolha "obra paga" ou deixe o preço em branco.',
    });
  }
}

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
  /** Descrição da capa, em uma ou duas frases. */
  coverAlt: optionalText(300),
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

  // Monetização escolhida pela autoria. Não substitui a curadoria: definir um
  // preço não publica a obra nem concede o Selo Livrin (ver ADR 014).
  monetization: z
    .enum(monetizationEnum.enumValues, { errorMap: () => ({ message: 'Modalidade de publicação inválida' }) })
    .default('GRATUITA'),
  priceCents: precoCentavosSchema,
  adRevenueAuthorShare: adShareSchema,
});

export type WorkFields = z.infer<typeof workFieldsSchema>;

/** Criação pelo autor: `action=draft` salva rascunho; `action=submit` envia para análise. */
export const createWorkSchema = workFieldsSchema
  .extend({
    action: z.enum(['draft', 'submit']).default('submit'),
  })
  .superRefine(validaMonetizacao);

/**
 * Atualização parcial: todos os campos opcionais (sem defaults para não
 * sobrescrever valores).
 *
 * Fica exportado como OBJETO, sem o refinamento de monetização, porque a
 * administração precisa estendê-lo (`.extend({ authorId })`) — e `.extend` não
 * existe depois de um `.superRefine`. Quem consome aplica o refinamento no
 * final; o schema pronto para uso é `updateWorkSchema`, logo abaixo.
 */
export const updateWorkFieldsSchema = z.object({
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
  coverAlt: optionalText(300),
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
  monetization: z.enum(monetizationEnum.enumValues).optional(),
  priceCents: precoCentavosSchema,
  adRevenueAuthorShare: adShareSchema,
});

/** O schema de atualização pronto para uso, já com a coerência de monetização. */
export const updateWorkSchema = updateWorkFieldsSchema.superRefine(validaMonetizacao);

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
