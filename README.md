# Editora Livrin — Quadrinhos Acessíveis

Plataforma web de **publicação e leitura acessível** de quadrinhos, livros, mangás e zines independentes. Autores enviam suas obras, a curadoria de acessibilidade da Livrin avalia cada uma (contraste, audiodescrição, ordem de leitura, classificação etária) e as obras aprovadas são publicadas em um catálogo aberto, lido em um **Leitor Acessível** com audiodescrição narrada, fonte para dislexia, escala de texto, espaçamento e paletas de alto contraste.

> Stack: **React + Vite + TypeScript + Tailwind CSS** no front-end · **Node.js + Express 5 + TypeScript + Drizzle ORM** no back-end · **PostgreSQL 16** · **Docker Compose**.

---

## Sumário

1. [Sobre o projeto](#sobre-o-projeto)
2. [Requisitos](#requisitos)
3. [Instalação e execução (Docker — recomendado)](#instalação-e-execução-docker--recomendado)
4. [Configuração (variáveis de ambiente)](#configuração-variáveis-de-ambiente)
5. [Contas de acesso](#contas-de-acesso)
6. [Banco de dados](#banco-de-dados)
7. [Estrutura do projeto](#estrutura-do-projeto)
8. [Arquitetura](#arquitetura)
9. [API (resumo)](#api-resumo)
10. [Desenvolvimento sem Docker](#desenvolvimento-sem-docker)
11. [Testes](#testes)
12. [Build e produção](#build-e-produção)
13. [Problemas comuns](#problemas-comuns)
14. [Documentação completa](#documentação-completa)

---

## Sobre o projeto

**Problema que resolve.** Quadrinhos e narrativas visuais quase nunca são acessíveis a pessoas cegas, com baixa visão, dislexia ou deficiência motora. Autores independentes não têm um caminho simples para adaptar e distribuir suas obras com recursos de acessibilidade.

**Público-alvo.** Autores/quadrinistas independentes (publicam), leitores — com ou sem deficiência (leem e avaliam) — e a equipe de curadoria da Livrin (administra).

**Principais funcionalidades**

| Área | O que faz |
| --- | --- |
| Catálogo público | Lista obras publicadas com busca (título, autor, gênero, tags), filtros por formato e recurso assistivo, ordenação e paginação. Leitura da sinopse em voz alta. |
| Leitor Acessível | Renderiza **PDF** (pdf.js), **EPUB** (epub.js) e **CBZ** (JSZip). Audiodescrição por página com falas dos personagens, **player** (faixa MP3/OGG/M4A enviada pelo autor ou **voz sintetizada** do navegador), escala do texto, espaçamento, tipografia **Inter / Lexend / OpenDyslexic**, paletas Escuro/Claro/Sépia/Amarelo-Preto, atalhos de teclado (← → e Espaço), download da obra, ficha técnica e avaliações. |
| Acessibilidade global | Alto contraste amarelo/preto, A-/A+ (escala de toda a interface), leitura da página em voz alta, modo "Leitor Otimizado", link "pular para o conteúdo", foco sempre visível, navegação completa por teclado. |
| Autor | Cadastro/login, submissão com upload (arrastar e soltar, barra de progresso), rascunhos, edição de metadados, audiodescrição página a página, acompanhamento da análise (etapas, checklist, notas dos pareceristas, chat com a curadoria), publicação após aprovação, painel com métricas reais (leituras, índice de acessibilidade, engajamento por recurso, voz dos leitores). |
| Leitor | Avaliação das obras (nota + comentário + recurso avaliado), perfil e troca de senha. |
| Administração (`/admin`) | Dashboard com dados reais, **CRUD** de obras (inclusive criação em nome de autor), decisão editorial (aprovar, solicitar ajustes, publicar, arquivar, reabrir), checklist e notas da curadoria, audiodescrição, **CRUD** de usuários (papéis, ativar/desativar, redefinir senha), gêneros e moderação de avaliações. |

---

## Requisitos

| Ferramenta | Versão | Observação |
| --- | --- | --- |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) ou Docker Engine | 24+ | Inclui o Docker Compose v2 (`docker compose`). |
| Git | qualquer recente | Para clonar o repositório. |
| Node.js | 20 ou 22 (LTS) | **Somente** para rodar sem Docker ou executar testes localmente. |
| PostgreSQL | 16 | **Somente** para rodar sem Docker. |

Funciona em Windows (WSL2/Docker Desktop), macOS (Intel e Apple Silicon) e Linux.

---

## Instalação e execução (Docker — recomendado)

```bash
# 1. Clonar
git clone <url-do-repositorio> livrin
cd livrin

# 2. Configurar variáveis (uma única vez) — depois edite as senhas no .env
cp .env.example .env            # Windows PowerShell: Copy-Item .env.example .env

# 3. Subir tudo (banco, API e front-end)
docker compose up --build
```

Pronto: abra **http://localhost:5173**.

Na primeira inicialização a API, automaticamente:
1. espera o PostgreSQL ficar disponível;
2. aplica as **migrations** (`api/drizzle/*.sql`);
3. executa o **seed** idempotente: gêneros literários, administrador inicial (de `ADMIN_EMAIL`/`ADMIN_PASSWORD`) e, se `SEED_DEMO_DATA=true`, obras/usuários de demonstração iguais ao protótipo.

Comandos úteis:

```bash
docker compose up -d --build     # sobe em segundo plano
docker compose logs -f api       # acompanha os logs da API
docker compose down              # para os containers (dados são mantidos)
docker compose down -v           # para e APAGA banco e uploads (recomeça do zero)
```

Desenvolvimento com hot reload em containers: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build` (detalhes em [docs/docker.md](docs/docker.md)).

---

## Configuração (variáveis de ambiente)

Todas as variáveis ficam no arquivo `.env` da raiz (modelo em [`.env.example`](.env.example)). As principais:

| Variável | Obrigatória | Para que serve |
| --- | --- | --- |
| `POSTGRES_PASSWORD` | sim | Senha do banco criado pelo container `db`. |
| `JWT_SECRET` | sim | Segredo (≥ 32 caracteres) para assinar os tokens de login. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | recomendadas | Administrador criado no primeiro start. |
| `SEED_DEMO_DATA` / `DEMO_USER_PASSWORD` | não | Popula o sistema com o conteúdo do protótipo. |
| `WEB_PORT` / `API_PORT` | não | Portas no seu computador (padrão 5173 e 3000). |
| `MAX_UPLOAD_MB` | não | Limite de upload das obras (padrão 180). |

Lista completa, formatos e onde cada variável é usada: [docs/environment.md](docs/environment.md).

---

## Contas de acesso

- **Administrador inicial:** o e-mail e a senha que você definiu em `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env` (no `.env.example`: `admin@livrin.local` / `TroqueEstaSenha123` — **troque**). Também é possível criar/promover administradores pela linha de comando: `docker compose exec api node dist/scripts/create-admin.js --email voce@exemplo.com --password "SenhaForte123"`.
- **Contas de demonstração** (somente com `SEED_DEMO_DATA=true`), todas com a senha de `DEMO_USER_PASSWORD`:
  - `marina@livrin.com` — autora com obras em todos os estados (publicada, aprovada, em análise, rascunho);
  - `lucas@livrin.com`, `tatiane@livrin.com`, `gabriel@livrin.com` — leitores que avaliaram obras;
  - `camila@livrin.com`, `rodrigo@livrin.com` — pareceristas (ADMIN).

> Em produção use `SEED_DEMO_DATA=false` e senhas fortes. Veja [docs/deployment.md](docs/deployment.md).

---

## Banco de dados

PostgreSQL 16 acessado pelo **Drizzle ORM**. Tabelas: `users`, `genres`, `works`, `audio_descriptions`, `review_checks`, `review_notes`, `feedbacks`, `reading_sessions` (diagrama ER e colunas em [docs/database.md](docs/database.md)).

| Tarefa | Comando (Docker) |
| --- | --- |
| Aplicar migrations | automático no start (ou `docker compose exec api node dist/db/migrate.js`) |
| Executar seed | automático no start (ou `docker compose exec api node dist/db/seed.js`) |
| Abrir o `psql` | `docker compose exec db psql -U livrin_user -d livrin_db` |
| Resetar tudo | `docker compose down -v && docker compose up --build` |
| Nova migration após alterar `api/src/db/schema.ts` | `cd api && npm run db:generate` (gera SQL versionado em `api/drizzle/`) |

---

## Estrutura do projeto

```
livrin/
├── api/                        # Back-end (Node.js + Express 5 + TypeScript)
│   ├── src/
│   │   ├── config/env.ts       # Leitura e validação (zod) das variáveis de ambiente
│   │   ├── db/                 # schema Drizzle, conexão, migrate, seed, reset
│   │   ├── routes/             # Mapa de rotas públicas/autenticadas e /admin
│   │   ├── controllers/        # Recebem a requisição, validam entrada e chamam serviços
│   │   ├── services/           # Regras de negócio e acesso ao banco (inclui admin/)
│   │   ├── validators/         # Schemas zod de entrada (body, query, params)
│   │   ├── middlewares/        # auth (JWT/RBAC), upload (multer), erros, rate limit
│   │   ├── utils/              # erros HTTP, logger, senha (bcrypt), texto
│   │   ├── scripts/            # create-admin (CLI)
│   │   ├── app.ts / server.ts  # Montagem do Express / inicialização
│   ├── drizzle/                # Migrations SQL versionadas
│   ├── seed-assets/            # Capas e arquivos de amostra (PDF/EPUB/CBZ) da demonstração
│   ├── tests/                  # Testes de integração (vitest + supertest + PostgreSQL)
│   └── Dockerfile
├── web/                        # Front-end (React + Vite + TypeScript + Tailwind)
│   ├── src/
│   │   ├── pages/              # Telas (catálogo, leitor, painel, submissão, análise, admin/)
│   │   ├── components/         # layout/, ui/, works/, reader/, admin/
│   │   ├── hooks/              # Consultas React Query (públicas e admin)
│   │   ├── auth/ preferences/  # Contextos de sessão e de acessibilidade
│   │   ├── lib/                # cliente HTTP, formatação, rótulos, síntese de voz
│   │   └── types/api.ts        # Tipos das respostas da API
│   ├── nginx.conf              # Servidor estático + proxy /api (produção)
│   └── Dockerfile
├── e2e/                        # Testes ponta a ponta no navegador (Playwright)
├── docs/                       # Documentação técnica completa
├── docker-compose.yml          # Ambiente completo (produção local)
├── docker-compose.dev.yml      # Sobrescrita com hot reload
├── .env.example                # Modelo das variáveis
├── CHANGELOG.md
└── README.md
```

Por que assim: front e back são projetos independentes (cada um com seu `package.json` e `Dockerfile`), o que permite publicá-los separadamente; dentro da API, a divisão rotas → controllers → services → banco mantém regras de negócio fora das rotas e facilita testes. Detalhes em [docs/architecture.md](docs/architecture.md).

---

## Arquitetura

```
Usuário ──► Navegador (React SPA) ──► Nginx (:5173) ──/api──► API Express (:3000) ──► PostgreSQL (:5432)
                                         │                        │
                                         └── arquivos estáticos   └── volume "uploads" (capas, obras, áudios)
```

- O front-end chama sempre caminhos relativos (`/api/...`); o **Nginx** (produção) ou o **Vite** (desenvolvimento) encaminha para a API — mesma origem, sem problemas de CORS.
- A API valida tudo com **zod**, aplica as regras de negócio nos **services** e persiste com **Drizzle** (SQL parametrizado).
- **Autenticação** por JWT (header `Authorization: Bearer`), senhas com **bcrypt**. A cada requisição o usuário é recarregado do banco, então desativações e mudanças de papel valem imediatamente. Rotas `/api/admin/*` exigem papel `ADMIN` **no servidor**.
- **Arquivos** ficam em um volume Docker; capas são públicas, arquivos das obras e áudios passam por rotas com checagem de permissão.

Mais em [docs/architecture.md](docs/architecture.md) e [docs/authentication.md](docs/authentication.md).

---

## API (resumo)

Base: `/api`. Documentação completa com exemplos em [docs/api.md](docs/api.md).

| Recurso | Endpoints |
| --- | --- |
| Autenticação | `POST /auth/register`, `POST /auth/login`, `GET/PATCH /auth/me`, `POST /auth/me/password` |
| Catálogo e obras | `GET /works`, `GET /works/:id`, `POST /works`, `PATCH /works/:id`, `DELETE /works/:id`, `POST /works/:id/submit`, `POST /works/:id/publish`, `GET /works/:id/file`, `GET /works/:id/audio` |
| Audiodescrição | `GET/POST /works/:id/audio-descriptions`, `PUT/DELETE /works/:id/audio-descriptions/:adId` |
| Curadoria (autor) | `GET /works/:id/review`, `POST /works/:id/review/notes` |
| Avaliações | `GET/POST /works/:id/feedbacks`, `GET /works/:id/feedbacks/mine` |
| Sessões de leitura | `POST /works/:id/sessions`, `PATCH /sessions/:sessionId` |
| Área do autor | `GET /me/summary`, `GET /me/works`, `GET /me/dashboard`, `GET /genres` |
| Administração | `GET /admin/stats`, CRUD `/admin/users`, `/admin/works` (+ `/status`, `/checks`, `/notes`), `/admin/genres`, `/admin/feedbacks` |
| Saúde | `GET /health` |

---

## Desenvolvimento sem Docker

Pré-requisitos: Node 20+/22 e um PostgreSQL 16 acessível.

```bash
# API
cd api
cp .env.example .env          # ajuste DATABASE_URL, JWT_SECRET, ADMIN_*
npm install
npm run db:migrate && npm run db:seed
npm run dev                   # http://localhost:3000

# Front-end (outro terminal)
cd web
npm install
npm run dev                   # http://localhost:5173 (proxy /api → localhost:3000)
```

Como criar páginas, endpoints, entidades e migrations: [docs/development.md](docs/development.md).

---

## Testes

```bash
# API — integração com PostgreSQL real (o banco TEST_DATABASE_URL é apagado e recriado)
cd api && npm test

# Verificação de tipos e build
cd api && npm run typecheck && npm run build
cd web && npm run build

# Ponta a ponta no navegador (com o sistema rodando e dados de demonstração)
cd e2e && npm install && npx playwright install chromium
ADMIN_PASSWORD=<sua senha de admin> npm test
```

Detalhes em [docs/testing.md](docs/testing.md).

---

## Build e produção

`docker compose up --build` já gera imagens de produção (API compilada para JavaScript rodando como usuário sem privilégios; front-end estático servido pelo Nginx). Checklist de segurança, HTTPS, backup e variáveis de produção em [docs/deployment.md](docs/deployment.md).

---

## Problemas comuns

| Sintoma | Solução rápida |
| --- | --- |
| `required variable POSTGRES_PASSWORD is missing` | Faltou `cp .env.example .env`. |
| `port is already allocated` | Mude `WEB_PORT`/`API_PORT` no `.env`. |
| Não consigo entrar como admin | Confira `ADMIN_EMAIL`/`ADMIN_PASSWORD` **antes** do primeiro start; depois use o script `create-admin` (ver [docs/authentication.md](docs/authentication.md)); o seed não altera admins existentes. |
| Upload falha com arquivo grande | Limite padrão 180 MB (`MAX_UPLOAD_MB`). |

Guia completo: [docs/troubleshooting.md](docs/troubleshooting.md).

---

## Documentação completa

| Documento | Conteúdo |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | Visão geral, fluxos, camadas, front-end |
| [docs/database.md](docs/database.md) | Tabelas, colunas, relacionamentos, ERD, migrations, seed |
| [docs/api.md](docs/api.md) | Todos os endpoints com exemplos e erros |
| [docs/authentication.md](docs/authentication.md) | Login, JWT, papéis, rotas protegidas, novo admin |
| [docs/admin.md](docs/admin.md) | Uso e funcionamento da área administrativa |
| [docs/business-rules.md](docs/business-rules.md) | Estados, permissões e validações |
| [docs/accessibility.md](docs/accessibility.md) | Recursos de acessibilidade e como funcionam |
| [docs/docker.md](docs/docker.md) | Containers, volumes, comandos |
| [docs/environment.md](docs/environment.md) | Todas as variáveis de ambiente |
| [docs/development.md](docs/development.md) | Guia de desenvolvimento e extensão |
| [docs/testing.md](docs/testing.md) | Estratégia e execução dos testes |
| [docs/deployment.md](docs/deployment.md) | Produção, segurança, backup |
| [docs/troubleshooting.md](docs/troubleshooting.md) | Problemas comuns e soluções |
| [docs/decisions/](docs/decisions/) | Registros de decisões técnicas (ADRs) |
| [CHANGELOG.md](CHANGELOG.md) | Histórico de mudanças |
