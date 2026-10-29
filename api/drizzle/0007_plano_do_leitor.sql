-- Plano do leitor: gratuito (padrão) ou premium.
--
-- O premium é simulado e faz UMA coisa: esconder os anúncios nas obras que a
-- autoria escolheu monetizar por publicidade. Ele não desbloqueia obra paga —
-- quem define preço é a autoria, e o dinheiro de uma assinatura não é dela.
-- Transformar o plano em passe livre sobre o trabalho dos outros seria uma
-- regra de negócio diferente, e não é a que o projeto adota (ver ADR 015).
--
-- Não é destrutivo: todas as contas existentes ficam GRATUITO, que preserva o
-- comportamento atual.

CREATE TYPE "public"."user_plan" AS ENUM('GRATUITO', 'PREMIUM');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "plan" "user_plan" DEFAULT 'GRATUITO' NOT NULL;
