-- Monetização opcional da obra e aquisição por leitor.
--
-- Até aqui o dinheiro do projeto existia só como doação: apoio ao projeto, que
-- não liberava nada. Esta migration acrescenta a outra metade da livraria — o
-- autor escolhe COMO disponibiliza a obra, e o leitor adquire a que for paga.
--
-- Duas regras ficam garantidas pelo banco, não só pela aplicação:
--   1. preço existe se, e somente se, a obra é PAGA, e cabe no teto de R$ 50;
--   2. uma pessoa só pode ter UMA aquisição confirmada por obra.
-- A segunda é o que torna a idempotência uma garantia, e não uma promessa:
-- dois cliques simultâneos não viram duas compras.
--
-- Nada aqui é destrutivo. Obras existentes ficam GRATUITA, que é o padrão e
-- preserva o comportamento atual do catálogo.

CREATE TYPE "public"."monetization" AS ENUM('GRATUITA', 'PAGA', 'PUBLICIDADE');--> statement-breakpoint
CREATE TYPE "public"."purchase_status" AS ENUM('PENDENTE', 'CONFIRMADA', 'FALHOU', 'CANCELADA', 'EXPIRADA');--> statement-breakpoint

ALTER TABLE "works" ADD COLUMN "monetization" "monetization" DEFAULT 'GRATUITA' NOT NULL;--> statement-breakpoint
ALTER TABLE "works" ADD COLUMN "price_cents" integer;--> statement-breakpoint
ALTER TABLE "works" ADD COLUMN "ad_revenue_author_share" integer DEFAULT 70 NOT NULL;--> statement-breakpoint

ALTER TABLE "works" ADD CONSTRAINT "works_price_matches_monetization" CHECK (
  ("works"."monetization" = 'PAGA' AND "works"."price_cents" IS NOT NULL AND "works"."price_cents" > 0 AND "works"."price_cents" <= 5000)
  OR ("works"."monetization" <> 'PAGA' AND "works"."price_cents" IS NULL)
);--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_ad_share_range" CHECK ("works"."ad_revenue_author_share" BETWEEN 0 AND 100);--> statement-breakpoint

CREATE TABLE "purchases" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "work_id" integer NOT NULL,
  "price_cents" integer NOT NULL,
  "currency" varchar(3) DEFAULT 'BRL' NOT NULL,
  "method" "payment_method" NOT NULL,
  "provider" varchar(40) NOT NULL,
  "provider_ref" varchar(80) NOT NULL,
  "status" "purchase_status" DEFAULT 'PENDENTE' NOT NULL,
  "confirmed_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "purchases_price_positive" CHECK ("purchases"."price_cents" > 0)
);--> statement-breakpoint

ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_work_id_works_id_fk"
  FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "purchases_user_idx" ON "purchases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "purchases_work_idx" ON "purchases" USING btree ("work_id");--> statement-breakpoint
CREATE INDEX "purchases_status_idx" ON "purchases" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_provider_ref_unique" ON "purchases" USING btree ("provider","provider_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_one_confirmed_per_user_work" ON "purchases" USING btree ("user_id","work_id") WHERE status = 'CONFIRMADA';
