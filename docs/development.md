# Guia de desenvolvimento

## Preparando o ambiente

Opção A — tudo em Docker com hot reload (requer Compose **v2**: `docker compose version` precisa responder `v2.x`):
```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Opção B — Node local (requer Node 20/22 e PostgreSQL 16):
```bash
# banco: crie um usuário/banco (ex.: livrin_user / livrin_db) e um banco de testes (livrin_test)
cd api && cp .env.example .env && npm install
npm run db:migrate && npm run db:seed
npm run dev                      # API em http://localhost:3000 (reinicia ao salvar)

cd ../web && npm install
npm run dev                      # front em http://localhost:5173 (proxy /api → :3000)
```

Scripts da API (`api/package.json`):

| Script | Ação |
| --- | --- |
| `dev` | servidor com recarga automática (`tsx watch`) |
| `build` / `start` | compila para `dist/` / executa a versão compilada |
| `start:prod` | migrate + seed + servidor (usado no Docker) |
| `typecheck` | verificação de tipos (inclui testes) |
| `db:generate` | gera migration SQL a partir do schema |
| `db:migrate` / `db:seed` / `db:reset` | aplica migrations / seed / **apaga e recria** o banco (bloqueado em produção) |
| `db:studio` | Drizzle Studio (navegador de dados) |
| `admin:create` | cria/promove administrador |
| `test` / `test:watch` | testes de integração |

Scripts do front (`web/package.json`): `dev`, `build` (typecheck + build), `preview`, `typecheck`.

## Convenções

- **TypeScript estrito** nos dois projetos (`strict`, `noUnusedLocals`, `noUnusedParameters`).
- Back-end: rotas apenas mapeiam; **controllers** validam entrada (`parse(schema, req.body)`) e chamam **services**; services contêm regras e consultas. Erros de domínio com `HttpError` (`badRequest`, `notFound`, `conflict`...). Nada de `try/catch` em controllers: o Express 5 envia erros assíncronos ao `errorHandler`.
- Permissões de obras em `services/work-policy.ts` — reutilize as funções, não duplique regras.
- Front-end: dados do servidor via React Query (`hooks/`); depois de uma mutação, invalide as chaves afetadas (`['me']`, `['catalog']`, `['work', id]`, `['admin']`...). Textos da interface em português.
- Estilo: classes utilitárias Tailwind com os **tokens** (`bg-surface`, `text-ink-muted`, `text-primary`...). Não use cores fixas: o alto contraste depende dos tokens.
- Acessibilidade: todo controle precisa de nome acessível (texto visível ou `aria-label`), foco visível e funcionar por teclado.
- Comentários explicam o **porquê**.

## Receitas

### Nova entidade / alteração de banco
1. Edite `api/src/db/schema.ts` (tabela, índices, FKs, `check`).
2. `cd api && npm run db:generate` → revise `drizzle/000X_*.sql`.
3. `npm run db:migrate`.
4. Exporte os tipos (`typeof tabela.$inferSelect`) se precisar.
5. Documente em `docs/database.md`.

### Novo endpoint
1. Schema zod em `api/src/validators/*.schemas.ts`.
2. Função no service (`api/src/services/...`).
3. Controller fino em `api/src/controllers/...`.
4. Rota em `api/src/routes/index.ts` (ou `routes/admin/index.ts`) com o middleware de acesso correto (`authenticate`, `optionalAuth`, nada = público).
5. Teste em `api/tests/` (sucesso, validação e permissão).
6. Documente em `docs/api.md`.

### Nova página
1. Crie `web/src/pages/MinhaPagina.tsx` (use `PageHeader`, `LoadingState`, `ErrorState`, `EmptyState` de `components/ui`).
2. Se buscar dados, crie um hook em `web/src/hooks/queries.ts`.
3. Registre a rota em `web/src/App.tsx` (dentro de `<RequireAuth />` se exigir login; `role="ADMIN"` para administração) e, se for o caso, o item no `Sidebar`.

### Novo componente
Coloque em `web/src/components/<área>/`. Componentes genéricos (botões, campos, modal) já existem em `components/ui/index.tsx` e `global.css` (`btn-primary`, `card`, `input`, `chip`...).

### Funcionalidade administrativa
Veja o passo a passo em [admin.md](admin.md#como-criar-um-novo-recurso-administrativo).

## Testes e build

```bash
cd api && npm test && npm run typecheck && npm run build
cd web && npm run build
cd e2e && npm test          # com o sistema rodando
```

Veja [testing.md](testing.md).

## Fluxo de contribuição sugerido

1. Crie uma branch.
2. Implemente + testes + documentação.
3. Rode `npm test` (api), `npm run build` (api e web).
4. Atualize o `CHANGELOG.md`.
