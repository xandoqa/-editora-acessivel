# Docker

## Requisitos

> Para rodar no Linux pela primeira vez, o caminho seguido está em [rodar-no-linux.md](rodar-no-linux.md). Esta página descreve como o Docker está montado.

**Docker Engine + plugin Compose v2.** `docker compose version` (com espaço) precisa responder `v2.x` ou maior; o `docker-compose` v1, com hífen, **não** serve: este `docker-compose.yml` segue a Compose Spec (`name:` no topo, `depends_on` com `condition: service_healthy`), que a v1 não interpreta.

| Sistema | Instalação | Observação |
| --- | --- | --- |
| Linux | `docker-ce` + `docker-compose-plugin` dos repositórios oficiais da Docker | para usar sem `sudo`: `sudo usermod -aG docker $USER` e reabrir a sessão |
| Windows | Docker Desktop com backend WSL2 | o plugin Compose já vem junto |
| macOS | Docker Desktop | idem |

Nada mais precisa estar instalado: Node 22, PostgreSQL 16 e todas as dependências vivem dentro das imagens. A primeira subida baixa e compila cerca de 1,5 GB.

O `iniciar.sh` confere as três coisas (binário, plugin v2, daemon acessível) antes de tentar subir, e diz o que fazer em cada caso em vez de deixar o Docker devolver o erro cru.

## Containers

| Serviço | Imagem | Função | Porta no host | Volume |
| --- | --- | --- | --- | --- |
| `db` | `postgres:16-alpine` | Banco PostgreSQL | — (não exposto; no modo dev: `DB_PORT`, padrão 5432) | `pgdata` → `/var/lib/postgresql/data` |
| `api` | build `api/Dockerfile` (alvo `runtime`) | API Node/Express compilada; aplica migrations e seed ao iniciar | `API_PORT` (3000) | `uploads` → `/app/uploads` |
| `web` | build `web/Dockerfile` (alvo `runtime`) | Nginx servindo o React compilado e fazendo proxy de `/api` e `/uploads` para `api:3000` | `WEB_PORT` (5173) | — |

Comunicação: os containers ficam na rede padrão do Compose e se encontram pelo nome do serviço (`db`, `api`). O navegador fala apenas com o `web`; a porta da API fica exposta só para depuração (pode ser removida em produção).

Ordem de inicialização (healthchecks):
`db` saudável (`pg_isready`) → `api` inicia, espera o banco, roda migrations + seed, sobe e fica saudável (`GET /health`) → `web` inicia.

## Persistência

- **`pgdata`**: todos os dados do PostgreSQL. Sobrevive a `docker compose down`, `restart` e rebuilds.
- **`uploads`**: capas, arquivos das obras e áudios.
- Ambos só são apagados com `docker compose down -v` (ou `docker volume rm`).

## Imagens

`api/Dockerfile` (multi-stage):
- `deps` — `npm ci` com dependências de desenvolvimento;
- `dev` — hot reload (`tsx watch`), usado pelo `docker-compose.dev.yml`;
- `build` — `tsc` gera `dist/`;
- `runtime` — Node 22 Alpine apenas com dependências de produção, `dist/`, migrations (`drizzle/`) e `seed-assets/`, rodando como usuário **`node`** (sem root), com `HEALTHCHECK`. Comando: `npm run start:prod` = migrate → seed → servidor.

`web/Dockerfile` (multi-stage): `deps` → `dev` (Vite) → `build` (`vite build`) → `runtime` (`nginx:1.27-alpine` + `web/nginx.conf`).

A imagem da API instala o **`qpdf`** (~3 MB) no estágio de runtime: é ele que normaliza os PDFs enviados. Sem ele a API funciona igual, só deixa de consertar arquivos fora do padrão.

No `web/nginx.conf`, o `index.html` vai com `no-store, must-revalidate` e os arquivos de `/assets/` com `immutable`. Os cabeçalhos de segurança são **repetidos em cada bloco `location`**, porque no nginx um `add_header` no filho anula os herdados do servidor em vez de somar.

Nenhum script `.sh` é usado (os comandos estão em `package.json`), evitando problemas de fim de linha (CRLF) e permissão de execução no Windows. O `.gitattributes` força `LF` nos arquivos de texto.

## Comandos

```bash
docker compose up --build            # constrói e inicia tudo (primeiro plano)
docker compose up -d                 # inicia em segundo plano
docker compose ps                    # estado e saúde dos containers
docker compose logs -f               # logs de todos   (ou: logs -f api)
docker compose stop                  # para sem remover
docker compose restart api           # reinicia só a API
docker compose up -d --build api     # reconstrói só a API após mudanças
docker compose down                  # remove containers (mantém volumes)
docker compose down -v               # remove containers E volumes (apaga banco e uploads)
docker compose exec api sh           # terminal dentro do container da API
docker compose exec db psql -U livrin_user -d livrin_db   # console SQL
docker compose build --no-cache      # reconstrói do zero
```

Tarefas dentro do container de produção da API:

```bash
docker compose exec api node dist/db/migrate.js
docker compose exec api node dist/db/seed.js
docker compose exec api node dist/scripts/create-admin.js --email ana@exemplo.com --password "SenhaForte123"
```

## Modo desenvolvimento (hot reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

- `api` usa o alvo `dev`, monta `./api` em `/app` e roda `tsx watch` (reinicia a cada alteração).
- `web` usa o alvo `dev` (Vite em `:5173`, proxy para `http://api:3000`), com `CHOKIDAR_USEPOLLING=true` para detectar mudanças em volumes no Windows/macOS.
- O banco fica exposto em `DB_PORT` (5432) para ferramentas como DBeaver/pgAdmin.
- `node_modules` fica dentro do container (volume anônimo), então não depende do seu sistema operacional.

Comandos de desenvolvimento dentro do container: `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec api npm run db:generate` (etc.).

## Recriar o ambiente do zero

```bash
docker compose down -v
docker compose up --build
```
