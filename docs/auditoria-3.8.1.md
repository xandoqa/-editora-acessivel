# Auditoria técnica — versão 3.8.1

**Data:** 01/11/2026 · **Escopo:** front-end, back-end, API, banco, rotas, componentes, formulários, responsividade, tratamento de erros, dependências, configuração e segurança.

## Como esta auditoria foi feita

Varredura automatizada primeiro, leitura dirigida depois. As varreduras cobriram:

| # | O que foi verificado | Resultado |
| --- | --- | --- |
| 1 | Imports relativos apontando para arquivo inexistente | 0 |
| 2 | `console.log`/`debug` esquecido em código de produção | 0 (só o logger e um texto de ajuda) |
| 3 | Marcadores `TODO`/`FIXME`/`HACK`/`XXX` | 0 |
| 4 | `dangerouslySetInnerHTML`, `eval`, `as any`, `@ts-ignore`, `target="_blank"` sem `rel` | 0 |
| 5 | Paridade entre `env.ts` e `.env.example` | sem divergência |
| 6 | Migrations × `_journal.json` (11 arquivos, 11 entradas, índices em ordem) | consistente |
| 7 | Tabelas do schema × `CREATE TABLE` das migrations | consistente nos dois sentidos |
| 8 | Chamadas do front sem rota correspondente na API | 0 |
| 9 | Chaves de tradução montadas em tempo de execução (`t(\`status.${x}\`)`) | todas existem nos 3 idiomas |
| 10 | `localStorage` sem `try/catch` | 0 |
| 11 | Larguras fixas que estourariam 360 px | 0 (as duas achadas são tabelas dentro de `overflow-x-auto`) |
| 12 | Grids de coluna fixa sem empilhar no celular | 0 |
| 13 | Segredos versionados; `.gitignore` cobrindo `.env`, `uploads`, `dist` | nenhum segredo, cobertura ok |
| 14 | Links quebrados na documentação (`.md`, `.png`, `.sh`…) | 0 |
| 15 | Scripts de `package.json` apontando para arquivo inexistente | 0 |
| 16 | Arquivos referenciados pela integração contínua | todos existem |
| 17 | Paridade das 320 chaves de tradução nos três idiomas | exata |

Leitura dirigida em: middleware de autenticação, upload, resolução de caminho de arquivo, cabeçalhos de segurança, CORS, tratamento central de erros, interceptadores do cliente HTTP, e o código novo das versões 3.7.0 e 3.8.0.

## Defeitos encontrados e corrigidos

### Bug 1 — Audiodescrição começava sozinha na obra errada

- **Local:** `web/src/pages/Reader.tsx`
- **Causa:** o `setTimeout` de 300 ms que atende `?ouvir=1` não era cancelado na limpeza do efeito.
- **Impacto:** trocar de obra em menos de 300 ms deixava o temporizador antigo vivo; ele encontrava o player já montado da obra **nova** e chamava `play()`. A audiodescrição começava numa obra que ninguém pediu para ouvir.
- **Correção:** guardar o identificador e `clearTimeout` no retorno do efeito.
- **Risco da correção:** nenhum. Cancelar temporizador na desmontagem é o comportamento esperado; o caminho normal (ficar na obra) não muda.
- **Status:** corrigido.

### Bug 2 — Variáveis do Fale Conosco não chegavam ao contêiner

- **Local:** `docker-compose.yml`, `.env.example` (raiz)
- **Causa:** na 3.8.0 as variáveis de SMTP foram documentadas em `api/.env.example`, mas o Compose só repassa ao contêiner o que está listado no bloco `environment` do serviço.
- **Impacto:** **alto para a apresentação.** Quem sobe o projeto pelo `./iniciar.sh` — que é o caminho documentado — configuraria o e-mail em `api/.env` e não aconteceria nada, sem nenhuma mensagem de erro. A entrega por e-mail era impossível de ligar pelo Docker.
- **Correção:** as seis variáveis entraram no `docker-compose.yml` com padrão vazio, e o bloco de instruções entrou no `.env.example` da raiz.
- **Risco da correção:** nenhum. Sem preenchimento, as variáveis chegam vazias e o Zod as transforma em `undefined` — exatamente o estado anterior.
- **Status:** corrigido.

### Bug 3 — Título do cartão montado por `split` de texto traduzido

- **Local:** `web/src/pages/Contato.tsx`
- **Causa:** o título saía de `t('contato.semRobo').split('.')[0]`.
- **Impacto:** funciona hoje nos três idiomas, e quebra silenciosamente no dia em que alguém mudar a pontuação de uma tradução — a frase parte no meio.
- **Correção:** chave própria (`contato.semRoboTitulo`) nos três idiomas.
- **Risco da correção:** nenhum; acrescenta chave, não altera nenhuma existente.
- **Status:** corrigido.

### Bug 4 — Três variáveis de ambiente não ajustáveis pelo Docker

- **Local:** `docker-compose.yml`
- **Causa:** `BCRYPT_ROUNDS`, `LOG_REQUESTS` e `PAYMENT_PROVIDER` estavam declaradas no `env.ts` com padrão, mas fora do bloco `environment`.
- **Impacto:** baixo. Os padrões são adequados; o efeito era não poder ajustá-los sem reconstruir a imagem.
- **Correção:** acrescentadas com **os mesmos padrões do código**.
- **Risco da correção:** nenhum — valores idênticos aos que já valiam.
- **Status:** corrigido.

### Bugs 5 e 6 — Código morto

- `contarNovas` em `api/src/services/contact.service.ts` (função exportada e nunca chamada) e um `useRef` atribuído e nunca lido em `web/src/components/contato/BotaoFaleConosco.tsx`.
- **Impacto:** nenhum em execução; código morto envelhece mal e confunde quem lê.
- **Status:** removidos. A remoção do primeiro deixou um import órfão que reprovou o build — corrigido, e os doze arquivos alterados na branch foram varridos pelo mesmo critério.

## Problemas documentados e NÃO corrigidos

Cada um destes tem correção conhecida, e em todos o risco da correção hoje é maior do que o problema.

### 1. A resposta do contato espera o SMTP

`receberMensagem` grava e só então tenta entregar, aguardando até 15 segundos quando o servidor de e-mail não responde. A requisição HTTP fica em pé durante essa espera.

**Por que não mexer agora:** passar a entrega para segundo plano tiraria da resposta o campo `entregue`, que é justamente o que impede a tela de prometer um e-mail que não saiu. Isso é comportamento importante, e trocá-lo na véspera da apresentação não se paga. A espera só acontece com SMTP **configurado e falhando** — na configuração padrão, a resposta é imediata.

**Correção futura:** fila de envio com estado próprio, e a tela consultando o resultado depois.

### 2. A lista de autores carrega todas as obras aprovadas

`listAuthors()` busca as obras e agrupa em memória, porque o card de cada autor mostra capas — e capa só sai da consulta de obras.

**Por que não mexer agora:** com dezenas de obras isso é uma consulta e alguns milissegundos. Trocar por consulta agregada exigiria uma segunda consulta para as capas, e a troca só compensa num acervo muito maior.

**Correção futura:** paginar a lista de autores e buscar as capas com `lateral join` por autor.

### 3. `npm audit` não pôde ser executado

O ambiente onde este trabalho foi feito não alcança o registro npm — por isso, inclusive, o cliente SMTP foi escrito sem dependência nova.

**Pendência para a máquina de quem apresenta:**

```bash
cd api && npm audit
cd ../web && npm audit
```

Não é bloqueio: as dependências estão travadas em `package-lock.json` e não houve dependência nova desde a última verificação.

### 4. Cobertura de tradução parcial

Cerca de 370 trechos da interface — formulário de obra, páginas administrativas, painel do autor — ainda não passam pelo dicionário e aparecem em português nos três idiomas. É medido a cada execução da integração contínua por `conferir-traducao.py`, que **não reprova** o PR porque a cobertura parcial é uma decisão declarada, não um descuido.

### 5. Janela de Libras duplicada transitoriamente

Já documentado na 3.6.1: com a gaveta do celular aberta, a `Sidebar` é montada duas vezes e o portal da janela de Libras aparece duplicado por instantes. Não afeta a leitura e a correção mexeria na montagem do layout.

## O que foi verificado e está correto

**Segurança.** `helmet` ativo; CORS com lista de origens; corpo JSON limitado a 1 MB; upload com nome gerado por UUID (o nome enviado nunca vira caminho), extensão em lista de permissão, limite de tamanho e pasta temporária antes do destino final; `absolutePath` recusa qualquer caminho que escape de `UPLOAD_DIR`; o tratador central de erros nunca devolve stack trace nem SQL ao cliente; todas as rotas administrativas passam por `authenticate` + `requireAdmin` no servidor, independentemente do que a interface mostra; `optionalAuth` trata token inválido como visitante em vez de recusar; limitadores por IP separados para login, cobrança, sessão de leitura e contato.

**Banco.** As onze migrations batem com o journal e com o schema, nos dois sentidos. As duas últimas (`0009_autores`, `0010_contato`) são aditivas: uma coluna anulável e uma tabela nova. Nenhuma linha existente é tocada por elas.

**Front-end.** Nenhum import quebrado em 74 componentes; todas as chamadas da API têm rota correspondente; expiração de sessão tratada por interceptador; todo acesso a `localStorage` protegido; tabelas largas dentro de contêiner rolável; nenhum grid de coluna fixa sem empilhar no celular.

## Verificação final

| Item | Como foi verificado |
| --- | --- |
| O projeto continua compilando | Integração contínua: tipos e build do front, tipos e testes da API |
| As imagens Docker continuam construindo | Job próprio na integração contínua |
| Rotas funcionando | Varredura de chamadas do front × rotas da API |
| Imports e referências | Varredura de imports relativos e de links da documentação |
| Componentes íntegros | `conferir-jsx.py`: 74 arquivos, todas as tags fechando na ordem |
| Contraste preservado | `conferir-contraste.py`: 273 pares acima do mínimo |
| Posicionamento preservado | `conferir-posicionamento.py`: três regras |
| Traduções | 320 chaves, paridade exata nos três idiomas |
| Nada removido por acidente | Diferença da branch revisada arquivo a arquivo |

## Ferramenta nova

`ferramentas/conferir-jsx.py`, agora na integração contínua. Sem `node_modules` no ambiente de desenvolvimento, uma `<div>` aberta e não fechada só aparecia dois minutos depois, no CI, normalmente com o commit já publicado. Ele responde **uma** pergunta — toda tag que abre fecha, na ordem certa? — em menos de um segundo, e não substitui o compilador.

As duas armadilhas que ele custou a acertar estão comentadas no arquivo: genérico de TypeScript (`useState<string>`) sendo confundido com tag, e a regra que resolvia isso engolindo as tags de fechamento, que vêm coladas no texto. A primeira versão acusava 140 problemas num projeto correto — relatório cheio de ruído é pior do que nenhum relatório.
