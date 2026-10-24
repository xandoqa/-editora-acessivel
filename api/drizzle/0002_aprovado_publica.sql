-- Aprovar passa a disponibilizar a obra no catálogo (seções 8 e 9 da especificação).
--
-- Antes existiam seis estados e o catálogo mostrava apenas PUBLICADO. A decisão
-- do administrador parava em APROVADO e quem publicava era o AUTOR, em outra
-- tela: o administrador aprovava e a obra continuava invisível. A seção 9 lista
-- quatro estados, sem um "publicado" separado.
--
-- Aqui PUBLICADO é aposentado: as obras publicadas passam a APROVADO, que é o
-- estado visível no catálogo. ARQUIVADO permanece para despublicar uma obra.

-- 1. Nenhuma obra pode continuar em PUBLICADO antes de o valor sumir do tipo.
UPDATE "works" SET "status" = 'APROVADO' WHERE "status" = 'PUBLICADO';--> statement-breakpoint

-- 2. Tipo novo, sem PUBLICADO.
CREATE TYPE "public"."work_status_v2" AS ENUM('RASCUNHO', 'EM_ANALISE', 'APROVADO', 'REJEITADO', 'ARQUIVADO');--> statement-breakpoint

-- 3. Troca o tipo da coluna. O índice works_status_idx é recriado pelo próprio
--    PostgreSQL junto com a mudança de tipo.
ALTER TABLE "works" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "works" ALTER COLUMN "status" TYPE "public"."work_status_v2" USING ("status"::text::"public"."work_status_v2");--> statement-breakpoint
ALTER TABLE "works" ALTER COLUMN "status" SET DEFAULT 'RASCUNHO';--> statement-breakpoint
DROP TYPE "public"."work_status";--> statement-breakpoint
ALTER TYPE "public"."work_status_v2" RENAME TO "work_status";--> statement-breakpoint

-- 4. Obra aprovada sem data de publicação (vinha de uma aprovação antiga que
--    nunca foi lançada pelo autor) passa a contar como publicada na revisão.
UPDATE "works" SET "published_at" = COALESCE("reviewed_at", "updated_at")
  WHERE "status" = 'APROVADO' AND "published_at" IS NULL;
