# Editora Livrin

[![CI](https://github.com/xandoqa/-editora-acessivel/actions/workflows/ci.yml/badge.svg)](https://github.com/xandoqa/-editora-acessivel/actions/workflows/ci.yml)

Plataforma editorial aberta para quadrinhos e livros independentes, com acessibilidade no centro: audiodescrição página a página, tipografia inclusiva, alto contraste e leitor compatível com leitores de tela.

O Livrin existe para que quem não tem como bancar um lançamento tradicional consiga publicar e ser lido. **A autoria decide como cada obra é disponibilizada** — leitura livre, obra paga ou leitura livre com publicidade — e leitura livre continua sendo o padrão. O apoio financeiro ao projeto é voluntário e nunca condiciona o acesso a uma obra: só a obra que a própria autoria marcou como paga exige aquisição.

**Versão 3.5.1** — veja o [CHANGELOG](CHANGELOG.md) e o [relatório final](docs/relatorio-final.md). A 3.0.0 foi a auditoria completa; a série 3.1.x trouxe as obras de demonstração com conteúdo de leitura real, a revisão visual e as correções de leitura de PDF; a 3.2.0 trouxe a monetização e a aquisição de obras; a 3.3.0 fechou uma brecha de acesso a obra paga, levou a publicidade para dentro da leitura e criou o plano do leitor; a 3.4.0 trouxe a janela de Libras; a 3.5.0 trouxe o histórico de leitura, a página de planos e a audiodescrição que funciona em toda obra; e a 3.5.1 corrigiu o layout do player de audiodescrição e passou a identificar a bandeira do cartão pelo número.

---

## Sumário

- [Começar em um comando](#começar-em-um-comando)
- [O que precisa estar instalado](#o-que-precisa-estar-instalado)
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
- [Direção visual](#direção-visual)
- [Documentação completa](#documentação-completa)

---

## Começar em um comando

### Linux e macOS

Se você extraiu o `.zip` (digamos, em `~/Documentos/livrin`):

```bash
cd ~/Documentos/livrin
chmod +x iniciar.sh parar.sh    # o .zip perde a permissão de execução
./iniciar.sh
```

Se clonou pelo Git, a permissão já vem certa — basta `./iniciar.sh`.

### Windows

Dê dois cliques em `iniciar.bat`.

### Depois

Abra **<http://localhost:5173>**. Para parar: `./parar.sh` (Linux/macOS), `parar.bat` (Windows) ou `Ctrl+C`.

A primeira execução demora: o script cria o `.env`, **gera um `JWT_SECRET` aleatório só para a sua instalação** e baixa e compila cerca de 1,5 GB. Dez minutos numa conexão comum é normal; nas próximas vezes são segundos.

> **Travou em algum ponto, ou é a primeira vez?** [**docs/rodar-no-linux.md**](docs/rodar-no-linux.md) é o passo a passo completo para Linux, com o que fazer em cada erro possível — permissão, Docker, porta ocupada, disco cheio.

---

## O que precisa estar instalado

**Só Docker com o plugin Compose v2.** Node, PostgreSQL e todas as dependências ficam dentro dos contêineres; nada é instalado na sua máquina.

| Sistema | O que instalar | Como conferir |
| --- | --- | --- |
| Linux | `docker.io` + `docker-compose-plugin` — **o Docker Desktop não é necessário** | `docker compose version` e `docker info` |
| Windows / macOS | Docker Desktop (espere o status "running") | `docker compose version` |

`docker compose version` — com **espaço** — precisa responder `v2.x` ou maior. Se só existir `docker-compose` com hífen, é a v1, descontinuada, que **não** entende este `docker-compose.yml` (ele usa `name:` e `depends_on: condition: service_healthy`, da Compose Spec). Instale o plugin: `sudo apt install docker-compose-plugin` ou o equivalente da sua distribuição.

O `iniciar.sh` confere tudo isso sozinho antes de tentar subir, e diz o que fazer em vez de deixar o Docker devolver o erro cru.

As imagens são `node:22-alpine` e `postgres:16-alpine`: o projeto roda igual em Linux, Windows (WSL2) e macOS.

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

**Roteiro curto de demonstração**, usando só o que já vem no seed:

| O que mostrar | Como |
| --- | --- |
| Obra paga bloqueada | Entre como `tatiane@livrin.com` (leitor comum) e abra *Chamas de Agosto* — R$ 18,90. Leitura, download e audiodescrição ficam indisponíveis; a ficha continua visível |
| Pagamento simulado | Clique em **Comprar obra**. Pix confirma em um clique; cartão usa `4111 1111 1111 1111`, `12/30`, `123` |
| Publicidade na leitura | Abra *Vozes do Mar* e avance as páginas |
| Plano premium | **Planos do Livrin** no cabeçalho → assinar. Volte a *Vozes do Mar*: os anúncios somem. *Chamas de Agosto* continua pedindo aquisição |
| Audiodescrição sem cadastro | Abra qualquer obra sem audiodescrição e clique em **Ouvir Audiodescrição**: narra capa, ficha, recursos e sinopse, avisando que é descrição básica |
| Histórico de leitura | Depois de abrir duas ou três obras, veja **Histórico de leitura** no menu |

Use uma conta de **leitor comum** para testar bloqueio: a administração e a autoria abrem obra paga sem comprar, por ser a regra de revisão — e o leitor avisa isso na tela.

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

PDF, **DOCX** (leitor próprio, sem dependência nova), EPUB (epub.js) e CBZ (JSZip). CBR não renderiza no navegador e é oferecido para download. O PDF é normalizado pelo `qpdf` no envio e lido em três vias — pedaços, arquivo completo e leitor do navegador —, porque o pdf.js recusa arquivos que leitores nativos abrem (ver [ADR 013](docs/decisions/013-leitura-de-pdf.md)). O DOCX é o formato mais acessível do leitor: o texto reflui e obedece à tipografia, ao espaçamento e à escala escolhidos, ao contrário do PDF, que é página fixa. Escala, espaçamento, tipografia (Inter, Lexend, OpenDyslexic) e quatro paletas aplicadas ao conteúdo em tempo real; navegação por teclado; audiodescrição narrada por faixa gravada ou por síntese de voz — e, nas obras sem descrição cadastrada, uma descrição básica montada a partir da ficha (ver [Audiodescrição](#audiodescrição)).

### Apoio voluntário

Página **Apoiar o Livrin** com valor livre ou sugerido, Pix, cartão ou boleto. A arquitetura é `PaymentService → PaymentProvider → método de pagamento`: trocar de provedor é implementar uma interface, sem mexer em rota, controller ou tela.

O provedor padrão é o **simulado**: percorre todo o caminho de um provedor real (abre a cobrança, fica pendente, confirma) sem movimentar dinheiro — e diz isso com todas as letras na interface. Nenhum dado de cartão passa pela aplicação. Os pontos de entrada são discretos de propósito: o rodapé e um botão na página da obra, nunca um banner na frente da leitura.

Apoiar **não libera obra nenhuma** e **não remove anúncio**: é apoio ao projeto. Quem libera obra é a aquisição; quem remove anúncio é o [plano premium](#planos-do-livrin). São três coisas diferentes, de propósito.

### Histórico de leitura e biblioteca

São coisas diferentes, e ficam em lugares diferentes:

| Área | O que mostra |
| --- | --- |
| **Minha biblioteca** | As obras que você **adquiriu** (obras pagas) |
| **Histórico de leitura** | As obras que você **abriu**, com a página alcançada e o progresso |

O histórico vem das sessões de leitura que o sistema já registrava para as métricas da autoria — não há tabela nova. Ele agrupa por obra e guarda a página mais distante, não a da última sessão: reler o começo não faz o histórico dizer que você regrediu.

Dá para apagar o histórico. Isso **desvincula** as leituras da sua conta em vez de excluí-las: elas somem da sua lista e as estatísticas de quem publicou seguem contando, sem ligação com você.

### Planos do Livrin

No cabeçalho, ao lado de "Publique sua obra" (e no menu lateral, em tela pequena). A página é pública.

| Plano | O que muda |
| --- | --- |
| **Gratuito** | Tudo o que a plataforma oferece, com anúncios nas obras monetizadas por publicidade |
| **Premium** | As mesmas obras, sem anúncios |

**O premium não libera obra paga.** Quem define o preço de uma obra é a autoria, e o dinheiro de uma assinatura da plataforma não é dela.

A assinatura usa o mesmo fluxo de pagamento simulado da compra de obra, e **funciona**: o plano é ativado pelo servidor ao confirmar a cobrança. Para cancelar, o botão fica na própria página — a conta volta ao gratuito e o histórico de pagamento é mantido.

### Janela de Libras

Na barra superior, ao lado da leitura em voz alta, há um botão que liga uma **janela com avatar sinalizando em Libras** o texto selecionado. O tradutor é o [VLibras](https://www.gov.br/governodigital/pt-br/acessibilidade-e-usuario/vlibras), suíte livre do governo federal.

Três coisas a saber antes de demonstrar:

- **Começa desligada, e o script só é baixado quando você liga.** Com o botão desligado, o site não faz nenhuma requisição a `vlibras.gov.br`.
- **Depende de internet e do serviço estar no ar.** Se não carregar, o botão avisa e volta a desligado — nada mais quebra. Teste antes da apresentação.
- **É tradução automática.** Libras é uma língua com gramática própria, não português sinalizado. O recurso é um apoio, declarado como automático, e não substitui intérprete humano.

A marcação **Libras no conteúdo**, nos filtros do catálogo, é outra coisa: é a autoria declarando que a própria obra traz sinalização em suas páginas, conferido pela curadoria. A plataforma não hospeda vídeo de intérprete.

### Audiodescrição

No leitor, o botão **Ouvir Audiodescrição** narra a obra com a voz do sistema. Há dois casos:

- **Obra com audiodescrição cadastrada:** narra a descrição e as falas de cada página, virando as páginas em sincronia.
- **Obra sem audiodescrição cadastrada:** narra uma **descrição básica** montada a partir da ficha — descrição da capa, formato, páginas, gênero, recursos declarados, sinopse e notas da autoria. A tela avisa que é descrição básica.

Antes, o segundo caso não fazia nada. Um botão que não faz nada promete acessibilidade e não entrega.

Iniciar, pausar e parar valem nos dois casos. A voz vem do sistema operacional, então a qualidade varia — há seletor de voz e de velocidade.

A **descrição da capa** é escrita pela autoria no formulário de publicação e serve para duas coisas: é o texto alternativo da imagem e abre a audiodescrição.

### Monetização e aquisição

> **Todo pagamento é simulado.** Nenhum dinheiro é movimentado, nenhuma cobrança é emitida, e a interface avisa isso antes de qualquer campo. Use apenas dados fictícios. Ver [ADR 014](docs/decisions/014-monetizacao-e-aquisicao.md).

Ao publicar ou editar uma obra, a autoria escolhe em **Como disponibilizar**:

| Modalidade | O que acontece |
| --- | --- |
| **Leitura livre** | Qualquer pessoa lê sem pagar. É o padrão |
| **Obra paga** | Exige aquisição. Preço definido pela autoria, de R$ 1,00 a **R$ 50,00** |
| **Livre, com publicidade** | Leitura gratuita, com blocos publicitários **de demonstração** entre as páginas da leitura |

A escolha **não influencia a curadoria**: definir preço não publica a obra nem concede o Selo Livrin, e obra fora do catálogo não pode ser adquirida. O preço pode ser alterado depois da aprovação — é decisão comercial, não conteúdo.

#### Como testar cada meio de pagamento

Entre com uma conta de leitor, abra uma obra paga (no seed, **Chamas de Agosto**, R$ 18,90) e clique em **Adquirir**.

| Meio | O que preencher | Como concluir |
| --- | --- | --- |
| **Pix** | Nada | Copie o código de demonstração se quiser e clique em **Simular pagamento aprovado** |
| **Cartão** | Titular qualquer, número `4111 1111 1111 1111`, validade `12/30`, código `123` | Clique em **Pagar**, depois em **Simular pagamento aprovado** |
| **Boleto** | Nada | A linha digitável é de demonstração e não é pagável. Clique em **Simular pagamento aprovado** |

**Cartões de teste, por bandeira.** A lista também aparece dentro do próprio formulário, recolhida — numa apresentação, procurar o número no README é tempo perdido na frente de quem assiste.

| Bandeira | Número |
| --- | --- |
| Visa | `4111 1111 1111 1111` |
| Mastercard | `5555 5555 5555 4444` |
| Elo | `6362 9700 0045 7013` |
| American Express | `3782 822463 10005` |
| Hipercard | `6062 8256 2425 4001` |
| Diners Club | `3056 930902 5904` |

Validade: qualquer data futura. Código: 3 dígitos, 4 no American Express.

**Não há seletor de bandeira, e isso é proposital:** o número já informa qual é, como nos checkouts reais. Nubank, Itaú e afins são **emissores**, não bandeiras — um cartão Nubank é um Mastercard ou um Visa. Todos os números acima passam no algoritmo de **Luhn**, que o servidor refaz por conta própria: sem ele, `1111 1111 1111 1111` passaria, e a validação seria enfeite.

Depois de aprovada, a obra entra em **Minha biblioteca** e continua disponível ao sair e entrar de novo — a aquisição pertence à conta, não ao navegador.

Para ver o caminho que **não** libera a obra: clique em **Cancelar cobrança**, ou deixe a cobrança expirar (Pix 30min, cartão 15min, boleto 3 dias). Em ambos os casos a obra continua bloqueada.

#### Publicidade e plano do leitor

Obra com modalidade **publicidade** é gratuita para o leitor e mostra um bloco publicitário na abertura da leitura, a cada quatro páginas e ao fim — sempre **entre** páginas, nunca por cima do texto. No seed, **Vozes do Mar** está nessa modalidade.

Os anunciantes são fictícios e cada bloco diz que é demonstração. Não há rede publicitária integrada, script de terceiro nem rastreamento.

O **plano do leitor** é `GRATUITO` por padrão. Em **Administração → Usuários**, dá para mudar uma conta para `PREMIUM`: os anúncios somem. O premium **não** desbloqueia obra paga — quem define preço é a autoria, e o dinheiro de uma assinatura não é dela.

#### Por que a obra paga abre para você

Se você entrar como **administração** ou como a **autoria da obra**, a obra paga abre sem compra. Isso é a regra de revisão, não uma falha: a curadoria precisa conseguir abrir qualquer obra.

O leitor avisa isso na tela, e o detalhe da obra devolve o motivo do acesso (`COMPRADA`, `AUTORIA`, `ADMINISTRACAO`, `NEGADO`). **Para testar o bloqueio, use uma conta de leitor comum** — por exemplo `tatiane@livrin.com`.

O que **não** funciona, de propósito: alterar o preço pelo navegador. A requisição de compra não tem campo de valor e o schema é estrito — mandar `priceCents` devolve erro 400. O preço cobrado é sempre o que está no banco.

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
├── ferramentas/                # Geradores de conteúdo (capas, obras) e os textos-fonte
│   └── historias/              # Contos, poemas e roteiros originais das obras
├── docs/                       # Documentação — ver docs/README.md
│   ├── decisions/              # ADRs: o que foi decidido e por quê
│   ├── design/                 # Direção visual, prévia interativa e telas do protótipo
│   ├── diagramas/              # Modelo de dados e fluxo editorial
│   └── academico/              # Documentos do trabalho: cronograma, DAS, casos de uso, BMC
├── .github/workflows/ci.yml    # Integração contínua
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

```
POST /api/works/:id/purchase
Autenticação: SIM        Perfil necessário: qualquer conta

Entrada (JSON):
  method: "PIX" | "CARTAO" | "BOLETO"
  card:   { holder, number, expiry, cvv }   — só quando method = CARTAO

  NÃO existe campo de valor. O preço é lido da obra, no servidor. O schema é
  estrito: enviar priceCents devolve 400, em vez de ser ignorado em silêncio.

Saída:  201 — cobrança aberta · 200 — cobrança pendente reaproveitada (idempotência)
Erros:  400 obra de leitura livre ou cartão inválido · 401 sem token
        404 obra inexistente ou fora do catálogo · 409 já adquirida
```

```
POST /api/purchases/:id/confirm
Autenticação: SIM

Saída:  200 — situação da cobrança. CONFIRMADA libera a obra; qualquer outra, não.
Erros:  404 cobrança de outra pessoa · 409 expirada ou não está mais pendente
```

```
GET /api/me/library        → obras adquiridas (aquisição confirmada)
GET /api/me/purchases      → histórico com todos os estados
POST /api/purchases/:id/cancel  → cancela cobrança pendente; não libera a obra
```

```
GET  /api/plans/options         → preço do plano, meios aceitos e se o provedor é real (público)
POST /api/me/plan/subscribe     → abre a cobrança da mensalidade
                                  Entrada: { method, card? } — SEM campo de valor
POST /api/me/plan/cancel        → volta a conta ao gratuito; mantém o histórico de pagamento

A confirmação usa a rota comum: POST /api/purchases/:id/confirm.
É ela que ativa o plano, no servidor — nunca a tela.
```

```
GET    /api/me/reading-history  → obras que você abriu, com a página alcançada
DELETE /api/me/reading-history  → desvincula suas leituras; as métricas da autoria seguem de pé
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

São **90 testes**, em sete arquivos:

| Arquivo | Casos | O que protege |
| --- | --- | --- |
| `auth.test.ts` | 11 | Login dos três perfis, senha inválida, acesso sem autenticação, troca de senha |
| `works.test.ts` | 20 | Criar, enviar arquivo e capa, transições de status, aprovar e rejeitar; `.docx` aceito e `.docx` falso recusado; PDF truncado recusado no envio |
| `catalog.test.ts` | 8 | Só obra aprovada aparece; filtros, busca, paginação; curinga de SQL tratado como texto |
| `donations.test.ts` | 9 | Valores, confirmação idempotente, isolamento entre pessoas — e que **ler não exige apoio nenhum** |
| `purchases.test.ts` | 18 | Teto de R$ 50,00, preço lido do banco, acesso liberado só após confirmação, idempotência, cancelamento |
| `acesso-e-modalidades.test.ts` | 11 | Os cenários A–L de acesso a obra paga, inclusive requisições forjadas direto na API |
| `historico-e-planos.test.ts` | 13 | Histórico por conta e isolado entre contas; plano ativado só pelo servidor; premium **não** libera obra paga; cancelamento |

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

## Direção visual

A estética é editorial e artesanal — papel, traço de tinta, cor de cartaz —, inspirada no espírito das obras de Ziraldo sem reproduzir personagens ou traços de terceiros. O que isso quer dizer na prática, o que já está implementado e **o que qualquer mudança visual precisa preservar** (contraste AAA, foco visível, alvo de toque, os três temas) está em:

- **[docs/design/direcao-visual.md](docs/design/direcao-visual.md)** — a referência antes de mexer em qualquer tela.
- **[docs/design/previa-visual.html](docs/design/previa-visual.html)** — prévia interativa; abra no navegador para ver as três paletas e as opções de tipografia com os contrastes medidos.

Toda a identidade vive em dois arquivos, de propósito: `web/src/styles/global.css` e `web/tailwind.config.js`. Trocar a identidade inteira não deveria exigir abrir componente nenhum.

---

## Documentação completa

O índice completo, por assunto, está em **[docs/README.md](docs/README.md)**. Os mais procurados:

| Documento | Conteúdo |
| --- | --- |
| [rodar-no-linux.md](docs/rodar-no-linux.md) | **Passo a passo para rodar no Linux**, do zero ao navegador, com o que fazer em cada erro |
| [troubleshooting.md](docs/troubleshooting.md) | Problemas por sintoma |
| [architecture.md](docs/architecture.md) | Camadas, fluxo de uma requisição, decisões estruturais |
| [api.md](docs/api.md) | Todas as rotas: método, URL, autenticação, perfil, entrada, saída e erros |
| [business-rules.md](docs/business-rules.md) | Ciclo editorial, transições, quem pode o quê |
| [accessibility.md](docs/accessibility.md) | Recursos de acessibilidade e o que foi medido |
| [navegadores.md](docs/navegadores.md) | Navegadores aceitos e os caminhos alternativos por motor |
| [design/direcao-visual.md](docs/design/direcao-visual.md) | A direção visual e o que ela não pode quebrar |
| [relatorio-final.md](docs/relatorio-final.md) | **Relatório final**: o que foi feito, testado e o que ficou pendente |
| [pagamento-real-opcoes.md](docs/pagamento-real-opcoes.md) | Opções para receber apoio de verdade sem orçamento |
| [obras-dominio-publico.md](docs/obras-dominio-publico.md) | Quando uma obra de terceiro pode entrar no acervo |
| [decisions/](docs/decisions/) | Registros de decisão arquitetural (ADR) |
| [academico/](docs/academico/) | Documentos do trabalho: cronograma, DAS, casos de uso, BMC |

---

## Licença e conteúdo de demonstração

Projeto acadêmico. As obras de demonstração são **conteúdo original criado para este projeto** ou de **domínio público** (caso de *Rimas*, de Bécquer). Nenhum PDF ou material protegido por direitos autorais foi incorporado.

As **obras em si** também são originais: contos, poemas e roteiros de quadrinho escritos para este projeto, com texto-fonte em `ferramentas/historias/` e arquivos gerados por `ferramentas/gerar-obras.py`. Os PDFs têm **texto de verdade**, não imagem de texto — num projeto de acessibilidade, um PDF escaneado seria contradizer a própria proposta. O EPUB traz `lang="pt-BR"` e sumário navegável.

```bash
python3 ferramentas/gerar-obras.py api/seed-assets/works
```

As **capas** são composições geométricas originais, geradas por `ferramentas/gerar-capas.py` — campo de cor chapada, uma forma grande e um filete, no mesmo vocabulário editorial da interface. Não há texto nelas de propósito: o card do catálogo já escreve título e autoria por cima. O script fica no repositório como prova de autoria e para que novas capas sejam feitas no mesmo estilo:

```bash
python3 ferramentas/gerar-capas.py api/seed-assets/covers
```

Requer apenas Pillow (`pip install pillow`).
