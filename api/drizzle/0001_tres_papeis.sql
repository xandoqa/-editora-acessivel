-- Três perfis de usuário (seção 7 da especificação): LEITOR, ESCRITOR, ADMIN.
--
-- Antes existiam apenas USER e ADMIN, e qualquer conta cadastrada podia publicar
-- obras. Esta migration amplia o enum e converte as contas existentes:
--   ADMIN                      -> ADMIN
--   USER que já tem obra       -> ESCRITOR  (preserva o que a conta podia fazer)
--   USER sem obra              -> LEITOR
--
-- Observação técnica: `ALTER TYPE ... ADD VALUE` não pode ser usado aqui porque
-- o valor novo não pode ser utilizado na mesma transação, e o migrator do Drizzle
-- roda tudo em uma transação. Por isso o tipo é recriado e trocado.

-- 1. Guarda o papel de destino em uma coluna temporária de texto.
ALTER TABLE "users" ADD COLUMN "role_migrado" varchar(10);--> statement-breakpoint
UPDATE "users" SET "role_migrado" = 'ADMIN' WHERE "role" = 'ADMIN';--> statement-breakpoint
UPDATE "users" SET "role_migrado" = 'ESCRITOR'
  WHERE "role_migrado" IS NULL
    AND EXISTS (SELECT 1 FROM "works" w WHERE w."author_id" = "users"."id");--> statement-breakpoint
UPDATE "users" SET "role_migrado" = 'LEITOR' WHERE "role_migrado" IS NULL;--> statement-breakpoint

-- 2. Cria o tipo novo.
CREATE TYPE "public"."user_role_v2" AS ENUM('LEITOR', 'ESCRITOR', 'ADMIN');--> statement-breakpoint

-- 3. Troca a coluna. O índice users_role_idx cai junto com a coluna antiga e é
--    recriado no passo 4.
ALTER TABLE "users" DROP COLUMN "role";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "public"."user_role_v2" DEFAULT 'LEITOR' NOT NULL;--> statement-breakpoint
UPDATE "users" SET "role" = "role_migrado"::"public"."user_role_v2";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "role_migrado";--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
ALTER TYPE "public"."user_role_v2" RENAME TO "user_role";--> statement-breakpoint

-- 4. Recria o índice por papel.
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");
