# Testes

## 1. Integração da API (`api/tests`)

Ferramentas: **Vitest** + **Supertest**, contra um **PostgreSQL real** (não há mocks do banco — as regras dependem de constraints e transações reais).

- Banco: `TEST_DATABASE_URL` (padrão `postgres://livrin_user:livrin_dev_password@localhost:5432/livrin_test`). **Ele é apagado e recriado** no início de cada arquivo de teste; por segurança, o nome precisa conter "test".
- Uploads vão para uma pasta temporária do sistema.

```bash
cd api
npm test            # execução única
npm run test:watch  # modo observação
```

Com Docker (modo dev), crie o banco de testes e rode dentro do container:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec db createdb -U livrin_user livrin_test
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec \
  -e TEST_DATABASE_URL=postgres://livrin_user:<senha>@db:5432/livrin_test api npm test
```

Cobertura atual (22 testes):

| Arquivo | Cenários |
| --- | --- |
| `auth.test.ts` | cadastro sempre `USER` (rejeita `role`), e-mail normalizado, duplicado (409), senha fraca (400), login/`me`, mensagem genérica para credenciais inválidas, token inválido (401), troca de senha; `/admin` → 401/403; desativação invalida token imediatamente; proteção contra remover o próprio admin; redefinição de senha; ID inválido (400) e busca com caracteres de SQL tratada como texto. |
| `works.test.ts` | rascunho sem arquivo; envio exige arquivo (422); arquivo falso rejeitado pela assinatura (400); envio com PDF cria checklist; obra não publicada invisível para visitantes/terceiros (404); edição bloqueada em análise (403); publicação antes da aprovação (409); nota da curadoria; transição inválida (409); rejeição sem motivo (400); aprovação conclui checklist; publicação; catálogo e download; edição só de metadados após publicar; avaliação única e atualizável; autor não avalia a própria obra; sessões de leitura e métricas do painel; audiodescrição (duplicada → 409, autor bloqueado em obra publicada → 403); exclusão bloqueada de gênero/usuário em uso (409); arquivamento remove do catálogo. |

## 2. Ponta a ponta no navegador (`e2e/`)

**Playwright** contra o sistema em execução (Docker ou dev), com dados de demonstração.

```bash
cd e2e
npm install
npx playwright install chromium     # primeira vez
ADMIN_PASSWORD=<senha do admin> DEMO_USER_PASSWORD=<senha demo> npm test
# BASE_URL=http://localhost:5173 (padrão)
```

Cenários: cadastro → submissão com upload (e validação de arquivo obrigatório) → visitante não vê obra em análise → admin aprova → autor publica → busca no catálogo → leitura do PDF com paginação por botão e teclado → avaliação por leitor → usuário comum bloqueado em `/admin` (front e API 403) → leitores EPUB e CBZ.

Cada execução cria um usuário e uma obra novos (nomes com carimbo de tempo).

## 3. Verificações estáticas

```bash
cd api && npm run typecheck && npm run build
cd web && npm run typecheck && npm run build
```

## O que foi verificado manualmente

Telas comparadas com o protótipo (login, catálogo, leitor, painel, análise, submissão), alto contraste, A-/A+, layout mobile com gaveta, edição de rascunho com audiodescrição, rejeição com motivo, CRUD de usuários e gêneros, moderação de avaliações. Ver o relatório final para o que **não** pôde ser verificado (build das imagens Docker no ambiente de desenvolvimento usado).
