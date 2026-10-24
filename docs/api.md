# API

Base: `/api`. Todas as respostas são JSON, exceto os downloads de arquivo.

**Legenda de acesso**

| Símbolo | Significado |
| --- | --- |
| 🌐 | Público — qualquer visitante |
| 👁 | Público, mas reconhece quem está logado (o autor vê o próprio rascunho) |
| 🔒 | Exige token válido |
| ✍️ | Exige perfil `ESCRITOR` (ou `ADMIN`) |
| 🛡 | Exige perfil `ADMIN` |

Autenticação por cabeçalho: `Authorization: Bearer <token>`.

---

## Formato dos erros

Toda falha devolve a mesma forma, sem pilha de execução, SQL ou caminho de arquivo — esses detalhes ficam no log do servidor.

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Dados inválidos. Verifique os campos destacados.",
             "details": [{ "field": "synopsis", "message": "Sinopse: mínimo de 20 caracteres" }] } }
```

| Código HTTP | `code` | Quando |
| --- | --- | --- |
| 400 | `BAD_REQUEST` / `VALIDATION_ERROR` | Dados inválidos; `details` traz campo a campo |
| 401 | `UNAUTHORIZED` | Sem token, token inválido/expirado, ou conta desativada |
| 403 | `FORBIDDEN` | Autenticado, mas o perfil não permite |
| 404 | `NOT_FOUND` | Não existe — ou existe e você não pode vê-lo |
| 409 | `CONFLICT` | Conflito de estado (e-mail duplicado, transição inválida) |
| 413 | `PAYLOAD_TOO_LARGE` | Corpo ou arquivo acima do limite |
| 422 | `UNPROCESSABLE` | Requisição válida, regra de negócio impede (falta o arquivo da obra) |
| 429 | `TOO_MANY_REQUESTS` | Limite de requisições |
| 500 | `INTERNAL_ERROR` | Erro inesperado |

**404 em vez de 403, de propósito:** uma obra não aprovada responde `404` para quem não é o autor nem administrador. Responder `403` confirmaria que ela existe.

Limites: 20 tentativas por IP a cada 15 minutos em login, cadastro e abertura de apoio; 600 requisições por minuto no restante.

---

## Autenticação

### `POST /auth/register` 🌐

Cria a conta e já devolve o token.

- **Entrada:** `{ name, email, password, role?, headline? }` — `role` só aceita `LEITOR` (padrão) ou `ESCRITOR`. `ADMIN` **nunca** é aceito do cliente.
- **Senha:** mínimo de 8 caracteres, com letras e números.
- **Saída:** `201` `{ token, user }`
- **Erros:** `400` dados inválidos · `409` e-mail já cadastrado

### `POST /auth/login` 🌐

- **Entrada:** `{ email, password }`
- **Saída:** `200` `{ token, user }`
- **Erros:** `401` "E-mail ou senha incorretos." — a mesma mensagem para e-mail inexistente e senha errada, e com o mesmo tempo de resposta · `401` conta desativada

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@livrin.local","password":"<ADMIN_PASSWORD do seu .env>"}'
```

### `GET /auth/me` 🔒 — `{ user }` com os dados atuais do banco

### `PATCH /auth/me` 🔒 — `{ name?, headline? }` → `{ user }`

### `POST /auth/me/password` 🔒

- **Entrada:** `{ currentPassword, newPassword }` → `204`
- **Erros:** `400` senha atual incorreta ou nova senha fora da política

### `POST /auth/me/writer` 🔒

Leitor ativa o próprio perfil de escritor.

- **Saída:** `200` `{ user }` com `role: "ESCRITOR"`
- **Erros:** `409` a conta já podia publicar

---

## Catálogo e obras

### `GET /works` 🌐 — catálogo público

Devolve **somente obras `APROVADO`**.

- **Parâmetros:** `q` (título, subtítulo, autoria, gênero, tags) · `format` (`QUADRINHO`, `LIVRO`, `MANGA_WEBCOMIC`, `ZINE`) · `feature` (`audiodescricao`, `leitor-tela`, `texto-alt`, `libras`, `facil-leitura`, `alto-contraste`) · `genreId` · `sort` (`recent`, `title`, `rating`) · `page` · `pageSize` (máx. 100)
- **Saída:** `{ data: Work[], meta: { page, pageSize, total, totalPages }, catalogTotal }`
- **Erros:** `400` parâmetro fora dos valores aceitos

Caracteres de curinga digitados na busca (`%`, `_`) são escapados e tratados como texto literal.

### `GET /works/:id` 👁

- **Saída:** `200` a obra. Não aprovada: só o autor e a administração veem; os demais recebem `404`.

### `POST /works` 🔒 ✍️

- **Entrada** (`multipart/form-data`): `title`, `synopsis` (mín. 20), `genreId`, `format`, `pages`, `ageRating?`, `subtitle?`, `isbn?`, `editionLabel?`, `authorNotes?`, `tags?`, as flags `hasAudioDesc`…`hasAltoContraste`, créditos de audiodescrição, `action` (`draft` | `submit`, padrão `submit`), e os arquivos `file`, `cover`, `audio`.
- **Saída:** `201` a obra criada — `RASCUNHO` com `action=draft`, `EM_ANALISE` com `action=submit`
- **Erros:** `400` dados ou arquivo inválido · `403` perfil `LEITOR` · `413` arquivo grande demais · `422` `action=submit` sem arquivo

Arquivos: obra em PDF/DOCX/EPUB/CBZ/CBR até `MAX_UPLOAD_MB`; capa em JPG/PNG/WEBP até 5 MB; áudio em MP3/OGG/M4A. A **assinatura binária** é conferida — renomear um executável para `.pdf` ou para `.docx` é recusado. DOCX, EPUB e CBZ são arquivos ZIP e compartilham a mesma assinatura (`PK\x03\x04`); o que os distingue é a extensão declarada.

Para PDF há mais dois passos. O **fim do arquivo** é conferido: sem a marca `%%EOF`, o envio é recusado com `400` — a assinatura do começo continua intacta num arquivo cortado no meio do upload, e sem essa conferência o problema só apareceria no leitor, longe da causa. Depois o arquivo passa pelo **`qpdf`**, que reescreve a estrutura preservando o conteúdo (remove cifra sem senha de abertura, reconstrói o xref, desfaz object streams). É o que faz um PDF de digitalização antiga abrir no navegador. Se o `qpdf` não estiver disponível, o original é guardado como chegou.

### `PATCH /works/:id` 🔒

Mesmos campos, todos opcionais, mais `removeCover` e `removeAudio`. O que pode ser alterado depende do status — ver [business-rules.md](business-rules.md).

- **Erros:** `403` status não permite · `404` não é sua

### `DELETE /works/:id` 🔒 — `204`. Autor: só `RASCUNHO`/`REJEITADO`. Admin: qualquer.

### `POST /works/:id/submit` 🔒 — envia para análise

- **Saída:** `200` a obra em `EM_ANALISE`
- **Erros:** `409` o status atual não permite enviar · `422` sem arquivo

> `POST /works/:id/publish` **não existe mais**. Aprovar é publicar; a ação é da curadoria, em `PATCH /admin/works/:id/status`.

### `GET /works/:id/file` 👁 — arquivo da obra

`?download=1` força o download com nome amigável. Aceita `Range`. Obra não aprovada: `404` para quem não é autor nem admin.

### `GET /works/:id/audio` 👁 — faixa de audiodescrição

---

## Audiodescrição

| Método e URL | Acesso | Observação |
| --- | --- | --- |
| `GET /works/:id/audio-descriptions` | 👁 | Mesma visibilidade da obra |
| `POST /works/:id/audio-descriptions` | 🔒 | `201`; autor em `RASCUNHO`/`REJEITADO`/`EM_ANALISE`, admin sempre |
| `PUT /works/:id/audio-descriptions/:adId` | 🔒 | idem |
| `DELETE /works/:id/audio-descriptions/:adId` | 🔒 | `204` |

Corpo: `{ pageNumber, description, chapterLabel?, chapterTitle?, panelLabel?, dialogues: [{ speaker, tone?, text }] }` — até 12 falas por página. Uma audiodescrição por página e obra.

---

## Curadoria vista pelo autor

| Método e URL | Acesso | Saída |
| --- | --- | --- |
| `GET /works/:id/review` | 🔒 | Etapa atual, protocolo, progresso, checklist e notas |
| `POST /works/:id/review/notes` | 🔒 | `201` — mensagem do autor para a curadoria |

Só o autor e a administração; os demais recebem `404`.

---

## Avaliações

| Método e URL | Acesso | Observação |
| --- | --- | --- |
| `GET /works/:id/feedbacks` | 🌐 | Avaliações visíveis; obra não aprovada devolve lista vazia |
| `GET /works/:id/feedbacks/mine` | 🔒 | A sua, ou `null` |
| `POST /works/:id/feedbacks` | 🔒 | `{ rating: 1–5, content (mín. 10), aspect? }` → `201`; reenviar atualiza |

**Erros:** `404` obra não aprovada · `409` autor avaliando a própria obra

---

## Sessões de leitura

| Método e URL | Acesso | Observação |
| --- | --- | --- |
| `POST /works/:id/sessions` | 👁 | `201` `{ id, token }`. Só para obras aprovadas. Limite por IP |
| `PATCH /sessions/:sessionId` | — | Exige o cabeçalho `X-Session-Token` devolvido na criação |

Corpo do `PATCH`: `{ lastPage?, usedAudioDesc?, usedHighContrast?, usedDyslexicFont?, usedZoom? }` → `204`. As flags só ligam.

---

## Apoio

### `GET /donations/options` 🌐

- **Saída:** `{ provider, label, isReal, methods, minCents, maxCents, currency }`

`isReal: false` significa que nenhum dinheiro é movimentado — a interface é obrigada a dizer isso ao usuário.

### `POST /donations` 👁

Apoio anônimo é permitido.

- **Entrada:** `{ amountCents, method: "PIX" | "CARTAO" | "BOLETO", workId?, donorName?, message? }`
- **Saída:** `201` `{ donation, checkout: { checkoutUrl?, code?, instruction?, isReal } }`
- **Erros:** `400` valor fora da faixa (R$ 5,00 a R$ 5.000,00) ou método indisponível · `404` obra inexistente

O valor é **em centavos, inteiro**: dinheiro não trafega como número de ponto flutuante.

### `POST /donations/:id/confirm` 👁

- **Saída:** `200` a doação atualizada. Confirmar de novo é inofensivo.
- **Erros:** `404` não é sua · `409` já não está aguardando pagamento

### `GET /me/donations` 🔒 — seus apoios, mais recentes primeiro

---

## Área do autor

| Método e URL | Acesso | Saída |
| --- | --- | --- |
| `GET /me/works` | 🔒 | Suas obras com o progresso do checklist |
| `GET /me/summary` | 🔒 | Contadores por status |
| `GET /me/dashboard` | 🔒 | Métricas reais de leitura, avaliações recebidas e obras |
| `GET /genres` | 🌐 | Gêneros ativos, com a contagem de obras |

---

## Administração 🛡

Todas sob `/api/admin`. Visitante recebe `401`; conta sem perfil `ADMIN` recebe `403`.

### Visão geral

| Método e URL | Observação |
| --- | --- |
| `GET /admin/stats` | Usuários, obras por status e formato, avaliações, sessões, gêneros, fila de curadoria |

### Obras

| Método e URL | Entrada / observação |
| --- | --- |
| `GET /admin/works` | `q`, `status`, `format`, `genreId`, `authorId`, `sort`, `order`, paginação. Todos os status |
| `POST /admin/works` | Campos da obra + `authorId` + `status` inicial (`RASCUNHO`, `EM_ANALISE`, `APROVADO`…) |
| `GET /admin/works/:id` | Obra + checklist + notas + audiodescrição |
| `PATCH /admin/works/:id` | Qualquer campo, em qualquer status; aceita `authorId` |
| `PATCH /admin/works/:id/status` | `{ status, reason? }`. **`reason` é obrigatório ao rejeitar.** `409` se a transição não for permitida, com a lista do que é |
| `DELETE /admin/works/:id` | `204`; remove também os arquivos do volume |

Aprovar aqui é o que coloca a obra no catálogo.

### Checklist e notas da curadoria

`POST /admin/works/:id/checks` · `PATCH /admin/works/:id/checks/:checkId` · `DELETE /admin/works/:id/checks/:checkId` · `POST /admin/works/:id/notes` · `DELETE /admin/notes/:id`

### Usuários

| Método e URL | Entrada / observação |
| --- | --- |
| `GET /admin/users` | `q`, `role`, `active`, `sort`, `order`, paginação |
| `POST /admin/users` | `{ name, email, password, role?, headline?, isActive? }` → `201` |
| `GET /admin/users/:id` | Detalhe + atividade + obras |
| `PATCH /admin/users/:id` | `{ name?, email?, role?, headline?, isActive? }` |
| `POST /admin/users/:id/reset-password` | `{ password }` → `204` |
| `DELETE /admin/users/:id` | `204`; `409` se a conta tiver obras |

Proteções: não dá para remover o próprio acesso administrativo, desativar a própria conta, nem deixar o sistema sem administrador ativo.

### Gêneros

`GET /admin/genres` (inclui os desativados) · `POST` · `PATCH /:id` · `DELETE /:id` — `409` se o gênero estiver em uso.

### Avaliações

`GET /admin/feedbacks` · `PATCH /admin/feedbacks/:id` (`{ isVisible }`) · `DELETE /admin/feedbacks/:id`

### Apoios

| Método e URL | Observação |
| --- | --- |
| `GET /admin/donations` | `status`, `method`, paginação; traz quem apoiou e a obra |
| `GET /admin/donations/stats` | Total, confirmados, centavos confirmados, apoiadores, provedor |

---

## Saúde

`GET /health` e `GET /api/health` 🌐 — `{ status: "ok", database: "ok" }`, ou `503` com `database: "unavailable"`. É o que o Docker usa no `healthcheck`.
