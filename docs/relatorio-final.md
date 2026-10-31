# Relatório Final — Livrin 3.5.3

*30 de outubro de 2026*

A plataforma passou a ter monetização opcional por obra (gratuita, paga ou com publicidade), aquisição vinculada à conta e plano do leitor — e uma brecha real de acesso a obra paga foi encontrada e fechada. Todo pagamento continua simulado.

Depois disso, a 3.4.0 acrescentou a **janela de Libras** (VLibras, opcional e carregada sob demanda) e corrigiu uma segunda promessa que o sistema não cumpria: a marcação `hasLibras` prometia intérprete e não havia campo de vídeo.

A 3.5.0 fechou a série com **histórico de leitura**, a página **Planos do Livrin** com assinatura simulada que ativa o plano de verdade e permite cancelar, e a **audiodescrição que funciona em toda obra** — antes, obra sem descrição cadastrada tinha um botão que não fazia nada.

Três versões vieram depois. A **3.5.1** corrigiu o layout do player de audiodescrição e passou a **identificar a bandeira do cartão pelo número**, com validação por algoritmo de Luhn e conferência de vencimento nos dois lados — antes, o formulário contava dígitos e aceitava `1111 1111 1111 1111`. A **3.5.2** deu **licença** ao repositório, que era público e sem nenhuma, e separou por escrito o que é código sob MIT do que é obra autoral do grupo. A **3.5.3** aplicou as correções de uma **auditoria completa do repositório**, descrita no fim deste relatório.

---

## Resumo

Esta rodada entregou a monetização pedida e corrigiu uma falha de segurança encontrada no caminho. Em números: 51 arquivos alterados, 16 criados, duas migrations, 29 testes novos de API, duas decisões de arquitetura registradas.

A autoria passou a escolher, obra a obra, entre leitura livre, obra paga (até R$ 50,00) e obra com publicidade. Obra paga exige aquisição confirmada para ser lida ou baixada, e a aquisição pertence à conta, não ao navegador.

O leitor ganhou um plano `PREMIUM`, ativado pela administração, cuja única consequência é esconder os anúncios.

Nada foi reconstruído e nenhuma funcionalidade existente foi removida. Todas as obras anteriores continuam gratuitas, e todas as contas anteriores continuam no plano gratuito.

## Novas funcionalidades

| Funcionalidade | O que faz |
| --- | --- |
| Modalidade por obra | A autoria escolhe entre leitura livre, obra paga e obra com publicidade, no mesmo formulário de publicação |
| Preço com teto | De R$ 1,00 a R$ 50,00, validado na API e por `CHECK` no banco |
| Aquisição | Tabela `purchases`, vinculada à conta, com preço congelado no momento da compra |
| Biblioteca pessoal | Rota `/biblioteca`, com as obras adquiridas e o histórico de todas as cobranças |
| Fluxo de pagamento | Cartão, Pix e boleto simulados, com estados de pendente, aprovado, cancelado e expirado |
| Expiração | Pix 30 min, cartão 15 min, boleto 3 dias |
| Publicidade na leitura | Bloco na abertura, a cada quatro páginas e ao fim, só em obra com essa modalidade |
| Plano do leitor | `GRATUITO` e `PREMIUM`, ativado em Administração → Usuários |

Duas decisões moldaram o desenho.

**O preço é congelado na compra.** Se a autoria mudar o valor amanhã, o histórico de quem já pagou não muda junto.

**O premium não desbloqueia obra paga.** Quem define o preço é a autoria, e o dinheiro de uma assinatura da plataforma não é dela — um passe livre sobre obras pagas seria a plataforma vendendo trabalho de terceiros.

## Vulnerabilidades identificadas e corrigidas

**A audiodescrição de obra paga estava aberta.** `GET /works/:id/audio-descriptions` verificava apenas a visibilidade por status, não a aquisição. A audiodescrição traz a descrição de cada quadro e as falas de cada personagem: num quadrinho, é a obra inteira em texto. O endpoint do arquivo recusava corretamente, e este entregava o mesmo conteúdo em outro formato.

Pior que o vazamento em si: era uma porta dos fundos que atingia justamente quem mais depende da audiodescrição. A verificação passou a ser a mesma dos outros caminhos de conteúdo.

**A lição que fica**, registrada na [ADR 015](decisions/015-publicidade-e-plano.md): ao proteger conteúdo, a pergunta não é *quais endpoints servem arquivos*, é **por quais caminhos o conteúdo pode sair**. Numa plataforma de acessibilidade, o mesmo conteúdo existe de propósito em mais de uma forma.

### O que foi verificado e estava correto

- Senhas com bcrypt; `JWT_SECRET` obrigatório, mínimo de 32 caracteres, com lista de segredos vazados recusados.
- Upload com lista branca de extensão **e** conferência dos bytes iniciais; só as capas são servidas estaticamente.
- Nenhum `.env` no repositório, em nenhum commit do histórico — varri todos os caminhos que já existiram.
- Nenhum dado de cartão armazenado: formato validado, valor descartado.
- Cabeçalhos de segurança repetidos em cada bloco do nginx que declara `add_header`.

### O que NÃO era vulnerabilidade

Obra paga abre para a **autoria** e para a **administração**, sem compra. É a regra de revisão: a curadoria precisa conseguir abrir qualquer obra. Testar com essas contas dava a impressão de que o bloqueio falhava.

A correção não foi remover o acesso — isso quebraria a curadoria — e sim **declarar o motivo**: o detalhe da obra devolve `access.reason` (`LIVRE`, `COMPRADA`, `AUTORIA`, `ADMINISTRACAO`, `NEGADO`) e o leitor avisa na tela quando a obra paga foi aberta sem compra.

## O que já existia e foi preservado

Nada foi reconstruído. Continuam intactos: os três perfis e a hierarquia de permissões; o fluxo editorial de rascunho, análise e aprovação; o Selo Livrin e o checklist de curadoria; o leitor acessível com PDF, EPUB, CBZ e DOCX; a audiodescrição e o player; as três paletas do site e as quatro do leitor; a leitura por palavra sob o cursor; as doações; e toda a área administrativa.

Duas garantias de compatibilidade:

- **Obras existentes ficam gratuitas.** A migration define `GRATUITA` como padrão, então o catálogo se comporta exatamente como antes.
- **Contas existentes ficam no plano gratuito.** Ninguém perde acesso a nada.

A monetização **não substitui a curadoria**: definir um preço não publica a obra nem concede o Selo, e obra fora do catálogo não pode ser adquirida. Na estante, a modalidade aparece ao lado do selo, nunca dentro dele — misturar os dois sugeriria que pagar compra selo.

## Como a autoria escolhe a monetização

No formulário de publicação ou de edição da obra, na seção **Como disponibilizar**:

1. **Leitura livre** — qualquer pessoa lê sem pagar. É o padrão.
2. **Obra paga** — abre um campo de preço em reais, de R$ 1,00 a R$ 50,00.
3. **Livre, com publicidade** — abre um campo de percentual da receita destinado à autoria (padrão de 70%).

A escolha pode ser alterada depois da aprovação, junto com os metadados de divulgação: é decisão comercial, não conteúdo, e mudar o preço não altera o que a curadoria examinou.

O preço é digitado em reais e convertido em centavos inteiros uma única vez, no envio. A coerência entre modalidade e preço é verificada em três lugares: no navegador (conveniência), na API (regra) e no banco (garantia).

## Como testar cada meio de pagamento

> Todo pagamento é simulado. Nenhum dinheiro é movimentado e nenhuma cobrança é emitida. A interface avisa isso antes de qualquer campo.

Entre com uma conta de **leitor comum** — `tatiane@livrin.com` serve. Não use a administração: ela abre obra paga sem comprar, por ser a regra de revisão. Abra *Chamas de Agosto* (R$ 18,90 no seed) e clique em **Comprar obra**.

| Meio | O que preencher | Como concluir |
| --- | --- | --- |
| Pix | Nada | Copie o código se quiser e clique em **Simular pagamento aprovado** |
| Cartão | Titular qualquer, número `4111 1111 1111 1111`, validade `12/30`, código `123` | **Pagar**, depois **Simular pagamento aprovado** |
| Boleto | Nada | A linha digitável é de demonstração e não é pagável. **Simular pagamento aprovado** |

Depois de aprovada, a obra entra em **Minha biblioteca** e continua disponível ao sair e entrar de novo.

**Para ver o caminho que não libera:** clique em **Cancelar cobrança**, ou deixe expirar. A obra continua bloqueada e não entra na biblioteca.

**Para ver que o cliente não controla o preço:** a requisição de compra não tem campo de valor e o schema é estrito. Enviar `priceCents` devolve 400, não um desconto.

**Para ver a publicidade:** abra *Vozes do Mar* e avance as páginas. Em Administração → Usuários, mude aquela conta para Premium e recarregue: os anúncios somem, e a obra paga continua pedindo aquisição.

## Arquivos criados e modificados

51 arquivos alterados, 16 criados, nenhum removido.

### Criados

| Arquivo | Por quê |
| --- | --- |
| `api/drizzle/0006_monetizacao.sql` | Modalidade, preço e a tabela `purchases`, com os `CHECK` e o índice único parcial |
| `api/drizzle/0007_plano_do_leitor.sql` | Coluna `plan` em `users` |
| `api/src/services/purchases.service.ts` | Regras de aquisição: preço do banco, idempotência, expiração, guarda de leitura |
| `api/src/controllers/purchases.controller.ts` | Rotas de compra, confirmação, cancelamento e biblioteca |
| `api/src/validators/purchases.schemas.ts` | Schema estrito, **sem campo de valor**; cartão validado e descartado |
| `api/tests/purchases.test.ts` | 18 casos de preço, acesso, idempotência e cancelamento |
| `api/tests/acesso-e-modalidades.test.ts` | Os 11 cenários A–L |
| `web/src/hooks/purchases.ts` | Consultas e mutações de aquisição |
| `web/src/components/works/AquisicaoDialog.tsx` | Fluxo de cartão, Pix e boleto |
| `web/src/components/works/Modalidade.tsx` | Indicação de modalidade na estante |
| `web/src/components/reader/Publicidade.tsx` | Blocos publicitários e onde cabem |
| `web/src/pages/Biblioteca.tsx` | Biblioteca pessoal e histórico |
| `docs/decisions/014-monetizacao-e-aquisicao.md` | Registra a revisão da ADR 011 |
| `docs/decisions/015-publicidade-e-plano.md` | A brecha, a publicidade e o plano |
| `docs/pagamento-real-opcoes.md` | Estudo de provedores reais, sem orçamento |
| `docs/obras-dominio-publico.md` | Critério para obra de terceiro no acervo |

### Modificados, em grupos

- **Acesso**: `works.service.ts` e `audio-descriptions.service.ts` ganharam a guarda de leitura; `purchases.service.ts` passou a devolver o motivo do acesso.
- **Modelo**: `schema.ts` (modalidade, preço, `purchases`, plano), `seed.ts` e `seed-data.ts` (duas obras de demonstração com modalidade).
- **Validação**: `works.schemas.ts` e `admin.schemas.ts`; `updateWorkSchema` foi separado em objeto e refinamento, porque `.superRefine` impede o `.extend` que a administração usa.
- **Interface**: `Reader.tsx`, `WorkCard.tsx`, `WorkForm.tsx`, `Sidebar.tsx`, `App.tsx`, `AdminUsers.tsx`, `types/api.ts`.
- **Documentação**: `README.md`, `CHANGELOG.md`, `docs/README.md`, ADR 011 marcada como revista em parte.

## Testes executados e resultados

**Onde rodaram:** na integração contínua do GitHub, contra um PostgreSQL de verdade. **Não rodaram na máquina de desenvolvimento**: o contêiner da sessão ficou sem DNS e as dependências não instalaram. O que foi feito localmente foi conferência de sintaxe.

| Verificação | Resultado |
| --- | --- |
| API — tipos e testes | passou |
| Front-end — tipos e build | passou |
| Docker — as imagens constroem | passou |

A suíte da API tem **90 casos**, em sete arquivos. Os três criados nesta série somam 42: 18 em `purchases.test.ts`, 11 em `acesso-e-modalidades.test.ts` e 13 em `historico-e-planos.test.ts`.

### Os cenários A–L

| Cenário | O que verifica | Resultado |
| --- | --- | --- |
| A | Obra gratuita continua acessível para ler e baixar | passou |
| B | Obra paga sem compra: leitura bloqueada, informações públicas visíveis | passou |
| C | Download direto bloqueado pelo backend, com e sem token | passou |
| D | Pagamento aprovado libera leitura, download e audiodescrição | passou |
| E | Cabeçalhos e corpos forjados não liberam nada | passou |
| F | Cobrança cancelada mantém o bloqueio e não entra na biblioteca | passou |
| G, H, I | Cada obra guarda a própria modalidade; paga não é tratada como publicidade | passou |
| J | Premium ativado pela administração não desbloqueia obra paga | passou |
| K | Permissões sobrevivem a sair e entrar de novo | passou |
| L | Audiodescrição de obra paga não é porta dos fundos | passou |

O cenário **E** foi testado da única forma que faz sentido: ignorando o frontend por completo e batendo direto na API. Se o acesso depende só do servidor, nenhuma alteração no navegador muda nada.

**Um teste falhou na primeira tentativa, e o erro era do próprio teste.** O cenário K exigia que o token de um novo login fosse diferente do anterior. Não é: o `iat` do JWT tem resolução de um segundo, então dois logins no mesmo segundo produzem a mesma string. A asserção foi corrigida, não o código.

## Executar o projeto do zero

Precisa de Docker e Docker Compose. Mais nada.

1. Clone o repositório e entre na pasta.
2. Copie `.env.example` para `.env`.
3. Gere um `JWT_SECRET` com pelo menos 32 caracteres e escreva no `.env`:
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
4. Rode `./iniciar.sh` (Linux e macOS) ou `iniciar.bat` (Windows).
5. Abra `http://localhost:5173`.

As migrations e o seed rodam sozinhos na subida. O passo a passo completo, com o que fazer em cada erro, está em [`README.md`](../README.md) e em [`docs/rodar-no-linux.md`](rodar-no-linux.md).

As contas de demonstração e suas senhas estão no `README.md`. As senhas reais vêm do `.env`; o repositório não guarda segredo nenhum.

> `docker compose down -v` apaga o volume do banco e, com ele, tudo o que foi cadastrado. Sem o `-v`, os dados permanecem.

## Auditoria da 3.5.3

Antes do fechamento, o repositório inteiro foi auditado: todas as pastas, os 87 arquivos TypeScript da API, os 58 do front, as nove migrations, os 50 arquivos de documentação e a configuração de Docker e de integração contínua.

### O que a auditoria verificou e estava correto

Nenhuma chamada de API do front sem rota correspondente no servidor, e nenhum handler de rota sem controller — as duas listas foram cruzadas inteiras, não por amostragem. Nenhum import quebrado nos dois pacotes. As dez tabelas e os onze enums do `schema.ts` batem com as nove migrations, incluindo as renomeações de tipo (`user_role_v2 → user_role`, `work_status_v2 → work_status`) e o `ADD VALUE` do `DOCX`. Migrations e `meta/_journal.json` em sincronia. Os 25 arquivos citados pelo seed existem em `seed-assets`. Nenhum link relativo quebrado na documentação. Nenhuma dependência importada sem ser declarada. Nenhum `TODO`, `console.log`, `any` ou `.only` esquecido. As três saídas de conteúdo — arquivo, faixa de áudio e audiodescrição — verificam aquisição.

### O que foi corrigido

| Achado | Correção |
| --- | --- |
| O limite de login contava acertos, e numa sala atrás do mesmo Wi-Fi o grupo e quem avaliasse esgotariam a cota **entrando com a senha certa** | `skipSuccessfulRequests`: só tentativa que falha consome cota. Força bruta é feita de erros |
| O mesmo limitador freava o login e a abertura de cobrança, onde o acerto é justamente o que precisa ser contado | `cobrancaLimiter` separado, aplicado a apoio, compra e assinatura |
| A garantia de banco contra cobrança duplicada não alcançava a assinatura de plano, porque `work_id` nulo escapa do índice único | Assinatura passou a serializar com `SELECT … FOR UPDATE` sobre a linha da conta |
| Duas cores fixas ignoravam o sistema de temas | Substituídas por token |
| A chave que evita repetir palavra na leitura em voz alta colidia entre nós de texto com início igual | Identidade do nó via `WeakMap`, sem heurística |
| `PAYMENT_PROVIDER` não estava documentada em nenhum `.env.example` | Documentada nos dois, com os valores aceitos |
| Os três `package-lock.json` registravam a versão `3.1.5` | Sincronizados |

### A correção que foi recusada

A auditoria recomendou `NULLS NOT DISTINCT` no índice `purchases_one_confirmed_per_user_work`, para estender ao plano a garantia que a compra de obra já tem. **A recomendação estava errada, e isso foi descoberto ao implementá-la.**

Cancelar assinatura não apaga o que foi pago: a cobrança anterior permanece `CONFIRMADA`. Um índice único sobre assinaturas confirmadas impediria que alguém que cancelou voltasse a assinar — trocaria uma corrida improvável por um defeito garantido, e um defeito que só apareceria com uma pessoa real tentando voltar a ser premium. A solução adotada serializa a decisão em transação. Um teste novo cobre exatamente o caminho que o índice teria quebrado.

Ver [ADR 018](decisions/018-assinatura-concorrente.md).

## Pendências e o que não foi verificado

### Não verificado

**A suíte de navegador (Playwright) não roda na integração contínua.** As três verificações automáticas cobrem API, front-end e Docker. O fluxo clicado de ponta a ponta — abrir a obra paga, pagar pela tela, ler — **ainda não foi executado por ninguém**. Vale rodar antes da apresentação.

### Pendências conhecidas

| Pendência | Impacto |
| --- | --- |
| Painel administrativo de publicidade simulada | Nenhum na demonstração; os dados seriam fictícios de qualquer forma |
| Design de formulários e administração | Estrutural, pouco visual |
| As telas de biblioteca, histórico e planos não têm teste de interface | O servidor delas é testado; a camada visual não. O único defeito visual desta série foi achado a olho |
| A assinatura abre a cobrança dentro da transação | Nenhum com o provedor simulado, que é instantâneo. Com provedor real, a transação seguraria a conexão durante a chamada externa |
| O limite do nginx (`client_max_body_size 200m`) é fixo e não acompanha `MAX_UPLOAD_MB` | Nenhum hoje, com folga de 20 MB. Aumentar a variável além de 200 faria o nginx recusar antes da API |

As quatro pendências da 3.5.0 que não aparecem mais aqui — `PAYMENT_PROVIDER` sem documentação, as duas cores fixas, a colisão de chave na leitura e a versão dos `package-lock.json` — foram corrigidas na 3.5.3.

### Configuração manual

Só duas coisas exigem intervenção: escrever o `JWT_SECRET` no `.env`, e ativar o plano Premium de uma conta em Administração → Usuários, se quiser demonstrar a leitura sem anúncios.

### Limites assumidos

Não há envio de e-mail (sem SMTP), então a recuperação de senha é feita pela administração. Não há integração publicitária nem adquirente de pagamento: ambos são simulados e declarados como tal na própria interface.

Não se afirma aqui que o projeto está seguro porque algumas verificações passaram. A auditoria desta rodada achou uma brecha real; uma revisão mais profunda, feita por quem não escreveu o código, provavelmente acharia outras.
