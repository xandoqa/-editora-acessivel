# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versionamento semântico.

## [3.1.0] — 2026-10-24

Rodada de ajustes a partir do uso real: dois defeitos que impediam ler uma obra
enviada, e uma revisão visual pedida depois de ver o sistema no ar.

### Corrigido

- **O leitor dizia "Não foi possível abrir este PDF" para qualquer falha.** A
  mesma frase cobria arquivo sumido do volume, PDF com senha, arquivo
  corrompido e API fora do ar — quatro problemas com soluções diferentes e
  nenhuma pista de qual era. Agora cada caso tem sua mensagem e, quando a
  falha é de HTTP, o leitor busca a explicação que a própria API devolveu.
- **A API servia um arquivo sem conferir se ele existia.** O registro no banco
  e os bytes no volume têm ciclos de vida independentes: trocar entre o
  `docker-compose.yml` e o de desenvolvimento troca o volume de uploads e
  mantém o banco, e o registro passa a apontar para o nada. O `sendFile`
  falhava com um erro que não dizia nada. Agora a resposta nomeia o problema e
  diz o que fazer. Vale também para a faixa de audiodescrição.

### Alterado

- **Peso visual.** Todo card tinha traço de 2px e sombra dura de 5px; com tudo
  em destaque, nada ficava em destaque. O traço caiu para 1px **mantendo a mesma
  cor** — o contraste do critério 1.4.11 é idêntico —, a sombra dura saiu dos
  cards e ficou para o botão principal e o Selo, os raios de canto diminuíram e
  o grão do papel ficou mais discreto. A paleta clareou e dessaturou.
- **Tipografia mais calma:** títulos de peso 800 para 700, entrelinha de corpo
  mais generosa, parágrafos limitados a 72 caracteres e micro-rótulos em
  versalete mais largo.
- **Capas de demonstração refeitas.** As anteriores eram imagens geradas por IA.
  No lugar entraram composições geométricas originais — cor chapada, uma forma,
  um filete —, sem texto, porque o card já escreve título e autoria por cima.
  São 10 a 60 vezes mais leves e o gerador (`ferramentas/gerar-capas.py`) fica
  no repositório como prova de autoria.

## [3.0.0] — 2026-10-22

Auditoria completa do projeto e correção dos problemas encontrados, na ordem de
estabilidade → segurança → banco → arquitetura → funcionalidades → experiência →
design → documentação. O relatório da auditoria classificou 4 problemas
críticos, 9 altos, 13 médios e 7 baixos; esta versão endereça todos.

### Corrigido — crítico

- **Aprovar não publicava.** O catálogo filtrava `status = 'PUBLICADO'`, mas a
  decisão do administrador parava em `APROVADO`: quem publicava era o autor, em
  outra tela. Na prática, a curadoria aprovava e a obra nunca aparecia. Agora
  `APROVADO` é o estado visível no catálogo e aprovar publica na mesma ação.
- **Dois papéis onde a especificação pede três.** Qualquer conta cadastrada
  podia publicar. Agora existem `LEITOR`, `ESCRITOR` e `ADMIN`, verificados no
  servidor em todas as rotas; o leitor recebe `403` ao tentar cadastrar obra.
- **Segredos reais versionados.** Os arquivos `.env` e `api/.env` vinham dentro
  do pacote, com um `JWT_SECRET` real e outro de exemplo publicado — quem
  conhecesse o repositório assinaria um token válido para qualquer conta.
  Removidos; o segredo passa a ser gerado na primeira execução e a API recusa
  valores de exemplo, marcadores e segredos com pouca entropia.
- **Quatro senhas de administrador diferentes** espalhadas entre `.env`,
  `.env.example`, `api/.env`, README e testes — a credencial dependia de como o
  projeto tinha sido iniciado. Agora há uma fonte única: `.env.example`.

### Corrigido — alto

- O seed regravava a senha do administrador a cada inicialização, desfazendo em
  silêncio a troca feita em "Meu perfil". Agora ele só cria a conta quando ela
  não existe.
- Capa ausente no volume virava **HTTP 500** com `Erro não tratado` no log, em
  vez de 404: o tratador central não reconhecia erros que já trazem `status`.
- O componente de capa não tinha `onError`, então um arquivo faltante deixava o
  ícone de imagem quebrada em vez do fallback tipográfico que já existia.
- **Banco e uploads podiam sair de sincronia para sempre.** Nova verificação de
  integridade roda a cada subida, recopia de `seed-assets` o que falta e limpa
  referências órfãs (seção 5 da especificação).
- O `:focus-visible` global era anulado nos campos de formulário por
  `focus:outline-none` — quem navega por teclado perdia o foco em toda a
  aplicação. Numa plataforma de acessibilidade, isso era o oposto do objetivo.
- Contrastes abaixo do nível declarado: bordas de campos e cards a 1,1:1 contra
  o mínimo de 3:1 do critério WCAG 1.4.11. Tokens ajustados.
- O leitor baixava o arquivo inteiro (até 180 MB) na memória antes de desenhar
  a primeira página.
- A política de senha do seed aceitava `12345678`, que o próprio sistema
  recusaria em qualquer formulário. Unificada.
- Os modos de desenvolvimento e produção dividiam o volume de uploads com donos
  diferentes, quebrando o envio de arquivos depois de alternar entre eles.

### Corrigido — médio e baixo

- `PATCH /sessions/:id` não exigia autenticação nem conferia dono: dava para
  inflar as métricas de leitura. Agora exige o token da sessão e tem limite por
  IP na criação.
- Dados de demonstração incoerentes: as obras declaravam de 88 a 310 páginas e
  os arquivos tinham de 2 a 4. A mesma tela mostrava "208 páginas" e
  "Pág 01 / 04".
- Duas estantes do catálogo nasciam vazias por não existir nenhuma obra de
  demonstração nos formatos mangá e zine. Faltava também o filtro por categoria.
- Afirmações fixas no código ("Navegação Motora: Aprovado pelo Comitê",
  "Camadas Contraste: 7:1 Aferido") eram apresentadas como resultado de
  verificação. Agora vêm dos dados ou estão escritas como declaração do autor.
- Documentação contradizia o código em quatro pontos sobre o seed do
  administrador; o README e o `docs/api.md` citavam uma senha inexistente.
- Os testes de ponta a ponta usavam uma senha padrão que não existia em arquivo
  nenhum e falhavam no login do administrador.
- Vazamentos de memória no leitor de quadrinhos e na pré-visualização de capa.
- O filtro de gêneros da administração escondia os gêneros desativados.
- Comentários `eslint-disable` referenciavam um linter que não estava instalado.

### Adicionado

- **Sistema de apoio voluntário** (seções 17 a 19): página "Apoiar o Livrin",
  tabela `donations`, arquitetura `PaymentService → PaymentProvider → método`,
  provedor simulado explícito quanto a não movimentar dinheiro, apoio anônimo ou
  identificado, vínculo opcional com uma obra, e painel administrativo com os
  números. Os pontos de entrada são discretos: rodapé e página da obra.
- **Nova identidade visual** (seções 14 e 15): paleta, tipografia, hierarquia,
  componentes e ornamentos ilustrados originais, no espírito editorial e
  artesanal pedido — sem reproduzir personagens ou obras de terceiros.
- **Manuscrito em `.docx`** aceito no envio e lido no navegador. É o formato em
  que quem escreve entrega o texto, e por isso o que mais baixa a barreira para
  publicar. No leitor é o formato **mais acessível** de todos: o texto reflui e
  obedece à tipografia, ao espaçamento, à escala e à paleta escolhidas — ao
  contrário do PDF, que é página fixa. Nenhuma dependência nova: o `.docx` é um
  ZIP, o projeto já usa JSZip e o XML do Word é convertido em blocos tipados
  (`web/src/components/reader/docxParser.ts`). O parser devolve estrutura, nunca
  HTML — não existe marcação de terceiros para injetar na página de quem lê.
- **Selo de Qualidade Livrin** nos cards do catálogo e na página da obra, com o
  nome de quem assinou a curadoria, a data e a lista do que foi verificado. O
  critério fica aberto de propósito: selo cujo critério ninguém pode ler não
  atesta nada. A coluna `reviewed_by` (migração `0004_selo_curadoria`) registra
  o revisor no momento da aprovação.
- Leitor ativa o próprio perfil de escritor em "Meu perfil", sem depender de um
  administrador.
- Verificação de integridade como comando: `npm run db:verify`.
- `docker-compose.test.yml` com um PostgreSQL efêmero para a suíte de testes.
- Integração contínua (`.github/workflows/ci.yml`): tipos, testes, build do
  front-end e construção das duas imagens Docker.
- `iniciar.sh` e `parar.sh` para Linux e macOS, equivalentes aos `.bat`. O
  `iniciar.sh` **confere o ambiente antes de tentar subir**: binário do Docker,
  plugin Compose v2 (o `docker-compose` v1 não entende este arquivo) e daemon
  acessível — e, em cada caso, diz o que fazer em vez de deixar o Docker
  devolver o erro cru. Também respeita um `WEB_PORT` trocado no `.env` ao
  informar a URL.
- **`docs/rodar-no-linux.md`**: passo a passo seguido para rodar no Linux, do
  zero até o navegador, com a solução de cada erro no ponto em que ele aparece
  (permissão perdida no unzip, Compose v1, socket sem permissão, porta ocupada,
  disco cheio, "parece travado"). A abertura do README e o `LEIA-ME-RAPIDO.txt`
  passaram a começar pelos comandos, com os pré-requisitos logo abaixo: antes a
  explicação vinha antes do que digitar, e era fácil se perder nela.
- Pré-requisitos e tropeços de Linux documentados onde se tropeça neles:
  `LEIA-ME-RAPIDO.txt`, a abertura do README, `docs/docker.md` e cinco entradas
  novas em `docs/troubleshooting.md` (permissão de execução perdida no unzip,
  CRLF em `.env` e nos `.sh`, socket do Docker sem permissão, disco cheio,
  primeira subida que parece travada).
- Obras de demonstração em espanhol e nos formatos que faltavam, incluindo
  *Rimas*, de Bécquer (domínio público), e *O Alfabeto das Coisas Pequenas*,
  manuscrito original em `.docx` deixado **em análise** e sem capa — é assim que
  um texto chega à curadoria, e serve para ver o leitor de `.docx` funcionando
  sem precisar enviar nada.
- Testes de catálogo e de apoio; a suíte da API foi de 22 para 47 testes.

### Alterado

- Status das obras: `RASCUNHO`, `EM_ANALISE`, `APROVADO`, `PUBLICADO`,
  `REJEITADO`, `ARQUIVADO` → `RASCUNHO`, `EM_ANALISE`, `APROVADO`, `REJEITADO`,
  `ARQUIVADO`. `PUBLICADO` foi aposentado e `ARQUIVADO` passou a ser o caminho
  para despublicar.
- `POST /works/:id/publish` deixou de existir: não há mais uma ação de
  publicação separada da aprovação.
- Toda a documentação foi reescrita a partir do comportamento real do código.

### Banco de dados

- `0001_tres_papeis`: amplia `user_role` e converte as contas existentes — quem
  já tinha obra vira `ESCRITOR`, o resto vira `LEITOR`.
- `0002_aprovado_publica`: remove `PUBLICADO` de `work_status`, migrando as
  obras publicadas para `APROVADO` e preenchendo `published_at` quando faltava.
- `0003_doacoes`: tabela `donations`, enums `donation_status` e `payment_method`.

### Removido

- Arquivos `.env` e `api/.env` do pacote distribuído.
- Botão "Lançar Agora" e a tela de publicação pelo autor.
- `api/seed-assets/panels/alvorada.jpg`, que nenhum código referenciava.

## [2.0.0] — 2026-10-18

Transformação do protótipo em aplicação completa, funcional e executável com Docker.

### Adicionado
- **Leitor Acessível real**: renderização de PDF (pdf.js, com extração do texto da página), EPUB (epub.js) e CBZ (JSZip); paginação por botões e teclado (← →); escala do texto, espaçamento, tipografia Inter/Lexend/OpenDyslexic e paletas Escuro/Claro/Sépia/Amarelo-Preto aplicadas em tempo real; ficha técnica; download da obra.
- **Audiodescrição** por página (descrição do quadro + falas com personagem e tom), editável pelo autor e pela curadoria, usada também como texto alternativo das páginas.
- **Player de audiodescrição**: faixa de áudio enviada (MP3/OGG/M4A) com ±10s, barra de posição e velocidade; ou narração por voz sintetizada sincronizada com as páginas (atalho Espaço).
- **Upload real** de obras (PDF/EPUB/CBZ/CBR), capas e áudios com validação de assinatura binária, arrastar-e-soltar e barra de progresso.
- **Ciclo editorial completo**: rascunho, envio, análise com checklist e notas dos pareceristas, chat do autor com a curadoria, aprovação, solicitação de ajustes com motivo, publicação pelo autor, arquivamento e reabertura.
- **Cadastro**, perfil (nome, apresentação) e troca de senha; tela de recuperação de acesso.
- **Catálogo** com busca (título, autor, gênero, tags), filtros por formato/recurso assistivo, ordenação, paginação, "Ouvir sinopse" e "Ouvir introdução da página".
- **Avaliações** dos leitores (nota, comentário, recurso avaliado), "Voz dos Leitores" no painel do autor.
- **Métricas reais**: sessões de leitura com uso de audiodescrição, alto contraste, fonte para dislexia e zoom; painel do autor e dashboard administrativo calculados no banco.
- **Área administrativa completa**: dashboard; obras (listagem com filtros/ordenação, criação em nome de autor, edição completa, decisão editorial, checklist, notas, audiodescrição, exclusão); usuários (criar, editar, papéis, ativar/desativar, redefinir senha, excluir com proteções); gêneros; moderação de avaliações.
- **Acessibilidade global**: alto contraste amarelo/preto por tokens CSS, A-/A+, leitura da página em voz alta, modo "Leitor Otimizado", link para pular ao conteúdo, foco visível, layout responsivo com menu gaveta.
- Layout fiel ao protótipo (barra lateral, barra superior, cards, telas de análise e painel).
- Script `create-admin` (criar/promover administrador).
- Testes de integração da API (22, Vitest + Supertest + PostgreSQL) e testes E2E (Playwright).
- Documentação completa em `README.md` e `docs/` (arquitetura, banco, API, autenticação, admin, regras de negócio, acessibilidade, Docker, variáveis, desenvolvimento, testes, deploy, troubleshooting, ADRs).

### Alterado
- Express 4 → 5; React Router 6 → 7 (modo biblioteca); TanStack Query para dados do servidor; `bcrypt` → `bcryptjs`.
- Estrutura do back-end em camadas: rotas → controllers → services, validação com zod, erros padronizados.
- Status das obras: `EM_ANALISE/APROVADO/REJEITADO` → `RASCUNHO/EM_ANALISE/APROVADO/PUBLICADO/REJEITADO/ARQUIVADO` (o catálogo mostra apenas `PUBLICADO`).
- Docker: imagens multi-stage de produção (API como usuário sem privilégios, front no Nginx com proxy `/api`), compose de desenvolvimento separado, migrations e seed automáticos no start, segredos obrigatórios via `.env`.
- O front-end usa caminho relativo `/api` (proxy do Vite/Nginx) em vez de URL absoluta.

### Banco de dados
- Migration inicial `0000_initial_schema`: enums `user_role`, `work_status`, `work_format`, `file_type`, `check_status`; tabelas `users` (+ `is_active`, `headline`, `last_login_at`), `genres` (nova), `works` (gênero por FK, formato, metadados editoriais, novos recursos de acessibilidade, créditos de audiodescrição, arquivos, datas do ciclo editorial), `audio_descriptions`, `review_checks`, `review_notes`, `feedbacks` (moderação, unicidade por leitor/obra), `reading_sessions`; índices, `CHECK`s e FKs com `RESTRICT`/`CASCADE`/`SET NULL`.
- Seed idempotente com gêneros, administrador inicial e dados de demonstração do protótipo (capas e arquivos de amostra).

### Corrigido (segurança e bugs)
- Cadastro permitia escolher `role=ADMIN` (escalada de privilégio).
- Segredo JWT com valor padrão no código.
- Obras não publicadas acessíveis por qualquer pessoa em `GET /works/:id`.
- Status arbitrário aceito em `PATCH /admin/works/:id/status`.
- Erros em rotas assíncronas não tratados (requisições presas / processo derrubado).
- IDs não numéricos geravam erro de SQL.
- Seed duplicava dados a cada execução; banco dependia de `drizzle-kit push` manual.
- Credenciais pré-preenchidas no formulário de login.
- Botões e indicadores apenas visuais (mocks) substituídos por funcionalidades reais.

### Removido
- Números fixos do painel do autor e da tela de análise.
- `docs/admin.md` e `docs/development.md` antigos (reescritos e ampliados).

## [1.0.0]
- Protótipo inicial gerado: telas de login, catálogo, leitor, painel do autor, fluxo de avaliação, submissão e painel administrativo básico.
