-- Selo de Qualidade Livrin (seção 7.3 da especificação e proposta de valor do BMC).
--
-- O selo não é um adorno novo: ele resume o checklist que a curadoria JÁ preenche
-- obra a obra (`review_checks`). O que faltava era registrar QUEM assinou a
-- aprovação — sem isso, o selo não teria um responsável, e um selo sem
-- responsável não atesta nada.
--
-- A coluna é opcional: obras aprovadas antes desta versão continuam válidas,
-- apenas sem o nome de quem aprovou.

ALTER TABLE "works" ADD COLUMN "reviewed_by" integer;--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_reviewed_by_users_id_fk"
  FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;
