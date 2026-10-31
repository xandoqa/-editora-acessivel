# Variáveis de ambiente

Há três arquivos de exemplo:

| Arquivo | Quando usar |
| --- | --- |
| `.env.example` (raiz) → copie para `.env` | **Docker Compose** (lido automaticamente pelo `docker compose`). |
| `api/.env.example` → `api/.env` | API rodando **sem Docker** (`npm run dev`, testes). |
| `web/.env.example` → `web/.env` | Opcional, front-end sem Docker. |

Nunca versione arquivos `.env` (já estão no `.gitignore`). Os valores dos exemplos são **marcadores**: troque senhas e segredos.

## Raiz (`.env`, Docker Compose)

| Variável | Obrigatória | Padrão | Formato / exemplo | Onde é usada |
| --- | --- | --- | --- | --- |
| `POSTGRES_DB` | não | `livrin_db` | nome do banco | container `db` e `DATABASE_URL` da API |
| `POSTGRES_USER` | não | `livrin_user` | usuário do banco | idem |
| `POSTGRES_PASSWORD` | **sim** | — | senha forte | idem (o compose falha com mensagem clara se faltar) |
| `JWT_SECRET` | **sim** | — | ≥ 32 caracteres aleatórios | API — assinatura dos tokens. Gerado pelos scripts de inicialização; valores de exemplo, marcadores (`troque-por…`) e segredos de baixa entropia são **recusados** |
| `JWT_EXPIRES_IN` | não | `1d` | `15m`, `12h`, `7d` | API — validade do login |
| `CORS_ORIGINS` | não | `http://localhost:5173` | lista separada por vírgula | API — origens aceitas (com o proxy, é a URL do site) |
| `MAX_UPLOAD_MB` | não | `180` | inteiro | API (limite de upload) e build do front (validação no formulário) |
| `ADMIN_NAME` | não | `Administrador Livrin` | texto | seed |
| `ADMIN_EMAIL` | recomendada | vazio | e-mail | seed — cria o admin inicial se não existir |
| `ADMIN_PASSWORD` | recomendada | vazio | ≥ 8 caracteres, com letras e números | seed — mesma política de senha do resto do sistema |
| `SEED_DEMO_DATA` | não | `false` (`.env.example`: `true`) | `true`/`false` | seed — dados do protótipo |
| `DEMO_USER_PASSWORD` | se `SEED_DEMO_DATA=true` | vazio | ≥ 8 caracteres, com letras e números | senha das contas de demonstração |
| `PAYMENT_PROVIDER` | não | `simulado` | nome do provedor registrado | apoio, compra de obra e assinatura do plano — `simulado` não movimenta dinheiro e avisa isso na interface |
| `WEB_PORT` | não | `5173` | porta | porta do site no host |
| `API_PORT` | não | `3000` | porta | porta da API no host (depuração) |
| `DB_PORT` | não | `5432` | porta | só no `docker-compose.dev.yml` |
| `TEST_DB_PORT` | não | `5433` | porta | só no `docker-compose.test.yml` |

## API (`api/.env`, sem Docker)

Validadas por `api/src/config/env.ts` (a API não inicia se algo obrigatório estiver inválido, e lista os problemas).

| Variável | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `NODE_ENV` | não | `development` | `development`, `test` ou `production` |
| `PORT` | não | `3000` | porta HTTP |
| `DATABASE_URL` | **sim** | — | `postgres://usuario:senha@host:5432/banco` |
| `JWT_SECRET` | **sim** | — | ≥ 32 caracteres; valores de exemplo são recusados |
| `JWT_EXPIRES_IN` | não | `1d` | validade do token |
| `CORS_ORIGINS` | não | `http://localhost:5173` | origens permitidas |
| `UPLOAD_DIR` | não | `./uploads` | pasta dos arquivos enviados |
| `MAX_UPLOAD_MB` | não | `180` | limite de upload |
| `TRUST_PROXY` | não | `false` | `true` atrás de Nginx/proxy (IP real no rate limit) |
| `BCRYPT_ROUNDS` | não | `10` | custo do hash (4–15) |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | não | — | administrador inicial (seed) |
| `SEED_DEMO_DATA`, `DEMO_USER_PASSWORD` | não | `false` | dados de demonstração |
| `LOG_REQUESTS` | não | `true` | loga cada requisição (método, rota, status, tempo) |
| `TEST_DATABASE_URL` | para testes | `postgres://livrin_user:livrin_dev_password@localhost:5432/livrin_test` | banco **apagado** a cada execução de `npm test` (precisa conter "test" no nome) |

## Front-end (`web/.env`, opcional)

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `API_PROXY_TARGET` | `http://localhost:3000` | destino do proxy do Vite para `/api` e `/uploads` (no Docker dev: `http://api:3000`) |
| `VITE_MAX_UPLOAD_MB` | `180` | limite exibido e validado no formulário |
| `VITE_API_URL` | `/api` | URL absoluta da API, se ela estiver em outra origem (exige `CORS_ORIGINS` correspondente) |
| `CHOKIDAR_USEPOLLING` | — | `true` para detectar mudanças em volumes Docker (Windows/macOS) |

Variáveis `VITE_*` são embutidas no JavaScript no momento do build: **nunca** coloque segredos nelas.
