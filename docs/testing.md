# Testes

Duas suítes: **integração da API** (Vitest + Supertest contra um PostgreSQL de verdade) e **ponta a ponta** (Playwright, no navegador, contra o sistema inteiro no ar).

Nenhuma delas usa banco fingido. Um teste que passa contra um banco simulado não diz nada sobre migrations, restrições, índices e transações — que é onde mora metade dos defeitos.

---

## API

### Banco de teste

O schema é **apagado e recriado** no início de cada arquivo de teste. Por segurança, o nome do banco precisa conter `test`, e a suíte se recusa a rodar se não contiver.

Use o compose dedicado — ele sobe um PostgreSQL efêmero, em memória, na porta 5433:

```bash
docker compose -f docker-compose.test.yml up -d db-test

cd api
TEST_DATABASE_URL=postgres://livrin_test:livrin_test@localhost:5433/livrin_test npm test

docker compose -f docker-compose.test.yml down -v
```

Modo observador: `npm run test:watch` com a mesma variável.

Sem Docker: aponte `TEST_DATABASE_URL` para qualquer PostgreSQL seu cujo banco tenha `test` no nome.

### O que cada arquivo cobre

48 testes, em quatro arquivos.

| Arquivo | Cobre |
| --- | --- |
| `auth.test.ts` | Cadastro como `LEITOR` por padrão e recusa de `role=ADMIN` vindo do cliente; escolha do perfil de escritor no cadastro; e-mail duplicado (`409`); senha fraca (`400`); login e `/auth/me`; mensagem genérica para credenciais inválidas; token inválido ou ausente (`401`); troca de senha exigindo a atual; `/admin` → `401` para visitante e `403` para conta comum; desativação invalidando o token na hora; proteção contra remover o próprio acesso administrativo; redefinição de senha; ID de rota inválido (`400`) |
| `works.test.ts` | Leitor não cadastra obra e escritor cadastra; leitor ativa o próprio perfil de escritor; escritor não alcança a administração; rascunho sem arquivo; recusa de arquivo cuja assinatura binária não bate com a extensão; envio para análise criando o checklist; obra não aprovada invisível a visitantes e a terceiros; bloqueio de edição durante a análise; nota da curadoria, validação de transições e aprovação; **a obra aprovada aparece no catálogo sem nenhuma ação do autor**; avaliações (uma por pessoa, atualizável, autor não avalia a própria obra); sessões de leitura alimentando o painel; audiodescrição por página; proteção de gênero em uso e de usuário com obras; arquivamento tirando a obra do catálogo; manuscrito em `.docx` aceito com o tipo e o `Content-Type` corretos, `.docx` falso (que não é ZIP) recusado e **PDF truncado recusado no envio** |
| `historico-e-planos.test.ts` | Histórico agrupado por obra com a página mais distante; apagar exige conta; plano só ativa depois da confirmação no servidor; premium não libera obra paga; **quem cancelou pode assinar de novo** — o caminho que um índice único sobre assinaturas confirmadas quebraria |
| `purchases.test.ts` | Teto de R$ 50,00 e preço só em obra paga; acesso negado antes e liberado depois da confirmação; a autoria lê a própria obra paga; o cliente não controla o preço (enviar `priceCents` é `400`); idempotência da abertura e da confirmação; biblioteca isolada por conta; cartão de demonstração validado e nunca devolvido; número que reprova no Luhn e cartão vencido devolvem `400`; cancelar não libera; obra fora do catálogo não se vende |
| `acesso-e-modalidades.test.ts` | Os cenários A–L: obra gratuita intacta; obra paga bloqueada para ler e para baixar, com e sem token; pagamento aprovado liberando arquivo, download e audiodescrição; cabeçalhos e corpos forjados não liberam nada; cobrança cancelada mantendo o bloqueio; cada obra guardando a própria modalidade; premium não desbloqueando obra paga; permissões sobrevivendo a novo login; **e a audiodescrição de obra paga, que era uma porta dos fundos** |
| `catalog.test.ts` | Só obras `APROVADO` aparecem; rascunho, em análise e arquivada não vazam nem para visitante nem para outro usuário; filtro por formato; filtro por recurso de acessibilidade; busca por título e por tag; curinga de SQL tratado como texto; paginação e recusa de parâmetros inválidos; arquivar tira do catálogo e reaprovar devolve |
| `donations.test.ts` | Meios aceitos e aviso de provedor simulado; apoio anônimo com código de pagamento; valores fora da faixa e método inexistente; obra inexistente; apoio vinculado a obra e conta, com confirmação idempotente; ninguém confirma o apoio de outra pessoa; estatísticas somando só os confirmados; listagem administrativa bloqueada para não-administrador; **ler uma obra continua não exigindo apoio nenhum** |

Os testes em negrito existem por causa de defeitos reais: a obra que ficava presa entre a aprovação e o catálogo e a garantia de que a doação não virou um pedágio (3.0.0), e o PDF cortado no meio do envio que passava na validação e só falhava no leitor, longe da causa (3.1.2).

### O que a suíte não cobre

A renderização dos leitores roda só no navegador e não é exercitada aqui. Isso foi caro: entre a 3.1.0 e a 3.1.4, três correções seguidas passaram no CI e não apareciam na tela, porque o `index.html` era servido sem cabeçalho de cache e o navegador continuava com o pacote antigo. Nenhum teste de back-end pegaria isso. Hoje a versão aparece no rodapé do site justamente para que esse tipo de engano seja visível em um olhar.

---

## Ponta a ponta (Playwright)

Rodam contra um ambiente **já no ar**, com `SEED_DEMO_DATA=true`.

```bash
# 1. deixe o sistema rodando em outro terminal
./iniciar.sh                 # ou iniciar.bat

# 2. instale e rode
cd e2e
npm install
npm run install-browsers
npm test
```

As credenciais saem do `.env` da raiz — o mesmo arquivo que o `docker compose` usa. Não há valores duplicados dentro dos testes; se o `.env` não existir, a suíte falha com uma mensagem dizendo o que fazer.

> Até a 2.0.0 cada credencial tinha um padrão escrito no próprio teste, e esses padrões não batiam com nenhum arquivo do projeto: rodar `npx playwright test` sem exportar variáveis quebrava no login do administrador.

Para apontar para outro endereço: `BASE_URL=http://localhost:8080 npm test`.

### O que os testes de navegador cobrem

1. Escritora se cadastra escolhendo o perfil, preenche o formulário, tem o envio recusado sem arquivo, anexa o PDF e envia para análise.
2. Leitor tenta abrir a área de publicação e é mandado para "Meu perfil".
3. Visitante não vê a obra em análise.
4. A curadoria aprova e **a obra já está no catálogo** — sem nenhuma ação do autor entre uma coisa e outra.
5. A obra aparece na busca do catálogo e abre no leitor, com navegação por botão e por teclado.
6. Leitor avalia a obra.
7. Escritora não acessa a administração, nem pela interface nem chamando a API direto.
8. Apoiar funciona pelo rodapé, avisa que a cobrança é de demonstração e confirma.
9. Os leitores de EPUB e de CBZ renderizam as obras de demonstração.

### O que ainda é conferido à mão

O **leitor de `.docx`** roda só no navegador (`DOMParser` + JSZip), e a suíte da API não tem como exercitá-lo: ela não abre o arquivo. O que a API cobre é a entrada — aceitar `.docx`, gravar o tipo `DOCX`, servir o `Content-Type` certo e recusar um `.docx` que não é ZIP. A renderização em si se confere assim: entre como `caua@livrin.com`, abra *O Alfabeto das Coisas Pequenas* e troque tipografia, escala e paleta — o texto deve refluir, com títulos, lista e itálico preservados.

Um teste automatizado desse leitor exigiria `vitest` + `jsdom` no front-end, que hoje não tem suíte própria. Para criá-la: `cd web && npm i -D vitest jsdom @testing-library/react` e um `web/vitest.config.ts` com `environment: 'jsdom'`. O alvo natural é `web/src/components/reader/docxParser.ts`, que é função pura — entra XML, saem blocos.

---

## Integração contínua

`.github/workflows/ci.yml`, a cada push e pull request:

| Job | O que faz |
| --- | --- |
| `api` | `npm ci`, `npm run typecheck`, `npm run build` e `npm test` contra um PostgreSQL de serviço |
| `web` | `npm ci` e `npm run build` (que inclui a checagem de tipos) |
| `docker` | Constrói as duas imagens de produção |

Nenhum segredo do repositório é usado: o banco é efêmero e o `JWT_SECRET` dos testes é gerado na hora.

---

## O que não está automatizado

Honestidade sobre a cobertura:

- **Leitores de tela.** NVDA, VoiceOver e TalkBack exigem verificação manual. Os atributos ARIA e a ordem de foco são conferidos no código, não por robô.
- **Síntese de voz.** Depende de vozes instaladas no sistema operacional.
- **Contraste.** Calculado a partir dos tokens, não medido na tela renderizada.
- **Linter.** O projeto não traz ESLint instalado: adicioná-lo exige regenerar os `package-lock.json`, o que precisa de acesso ao registro npm. Para habilitar:
  ```bash
  cd api && npm i -D eslint @eslint/js typescript-eslint
  cd ../web && npm i -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks
  ```
  A checagem de tipos do TypeScript (`noUnusedLocals`, `noUnusedParameters`, `strict`) roda em todo build e cobre boa parte do que um linter pegaria.
