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

/**
 * Três perfis, conforme a seção 7 da especificação:
 *   LEITOR    — acessa o catálogo, lê obras e avalia. NÃO publica.
 *   ESCRITOR  — tudo do leitor + cadastrar, enviar e acompanhar as próprias obras.
 *   ADMIN     — tudo + painel administrativo, curadoria e decisão editorial.
 * A ordem importa: é usada como hierarquia em `middlewares/auth.ts`.
 */
export const userRoleEnum = pgEnum('user_role', ['LEITOR', 'ESCRITOR', 'ADMIN']);

/**
 * Ciclo de vida editorial de uma obra (ver docs/business-rules.md):
 * RASCUNHO → EM_ANALISE → APROVADO → (ARQUIVADO)
 *                      ↘ REJEITADO → (correção) → EM_ANALISE
 *
 * APROVADO é o estado visível no catálogo: aprovar JÁ disponibiliza a obra,
 * como manda a seção 8 da especificação. ARQUIVADO despublica sem apagar.
 */
export const workStatusEnum = pgEnum('work_status', [
  'RASCUNHO',
  'EM_ANALISE',
  'APROVADO',
  'REJEITADO',
  'ARQUIVADO',
]);

export const workFormatEnum = pgEnum('work_format', ['QUADRINHO', 'LIVRO', 'MANGA_WEBCOMIC', 'ZINE']);

export const fileTypeEnum = pgEnum('file_type', ['PDF', 'EPUB', 'CBZ', 'CBR', 'DOCX']);

export const checkStatusEnum = pgEnum('check_status', ['PENDENTE', 'EM_ANDAMENTO', 'APROVADO', 'REPROVADO']);

/** Situação de uma doação (ver services/payments). */
export const donationStatusEnum = pgEnum('donation_status', ['PENDENTE', 'CONFIRMADA', 'FALHOU', 'CANCELADA']);

/** Meios de pagamento oferecidos na tela de apoio. */
export const paymentMethodEnum = pgEnum('payment_method', ['PIX', 'CARTAO', 'BOLETO']);

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
    role: userRoleEnum('role').notNull().default('LEITOR'),
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
    /** Quem assinou a decisão editorial. É o responsável pelo Selo Livrin. */
    reviewedBy: integer('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
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

/**
 * Doações de apoio ao projeto (seções 17 a 19 da especificação).
 *
 * A Livrin existe para quem publica sem condições de bancar um lançamento
 * tradicional, então a doação é um apoio voluntário — nunca um pedágio para
 * ler. A linha guarda o essencial da cobrança e a referência devolvida pelo
 * provedor; nenhum dado de cartão passa por aqui nem é armazenado.
 */
export const donations = pgTable(
  'donations',
  {
    id: serial('id').primaryKey(),
    /** Quem doou, se estava autenticado. Doação anônima é permitida. */
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    /** Obra que motivou a doação, quando partiu da página de uma obra. */
    workId: integer('work_id').references(() => works.id, { onDelete: 'set null' }),
    donorName: varchar('donor_name', { length: 120 }),
    /** Em centavos: dinheiro nunca é guardado como número de ponto flutuante. */
    amountCents: integer('amount_cents').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
    method: paymentMethodEnum('method').notNull(),
    /** Nome do provedor que processou (ex.: "simulado"). */
    provider: varchar('provider', { length: 40 }).notNull(),
    /** Identificador da cobrança no provedor. */
    providerRef: varchar('provider_ref', { length: 80 }).notNull(),
    status: donationStatusEnum('status').notNull().default('PENDENTE'),
    message: text('message'),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('donations_status_idx').on(t.status),
    index('donations_created_idx').on(t.createdAt),
    uniqueIndex('donations_provider_ref_unique').on(t.provider, t.providerRef),
    check('donations_amount_positive', sql`${t.amountCents} > 0`),
  ],
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
export type Donation = typeof donations.$inferSelect;
export type NewDonation = typeof donations.$inferInsert;
export type DonationStatus = (typeof donationStatusEnum.enumValues)[number];
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
