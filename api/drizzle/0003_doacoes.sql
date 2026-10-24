-- Sistema de apoio/doação (seções 17 a 19 da especificação).
--
-- A doação é voluntária e nunca condiciona a leitura. Esta tabela guarda o
-- essencial da cobrança e a referência devolvida pelo provedor de pagamento;
-- nenhum dado de cartão passa pela aplicação nem é armazenado.

CREATE TYPE "public"."donation_status" AS ENUM('PENDENTE', 'CONFIRMADA', 'FALHOU', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('PIX', 'CARTAO', 'BOLETO');--> statement-breakpoint

CREATE TABLE "donations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"work_id" integer,
	"donor_name" varchar(120),
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"method" "payment_method" NOT NULL,
	"provider" varchar(40) NOT NULL,
	"provider_ref" varchar(80) NOT NULL,
	"status" "donation_status" DEFAULT 'PENDENTE' NOT NULL,
	"message" text,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "donations_amount_positive" CHECK ("donations"."amount_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "donations_status_idx" ON "donations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "donations_created_idx" ON "donations" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "donations_provider_ref_unique" ON "donations" USING btree ("provider","provider_ref");
