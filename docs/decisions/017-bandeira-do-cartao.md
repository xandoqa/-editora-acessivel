# ADR 017 — Bandeira do cartão detectada pelo número, e validação nos dois lados

**Data:** 29/10/2026 · **Versão:** 3.5.1 · **Estado:** aceita

## Contexto

O diálogo de pagamento simulado pedia titular, número, validade e código de segurança. A conferência do número era a quantidade de dígitos, e nada mais. Três consequências:

1. `1111 1111 1111 1111` passava. Dezesseis dígitos que nenhum banco emitiria.
2. O código de segurança exigia 3 dígitos sempre, inclusive em American Express, que tem 4.
3. A tela não dizia nada sobre o cartão digitado. Em uma apresentação, isso parece um campo de texto com máscara, não um checkout.

O pedido foi: "que o usuário possa escolher o tipo do cartão, Nubank, Visa, Mastercard… ou que identifique".

## Decisão

**Detectar a bandeira pelo número, sem seletor.** A bandeira aparece ao lado do campo enquanto se digita, o agrupamento do número e o tamanho do código de segurança seguem a bandeira detectada, e o formulário traz uma lista recolhida com um cartão de teste de cada.

**Validar com Luhn e vencimento, no navegador e no servidor.**

### Por que não um seletor

**Nubank não é bandeira, é emissor.** Nubank, Itaú e Inter emitem; Visa, Mastercard, Elo, Amex, Hipercard e Diners processam. Um cartão Nubank *é* um Mastercard ou um Visa. Uma lista misturando banco e bandeira estaria errada no conceito — e é exatamente o tipo de detalhe que uma banca pergunta.

**O número já informa.** As primeiras posições de um cartão são o IIN, a faixa que identifica emissor e bandeira. Um seletor duplicaria uma informação que já está no campo ao lado, e criaria o caso em que o marcado discorda do digitado — obrigando o sistema a decidir em quem acreditar. Checkout real detecta.

### A ordem das regras é a parte que importa

As faixas se sobrepõem, então a ordem de teste muda o resultado:

| Faixa | Pertence a | Seria lida como |
| --- | --- | --- |
| `4011`, `4312`, `4389`, `4514`, `4576` | Elo | Visa, se `/^4/` fosse testado antes |
| `5041`, `5066`, `5067`, `509x` | Elo | Mastercard, que pega `5[1-5]` — aqui não há conflito, mas a Elo precisa vir antes por causa do caso acima |
| `3841` | Hipercard | Diners, que pega todo `38` |
| `34`, `37` | American Express | Diners, se `38`/`36` fossem testados de forma mais larga |

A lista em `web/src/lib/cartao.ts` vai **do mais específico para o mais genérico**, e `VISA: /^4/` é a última regra justamente por ser a mais larga. Está comentado no arquivo, porque é o tipo de coisa que alguém "simplifica" seis meses depois e quebra sem perceber.

### Por que Luhn

Luhn é a conferência que todo número de cartão real satisfaz. É o que separa "dezesseis dígitos quaisquer" de "um número plausível". Sem ela, a validação é enfeite — e um formulário que aceita qualquer coisa é pior que um que não valida nada, porque aparenta rigor.

Luhn **não** diz que o cartão existe, tem saldo ou é de alguém. Diz que o número não foi digitado errado. É tudo o que se pode saber sem consultar a bandeira, e é o que um checkout confere antes de enviar.

### Por que a mesma conferência no servidor

`createPurchaseSchema` refaz Luhn e vencimento por conta própria. A tela pode ser contornada: basta mandar a requisição pelo terminal. **Validação que só existe no navegador não é validação** — é a mesma razão pela qual o acesso a obra paga é verificado no servidor (ADR 014) e pela qual a brecha da audiodescrição precisou ser fechada no serviço, não na interface (ADR 015).

O schema continua `.strict()` e **sem campo de valor**: o preço vem do banco. Enviar `priceCents` devolve `400`.

### Nada do cartão é guardado

Número, validade e código são validados em formato e descartados. O controller recebe `card`, o schema confere, e o serviço nunca o recebe: nada entra em banco, log, mensagem de erro ou histórico. O histórico guarda meio (`CARTAO`), valor e estado.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Seletor de bandeira | Duplica o que o número informa e permite divergir dele. Pior: convida a listar bancos, que não são bandeiras |
| Seletor de banco emissor (Nubank, Itaú…) | Conceitualmente errado. E inútil: emissor não muda o que é cobrado nem como |
| Biblioteca de terceiro (`card-validator`, `creditcardjs`) | Uma dependência nova para seis expressões regulares e vinte linhas de Luhn, num projeto que precisa ser auditável por quem o avalia. O arquivo todo tem menos linhas que o `package.json` da biblioteca |
| Só Luhn, sem bandeira | Resolveria a validação, mas não o código de 4 dígitos do Amex nem o agrupamento, e a tela continuaria sem dizer nada |
| Validar só no navegador | É o erro que a 3.3.0 corrigiu em outro lugar. Não repetir |

## Consequências

- O formulário recusa número implausível, mês inexistente e cartão vencido, com mensagem específica em cada caso.
- American Express passa a funcionar: 15 dígitos, código de 4.
- O servidor recusa o mesmo, por si.
- Uma faixa nova de bandeira exige editar `REGRAS` em um arquivo — e **na posição certa**, que é o risco que o comentário no código tenta evitar.
- Os números de teste viraram conteúdo de demonstração: estão no formulário (um por bandeira) e em [README-PAGAMENTO.md](../../README-PAGAMENTO.md) (todos).

## Verificação

- Testes em `api/tests/purchases.test.ts`: Luhn inválido → `400`, cartão vencido → `400`. Rodam no CI.
- Os 21 números de teste publicados foram conferidos por script antes de entrar: Luhn válido, bandeira correta e quantidade de dígitos correta, inclusive os dois casos de sobreposição de faixa.
- **Não verificado automaticamente:** o fluxo clicado de ponta a ponta. A suíte Playwright existe e roda à mão, fora do CI.
