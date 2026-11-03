# ADR 023 — AbacatePay: PIX de verdade, em ambiente de desenvolvimento, sem deixar de ser opcional

**Data:** 03/11/2026 · **Versão:** 3.9.0 · **Estado:** aceita

## Contexto

A [ADR 011](011-doacoes-provedor-simulado.md) escolheu um provedor simulado e afirmou que trocar de provedor seria "implementar duas funções". O estudo em [pagamento-real-opcoes.md](../pagamento-real-opcoes.md) foi além e recomendou três camadas, sendo a segunda **um provedor real em sandbox, ativado por `PAYMENT_PROVIDER`, com o simulado continuando padrão** — porque é o que transforma aquela afirmação de promessa em fato demonstrado.

Esta ADR implementa aquela camada 2 com o [AbacatePay](https://docs.abacatepay.com), pedido por nome.

O pedido veio **um dia antes da apresentação**. Isso não é detalhe de cronograma: é a restrição que mais pesou em cada decisão abaixo.

## Decisão 1 — PIX e só PIX

`methods` tem um item. Não por limitação do AbacatePay, que também faz boleto e cartão, mas porque a regra escrita na própria interface `PaymentProvider` é que dado de cartão **nunca** passa por esta aplicação.

PIX cumpre essa regra sem esforço algum: o que volta do provedor é um código copiável e uma imagem de QR Code, e quem paga paga no aplicativo do próprio banco. Não existe número, CVV ou validade para guardar, mascarar em log ou esquecer de mascarar em log. A restrição do projeto — *"não armazene números completos de cartões, códigos de segurança ou outros dados financeiros sensíveis"* — deixa de depender de disciplina e passa a depender da escolha do meio.

Como o serviço confere `provedor.methods` antes de abrir a cobrança, pedir `CARTAO` nesta instalação devolve um 400 explicado, não um erro vindo de dentro do provedor.

Também não mandamos o objeto `customer`: ele exige `taxId` (CPF) quando presente, e apoiar um projeto não é motivo para pedir CPF de ninguém.

## Decisão 2 — O simulado continua sendo o padrão, e a instalação não quebra sem chave

`PAYMENT_PROVIDER` segue com `default('simulado')`. O AbacatePay **só entra no registro de provedores quando existe `ABACATEPAY_API_KEY`**. Sem chave, ele não é uma opção, e `PAYMENT_PROVIDER=abacatepay` cai no simulado pelo caminho que já existia para provedor desconhecido — com um aviso no log dizendo que falta a chave, porque "não está registrado" sozinho não explica nada a quem for procurar.

Isso é deliberado e é o que torna a mudança segura na véspera: **quem clonar o repositório e rodar `./iniciar.sh` vê exatamente o que via antes.** Nenhum caminho novo é percorrido sem alguém preencher uma variável de propósito.

## Decisão 3 — O ambiente é declarado, mas conferido contra a resposta

Quem decide se a cobrança é real é a chave de API. A aplicação não tem como saber disso de antemão, mas **cada cobrança volta com `devMode`**, dizendo em que ambiente nasceu.

Então fazemos as duas coisas: `ABACATEPAY_DEV_MODE` declara o ambiente esperado (padrão `true`, porque a opção segura é a que não movimenta dinheiro por engano), e o provedor **compara a declaração com o `devMode` que voltou**. Discordando:

- declarado desenvolvimento, respondido real → `logger.error`, com o texto dizendo para parar e trocar a chave. É o caso em que alguém acha que está demonstrando e está movimentando dinheiro de verdade;
- declarado real, respondido desenvolvimento → `logger.warn`. A instalação se acha real e não arrecada nada.

E o texto que vai para a tela sai do `devMode` **que o provedor respondeu**, nunca da declaração. A declaração pode estar errada; a resposta é o que aconteceu.

Isto é a mesma postura das outras medições do projeto (contraste, posicionamento, forma): não afirmar o que dá para medir.

## Decisão 4 — Em desenvolvimento, confirmar simula o pagamento

O botão de confirmar que já existe chama `confirmCharge`, que consulta a situação real da cobrança. A situação real de uma cobrança PIX que ninguém pagou é "pendente" — para sempre. Sem mais nada, a demonstração empacaria num QR Code que ninguém vai pagar ao vivo.

Então, **e somente quando `ABACATEPAY_DEV_MODE=true`**, uma cobrança ainda pendente dispara `POST /pixQrCode/simulate-payment` antes de reconsultar. Esse endpoint existe no ambiente de desenvolvimento do próprio AbacatePay, cada uso vai para o log como `warn` dizendo que nenhum dinheiro se moveu, e com `ABACATEPAY_DEV_MODE=false` ele nunca é chamado.

Se a simulação falhar, a confirmação **devolve `PENDENTE` em vez de estourar**: a cobrança existe e continua pendente, e é isso que é verdade.

Nenhuma rota, controller, validador ou tela mudou para isto funcionar.

## Decisão 5 — Tempo limite de oito segundos

A lição da [ADR 022](022-fale-conosco.md) é que dependência externa sem tempo limite trava a resposta inteira — o Fale Conosco ainda espera até 15 segundos pelo SMTP, e isso está documentado como problema conhecido.

Aqui o provedor entra no caminho de uma requisição que a pessoa está esperando na tela, então cada chamada tem `AbortSignal.timeout(8_000)`. Esgotado o tempo, o erro é 502 com texto que a pessoa entende, e o log registra qual chamada demorou.

502 e não 500, de propósito: o defeito não está nesta aplicação, e a diferença importa para quem lê o log depois. Por isso `badGateway` foi acrescentado ao `http-error.ts`.

## Decisão 6 — Dezoito testes contra um AbacatePay de mentira

Nenhum teste toca a internet. Há um servidor HTTP de brinquedo que responde no formato `{ data, error }` e **grava o que recebeu**, para os testes conferirem o que foi enviado — não só o que voltou.

O que eles seguram são os defeitos clássicos de integração de pagamento:

- valor em reais onde o provedor espera centavos (cobrança de R$ 0,50 em vez de R$ 50,00);
- resposta **200 com `error` preenchido** tratada como sucesso;
- situação desconhecida caindo em "confirmada", liberando acesso de graça — por isso `traduzir` manda qualquer situação nova para `FALHOU`, com aviso: na dúvida, ninguém ganha acesso;
- provedor fora do ar travando a requisição;
- simulação de pagamento disparando fora do ambiente de desenvolvimento;
- chave de API aparecendo na mensagem de erro.

## O que esta ADR NÃO fez

Anotado como pendência honesta, não como coisa feita:

1. **Webhook.** A confirmação continua acontecendo quando alguém aperta confirmar. Webhook exige endereço público e verificação de assinatura, e o estudo de opções já avisava para **não depender de webhook na apresentação**, porque túnel é mais uma peça para falhar ao vivo. O índice único em `provider_ref` segue preparando o terreno.
2. **A imagem do QR Code na tela.** A resposta traz `brCodeBase64`, e mostrá-la seria melhor que só o código copiável. É mudança de interface, e mudança de interface na véspera da apresentação é risco sem necessidade — o código copiável funciona em qualquer aplicativo de banco. O campo está documentado aqui para quem for fazer isso depois.
3. **Expiração automática de cobrança pendente.** Continua sendo o item 2 da lista de pendências do estudo de opções.
4. **Boleto e cartão pelo AbacatePay.** Ver decisão 1.

## Consequências

- A afirmação da ADR 011 deixou de ser promessa: existem dois provedores, e trocar entre eles é uma variável de ambiente.
- Nenhuma credencial entrou no repositório. `ABACATEPAY_API_KEY` aparece **vazia** nos dois `.env.example` e no `docker-compose.yml`, com o motivo escrito ao lado.
- O `web/.env.example` **não** recebeu as variáveis, de propósito: chave de pagamento no navegador é chave vazada.
- A restrição do projeto *"não implemente pagamentos reais"* continua respeitada na configuração padrão, e passa a ser uma escolha de quem instala em vez de um limite do código.

## Fontes

- [Criar QRCode PIX — AbacatePay](https://docs.abacatepay.com/api-reference/criar-qrcode-pix)
- [Checar Status — AbacatePay](https://docs.abacatepay.com/api-reference/checar-status)
- [Simular Pagamento — AbacatePay](https://docs.abacatepay.com/api-reference/simular-pagamento)
