# 007 — Validação, erros e organização do código

**Decisão.** Schemas **zod** por recurso (`validators/`), aplicados nos controllers via `parse()`; erros de domínio com `HttpError`; tratador central traduz zod, erros do PostgreSQL (23505, 23503, 23514, 22P02) e erros do multer em JSON padronizado `{ error: { code, message, details } }`, sem vazar detalhes internos. Back-end em camadas: rotas → controllers → services → banco, com regras de permissão centralizadas em `work-policy.ts`.

**Alternativas.** express-validator (menos tipagem), validação manual (repetitiva), Repositórios separados para cada tabela (abstração sem ganho real aqui — o Drizzle já é a camada de acesso; os services fazem as consultas diretamente).

**Por que.** zod gera os tipos TypeScript das entradas e as mensagens em português usadas pelo front-end para destacar campos (`details[].field`). A camada de serviço é testável e reutilizada entre rotas públicas e administrativas (ex.: `works.service` atende autor e admin com políticas diferentes). Nenhuma lógica de negócio fica nas rotas ou nos componentes React.
