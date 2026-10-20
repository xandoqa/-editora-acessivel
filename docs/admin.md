# Área administrativa

```
Administrador → Login → Autenticação (JWT) → Área administrativa (/admin) → API /api/admin/* → PostgreSQL
```

## Como acessar

1. Garanta que existe um administrador (ver [authentication.md](authentication.md#criar-um-administrador-com-segurança)). Com o `.env.example`, o seed cria `admin@livrin.local` com a senha de `ADMIN_PASSWORD`.
2. Abra `http://localhost:5173/login` e entre com essa conta: administradores são levados direto para `/admin`.
3. A qualquer momento, o menu do avatar (canto superior direito) e a barra lateral mostram o atalho **Administração** apenas para quem tem papel `ADMIN`.

A área tem layout próprio (faixa laranja "Área administrativa · Acesso restrito", menu lateral próprio e link "Voltar ao site"), mantendo a identidade visual da Livrin.

Um usuário comum que digitar `/admin` é redirecionado ao catálogo; se chamar a API diretamente, recebe `403`. A verificação real acontece na API (`authenticate` + `requireAdmin` em todo `/api/admin`).

## Telas

### Visão geral (`/admin`)
Indicadores calculados no banco (`GET /api/admin/stats`): usuários (ativos, admins, novos em 30 dias), obras no catálogo, fila de curadoria, sessões de leitura (30 dias e total, com audiodescrição), fila de curadoria mais antiga primeiro, obras por status, acervo por formato, cadastros recentes e comunidade (avaliações e média, ocultas, gêneros ativos). Cada indicador leva à listagem correspondente já filtrada.

### Obras & Curadoria (`/admin/works`)
- **Listagem** de todas as obras (qualquer status) com busca (título, autor, gênero, tags), filtros por status e gênero, ordenação clicável (título, status, envio, atualização) e paginação no servidor. O estado dos filtros fica na URL (pode ser compartilhado).
- **Nova obra** (`/admin/works/new`): cadastra uma obra em nome de um autor escolhido, com status inicial (rascunho, em análise, aprovada ou publicada — as duas últimas exigem arquivo).
- **Detalhe** (`/admin/works/:id`):
  - **Decisão editorial:** botões com as transições permitidas a partir do status atual (aprovar, solicitar ajustes/rejeitar com motivo obrigatório, publicar, despublicar/arquivar, reabrir análise, devolver como rascunho, republicar). Cada ação abre uma confirmação explicando o efeito.
  - **Checklist da Etapa 2:** alterar o status de cada item (pendente, em andamento, aprovado, reprovado), adicionar e remover itens. O autor vê as mudanças na tela "Em Análise".
  - **Notas dos pareceristas:** registrar e excluir notas (as mensagens do autor também aparecem aqui).
  - **Dados da obra:** edição completa (inclusive arquivo, capa, áudio, recursos de acessibilidade e autor responsável).
  - **Audiodescrição por página:** criar, editar e excluir páginas descritas e falas.
  - **Excluir** definitivamente (com aviso sugerindo arquivar em vez de excluir).

### Usuários (`/admin/users`)
Busca por nome/e-mail, filtros por papel e situação, ordenação e paginação. Ações por linha: **detalhes** (atividade e obras), **editar** (nome, e-mail, papel, apresentação, ativo), **redefinir senha**, **ativar/desativar** (soft delete — bloqueia login e invalida tokens na hora) e **excluir** (somente contas sem obras). "Novo usuário" cria contas com papel e senha inicial.

### Gêneros (`/admin/genres`)
Criar, renomear, ativar/desativar e excluir gêneros. Gêneros com obras não podem ser excluídos (apenas desativados); gêneros inativos somem do formulário de submissão, mas as obras existentes continuam com eles.

### Avaliações (`/admin/feedbacks`)
Moderação com busca, filtros (visibilidade, nota) e ordenação. **Ocultar** é reversível (some da obra e do painel do autor); **Excluir** é definitivo.

## Entidades administradas e relação com o banco

| Tela | Tabelas | Endpoints |
| --- | --- | --- |
| Visão geral | todas (agregações `count`, `avg`, `filter`) | `GET /admin/stats` |
| Obras & Curadoria | `works`, `review_checks`, `review_notes`, `audio_descriptions` | `/admin/works*`, `/admin/notes/:id`, `/works/:id/audio-descriptions*` |
| Usuários | `users` (+ contagens de `works`, `feedbacks`, `reading_sessions`, `review_notes`) | `/admin/users*` |
| Gêneros | `genres` | `/admin/genres*` |
| Avaliações | `feedbacks` | `/admin/feedbacks*` |

O fluxo é sempre: **ação na tela → API (`/api/admin/...`) → validação zod → regra de negócio no serviço → PostgreSQL → resposta → interface invalida o cache e recarrega os dados**. A interface nunca acessa o banco diretamente.

Detalhes de cada endpoint: [api.md](api.md#administração-️-apiadmin).

## Regras de proteção

- Não é possível remover o próprio papel de ADMIN, desativar nem excluir a própria conta.
- O sistema nunca fica sem pelo menos um administrador ativo.
- Usuários com obras não são excluídos (FK `RESTRICT`); use a desativação.
- Gêneros em uso não são excluídos.
- Transições de status inválidas são recusadas pela API (`409`) — ver [business-rules.md](business-rules.md).
- IDs de rota são validados (inteiros positivos); buscas são parametrizadas.

## Como criar um novo recurso administrativo

Exemplo: administrar "Coleções".

1. **Banco:** adicione a tabela em `api/src/db/schema.ts` e gere a migration (`npm run db:generate`).
2. **Validação:** crie os schemas zod em `api/src/validators/admin.schemas.ts`.
3. **Serviço:** `api/src/services/admin/collections.service.ts` com listagem paginada, criação, edição e exclusão (use `paginated()` e `escapeLike()`).
4. **Controller:** funções em `api/src/controllers/admin/admin.controller.ts` (ou um arquivo novo na mesma pasta).
5. **Rotas:** registre em `api/src/routes/admin/index.ts` — o `router.use(authenticate, requireAdmin)` já protege tudo.
6. **Testes:** adicione casos em `api/tests/` (inclua o teste de `403` para usuário comum).
7. **Front-end:** hook em `web/src/hooks/adminQueries.ts`, página em `web/src/pages/admin/`, rota em `web/src/App.tsx` (dentro de `/admin`) e item no menu em `web/src/components/admin/AdminLayout.tsx`.
8. **Documentação:** atualize este arquivo, `api.md`, `database.md` e o `CHANGELOG.md`.
