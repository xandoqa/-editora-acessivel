-- Assinatura do plano, descrição da capa e a data em que o plano passou a valer.
--
-- A mensalidade do plano reaproveita a tabela `purchases` em vez de ganhar uma
-- tabela própria: o ciclo é o mesmo (abre, fica pendente, confirma ou expira),
-- a idempotência é a mesma e o provedor é o mesmo. Uma segunda tabela de
-- pagamento seria duplicar o sistema para guardar os mesmos campos.
--
-- Para isso, `work_id` passa a aceitar nulo (uma mensalidade não pertence a
-- obra alguma) e um CHECK garante os dois sentidos da regra: OBRA exige
-- work_id, PLANO exige a ausência dele.
--
-- O índice único parcial de aquisição confirmada continua valendo para obras.
-- Como o PostgreSQL trata NULLs como distintos, ele não impede várias
-- mensalidades confirmadas da mesma pessoa — que é exatamente o desejado.
--
-- `works.cover_alt` é a descrição da capa escrita pela autoria: serve de texto
-- alternativo da imagem e de primeiro trecho da audiodescrição.
--
-- Nada aqui é destrutivo: aquisições existentes ficam com kind = 'OBRA'.

CREATE TYPE "public"."purchase_kind" AS ENUM('OBRA', 'PLANO');--> statement-breakpoint

ALTER TABLE "purchases" ALTER COLUMN "work_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "kind" "purchase_kind" DEFAULT 'OBRA' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_kind_matches_work" CHECK (
  ("purchases"."kind" = 'OBRA' AND "purchases"."work_id" IS NOT NULL)
  OR ("purchases"."kind" = 'PLANO' AND "purchases"."work_id" IS NULL)
);--> statement-breakpoint

ALTER TABLE "users" ADD COLUMN "plan_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "works" ADD COLUMN "cover_alt" varchar(300);
