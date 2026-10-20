# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versionamento semântico.

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
