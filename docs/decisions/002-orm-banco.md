# 002 — PostgreSQL + Drizzle ORM

**Decisão.** PostgreSQL 16 com **Drizzle ORM** (já presente no projeto) e **migrations SQL geradas pelo drizzle-kit e versionadas** em `api/drizzle/`, aplicadas por código (`migrate()`) na inicialização. Seed idempotente.

**Alternativas.** Prisma (ótimo, mas com engine binária e geração de cliente — mais peças para funcionar em Alpine/ARM), TypeORM (decorators, mais propenso a inconsistências), `drizzle-kit push` (usado no projeto original: altera o banco direto sem histórico — inadequado para produção).

**Por que.** Drizzle é TypeScript puro, tipos inferidos do schema, SQL previsível e parametrizado (proteção contra SQL injection), sem dependência nativa. Migrations versionadas tornam o banco reproduzível em qualquer máquina e auditável. Aplicar no start elimina passos manuais (`docker compose up` basta).

**Modelagem.** Enums do PostgreSQL para status/papéis/formatos; `CHECK` para páginas, notas 1–5; unicidade (e-mail, gênero, avaliação por leitor/obra, audiodescrição por página); FKs com `RESTRICT` onde apagar perderia acervo (autor, gênero) e `CASCADE` para dados dependentes da obra. Desativação de usuários (soft delete) em vez de exclusão quando há vínculos.

**Cuidado conhecido.** Em consultas de uma só tabela o Drizzle omite o nome da tabela nas colunas; subconsultas correlacionadas usam a coluna externa qualificada explicitamente (`"works"."id"`) — ver comentário em `work-queries.ts`.
