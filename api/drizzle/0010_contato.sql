-- Mensagens do "Fale Conosco".
--
-- A mensagem é GRAVADA antes de qualquer tentativa de envio por e-mail. A
-- ordem importa: entrega de e-mail falha — servidor fora, senha trocada, rede
-- caída —, e uma mensagem que só existia no caminho do envio desaparece junto
-- com a falha. Gravada primeiro, ela nunca se perde: o envio vira uma segunda
-- etapa, cujo resultado fica registrado em `delivered_at` / `delivery_error`.
--
-- `status` separa o que já foi lido do que não foi, e é o que a administração
-- usa para não reler a caixa inteira todo dia.
--
-- Nada aqui é destrutivo: tabela nova, nenhuma tabela existente é alterada.

CREATE TYPE "public"."contact_status" AS ENUM('NOVA', 'LIDA', 'RESPONDIDA', 'ARQUIVADA');--> statement-breakpoint

CREATE TABLE "contact_messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(120) NOT NULL,
  "email" varchar(255) NOT NULL,
  "subject" varchar(60) NOT NULL,
  "order_ref" varchar(60),
  "message" text NOT NULL,
  "status" "contact_status" DEFAULT 'NOVA' NOT NULL,
  -- Quem estava logado ao escrever, se alguém estava. Nulo para visitante, e
  -- a mensagem sobrevive à exclusão da conta: o que foi dito continua dito.
  "user_id" integer,
  -- Resultado da tentativa de envio por e-mail. Nulo = ainda não entregue.
  "delivered_at" timestamp with time zone,
  "delivery_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;--> statement-breakpoint

CREATE INDEX "contact_messages_status_idx" ON "contact_messages" ("status");--> statement-breakpoint
CREATE INDEX "contact_messages_created_idx" ON "contact_messages" ("created_at" DESC);
