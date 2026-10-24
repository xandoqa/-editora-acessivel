# Editora Livrin

Plataforma editorial aberta para quadrinhos e livros independentes, com acessibilidade no centro: audiodescrição página a página, tipografia inclusiva, alto contraste e leitor compatível com leitores de tela.

O Livrin existe para que quem não tem como bancar um lançamento tradicional consiga publicar e ser lido. Ler é de graça; o apoio financeiro é voluntário e nunca condiciona o acesso a uma obra.

**Versão 3.0.0** — veja o [CHANGELOG](CHANGELOG.md) para o que mudou em relação à 2.0.0.

---

## Sumário

- [Começar em um comando](#começar-em-um-comando)
- [Credenciais de desenvolvimento](#credenciais-de-desenvolvimento)
- [O que o sistema faz](#o-que-o-sistema-faz)
- [Tecnologias e requisitos](#tecnologias-e-requisitos)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Banco de dados e migrations](#banco-de-dados-e-migrations)
- [Principais endpoints](#principais-endpoints)
- [Testes](#testes)
- [Desenvolvimento](#desenvolvimento)
- [Solução de problemas](#solução-de-problemas)
- [Documentação completa](#documentação-completa)

---

## Começar em um comando

**Requisito único: Docker com o plugin Compose v2.** Nada mais precisa estar instalado na sua máquina — Node, PostgreSQL e todas as dependências ficam dentro dos contêineres.

| Sistema | O que instalar | Como conferir |
| --- | --- | --- |
| Windows / macOS | Docker Desktop (espere o status "running") | `docker compose version` |
| Linux | Docker Engine + `docker-compose-plugin` (pacote oficial da Docker) | `docker compose version` |

`docker compose version` (com **espaço**) precisa responder `v2.x` ou maior. Se só existir `docker-compose` com hífen, é a v1, que foi descontinuada e **não** entende este `docker-compose.yml` — ele usa `name:` no topo e `depends_on: condition: service_healthy`, recursos da Compose Spec. Instale o plugin: `sudo apt install docker-compose-plugin` (Debian/Ubuntu) ou equivalente da sua distribuição.

As imagens são `node:22-alpine` e `postgres:16-alpine`, ambas Linux nativas: o projeto roda igual em Linux, Windows (WSL2) e macOS.

| Sistema | Comando |
| --- | --- |
| Windows | dê dois cliques em `iniciar.bat` |
| Linux / macOS | `./iniciar.sh` |

Na primeira execução o script cria o arquivo `.env` a partir de `.env.example` e **gera um `JWT_SECRET` aleatório só para a sua instalação** — nenhum segredo vem pronto dentro do repositório. Depois disso ele sobe os três containers.

A primeira subida demora alguns minutos (baixa imagens e compila). Quando terminar, abra:

**<http://localhost:5173>**

Para parar: `parar.bat` (Windows) ou `./parar.sh` (Linux/macOS).

<details>
<summary><strong>Linux: quatro coisas que costumam travar a primeira execução</strong></summary>

**1. `./iniciar.sh: Permission denied`** — o extrator perdeu a permissão de execução (acontece com vários descompactadores gráficos). Resolva com `chmod +x iniciar.sh parar.sh`, ou rode `sh iniciar.sh`, que funciona sem a permissão.

**2. `permission denied while trying to connect to the Docker daemon socket`** — seu usuário não está no grupo `docker`. O caminho recomendado:

```bash
sudo usermod -aG docker $USER
# saia e entre na sessão de novo (ou: newgrp docker)
docker compose version       # deve responder sem sudo
```

Dá para usar `sudo ./iniciar.sh`, mas aí o `.env` criado pelo script fica pertencendo ao `root` e você precisa de `sudo` para editá-lo depois. Se isso já aconteceu: `sudo chown $USER:$USER .env`.

**3. `port is already allocated`** — outra coisa já usa a 5173 ou a 3000. Descubra com `ss -ltnp | grep -E ':(5173|3000)'` e, se preferir não encerrar o processo, mude no `.env`:

```bash
WEB_PORT=8080
API_PORT=3001
CORS_ORIGINS=http://localhost:8080   # precisa acompanhar o WEB_PORT
```

O PostgreSQL **não** é exposto no `docker-compose.yml` padrão, então a porta 5432 nunca entra em conflito (só no modo de desenvolvimento, onde vale `DB_PORT`).

**4. Espaço em disco.** A primeira subida baixa e compila cerca de 1,5 GB entre imagens e camadas. `docker system df` mostra o que já está ocupado e `docker system prune` libera o que não é mais usado.

Outros tropeços estão em [docs/troubleshooting.md](docs/troubleshooting.md).

</details>

<details>
<summary>Prefere rodar os comandos na mão?</summary>

```bash
cp .env.example .env                 # Windows: Copy-Item .env.example .env
# gere o segredo e cole na linha JWT_SECRET= do .env:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
docker compose up --build
```

A API recusa subir com um `JWT_SECRET` vazio, curto, de exemplo ou com pouca variedade de caracteres — e diz exatamente isso na mensagem de erro.

</details>

O que acontece ao subir, nesta ordem:

1. O PostgreSQL inicia e fica saudável.
2. A API aplica as **migrations**.
3. A API roda o **seed idempotente**: gêneros literários, administrador inicial e, se `SEED_DEMO_DATA=true`, as obras e contas de demonstração.
4. A API roda a **verificação de integridade**: confere se todo arquivo referenciado no banco existe no volume de uploads e recopia o que faltar (veja [Por que isso existe](#por-que-a-verificação-de-integridade-existe)).
5. A API sobe; o Nginx serve o front-end e encaminha `/api` e `/uploads`.

---

## Credenciais de desenvolvimento

Todas vêm do `.env`, que é gerado a partir de `.env.example`. **São credenciais de desenvolvimento**, existem para o projeto poder ser avaliado logo após a instalação e estão marcadas como tal no próprio arquivo. Em produção, troque as três (veja [docs/deployment.md](docs/deployment.md)).

| Perfil | E-mail | Senha | O que pode fazer |
| --- | --- | --- | --- |
| **Administrador** | `admin@livrin.local` | `Livrin.Dev2026` | Tudo: curadoria, usuários, gêneros, avaliações, apoios |
| **Escritor** | `marina@livrin.com` | `Demo.Livrin2026` | Ler + cadastrar, enviar e acompanhar as próprias obras |
| **Leitor** | `lucas@livrin.com` | `Demo.Livrin2026` | Catálogo, leitura e avaliação. **Não publica** |

Outras contas de demonstração usam a mesma senha: `lorena@`, `eloa@`, `caua@`, `tiago@`, `marina.duarte@` (escritores), `tatiane@`, `gabriel@` (leitores) e `camila@`, `rodrigo@` (administradores), todos em `@livrin.com`.

**Para ver o leitor de `.docx` sem enviar nada:** entre como `caua@livrin.com` e abra *O Alfabeto das Coisas Pequenas* no painel — é um manuscrito em Word, em análise e ainda sem capa, como um texto realmente chega à curadoria. Mude a tipografia, a escala e a paleta no leitor: o texto reflui de verdade, o que um PDF não faz.

### Trocar a senha do administrador

Edite `ADMIN_PASSWORD` no `.env` **antes** da primeira subida, ou troque depois por dentro do sistema em **Meu perfil → Alterar senha**. A troca feita pelo sistema é definitiva: o seed cria o administrador quando ele não existe e **não sobrescreve a senha de uma conta já existente**. (Na versão 2.0.0 ele sobrescrevia, e a senha trocada pelo usuário voltava sozinha a cada reinício.)

Para criar ou promover outro administrador:

```bash
docker compose exec api node dist/scripts/create-admin.js \
  --email voce@exemplo.com --password "SenhaForte123" --name "Seu Nome"
```

---

## O que o sistema faz

### Três perfis de usuário

| Perfil | Permissões |
| --- | --- |
| **Leitor** | Acessa a plataforma e o catálogo, pesquisa, visualiza livros e quadrinhos, lê as obras disponíveis e avalia. **Não publica, não aprova e não acessa a administração.** |
| **Escritor** | Tudo do leitor, mais: cadastrar obra (título, descrição, capa, arquivo), acompanhar o status e enviar para análise. Não publica direto: toda obra passa pela curadoria. |
| **Administrador** | Tudo do escritor, mais: painel administrativo, análise das obras enviadas, aprovar, rejeitar, gerenciar catálogo, usuários, gêneros, avaliações e apoios. |

A hierarquia é cumulativa e verificada **no servidor**, em todas as rotas. Esconder um menu no front-end é só conveniência de navegação.

Um leitor que decide publicar ativa o perfil de escritor em **Meu perfil → Quero publicar**, sem precisar de um administrador.

### Fluxo de publicação

```
ESCRITOR → cria a obra → envia capa + arquivo + informações
         → status EM_ANALISE
ADMINISTRADOR → analisa → APROVAR ou REJEITAR
```

**Aprovar é publicar.** Quando o administrador aprova, a obra passa a `APROVADO` e aparece no catálogo **na mesma ação** — não existe um segundo botão nem uma etapa extra do autor. Ao rejeitar, o status vira `REJEITADO`, o motivo é registrado e mostrado ao autor, e a obra fica fora do catálogo.

### Status das obras

| Status | Significado | No catálogo? |
| --- | --- | --- |
| `RASCUNHO` | Em edição pelo autor | não |
| `EM_ANALISE` | Enviada, aguardando a curadoria | não |
| `APROVADO` | Aprovada pela curadoria | **sim** |
| `REJEITADO` | Precisa de ajustes (motivo registrado) | não |
| `ARQUIVADO` | Retirada do catálogo pela curadoria | não |

Transições inválidas são recusadas pelo servidor com a lista do que seria permitido. O leitor não altera status; o escritor só tem uma ação de status (enviar para análise).

### Catálogo

Livros e quadrinhos (mais mangás/webcomics e zines), com capa, título, autoria, descrição, categoria, informações da obra, status e acesso à leitura. Tem busca por título, autoria, gênero e tags, filtros por formato, por categoria e por recurso assistivo, ordenação e paginação — tudo resolvido no servidor.

### Leitor acessível

PDF (pdf.js, com extração da camada de texto), **DOCX** (leitor próprio, sem dependência nova), EPUB (epub.js) e CBZ (JSZip). CBR não renderiza no navegador e é oferecido para download. O DOCX é o formato mais acessível do leitor: o texto reflui e obedece à tipografia, ao espaçamento e à escala escolhidos, ao contrário do PDF, que é página fixa. Escala, espaçamento, tipografia (Inter, Lexend, OpenDyslexic) e quatro paletas aplicadas ao conteúdo em tempo real; navegação por teclado; audiodescrição página a página narrada por faixa gravada ou por síntese de voz.

### Apoio voluntário

Página **Apoiar o Livrin** com valor livre ou sugerido, Pix, cartão ou boleto. A arquitetura é `PaymentService → PaymentProvider → método de pagamento`: trocar de provedor é implementar uma interface, sem mexer em rota, controller ou tela.

O provedor padrão é o **simulado**: percorre todo o caminho de um provedor real (abre a cobrança, fica pendente, confirma) sem movimentar dinheiro — e diz isso com todas as letras na interface. Nenhum dado de cartão passa pela aplicação. Os pontos de entrada são discretos de propósito: o rodapé e um botão na página da obra, nunca um banner na frente da leitura.

---

## Tecnologias e requisitos

**Requisito para rodar:** Docker Desktop (Windows/macOS) ou Docker Engine + Compose v2 (Linux). Nada mais precisa estar instalado — nem Node, nem PostgreSQL.

| Camada | Tecnologia |
| --- | --- |
| Front-end | React 18, TypeScript, Vite 6, Tailwind CSS 3, TanStack Query 5, React Router 7 |
| Leitor | pdf.js, epub.js, JSZip |
| Back-end | Node 22, Express 5, TypeScript, Zod, Multer, Helmet, JWT (`jsonwebtoken`), bcryptjs |
| ORM / migrations | Drizzle ORM + drizzle-kit |
| Banco | PostgreSQL 16 |
| Testes | Vitest + Supertest (API), Playwright (navegador) |
| Infra | Docker, Docker Compose, Nginx |

Para desenvolver fora do Docker: Node 22 ou superior e um PostgreSQL 16 acessível.

---

## Variáveis de ambiente

Arquivo único na raiz: `.env` (gerado de `.env.example`). Detalhes completos em [docs/environment.md](docs/environment.md).

| Variável | Obrigatória | Padrão | Para que serve |
| --- | --- | --- | --- |
| `JWT_SECRET` | **sim** | — | Assina os tokens. Gerado pelos scripts de inicialização. Valores de exemplo são recusados |
| `JWT_EXPIRES_IN` | não | `1d` | Validade do token |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | **sim** | — | Banco criado pelo container `db` |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | recomendadas | — | Administrador inicial criado pelo seed |
| `SEED_DEMO_DATA` | não | `false` | `true` popula o catálogo de demonstração |
| `DEMO_USER_PASSWORD` | se `SEED_DEMO_DATA=true` | — | Senha de todas as contas de demonstração |
| `PAYMENT_PROVIDER` | não | `simulado` | Provedor de pagamento das doações |
| `MAX_UPLOAD_MB` | não | `180` | Tamanho máximo do arquivo da obra |
| `CORS_ORIGINS` | não | `http://localhost:5173` | Origens autorizadas |
| `WEB_PORT` / `API_PORT` / `DB_PORT` | não | `5173` / `3000` / `5432` | Portas expostas no seu computador |

Senhas passam pela mesma política do resto do sistema: mínimo de 8 caracteres, com letras e números. Um `ADMIN_PASSWORD` fraco é recusado na inicialização, não aceito em silêncio.

---

## Estrutura do projeto

```
livrin/
├── api/                        # Back-end (Node + Express + TypeScript)
│   ├── drizzle/                # Migrations SQL versionadas
│   ├── seed-assets/            # Capas e arquivos das obras de demonstração
│   ├── src/
│   │   ├── config/             # Validação das variáveis de ambiente
│   │   ├── controllers/        # Entrada HTTP: valida e delega
│   │   ├── db/                 # Schema, migrations, seed, integridade
│   │   ├── middlewares/        # Autenticação, papéis, upload, erros, rate limit
│   │   ├── routes/             # Mapa das rotas
│   │   ├── services/           # Regras de negócio (inclui payments/)
│   │   ├── utils/              # Erros HTTP, logger, senha, texto
│   │   └── validators/         # Esquemas Zod
│   └── tests/                  # Testes de integração da API
├── web/                        # Front-end (React + Vite + Tailwind)
│   └── src/
│       ├── components/         # Layout, leitor, obras, administração, UI
│       ├── hooks/              # Consultas (TanStack Query)
│       ├── lib/                # Cliente HTTP, formatação, rótulos, voz
│       ├── pages/              # Telas
│       └── styles/             # Tokens e componentes CSS
├── e2e/                        # Testes de ponta a ponta (Playwright)
├── docs/                       # Documentação técnica
├── docker-compose.yml          # Produção local (padrão)
├── docker-compose.dev.yml      # Desenvolvimento com recarga automática
├── docker-compose.test.yml     # Banco efêmero para os testes
└── .env.example                # Fonte única das variáveis
```

### Arquitetura em camadas

```
Front-end (React)
      ↓  HTTP /api
API / Back-end (Express)
      ↓
Services (regras de negócio)
      ↓
Database (PostgreSQL via Drizzle)
```

Autorização no caminho de cada requisição:

```
Front-end
      ↓  Authorization: Bearer <token>
Autenticação   (valida o token e recarrega o usuário do banco)
      ↓
Autorização    (confere o papel: LEITOR < ESCRITOR < ADMIN)
      ↓
Back-end       (regras de negócio)
      ↓
PostgreSQL
```

O papel usado na decisão é sempre o que está **no banco**, não o que veio dentro do token: desativar ou rebaixar uma conta vale na requisição seguinte, sem esperar o token expirar. Detalhes em [docs/architecture.md](docs/architecture.md).

---

## Banco de dados e migrations

Nove tabelas: `users`, `genres`, `works`, `audio_descriptions`, `review_checks`, `review_notes`, `feedbacks`, `reading_sessions` e `donations`. Com índices, chaves estrangeiras (`RESTRICT`/`CASCADE`/`SET NULL`) e restrições `CHECK`. Detalhes em [docs/database.md](docs/database.md).

As migrations ficam em `api/drizzle/` e são aplicadas automaticamente na subida:

| Migration | O que faz |
| --- | --- |
| `0000_initial_schema` | Schema inicial |
| `0001_tres_papeis` | `USER`/`ADMIN` → `LEITOR`/`ESCRITOR`/`ADMIN`, convertendo as contas existentes |
| `0002_aprovado_publica` | Aposenta `PUBLICADO`; `APROVADO` passa a ser o estado visível no catálogo |
| `0003_doacoes` | Tabela `donations` e os enums de situação e método |

Comandos úteis (dentro de `api/`):

```bash
npm run db:generate   # gera uma migration a partir do schema
npm run db:migrate    # aplica as migrations
npm run db:seed       # roda o seed idempotente
npm run db:verify     # verificação de integridade banco ↔ uploads
npm run db:reset      # APAGA tudo e recria (bloqueado em produção)
```

### Por que a verificação de integridade existe

O banco guarda só o **caminho** de cada arquivo; os bytes ficam no volume `uploads`. São dois volumes Docker com ciclos de vida independentes, então eles podem sair de sincronia — por exemplo se alguém remover apenas o volume de uploads.

Até a versão 2.0.0, o seed decidia se já havia rodado consultando um usuário no banco e nunca recopiava nada: o banco seguia apontando para capas que não existiam mais e o catálogo exibia imagens quebradas **para sempre**. Agora, a cada subida, cada caminho registrado é conferido; o que falta é recopiado de `seed-assets` e, se não houver origem, a referência é limpa para a interface mostrar o estado real em vez de uma imagem quebrada.

---

## Principais endpoints

Todas as rotas ficam sob `/api`. Lista completa com corpo e erros em [docs/api.md](docs/api.md).

| Área | Endpoints |
| --- | --- |
| Autenticação | `POST /auth/register`, `POST /auth/login`, `GET/PATCH /auth/me`, `POST /auth/me/password`, `POST /auth/me/writer` |
| Catálogo | `GET /works`, `GET /works/:id`, `GET /genres` |
| Obras (escritor) | `POST /works`, `PATCH /works/:id`, `DELETE /works/:id`, `POST /works/:id/submit` |
| Leitura | `GET /works/:id/file`, `GET /works/:id/audio`, `GET /works/:id/audio-descriptions`, `POST /works/:id/sessions` |
| Avaliações | `GET/POST /works/:id/feedbacks`, `GET /works/:id/feedbacks/mine` |
| Apoio | `GET /donations/options`, `POST /donations`, `POST /donations/:id/confirm`, `GET /me/donations` |
| Administração | `/admin/stats`, `/admin/works`, `/admin/users`, `/admin/genres`, `/admin/feedbacks`, `/admin/donations` |

Exemplo — cadastrar uma obra:

```
POST /api/works
Autenticação: SIM        Perfil necessário: ESCRITOR

Entrada (multipart/form-data):
  title, synopsis, genreId, format, pages, cover (imagem), file (PDF/DOCX/EPUB/CBZ/CBR)

Saída:  201 — obra criada com status EM_ANALISE (ou RASCUNHO, com action=draft)
Erros:  400 dados inválidos · 401 sem token · 403 perfil LEITOR · 422 falta o arquivo
```

---

## Testes

### API (Vitest + Supertest, PostgreSQL de verdade)

```bash
docker compose -f docker-compose.test.yml up -d db-test

cd api
TEST_DATABASE_URL=postgres://livrin_test:livrin_test@localhost:5433/livrin_test npm test

docker compose -f docker-compose.test.yml down -v
```

Os 47 testes cobrem autenticação (login dos três perfis, senha inválida, acesso sem autenticação), autorização (leitor não alcança a área de escritor, escritor não alcança a administração), obras (criar, enviar arquivo e capa, alterar status, aprovar, rejeitar), catálogo (obra aprovada aparece, filtros, busca, paginação) apoio (valores, confirmação, isolamento entre pessoas) e manuscrito em `.docx` (aceito com o tipo correto; recusado quando o conteúdo não é um ZIP de verdade).

### Navegador (Playwright)

Com o sistema no ar:

```bash
cd e2e
npm install && npm run install-browsers
npm test
```

As credenciais saem do `.env` da raiz — não há valores duplicados nos testes.

### Integração contínua

`.github/workflows/ci.yml` roda, a cada push e pull request: tipos e testes da API contra um PostgreSQL real, build do front-end e construção das duas imagens Docker.

---

## Desenvolvimento

Com recarga automática nos dois lados:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

O modo de desenvolvimento usa um volume de uploads **próprio** (`uploads_dev`). Em produção a API roda como usuário sem privilégios e em desenvolvimento como root; volumes separados evitam que um modo deixe arquivos que o outro não consegue sobrescrever.

Sem Docker: suba um PostgreSQL, copie `api/.env.example` para `api/.env`, ajuste a `DATABASE_URL`, e então `cd api && npm install && npm run dev` e `cd web && npm install && npm run dev`.

Mais detalhes em [docs/development.md](docs/development.md).

---

## Solução de problemas

| Sintoma | O que fazer |
| --- | --- |
| `required variable POSTGRES_PASSWORD is missing` | Faltou o `.env`. Rode `iniciar.bat` / `./iniciar.sh`, que o cria |
| `JWT_SECRET ... valor de exemplo` | O `.env` ficou com o segredo em branco ou de exemplo. Apague o `.env` e rode o script de início, ou gere o segredo com o comando da mensagem |
| Porta já em uso | Mude `WEB_PORT` ou `API_PORT` no `.env` — e, se mudar `WEB_PORT`, ajuste também `CORS_ORIGINS`. O banco não é exposto no compose padrão (`DB_PORT` só vale no modo dev) |
| Não consigo entrar como admin | Confira `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env`. Se a conta já existe com outra senha, use o script `create-admin` |
| Capas sem imagem | A verificação de integridade reporta e corrige na subida. Veja `docker compose logs api` |
| Mudei o código e nada acontece | Você está no modo produção. Use o compose de desenvolvimento |

Lista completa em [docs/troubleshooting.md](docs/troubleshooting.md).

---

## Documentação completa

| Documento | Conteúdo |
| --- | --- |
| [architecture.md](docs/architecture.md) | Camadas, fluxo de uma requisição, decisões estruturais |
| [database.md](docs/database.md) | Tabelas, colunas, relacionamentos, migrations, seed |
| [api.md](docs/api.md) | Todas as rotas: método, URL, autenticação, perfil, entrada, saída e erros |
| [authentication.md](docs/authentication.md) | JWT, papéis, permissões, criação de administrador |
| [business-rules.md](docs/business-rules.md) | Ciclo editorial, transições, quem pode o quê |
| [admin.md](docs/admin.md) | Painel administrativo |
| [accessibility.md](docs/accessibility.md) | Recursos de acessibilidade e o que foi medido |
| [environment.md](docs/environment.md) | Cada variável de ambiente |
| [docker.md](docs/docker.md) | Imagens, serviços, volumes |
| [development.md](docs/development.md) | Rodar e desenvolver localmente |
| [testing.md](docs/testing.md) | Como rodar e o que cada teste cobre |
| [deployment.md](docs/deployment.md) | Levar para produção com segurança |
| [troubleshooting.md](docs/troubleshooting.md) | Problemas comuns |
| [decisions/](docs/decisions/) | Registros de decisão arquitetural (ADR) |

---

## Licença e conteúdo de demonstração

Projeto acadêmico. As obras de demonstração são **conteúdo original criado para este projeto** ou de **domínio público** (caso de *Rimas*, de Bécquer). Nenhum PDF ou material protegido por direitos autorais foi incorporado.
