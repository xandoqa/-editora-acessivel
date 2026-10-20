# Arquitetura

## Visão geral

```
                 ┌───────────────────────────── Docker Compose ─────────────────────────────┐
 Usuário         │                                                                         │
 (navegador) ───►│  web  (Nginx :80 → host :5173)                                          │
                 │   ├─ /            → arquivos estáticos do React (SPA)                   │
                 │   ├─ /api/*       → proxy ──► api (Node/Express :3000)                  │
                 │   └─ /uploads/*   → proxy ──► api                                       │
                 │                                   │                                     │
                 │                                   ├──► db (PostgreSQL 16 :5432)  [volume pgdata]
                 │                                   └──► /app/uploads              [volume uploads]
                 └─────────────────────────────────────────────────────────────────────────┘
```

Fluxo de uma requisição: **Usuário → Front-end (React) → API (Express) → PostgreSQL**, e a resposta volta pelo mesmo caminho até a interface, que atualiza o cache (React Query) e re-renderiza.

## Back-end (`api/`)

Camadas, de fora para dentro:

| Camada | Pasta | Responsabilidade |
| --- | --- | --- |
| Configuração | `src/config/env.ts` | Lê e valida (zod) todas as variáveis de ambiente na inicialização. Falha cedo, com mensagem clara. |
| Aplicação | `src/app.ts` | Monta o Express: helmet, CORS, JSON, log de requisições, `/health`, estático das capas, rotas, 404 e tratador de erros. |
| Rotas | `src/routes/index.ts`, `src/routes/admin/index.ts` | Mapa de URLs → middlewares → controllers. Cada rota indica o nível de acesso. |
| Middlewares | `src/middlewares/` | `auth.ts` (JWT, `authenticate`, `optionalAuth`, `requireAdmin`), `upload.ts` (multer), `rate-limit.ts`, `error-handler.ts`. |
| Controllers | `src/controllers/` | Finos: validam a entrada com os schemas de `validators/`, chamam o serviço e definem o status HTTP. |
| Validadores | `src/validators/` | Schemas zod de body/query/params (mensagens em português). |
| Serviços | `src/services/` | Regras de negócio e consultas ao banco. `work-policy.ts` centraliza permissões e transições de status. `storage.service.ts` cuida dos arquivos. |
| Dados | `src/db/` | `schema.ts` (tabelas Drizzle), `client.ts` (pool), `migrate.ts`, `seed.ts`, `reset.ts`. |

Express 5 encaminha automaticamente erros de funções `async` para o tratador central (`error-handler.ts`), que converte `HttpError`, erros do zod e códigos do PostgreSQL (unicidade, FK, check) em respostas JSON padronizadas — sem vazar stack trace ou SQL:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Dados inválidos...", "details": [{ "field": "title", "message": "Título é obrigatório" }] } }
```

### Arquivos

`storage.service.ts` grava os uploads em `UPLOAD_DIR` (volume Docker):

```
uploads/
├── tmp/      recebidos pelo multer, ainda não validados
├── covers/   capas — públicas em /uploads/covers/<uuid>.<ext>
├── works/    arquivos das obras — privados, servidos por GET /api/works/:id/file
└── audio/    faixas de audiodescrição — privadas, GET /api/works/:id/audio
```

Cada arquivo é validado por extensão, tamanho **e assinatura binária** (`%PDF-`, ZIP, `Rar!`, JPEG/PNG/WEBP, ID3/MP3, OggS, ftyp) antes de ser movido para o destino com nome UUID. Se o banco falhar, os arquivos recém-gravados são removidos; ao substituir um arquivo, o antigo só é apagado depois que o banco confirma a alteração.

## Front-end (`web/`)

| Pasta | Conteúdo |
| --- | --- |
| `src/App.tsx` | Rotas (React Router). Páginas pesadas (leitor, admin) são carregadas sob demanda. |
| `src/main.tsx` | Providers: React Query, Preferências de acessibilidade, Toasts, Autenticação. Fontes (Inter, Plus Jakarta Sans, Lexend, OpenDyslexic) empacotadas localmente. |
| `src/pages/` | Uma página por tela do protótipo (+ `admin/`). |
| `src/components/layout` | Barra lateral, barra superior, layout com gaveta no celular. |
| `src/components/reader` | Leitor: `DocumentViewer` escolhe `PdfViewer` (pdf.js), `EpubViewer` (epub.js) ou `CbzViewer` (JSZip); `AudioDescriptionPlayer`; preferências de leitura; registro de sessões. |
| `src/components/works` | Formulário de obra, upload, editor de audiodescrição, avaliações, cards do catálogo. |
| `src/components/admin` | Layout e tabelas da administração. |
| `src/hooks/` | Hooks de leitura com React Query (`queries.ts`, `adminQueries.ts`). |
| `src/lib/` | Cliente HTTP (axios), formatação pt-BR, rótulos, síntese de voz. |
| `src/styles/global.css` | Tokens de cor como variáveis CSS (troca completa no Alto Contraste), componentes base, foco visível. |

Comunicação com a API: o axios usa a base relativa `/api` e injeta `Authorization: Bearer <token>`. Em desenvolvimento o Vite faz proxy de `/api` e `/uploads` para `API_PROXY_TARGET`; em produção o Nginx faz o mesmo. Resultado: front e API na mesma origem, sem CORS no navegador.

Estado: dados do servidor ficam no cache do React Query (invalidado após cada mutação); sessão no `AuthContext`; preferências de acessibilidade no `PreferencesContext` (localStorage, por navegador).

## Fluxos principais

### Publicação de uma obra
1. Autor envia o formulário (multipart) → `POST /api/works` com `action=submit`.
2. API valida campos e arquivo, grava o arquivo, cria a obra em `RASCUNHO` e, na mesma transação, a move para `EM_ANALISE` criando o checklist padrão.
3. Curadoria (admin) atualiza o checklist, registra notas e decide (`PATCH /api/admin/works/:id/status`).
4. Aprovada (`APROVADO`), o autor publica (`POST /api/works/:id/publish`) → `PUBLICADO` → aparece no catálogo.

### Leitura
1. `GET /api/works/:id` (metadados) + `GET /api/works/:id/audio-descriptions`.
2. `GET /api/works/:id/file` (ArrayBuffer) → renderização no navegador.
3. `POST /api/works/:id/sessions` cria uma sessão; `PATCH /api/sessions/:id` registra página e recursos usados → métricas reais nos painéis.

### Administração
Administrador → Login → `RequireAuth role=ADMIN` (front) → `/admin/*` → API `/api/admin/*` (`authenticate` + `requireAdmin`) → PostgreSQL.

## Decisões

As decisões técnicas estão registradas em [decisions/](decisions/).
