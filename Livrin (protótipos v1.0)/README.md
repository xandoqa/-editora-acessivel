# Livrin — protótipo (TypeScript + PostgreSQL)

Plataforma de publicação acessível. **API** Express + Drizzle ORM + PostgreSQL; **Front** React + Vite consumindo a API.

## Requisitos
- Node.js 18+ (nodejs.org, versão LTS) — confira com `node -v`
- Docker Desktop (aberto e com "Engine running") — fornece o PostgreSQL

## Passo a passo
1. Descompacte o zip e abra um terminal na pasta `livrin`.
2. Suba o banco:
   ```
   docker compose up -d
   ```
3. **Terminal 1 — API:**
   ```
   cd api
   npm i
   npm run db:push
   npm run seed
   npm run dev
   ```
   Deve aparecer `API :3000`. Deixe aberto.
4. **Terminal 2 — Front** (novo terminal, na pasta `livrin`):
   ```
   cd web
   npm i
   npm run dev
   ```
5. Abra http://localhost:5173 e entre com `autor@email.com` / `123456` (ou cadastre-se).

## Sem Docker?
Crie um banco gratuito (ex.: neon.tech), copie a string de conexão e, na pasta `api`, antes dos comandos do passo 3:
- Windows: `set DATABASE_URL=sua-string`
- Linux/Mac: `export DATABASE_URL="sua-string"`

## Atualizando o projeto
Se mudar o schema (`api/src/schema.ts`), rode `npm run db:push` na pasta `api` e reinicie a API.
Rode o `seed` só uma vez.

## Uso
- **Catálogo:** busca, filtro por gênero, "Ler agora" (conta leitura, A-/A+, 🔊 Ouvir).
- **Publicar Obra:** envia para **Em Análise**; "Simular aprovação" publica no catálogo.
- **Meu Painel:** métricas e gerenciamento das suas obras.
- **Alto Contraste:** botão no menu lateral e no login.

## API
| Método | Rota | Descrição |
|---|---|---|
| POST | /api/login | autentica |
| POST | /api/register | cadastra |
| GET | /api/books?status= | lista (`analise`/`publicado`) |
| POST | /api/books | cria (entra em análise) |
| POST | /api/books/:id/read | soma leitura |
| POST | /api/books/:id/approve | publica |
| DELETE | /api/books/:id | exclui |

## Problemas comuns
- `failed to connect to the docker API`: abra o Docker Desktop e aguarde iniciar.
- `ECONNREFUSED 5432`: o banco não subiu; rode `docker compose up -d`.
- Porta ocupada (3000/5173/5432): feche o programa que a usa.
- Tela sem dados: confirme que a API está rodando e que o `seed` foi executado.
