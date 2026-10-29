# Pagamento simulado — todos os dados da demonstração

> **Nada aqui movimenta dinheiro.** Não há provedor de pagamento, não há cobrança emitida, não há requisição para fora do sistema. Os números abaixo são números públicos de teste, que nenhum banco emitiu para ninguém, e servem só para a tela ter o que conferir. A interface avisa isso antes de qualquer campo.
>
> Este arquivo existe para a hora da apresentação: tudo o que precisa ser digitado está aqui, em uma página, sem precisar caçar no README principal. O porquê de cada decisão está no fim, caso perguntem.

Voltar para o [README principal](README.md) · Decisão técnica: [ADR 017](docs/decisions/017-bandeira-do-cartao.md)

---

## Sumário

- [Com qual conta entrar](#com-qual-conta-entrar)
- [Onde o pagamento aparece](#onde-o-pagamento-aparece)
- [Cartão: todos os números](#cartão-todos-os-números)
- [Titular, validade e código de segurança](#titular-validade-e-código-de-segurança)
- [Pix](#pix)
- [Boleto](#boleto)
- [Assinar e cancelar o plano](#assinar-e-cancelar-o-plano)
- [O que falha de propósito](#o-que-falha-de-propósito)
- [Por que não há seletor de bandeira](#por-que-não-há-seletor-de-bandeira)
- [Onde isso está no código](#onde-isso-está-no-código)
- [Se perguntarem na apresentação](#se-perguntarem-na-apresentação)

---

## Com qual conta entrar

| Perfil | E-mail | Senha |
| --- | --- | --- |
| **Leitor comum** — use esta | `tatiane@livrin.com` | `Demo.Livrin2026` |
| Leitor comum (alternativa) | `lucas@livrin.com` | `Demo.Livrin2026` |

**Entre como leitor comum, não como administrador.** A administração e a autoria abrem obra paga **sem comprar**, porque a curadoria precisa conseguir abrir qualquer obra para avaliá-la. Se você demonstrar com `admin@livrin.local`, a obra paga vai abrir de primeira e parecerá que o bloqueio não existe.

Se isso acontecer na frente da banca, a resposta está na própria tela: o leitor avisa o motivo do acesso, e o detalhe da obra devolve `COMPRADA`, `AUTORIA`, `ADMINISTRACAO` ou `NEGADO`.

---

## Onde o pagamento aparece

São dois lugares, e os dois usam **o mesmo diálogo** — o que for digitado em um vale no outro:

| Onde | O que | Valor |
| --- | --- | --- |
| **Comprar obra** | Obra paga no catálogo. No seed, *Chamas de Agosto* | R$ 18,90 |
| **Planos do Livrin** → assinar | Plano premium do leitor, no menu do cabeçalho | R$ 9,90 |

---

## Cartão: todos os números

A bandeira é **identificada enquanto se digita**: não há seletor para escolher. Digite o número e o nome da bandeira aparece ao lado do campo.

Todos os números abaixo foram conferidos um por um: passam no algoritmo de Luhn, detectam a bandeira indicada e têm a quantidade de dígitos daquela bandeira. Pode digitar com espaço ou sem — o campo formata sozinho.

O próprio formulário traz **um número de cada bandeira**, numa seção recolhida — o suficiente para não travar numa demonstração. Esta página traz **todos**, para quando você quiser mostrar mais de um por bandeira ou provar um caso específico.

### Visa

| Número | Dígitos | Código |
| --- | --- | --- |
| `4111 1111 1111 1111` | 16 | 3 |
| `4012 8888 8888 1881` | 16 | 3 |
| `4555 7375 8689 9658` | 16 | 3 |
| `4532 7547 8964 0` | 13 | 3 |

O de 13 dígitos é legítimo: Visa tem faixas de 13, 16 e 19. Serve para mostrar que a validação não é "tem que ter 16".

### Mastercard

| Número | Dígitos | Código |
| --- | --- | --- |
| `5555 5555 5555 4444` | 16 | 3 |
| `5105 1051 0510 5449` | 16 | 3 |
| `5276 0000 0000 0006` | 16 | 3 |
| `2223 0000 4841 4004` | 16 | 3 |

O último começa com 2: desde 2017 a Mastercard também emite na faixa 2221–2720, e a detecção cobre isso.

### Elo

| Número | Dígitos | Código |
| --- | --- | --- |
| `6362 9700 0045 7013` | 16 | 3 |
| `6516 5200 0000 0001` | 16 | 3 |
| `5067 2686 8888 8884` | 16 | 3 |
| `4011 7800 0000 0006` | 16 | 3 |

**O último é o número para mostrar que a detecção não é ingênua:** começa com `4`, como todo Visa, e ainda assim aparece como **Elo**. Veja [a armadilha das faixas](#as-duas-armadilhas-vale-mostrar).

### American Express

| Número | Dígitos | Código |
| --- | --- | --- |
| `3782 822463 10005` | 15 | **4** |
| `3714 496353 98431` | 15 | **4** |
| `3434 343434 34343` | 15 | **4** |

Amex tem 15 dígitos e **código de 4 dígitos**. O campo de código muda de tamanho sozinho quando a bandeira é identificada — é a diferença mais visível de todas, e a mais fácil de demonstrar.

### Hipercard

| Número | Dígitos | Código |
| --- | --- | --- |
| `6062 8256 2425 4001` | 16 | 3 |
| `6062 8200 0000 0003` | 16 | 3 |
| `3841 0000 0000 0007` | 16 | 3 |

### Diners Club

| Número | Dígitos | Código |
| --- | --- | --- |
| `3056 930902 5904` | 14 | 3 |
| `3852 000002 3286` | 14 | 3 |
| `3600 000000 0008` | 14 | 3 |

Diners tem 14 dígitos e agrupamento 4-6-4, não 4-4-4-4.

### As duas armadilhas (vale mostrar)

Estes dois números existem porque a ordem em que as faixas são testadas muda o resultado. É o detalhe que separa uma detecção que funciona de uma que parece funcionar:

| Número | Lido ingenuamente como | O que o sistema diz | Por quê |
| --- | --- | --- | --- |
| `4011 7800 0000 0006` | Visa (começa com 4) | **Elo** | A Elo emite em faixas que começam com 4 — `4011`, `4312`, `4389`, `4514`, `4576` — e são dela, não da Visa |
| `3841 0000 0000 0007` | Diners (começa com 38) | **Hipercard** | A faixa `3841` do Hipercard cai dentro do `38` do Diners |

A regra, que está comentada no código: testar **do mais específico para o mais genérico**. `VISA: /^4/` é a última regra da lista justamente porque é a mais larga.

---

## Titular, validade e código de segurança

| Campo | O que aceitar | Exemplo |
| --- | --- | --- |
| **Titular** | Qualquer nome, 3 caracteres ou mais | `ALEXANDRE TESTE` |
| **Validade** | `MM/AA`, qualquer mês futuro. A barra é inserida sozinha | `12/30` |
| **Código** | 3 dígitos; **4 no American Express** | `123` / `1234` |

Um cartão vale até o **último dia** do mês impresso nele, e a conferência respeita isso: em outubro de 2026, `10/26` ainda passa.

---

## Pix

Não há nada para preencher.

1. **Comprar obra** → **Pix**
2. Aparece um código de demonstração (dá para copiar, não serve para pagar)
3. **Simular pagamento aprovado**

A cobrança Pix expira em **30 minutos**.

---

## Boleto

Também não há nada para preencher. A linha digitável é de demonstração e **não é pagável** em banco nenhum.

1. **Comprar obra** → **Boleto**
2. **Simular pagamento aprovado**

A cobrança de boleto expira em **3 dias** — é o prazo que um boleto real teria.

---

## Assinar e cancelar o plano

1. **Planos do Livrin**, no cabeçalho
2. **Assinar** → mesmo diálogo de pagamento, R$ 9,90
3. Confirme. A conta passa a `PREMIUM` na hora

Para mostrar que o plano **faz** algo: abra *Vozes do Mar* antes e depois de assinar. É uma obra na modalidade publicidade, e com o plano ativo os blocos publicitários desaparecem da leitura.

Para cancelar: **Planos do Livrin** → **Cancelar plano**. A conta volta a `GRATUITO` e os anúncios voltam.

**O premium não desbloqueia obra paga**, e isso é de propósito: quem define o preço de uma obra é a autoria, e o dinheiro de uma assinatura não é dela. *Chamas de Agosto* continua pedindo aquisição mesmo com plano ativo.

---

## O que falha de propósito

Esta tabela é o roteiro para a pergunta "e se eu digitar qualquer coisa?". Todas as mensagens abaixo são as que aparecem de verdade na tela.

| O que digitar | O que acontece |
| --- | --- |
| `1111 1111 1111 1111` | **Número de cartão inválido.** São dezesseis dígitos que nenhum banco emitiria: reprova no Luhn |
| `1234 5678 9012 3456` | **Bandeira não reconhecida.** Nenhuma bandeira emite na faixa que começa com 1 |
| `4111 1111 1111 111` | **Um cartão Visa tem 13, 16 ou 19 dígitos.** |
| `4111 1111 1111 1111` com validade `01/20` | **Validade inválida ou vencida (use MM/AA).** |
| `4111 1111 1111 1111` com validade `13/30` | A mesma mensagem: não existe mês 13 |
| Amex com código de 3 dígitos | **O código de segurança tem 4 dígitos nesta bandeira.** |

E os dois caminhos que **não** liberam a obra:

| O que fazer | O que acontece |
| --- | --- |
| **Cancelar cobrança** | A cobrança vira `CANCELADA` e a obra continua bloqueada |
| Deixar expirar | Pix 30 min, cartão 15 min, boleto 3 dias. Depois disso a cobrança vence sozinha e a obra continua bloqueada |

### A validação não está só no navegador

Isto é o ponto que mais vale guardar para a banca. Se alguém burlar a tela — mandar a requisição direto, pelo terminal ou pelo console do navegador — o servidor **refaz as mesmas conferências por conta própria** e devolve `400`:

```bash
# 1. pegue um token entrando como leitor
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"tatiane@livrin.com","password":"Demo.Livrin2026"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')

# 2. Luhn inválido: o servidor recusa, mesmo sem passar pela tela
curl -s -X POST http://localhost:3000/api/works/<id>/purchase \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"method":"CARTAO","card":{"holder":"TESTE","number":"1111111111111111","expiry":"12/30","cvv":"123"}}'
# -> 400 "Número de cartão inválido."
```

E a requisição de compra **não tem campo de valor**: o preço é lido da obra no banco, e o schema é estrito. Mandar `priceCents` devolve `400`, não um desconto:

```bash
curl -s -X POST http://localhost:3000/api/works/<id>/purchase \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"method":"PIX","priceCents":1}'
# -> 400
```

O `<id>` é o da obra, que aparece na URL ao abrir a obra no site. Se você subiu com outra porta (`API_PORT` no `.env`), troque o `3000`.

Dois testes automatizados cobrem a parte do cartão (`api/tests/purchases.test.ts`), e rodam na integração contínua a cada mudança.

### Nada do cartão é guardado

Número, validade e código de segurança são conferidos em formato e **descartados em seguida**. Não entram em banco, em log, em mensagem de erro nem no histórico de compras. O histórico guarda o meio de pagamento (`CARTAO`), o valor e o estado — nada mais.

---

## Por que não há seletor de bandeira

O pedido original era "que o usuário possa escolher o tipo do cartão, Nubank, Visa, Mastercard… **ou que identifique**". A escolha foi identificar, por duas razões:

**Nubank não é bandeira, é emissor.** Nubank, Itaú, Inter e Caixa são bancos que emitem cartões; Visa, Mastercard, Elo, Amex, Hipercard e Diners são as bandeiras que processam. Um cartão Nubank **é** um Mastercard ou um Visa. Uma lista que misturasse os dois estaria errada no conceito, e a banca pode perguntar exatamente isso.

**O número já carrega a informação.** As primeiras posições de um cartão são o IIN, a faixa que identifica quem emite e por qual bandeira. Pedir que a pessoa escolha algo que o número já informa só cria uma chance a mais de divergência entre o que ela marcou e o que digitou — e aí o sistema teria de decidir em quem acreditar. Checkout de verdade detecta; por isso este também detecta.

**E por que Luhn.** Antes, o formulário conferia a quantidade de dígitos e nada mais, então `1111 1111 1111 1111` passava. O algoritmo de Luhn é a conferência que todo número de cartão real satisfaz — é o que separa "dezesseis dígitos quaisquer" de "um número plausível". Sem ele, a validação é enfeite.

---

## Onde isso está no código

| Arquivo | O que faz |
| --- | --- |
| `web/src/lib/cartao.ts` | Faixas de cada bandeira, Luhn, formatação, validade. Os números de teste também estão aqui |
| `web/src/components/works/PagamentoSimulado.tsx` | O diálogo de pagamento, usado pela compra de obra e pela assinatura do plano |
| `web/src/components/works/AquisicaoDialog.tsx` | A compra de obra, que é uma casca fina sobre o diálogo acima |
| `api/src/validators/purchases.schemas.ts` | A mesma conferência no servidor: Luhn, validade, e o schema estrito sem campo de preço |
| `api/src/services/purchases.service.ts` | Preço lido do banco, estados da cobrança, expiração, acesso de leitura |
| `api/tests/purchases.test.ts` | Os testes, inclusive Luhn inválido e cartão vencido |

---

## Se perguntarem na apresentação

**"Isso cobra de verdade?"**
Não. Não há provedor de pagamento, não há requisição para fora, nenhum valor é movimentado. A tela avisa antes de qualquer campo. O estudo das opções para receber de verdade, caso o projeto seguisse, está em [docs/pagamento-real-opcoes.md](docs/pagamento-real-opcoes.md).

**"Por que não tem Nubank na lista?"**
Porque Nubank é o banco que emite, não a bandeira que processa. Um cartão Nubank é um Mastercard ou um Visa, e é o número que diz qual.

**"E se eu digitar um número qualquer?"**
A tela recusa, e o servidor também — veja [o que falha de propósito](#o-que-falha-de-propósito). A conferência existe nos dois lados porque validação que só existe no navegador não é validação.

**"Vocês guardam os dados do cartão?"**
Não. São validados em formato e descartados. Nada entra em banco, log ou histórico.

**"Dá para mudar o preço pelo navegador?"**
Não. A requisição de compra não tem campo de valor e o schema é estrito: enviar `priceCents` devolve `400`. O preço cobrado é sempre o que está no banco.

**"Como vocês sabem que funciona?"**
Pelos testes automatizados da API, que rodam na integração contínua a cada mudança. O que **não** é verificado automaticamente é o fluxo clicado de ponta a ponta: a suíte de navegador existe (Playwright) mas roda à mão, não no CI. Está dito assim em [docs/testing.md](docs/testing.md).
