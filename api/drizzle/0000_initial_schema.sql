CREATE TYPE "public"."check_status" AS ENUM('PENDENTE', 'EM_ANDAMENTO', 'APROVADO', 'REPROVADO');--> statement-breakpoint
CREATE TYPE "public"."file_type" AS ENUM('PDF', 'EPUB', 'CBZ', 'CBR');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."work_format" AS ENUM('QUADRINHO', 'LIVRO', 'MANGA_WEBCOMIC', 'ZINE');--> statement-breakpoint
CREATE TYPE "public"."work_status" AS ENUM('RASCUNHO', 'EM_ANALISE', 'APROVADO', 'PUBLICADO', 'REJEITADO', 'ARQUIVADO');--> statement-breakpoint
CREATE TABLE "audio_descriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_id" integer NOT NULL,
	"page_number" integer NOT NULL,
	"chapter_label" varchar(60),
	"chapter_title" varchar(120),
	"panel_label" varchar(80),
	"description" text NOT NULL,
	"dialogues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audio_descriptions_page_positive" CHECK ("audio_descriptions"."page_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "feedbacks" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"content" text NOT NULL,
	"aspect" varchar(80),
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedbacks_rating_range" CHECK ("feedbacks"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"slug" varchar(90) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_id" integer NOT NULL,
	"user_id" integer,
	"last_page" integer DEFAULT 1 NOT NULL,
	"used_audio_desc" boolean DEFAULT false NOT NULL,
	"used_high_contrast" boolean DEFAULT false NOT NULL,
	"used_dyslexic_font" boolean DEFAULT false NOT NULL,
	"used_zoom" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_id" integer NOT NULL,
	"label" varchar(120) NOT NULL,
	"status" "check_status" DEFAULT 'PENDENTE' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"headline" varchar(160),
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "works" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(120) NOT NULL,
	"subtitle" varchar(160),
	"author_id" integer NOT NULL,
	"genre_id" integer NOT NULL,
	"format" "work_format" DEFAULT 'LIVRO' NOT NULL,
	"pages" integer NOT NULL,
	"synopsis" text NOT NULL,
	"status" "work_status" DEFAULT 'RASCUNHO' NOT NULL,
	"edition_label" varchar(60),
	"isbn" varchar(20),
	"age_rating" varchar(3) DEFAULT 'L' NOT NULL,
	"author_notes" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"has_audio_desc" boolean DEFAULT false NOT NULL,
	"has_leitor_tela" boolean DEFAULT false NOT NULL,
	"has_texto_alt" boolean DEFAULT false NOT NULL,
	"has_libras" boolean DEFAULT false NOT NULL,
	"has_facil_leitura" boolean DEFAULT false NOT NULL,
	"has_alto_contraste" boolean DEFAULT false NOT NULL,
	"audio_describer" varchar(120),
	"audio_narrator" varchar(120),
	"audio_reviewer" varchar(160),
	"cover_path" text,
	"file_path" text,
	"file_type" "file_type",
	"file_size_bytes" bigint,
	"file_original_name" varchar(255),
	"audio_path" text,
	"rejection_reason" text,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "works_pages_positive" CHECK ("works"."pages" > 0)
);
--> statement-breakpoint
ALTER TABLE "audio_descriptions" ADD CONSTRAINT "audio_descriptions_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_checks" ADD CONSTRAINT "review_checks_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_notes" ADD CONSTRAINT "review_notes_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_notes" ADD CONSTRAINT "review_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "audio_descriptions_work_page_unique" ON "audio_descriptions" USING btree ("work_id","page_number");--> statement-breakpoint
CREATE UNIQUE INDEX "feedbacks_work_user_unique" ON "feedbacks" USING btree ("work_id","user_id");--> statement-breakpoint
CREATE INDEX "feedbacks_work_idx" ON "feedbacks" USING btree ("work_id");--> statement-breakpoint
CREATE UNIQUE INDEX "genres_name_unique" ON "genres" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "genres_slug_unique" ON "genres" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "reading_sessions_work_started_idx" ON "reading_sessions" USING btree ("work_id","started_at");--> statement-breakpoint
CREATE INDEX "review_checks_work_idx" ON "review_checks" USING btree ("work_id");--> statement-breakpoint
CREATE INDEX "review_notes_work_idx" ON "review_notes" USING btree ("work_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "works_status_idx" ON "works" USING btree ("status");--> statement-breakpoint
CREATE INDEX "works_author_idx" ON "works" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "works_genre_idx" ON "works" USING btree ("genre_id");--> statement-breakpoint
CREATE INDEX "works_published_at_idx" ON "works" USING btree ("published_at");