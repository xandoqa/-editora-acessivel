# API REST

- **Base URL:** `/api` (via Nginx/Vite) ou `http://localhost:3000/api` (direto).
- **Formato:** JSON (`Content-Type: application/json`), exceto criação/edição de obras, que usam `multipart/form-data` (upload).
- **Autenticação:** `Authorization: Bearer <token>` (token obtido em `/auth/login` ou `/auth/register`, válido por `JWT_EXPIRES_IN`).
- **Níveis de acesso:** 🌐 público · 👤 opcional (reconhece o usuário se houver token) · 🔒 autenticado · 🛡️ ADMIN.
- **Limites:** 600 req/min por IP na API; 20 tentativas/15 min em login e cadastro (`429`).

## Formato de erro

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Dados inválidos. Verifique os campos destacados.",
             "details": [{ "field": "email", "message": "Informe um e-mail válido" }] } }
```

| Status | `code` | Quando |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` / `BAD_REQUEST` | Campos inválidos, ID não numérico, arquivo inválido, JSON malformado |
| 401 | `UNAUTHORIZED` | Sem token, token inválido/expirado, conta desativada, login incorreto |
| 403 | `FORBIDDEN` | Sem permissão (ex.: usuário comum em `/admin`, autor editando obra em análise) |
| 404 | `NOT_FOUND` | Recurso inexistente **ou não visível** para quem pede (obras não publicadas) |
| 409 | `CONFLICT` | E-mail duplicado, transição de status inválida, exclusão bloqueada por vínculo |
| 413 | `PAYLOAD_TOO_LARGE` | Corpo JSON acima de 1 MB |
| 422 | `UNPROCESSABLE` | Regra de negócio (ex.: enviar para análise sem arquivo) |
| 429 | `TOO_MANY_REQUESTS` | Limite de requisições |
| 500 | `INTERNAL_ERROR` | Erro inesperado (detalhes apenas no log do servidor) |

## Objeto `Work` (resposta)

```json
{
  "id": 1, "title": "Além das Estrelas", "subtitle": "Crônicas do Espaço", "status": "PUBLICADO",
  "format": "QUADRINHO", "pages": 148, "synopsis": "No ano estelar de 2384...", "editionLabel": "Webcomic serial",
  "isbn": "978-65-8912-04-1", "ageRating": "12", "authorNotes": "...", "tags": ["EspaçoProfundo"],
  "hasAudioDesc": true, "hasLeitorTela": true, "hasTextoAlt": true, "hasLibras": true, "hasFacilLeitura": false, "hasAltoContraste": true,
  "audioDescriber": "Thiago Alencar", "audioNarrator": "Sarah Menezes", "audioReviewer": "Instituto Acessibilidade Aberta",
  "coverUrl": "/uploads/covers/2f6c...webp", "hasFile": true,
  "file": { "type": "PDF", "sizeBytes": 430424, "originalName": "alem-das-estrelas.pdf" }, "hasAudio": false,
  "rejectionReason": null, "submittedAt": "...", "reviewedAt": "...", "publishedAt": "...", "createdAt": "...", "updatedAt": "...",
  "author": { "id": 3, "name": "Lorena Campolina", "headline": "Roteiro e Ilustrações Originais" },
  "genre": { "id": 1, "name": "Ficção Científica" },
  "rating": { "average": 4.5, "count": 2 }, "readsCount": 110
}
```

Listagens paginadas retornam `{ "data": [...], "meta": { "page", "pageSize", "total", "totalPages" } }`.

---

## Authentication

### `POST /auth/register` 🌐
Cria uma conta **sempre com papel `USER`** (o campo `role` não é aceito).

Body: `{ "name": "Ana", "email": "ana@exemplo.com", "password": "Senha12345", "headline": "opcional" }`
Senha: 8–72 caracteres, com letras e números.

`201` → `{ "token": "eyJ...", "user": { "id": 12, "name": "Ana", "email": "ana@exemplo.com", "role": "USER", "headline": null, "isActive": true, "createdAt": "..." } }`
Erros: `400` validação, `409` e-mail já cadastrado, `429`.

### `POST /auth/login` 🌐
Body: `{ "email": "marina@livrin.com", "password": "..." }` → `200` `{ token, user }`.
Erros: `401` "E-mail ou senha incorretos." (mesma mensagem para e-mail inexistente) ou conta desativada.

```bash
curl -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@livrin.local","password":"TroqueEstaSenha123"}'
```

### `GET /auth/me` 🔒 → `{ "user": {...} }`
### `PATCH /auth/me` 🔒 — body `{ "name"?, "headline"? }` → `{ "user" }`
### `POST /auth/me/password` 🔒 — body `{ "currentPassword", "newPassword" }` → `204`; `400` se a senha atual estiver errada.

---

## Gêneros

### `GET /genres` 🌐 → `[{ "id", "name", "slug", "isActive", "worksCount" }]` (somente ativos)

---

## Obras

### `GET /works` 🌐 — catálogo (somente `PUBLICADO`)
Query: `q` (título, subtítulo, autor, gênero, tags), `format` (`QUADRINHO|LIVRO|MANGA_WEBCOMIC|ZINE`), `feature` (`audiodescricao|leitor-tela|texto-alt|libras|facil-leitura|alto-contraste`), `genreId`, `sort` (`recent|title|rating`), `page` (1), `pageSize` (12, máx. 100).
`200` → `{ data: Work[], meta, catalogTotal }` (`catalogTotal` = total publicado, usado no "N títulos inclusivos").

### `GET /works/:id` 👤
Obra publicada: qualquer pessoa. Não publicada: apenas o autor e ADMIN (os demais recebem `404`).

### `POST /works` 🔒 multipart
Campos: `title`*, `genreId`*, `pages`*, `synopsis`* (20–2000), `format`, `subtitle`, `editionLabel`, `isbn`, `ageRating` (`L|10|12|14|16|18`), `authorNotes`, `tags` (JSON `["a","b"]` ou `"a, b"`), `hasAudioDesc|hasLeitorTela|hasTextoAlt|hasLibras|hasFacilLeitura|hasAltoContraste` (`true/false`), `audioDescriber`, `audioNarrator`, `audioReviewer`, `action` (`draft` | `submit`, padrão `submit`).
Arquivos: `file` (PDF/EPUB/CBZ/CBR, até `MAX_UPLOAD_MB`), `cover` (JPG/PNG/WEBP, 5 MB), `audio` (MP3/OGG/M4A).
`action=submit` exige `file` (`422` caso contrário) e coloca a obra em `EM_ANALISE` com o checklist padrão.

```bash
curl -X POST http://localhost:3000/api/works -H "Authorization: Bearer $TOKEN" \
  -F title='Minha HQ' -F genreId=1 -F pages=24 -F format=QUADRINHO \
  -F synopsis='Uma história acessível sobre...' -F hasAudioDesc=true \
  -F file=@minha-hq.pdf -F cover=@capa.jpg
```
`201` → `Work`. Erros: `400` (campos/arquivo inválido), `422` (sem arquivo no envio).

### `PATCH /works/:id` 🔒 multipart (autor)
Campos opcionais iguais aos da criação + `removeCover`, `removeAudio`. Regras por status (ver [business-rules.md](business-rules.md)): `RASCUNHO`/`REJEITADO` editam tudo; `APROVADO`/`PUBLICADO` só `subtitle`, `synopsis`, `authorNotes`, `tags`, `editionLabel` e capa; `EM_ANALISE`/`ARQUIVADO` → `403`.

### `POST /works/:id/submit` 🔒 — rascunho/rejeitada → `EM_ANALISE` (`409` em outro status, `422` sem arquivo)
### `POST /works/:id/publish` 🔒 — `APROVADO` → `PUBLICADO` (`409` antes da aprovação)
### `DELETE /works/:id` 🔒 — autor: apenas `RASCUNHO`/`REJEITADO` (`409` nos demais); ADMIN: qualquer obra. `204`.

### `GET /works/:id/file` 👤
Envia o arquivo original (`application/pdf`, `application/epub+zip`, ...). `?download=1` força download com nome amigável. Mesma visibilidade de `GET /works/:id`.

### `GET /works/:id/audio` 👤 — faixa de audiodescrição (suporta `Range`).

---

## Audiodescrição

### `GET /works/:id/audio-descriptions` 👤 → lista ordenada por página
```json
[{ "id": 1, "workId": 1, "pageNumber": 1, "chapterLabel": "Capítulo 1", "chapterTitle": "O Limiar da Nebulosa Carina",
   "panelLabel": "Painel 1 • Plano Aberto", "description": "A nave Alvorada desliza...",
   "dialogues": [{ "speaker": "Comandante Yara", "tone": "Voz firme", "text": "Mantenham os sensores..." }] }]
```
### `POST /works/:id/audio-descriptions` 🔒 · `PUT /works/:id/audio-descriptions/:adId` 🔒 · `DELETE ...` 🔒
Body: `{ pageNumber*, description*, chapterLabel?, chapterTitle?, panelLabel?, dialogues?: [{ speaker*, tone?, text* }] (máx. 12) }`.
Autor: somente em `RASCUNHO`, `REJEITADO` ou `EM_ANALISE` (`403` nos demais); ADMIN: sempre. `409` se a página já tiver audiodescrição.

---

## Curadoria (lado do autor)

### `GET /works/:id/review` 🔒 (autor ou ADMIN)
```json
{ "workId": 8, "status": "EM_ANALISE", "stage": 2, "protocol": "LVR-88208", "progress": 50,
  "checks": [{ "id": 1, "label": "Contraste de balões & onomatopeias", "status": "APROVADO", "position": 0, "updatedAt": "..." }],
  "notes": [{ "id": 1, "content": "...", "createdAt": "...", "user": { "id": 10, "name": "Camila Fontes", "role": "ADMIN", "headline": "..." } }] }
```
### `POST /works/:id/review/notes` 🔒 — body `{ "content" }` (mensagem do autor/"Abrir Chat") → `201` nota.

---

## Avaliações

### `GET /works/:id/feedbacks` 🌐 — avaliações visíveis de obra publicada (máx. 50)
### `GET /works/:id/feedbacks/mine` 🔒 — avaliação do próprio usuário ou `null`
### `POST /works/:id/feedbacks` 🔒
Body `{ "rating": 1-5, "content": "10-1500 caracteres", "aspect": "opcional" }`. Uma por usuário e obra (reenviar atualiza). Somente obras publicadas; o autor não avalia a própria obra (`409`).

---

## Sessões de leitura (métricas)

### `POST /works/:id/sessions` 👤 → `201 { "id": "<uuid>" }` (somente obras publicadas)
### `PATCH /sessions/:sessionId` 🌐
Body (todos opcionais): `{ "lastPage": 3, "usedAudioDesc": true, "usedHighContrast": true, "usedDyslexicFont": true, "usedZoom": true }` → `204`. As flags só "ligam".

---

## Área do autor

| Endpoint | Resposta |
| --- | --- |
| `GET /me/summary` 🔒 | `{ drafts, inReview, readyToLaunch, published, rejected, total }` |
| `GET /me/works` 🔒 | `Work[]` com `reviewProgress` (% do checklist aprovado) |
| `GET /me/dashboard` 🔒 | `{ summary, totalReads, worksWithReads, accessibilityIndex: { average, count }, engagement: { sessions, audioDesc, highContrast, dyslexiaZoom }, highlight, feedbacks, works }` |

---

## Administração 🛡️ (`/api/admin/*`)

Todas exigem token de um usuário **ativo** com papel `ADMIN` (`401` sem token, `403` para `USER`).

### Dashboard
`GET /admin/stats` → `{ users: { total, active, admins, newLast30 }, works: { total, byStatus, byFormat }, feedbacks: { total, hidden, average }, sessions: { total, last30, audioDesc }, genres: { total, active }, pendingQueue: Work[], recentUsers }`

### Usuários
| Método e rota | Descrição |
| --- | --- |
| `GET /admin/users?q=&role=&active=&sort=createdAt\|name\|email\|lastLoginAt&order=asc\|desc&page=&pageSize=` | Lista paginada com `worksCount` |
| `GET /admin/users/:id` | Detalhe + atividade (avaliações, sessões, notas) + obras |
| `POST /admin/users` | `{ name, email, password, role?, headline?, isActive? }` → `201` |
| `PATCH /admin/users/:id` | `{ name?, email?, role?, headline?, isActive? }` — não permite remover o próprio acesso (`400`) nem deixar o sistema sem admin ativo (`409`) |
| `POST /admin/users/:id/reset-password` | `{ password }` → `204` |
| `DELETE /admin/users/:id` | `204`; `409` se o usuário tiver obras (desative-o); `400` para a própria conta |

### Obras
| Método e rota | Descrição |
| --- | --- |
| `GET /admin/works?q=&status=&format=&genreId=&authorId=&sort=createdAt\|updatedAt\|title\|submittedAt\|status&order=&page=&pageSize=` | Todas as obras, qualquer status |
| `GET /admin/works/:id` | `Work` + `checks` + `notes` + `audioDescriptions` |
| `POST /admin/works` (multipart) | Campos da obra + `authorId`* + `status` inicial (`RASCUNHO`, `EM_ANALISE`, `APROVADO`, `PUBLICADO`...) |
| `PATCH /admin/works/:id` (multipart) | Edita qualquer campo/arquivo, inclusive `authorId` |
| `PATCH /admin/works/:id/status` | `{ status, reason? }` — `reason` obrigatório para `REJEITADO`. Transições inválidas → `409` com `details.allowed` |
| `DELETE /admin/works/:id` | Exclusão definitiva (arquivos inclusos) |
| `POST /admin/works/:id/checks` | `{ label }` novo item do checklist |
| `PATCH /admin/works/:id/checks/:checkId` | `{ status?, label? }` |
| `DELETE /admin/works/:id/checks/:checkId` | Remove item |
| `POST /admin/works/:id/notes` | `{ content }` nota do parecerista (visível ao autor) |
| `DELETE /admin/notes/:id` | Remove nota |

### Gêneros
`GET /admin/genres` (inclui inativos e `worksCount`) · `POST /admin/genres` `{ name, isActive? }` · `PATCH /admin/genres/:id` `{ name?, isActive? }` · `DELETE /admin/genres/:id` (`409` se houver obras).

### Avaliações
`GET /admin/feedbacks?q=&visible=true|false&workId=&rating=&order=&page=` · `PATCH /admin/feedbacks/:id` `{ isVisible }` · `DELETE /admin/feedbacks/:id`.

---

## Saúde

`GET /health` (ou `/api/health`) → `200 { "status": "ok", "database": "ok" }` ou `503` se o banco estiver indisponível. Usado pelo healthcheck do Docker.

## Arquivos estáticos

`GET /uploads/covers/<uuid>.<ext>` 🌐 — capas (cache de 7 dias). Nenhum outro diretório de upload é servido diretamente.
