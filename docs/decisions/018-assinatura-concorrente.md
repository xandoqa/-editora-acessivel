# ADR 018 — Assinatura simultânea travada por transação, e não por índice único

**Data:** 30/10/2026 · **Versão:** 3.5.3 · **Estado:** aceita · **Revisa:** parte da [014](014-monetizacao-e-aquisicao.md)

## Contexto

A compra de obra tem uma garantia de banco contra cobrança duplicada, criada na 3.2.0:

```sql
CREATE UNIQUE INDEX "purchases_one_confirmed_per_user_work"
  ON "purchases" USING btree ("user_id","work_id")
  WHERE status = 'CONFIRMADA';
```

É uma garantia forte justamente por não depender da aplicação: mesmo que duas requisições passem pela mesma verificação ao mesmo tempo, o banco recusa a segunda.

A assinatura do plano reaproveita a mesma tabela, com `kind = 'PLANO'` e `work_id` **nulo**. E no PostgreSQL, **nulos são distintos entre si num índice único**: duas linhas `(user_id = 5, work_id = NULL)` ambas `CONFIRMADA` são aceitas. A garantia não alcançava o plano.

A proteção que existia era só da aplicação: `assinarPlano` lia o plano da conta, recusava com `409` se já fosse `PREMIUM`, e reaproveitava cobrança pendente. Entre a leitura e a escrita havia uma janela — dois cliques simultâneos, ou duas abas, poderiam gerar duas cobranças confirmadas para a mesma conta.

Uma auditoria apontou isso e recomendou o reflexo óbvio: acrescentar `NULLS NOT DISTINCT` ao índice.

## Decisão

**Não estender o índice. Serializar a decisão em transação**, com `SELECT … FOR UPDATE` sobre a linha da conta.

### Por que o índice estava errado

Porque **cancelar assinatura não apaga o que foi pago**. A cobrança anterior permanece `CONFIRMADA` no histórico, que é o comportamento correto: o dinheiro foi cobrado, e o histórico é registro, não estado atual.

Logo, uma pessoa que assina em março, cancela em abril e quer voltar em setembro teria **duas** assinaturas confirmadas — e um índice único sobre assinaturas confirmadas recusaria a segunda. A correção trocaria uma corrida improvável por um defeito garantido, e por um defeito pior: só apareceria com alguém real tentando voltar a ser premium, meses depois, longe de qualquer teste.

Isto foi descoberto ao implementar a recomendação, não ao lê-la. É o argumento a favor de escrever o teste antes de confiar no reflexo.

### O que foi feito

```ts
return db.transaction(async (tx) => {
  const [conta] = await tx.select({ plan: users.plan })
    .from(users).where(eq(users.id, viewer.id)).for('update');
  // …verificação de plano, reaproveitamento de pendente, inserção
});
```

O `FOR UPDATE` trava a linha da conta até o fim da transação. Duas requisições simultâneas da mesma pessoa entram em fila: a segunda encontra ou a conta já `PREMIUM` (e recebe `409`), ou a cobrança pendente que a primeira abriu (e a reaproveita). **Os dois caminhos já existiam** — o que faltava era garantir que a segunda requisição enxergasse o resultado da primeira.

A trava é por conta, não global: pessoas diferentes assinando ao mesmo tempo não se esperam.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| `NULLS NOT DISTINCT` no índice existente | Quebra quem cancelou e quer voltar. É o motivo desta ADR |
| Índice único parcial só sobre `kind = 'PLANO'` e status `PENDENTE` | Protege a cobrança aberta, não a confirmação, que é onde o dinheiro é registrado |
| Coluna `work_id` com valor sentinela (`0`) em vez de nulo | Faz o índice funcionar e destrói o significado da coluna: `0` não é obra nenhuma, e a chave estrangeira teria de cair |
| Verificação otimista com nova leitura depois da escrita | Detecta tarde: a cobrança duplicada já existiria, e desfazer é mais frágil que não criar |
| Deixar como estava | A assimetria é invisível para quem lê o schema: a mesma tabela com garantia forte num caso e nenhuma no outro |

## Consequências

- Assinatura simultânea da mesma conta passa a ser impossível, por serialização.
- A pessoa que cancelou **continua podendo assinar de novo**, com o pagamento anterior preservado no histórico. Há teste cobrindo exatamente isto, em `api/tests/historico-e-planos.test.ts`.
- A chamada ao provedor ocorre **dentro** da transação, segurando a conexão. Com o provedor simulado é instantâneo. Com um provedor real, valeria mover a abertura da cobrança para fora e reservar a transação só para a decisão — está anotado como pendência no relatório final.
- A compra de obra permanece como estava: lá o índice funciona, porque `work_id` não é nulo.
