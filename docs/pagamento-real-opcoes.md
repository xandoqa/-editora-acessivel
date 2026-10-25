# Apoio com pagamento real — opções

Estudo de alternativas para o Livrin receber apoio de verdade, sem orçamento. **Nada aqui foi implementado.** O provedor em uso continua sendo o `simulado`, e a [ADR 011](decisions/011-doacoes-provedor-simulado.md) continua valendo.

> **Condições verificadas em outubro de 2026.** Taxa e exigência de cadastro são as coisas que mudam mais rápido em meio de pagamento. Confirme na fonte antes de contratar qualquer coisa — os links estão no fim.

---

## A distinção que decide tudo

"Sistema de pagamento gratuito" junta duas coisas diferentes, e confundi-las é o que faz a pessoa procurar algo que não existe:

| | Custa? |
| --- | --- |
| **Integrar** — criar conta, obter credencial, programar, testar em sandbox | **Grátis** em todos os provedores considerados aqui |
| **Receber** — o dinheiro entrar na conta | **Sempre tem custo**, exceto no Pix estático |

Ou seja: **falta de dinheiro não impede integrar.** As contas de teste do Mercado Pago, por exemplo, não exigem CNPJ, conta bancária nem pagamento — são até 15 contas simultâneas, com cartões de teste. O que a falta de dinheiro impede é *receber sem taxa*, e isso só o Pix estático resolve.

Também vale separar "sem mensalidade" de "sem taxa por transação". Quase todos são sem mensalidade. Quase nenhum é sem taxa por transação.

---

## O que o projeto já tem

Antes de escolher, vale saber que a parte difícil está pronta:

- `PaymentService → PaymentProvider → método`, com `SimulatedPaymentProvider` declarando `isReal: false`.
- Valor em **centavos inteiros**, `provider` + `provider_ref` com índice único, apoio anônimo permitido.
- Nenhum dado de cartão na aplicação.
- A variável `PAYMENT_PROVIDER` já existe em `api/src/config/env.ts`, com `default('simulado')`, e provedor desconhecido cai no simulado com aviso no log.

Trocar de provedor é implementar `createCharge` e `confirmCharge` e registrar a classe. **Nenhuma rota, controller ou tela muda.**

> **Pendência conhecida:** `PAYMENT_PROVIDER` não está declarada em nenhum dos três `.env.example`. Quem for mexer nisso deve documentá-la lá.

---

## As opções

### 1. Pix estático — chave e QR Code

A única opção **realmente sem custo** para pessoa física: o valor cai integral, sem intermediário.

| | |
| --- | --- |
| **Custo** | R$ 0,00. Para pessoa física, receber Pix é gratuito por determinação do Banco Central |
| **Exige** | Só uma chave Pix. Sem CNPJ, sem contrato, sem aprovação |
| **Integração** | Nenhuma. É uma imagem e um texto copiável na tela |
| **Confirmação** | **Manual.** Ninguém avisa o sistema que o dinheiro chegou |

**O problema não é o dinheiro, é o registro.** Sem API não existe webhook, então a administração precisa conferir o extrato e lançar o apoio à mão. Para um projeto com poucos apoios por mês, isso é perfeitamente administrável — e a área administrativa já tem onde registrar.

**Dois cuidados reais:**

- A chave Pix **expõe o nome do titular** a quem for pagar. Numa plataforma pública, isso é dado pessoal do autor do projeto na tela.
- Receber doações como pessoa física tem implicação fiscal. Não sou advogado nem contador; se o volume deixar de ser simbólico, vale consultar quem é.

### 2. Mercado Pago — a melhor para *demonstrar*

| | |
| --- | --- |
| **Sandbox** | Grátis, até 15 contas de teste, **sem CNPJ, sem conta bancária, sem pagamento** |
| **Produção** | Tem taxa por transação; há condições promocionais de Pix sem taxa que mudam com frequência — confira antes |
| **Integração** | API documentada em português, SDK, webhook, e "link de pagamento" que dispensa código |

É a opção certa quando o objetivo é **provar a arquitetura**, não arrecadar. Dá para ir até o fim — cobrança criada, pagamento feito com cartão de teste, webhook recebido, apoio registrado — sem nenhum centavo trocar de mão e sem abrir empresa.

### 3. Asaas

| | |
| --- | --- |
| **Mensalidade** | Não há, e a conta é gratuita |
| **Pix** | R$ 1,99 por transação recebida (R$ 0,99 em condição promocional de 3 meses) |
| **Cartão** | R$ 0,49 + 2,99% à vista |
| **Observação** | QR Code dinâmico é gratuito; a página mostra condições separadas para CPF e CNPJ e **não deixa claro** se receber cobranças exige CNPJ — confirme antes |

Custo **fixo** por Pix, não percentual: ruim para apoio pequeno. Num apoio de R$ 5,00, R$ 1,99 é quase 40%.

### 4. Efí (ex-Gerencianet)

| | |
| --- | --- |
| **Pix** | 1,19% por Pix recebido, tanto em chave/QR estático quanto dinâmico |
| **Gratuidade** | 30 Pix grátis por mês **só pelo aplicativo** — e a própria Efí diz que **não vale para chave usada em API ou webhook** |

Essa ressalva importa muito aqui: a gratuidade existe exatamente onde o projeto não a usaria. Via API, é 1,19% desde o primeiro recebimento. Por ser percentual, é mais justa que taxa fixa para valores pequenos.

### 5. Ko-fi

| | |
| --- | --- |
| **Custo** | Taxa de serviço de 0–5%, sem mensalidade, **mais** a taxa do processador |
| **Exige** | Conta PayPal **ou** Stripe conectada |
| **Integração** | Nenhuma possível: é página externa |

A pessoa **sai do Livrin** para apoiar. Resolve o problema de receber, e não contribui nada para o trabalho: não há código, arquitetura nem decisão técnica para defender. A ajuda da Ko-fi não deixa claro quais países podem *receber*, só quais métodos aparecem para quem paga — verifique o Brasil antes de contar com ela.

### 6. Apoia.se, Catarse e plataformas de financiamento

Mesma análise da Ko-fi, com percentual maior e um cadastro mais sério. Fazem sentido para um projeto que vai viver depois do TCC. Não fazem sentido como componente do TCC.

---

## Resumo comparativo

| Opção | Custo por apoio | Exige CNPJ | Integra ao Livrin | Confirma sozinho |
| --- | --- | --- | --- | --- |
| Pix estático | **R$ 0,00** | Não | Só visual | **Não** |
| Mercado Pago (sandbox) | R$ 0,00 (dinheiro fictício) | **Não** | Sim, completa | Sim |
| Mercado Pago (produção) | Taxa variável | Verificar | Sim, completa | Sim |
| Asaas | R$ 1,99 fixo (Pix) | Verificar | Sim | Sim |
| Efí | 1,19% (Pix) | Verificar | Sim | Sim |
| Ko-fi | 0–5% + processador | Não | **Não** | Sim |

---

## Recomendação: três camadas, não uma escolha

A pergunta "qual provedor usar" tem uma resposta melhor que um nome: **mais de um, cada um no seu papel.** A abstração já existe, então isso custa pouco.

**Camada 1 — o simulado continua sendo o padrão.** Inegociável. O avaliador roda `./iniciar.sh` e tudo funciona sem credencial nenhuma. Um projeto que quebra por falta de chave é pior que um simulador honesto. É também a defesa pronta para a pergunta "por que não é real?": porque declarar `isReal: false` é mais defensável que fingir.

**Camada 2 — um segundo provedor em sandbox, para provar a abstração.** Ativado por `PAYMENT_PROVIDER`, com o simulado como padrão. Isso transforma a afirmação da ADR 011 — "trocar de provedor é implementar duas funções" — de promessa em fato demonstrado. É o maior ganho acadêmico disponível a custo zero.

**Camada 3 — Pix estático, para quem realmente quiser apoiar.** É a única forma de receber sem taxa, e resolve o pedido literal: alguém que queira apoiar, consegue. Com confirmação manual pela administração, que já existe. Se for adotado, o aviso sobre o nome do titular aparecer na tela precisa ser uma decisão consciente, não um efeito colateral.

### O que faltaria no código

Fora de escopo aqui, anotado para depois:

1. **Webhook com idempotência.** É onde mora a complexidade real de pagamento: a notificação chega duas vezes, fora de ordem, ou nunca. O índice único em `provider_ref` já prepara o terreno. Tratar isso bem é o que separa integração de brinquedo — e **dá para demonstrar com o simulado**, sem chave nenhuma.
2. **Expiração de cobrança pendente.** Todo sistema de pagamento tem esse estado; quase todo trabalho acadêmico esquece dele.
3. **`PAYMENT_PROVIDER` nos `.env.example`**, com os valores aceitos.
4. **Credenciais fora do repositório.** O repositório é público. Nem chave de teste entra — vai por `.env`, como o resto.

Os itens 1 e 2 valem **mesmo que nenhum provedor novo seja integrado**, e são os de melhor retorno.

### O que não fazer

- **Não fazer o simulado parecer real.** É o único jeito de transformar uma decisão defensável em desonestidade. A ADR 011 já trata isso como requisito, não como detalhe.
- **Não depender de webhook na apresentação.** Webhook precisa de URL pública; em desenvolvimento isso sai com um túnel, que é mais uma peça para falhar ao vivo. Por isso o simulado segue como padrão.
- **Não colocar nenhuma credencial no repositório**, nem de sandbox.

---

## Fontes

- [Preços e taxas — Asaas](https://www.asaas.com/precos-e-taxas)
- [Qual o custo do Pix — Efí](https://sejaefi.com.br/blog/qual-custo-do-pix)
- [Contas de teste — Mercado Pago Developers](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-orders/resources/your-integrations/test/accounts)
- [Pix gratuito para empresas: tarifas MEI e CNPJ — Mercado Pago](https://www.mercadopago.com.br/blog/pix-gratuito-empresas-tarifas-mei-cnpj)
- [Métodos de pagamento disponíveis — Ajuda da Ko-fi](https://help.ko-fi.com/hc/en-us/articles/24482435253661-What-payment-methods-are-available-on-Ko-fi)
- [Tarifas Pix cobradas pelos PSPs — discussão na API Pix do Banco Central](https://github.com/bacen/pix-api/discussions/266)
