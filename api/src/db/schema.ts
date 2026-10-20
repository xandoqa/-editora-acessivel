import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/* -------------------------------------------------------------------------- */
/*                                   ENUMS                                    */
/* -------------------------------------------------------------------------- */

export const userRoleEnum = pgEnum('user_role', ['USER', 'ADMIN']);

/**
 * Ciclo de vida editorial de uma obra (ver docs/business-rules.md):
 * RASCUNHO → EM_ANALISE → APROVADO → PUBLICADO → (ARQUIVADO)
 *                      ↘ REJEITADO → (correção) → EM_ANALISE
 */
export const workStatusEnum = pgEnum('work_status', [
  'RASCUNHO',
  'EM_ANALISE',
  'APROVADO',
  'PUBLICADO',
  'REJEITADO',
  'ARQUIVADO',
]);

export const workFormatEnum = pgEnum('work_format', ['QUADRINHO', 'LIVRO', 'MANGA_WEBCOMIC', 'ZINE']);

export const fileTypeEnum = pgEnum('file_type', ['PDF', 'EPUB', 'CBZ', 'CBR']);

export const checkStatusEnum = pgEnum('check_status', ['PENDENTE', 'EM_ANDAMENTO', 'APROVADO', 'REPROVADO']);

/* -------------------------------------------------------------------------- */
/*                                   TABELAS                                  */
/* -------------------------------------------------------------------------- */

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Autores, leitores e administradores (pareceristas). */
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    /** Sempre armazenado em minúsculas (normalizado pela camada de serviço). */
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    role: userRoleEnum('role').notNull().default('USER'),
    isActive: boolean('is_active').notNull().default(true),
    /** Descrição curta exibida em avaliações/notas: ex. "Baixa Visão · Leitor de Tela". */
    headline: varchar('headline', { length: 160 }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('users_email_unique').on(t.email), index('users_role_idx').on(t.role)],
);

/** Gêneros literários gerenciados pela administração. */
export const genres = pgTable(
  'genres',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 80 }).notNull(),
    slug: varchar('slug', { length: 90 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('genres_name_unique').on(t.name), uniqueIndex('genres_slug_unique').on(t.slug)],
);

/** Obras (livros, HQs, mangás, zines) submetidas por autores. */
export const works = pgTable(
  'works',
  {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 120 }).notNull(),
    subtitle: varchar('subtitle', { length: 160 }),
    authorId: integer('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    genreId: integer('genre_id')
      .notNull()
      .references(() => genres.id, { onDelete: 'restrict' }),
    format: workFormatEnum('format').notNull().default('LIVRO'),
    pages: integer('pages').notNull(),
    synopsis: text('synopsis').notNull(),
    status: workStatusEnum('status').notNull().default('RASCUNHO'),
    /** Rótulo editorial exibido no card do catálogo (ex.: "Edição especial"). */
    editionLabel: varchar('edition_label', { length: 60 }),
    isbn: varchar('isbn', { length: 20 }),
    /** Classificação indicativa (L, 10, 12, 14, 16, 18). */
    ageRating: varchar('age_rating', { length: 3 }).notNull().default('L'),
    authorNotes: text('author_notes'),
    tags: text('tags').array().notNull().default(sql`'{}'::text[]`),

    // Recursos de acessibilidade declarados pelo autor / validados pela curadoria
    hasAudioDesc: boolean('has_audio_desc').notNull().default(false),
    hasLeitorTela: boolean('has_leitor_tela').notNull().default(false),
    hasTextoAlt: boolean('has_texto_alt').notNull().default(false),
    hasLibras: boolean('has_libras').notNull().default(false),
    hasFacilLeitura: boolean('has_facil_leitura').notNull().default(false),
    hasAltoContraste: boolean('has_alto_contraste').notNull().default(false),

    // Créditos da audiodescrição
    audioDescriber: varchar('audio_describer', { length: 120 }),
    audioNarrator: varchar('audio_narrator', { length: 120 }),
    audioReviewer: varchar('audio_reviewer', { length: 160 }),

    // Arquivos (caminhos relativos a UPLOAD_DIR; nunca expostos diretamente)
    coverPath: text('cover_path'),
    filePath: text('file_path'),
    fileType: fileTypeEnum('file_type'),
    fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }),
    fileOriginalName: varchar('file_original_name', { length: 255 }),
    audioPath: text('audio_path'),

    rejectionReason: text('rejection_reason'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('works_status_idx').on(t.status),
    index('works_author_idx').on(t.authorId),
    index('works_genre_idx').on(t.genreId),
    index('works_published_at_idx').on(t.publishedAt),
    check('works_pages_positive', sql`${t.pages} > 0`),
  ],
);

/**
 * Audiodescrição por página/quadro: texto descritivo + falas dos personagens.
 * É exibida no Leitor Acessível e narrada pelo player (áudio ou síntese de voz).
 */
export type Dialogue = { speaker: string; tone?: string; text: string };

export const audioDescriptions = pgTable(
  'audio_descriptions',
  {
    id: serial('id').primaryKey(),
    workId: integer('work_id')
      .notNull()
      .references(() => works.id, { onDelete: 'cascade' }),
    pageNumber: integer('page_number').notNull(),
    chapterLabel: varchar('chapter_label', { length: 60 }),
    chapterTitle: varchar('chapter_title', { length: 120 }),
    panelLabel: varchar('panel_label', { length: 80 }),
    description: text('description').notNull(),
    dialogues: jsonb('dialogues').$type<Dialogue[]>().notNull().default([]),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('audio_descriptions_work_page_unique').on(t.workId, t.pageNumber),
    check('audio_descriptions_page_positive', sql`${t.pageNumber} > 0`),
  ],
);

/** Itens verificados pela curadoria na Etapa 2 ("Revisão de conteúdo & testes de acessibilidade"). */
export const reviewChecks = pgTable(
  'review_checks',
  {
    id: serial('id').primaryKey(),
    workId: integer('work_id')
      .notNull()
      .references(() => works.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 120 }).notNull(),
    status: checkStatusEnum('status').notNull().default('PENDENTE'),
    position: integer('position').notNull().default(0),
    ...timestamps,
  },
  (t) => [index('review_checks_work_idx').on(t.workId)],
);

/** Notas dos pareceristas e mensagens do autor ("Abrir chat") sobre uma obra em análise. */
export const reviewNotes = pgTable(
  'review_notes',
  {
    id: serial('id').primaryKey(),
    workId: integer('work_id')
      .notNull()
      .references(() => works.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('review_notes_work_idx').on(t.workId)],
);

/** Avaliações dos leitores ("Voz dos Leitores"). Uma por leitor e obra. */
export const feedbacks = pgTable(
  'feedbacks',
  {
    id: serial('id').primaryKey(),
    workId: integer('work_id')
      .notNull()
      .references(() => works.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    content: text('content').notNull(),
    /** Recurso de acessibilidade comentado (ex.: "Interface de Leitura Acessível"). */
    aspect: varchar('aspect', { length: 80 }),
    isVisible: boolean('is_visible').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('feedbacks_work_user_unique').on(t.workId, t.userId),
    index('feedbacks_work_idx').on(t.workId),
    check('feedbacks_rating_range', sql`${t.rating} BETWEEN 1 AND 5`),
  ],
);

/**
 * Sessões de leitura registradas pelo Leitor Acessível. Alimentam as métricas
 * reais do painel do autor e do dashboard administrativo (leituras, uso de
 * audiodescrição, alto contraste, fonte para dislexia/zoom).
 */
export const readingSessions = pgTable(
  'reading_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workId: integer('work_id')
      .notNull()
      .references(() => works.id, { onDelete: 'cascade' }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    lastPage: integer('last_page').notNull().default(1),
    usedAudioDesc: boolean('used_audio_desc').notNull().default(false),
    usedHighContrast: boolean('used_high_contrast').notNull().default(false),
    usedDyslexicFont: boolean('used_dyslexic_font').notNull().default(false),
    usedZoom: boolean('used_zoom').notNull().default(false),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('reading_sessions_work_started_idx').on(t.workId, t.startedAt)],
);

/* -------------------------------------------------------------------------- */
/*                                    TIPOS                                   */
/* -------------------------------------------------------------------------- */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Genre = typeof genres.$inferSelect;
export type Work = typeof works.$inferSelect;
export type NewWork = typeof works.$inferInsert;
export type WorkStatus = (typeof workStatusEnum.enumValues)[number];
export type WorkFormat = (typeof workFormatEnum.enumValues)[number];
export type FileType = (typeof fileTypeEnum.enumValues)[number];
export type CheckStatus = (typeof checkStatusEnum.enumValues)[number];
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type AudioDescription = typeof audioDescriptions.$inferSelect;
export type ReviewCheck = typeof reviewChecks.$inferSelect;
export type Feedback = typeof feedbacks.$inferSelect;
