# 011 — Doações com provedor de pagamento simulado

**Decisão.** `PaymentService → PaymentProvider → método de pagamento`. O provedor padrão é o `simulado`: percorre todo o caminho de um provedor real sem movimentar dinheiro, e declara isso (`isReal: false`) para que a interface avise o usuário.

**Por que uma interface, e não uma integração direta.** A seção 18 pede explicitamente essa arquitetura, e a razão é boa: trocar de provedor passa a ser implementar duas funções (`createCharge`, `confirmCharge`) e registrar a classe. Nenhuma rota, controller ou tela muda.

**Por que simulado como padrão.** A mesma seção 18 diz que, por ser trabalho acadêmico, vale priorizar algo seguro e demonstrável em vez de montar infraestrutura financeira real. Um gateway de verdade exigiria chaves, conta, webhook público e dados de terceiros — tudo para demonstrar um fluxo que o simulado demonstra inteiro.

**Honestidade como requisito.** O provedor simulado diz, em todas as respostas, que a cobrança é de demonstração: `isReal: false`, a instrução na tela começa avisando, e tanto a página de apoio quanto o painel administrativo mostram um aviso. Fingir um pagamento real seria exatamente a "gambiarra" que a seção 32 proíbe — e, num trabalho acadêmico, um número de arrecadação que parece verdadeiro e não é seria pior que não ter a funcionalidade.

**Decisões de modelagem.**

| Escolha | Por quê |
| --- | --- |
| Valor em **centavos**, inteiro | Ponto flutuante não representa 0,10 exatamente; somar centavos como número quebrado produz totais errados |
| `provider` + `provider_ref` com índice único | Permite trocar de provedor sem perder o histórico e impede registrar a mesma cobrança duas vezes |
| `user_id` e `work_id` opcionais com `SET NULL` | Apoio anônimo é permitido, e apagar uma obra não pode apagar o registro financeiro |
| Nenhum dado de cartão na aplicação | O provedor devolve URL ou código; a pessoa paga do lado dele. Guardar cartão exigiria PCI-DSS e não traria nada |

**Posicionamento na interface.** A seção 19 pede discrição: o convite mora no rodapé e num botão na página da obra, nunca num banner. Ler nunca passa por uma tela de doação, e nenhuma obra fica atrás de pagamento.
