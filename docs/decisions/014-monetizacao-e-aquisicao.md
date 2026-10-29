# 014 — Monetização opcional e aquisição de obras

> Revisa parte da [011](011-doacoes-provedor-simulado.md). O provedor simulado continua sendo o padrão, e todo pagamento continua sendo simulado. O que muda é que **agora existe obra atrás de pagamento** — o que a 011 dizia não existir.

**Decisão.** A autoria escolhe como disponibiliza cada obra: `GRATUITA`, `PAGA` (com preço próprio, até R$ 50,00) ou `PUBLICIDADE` (leitura livre, com espaços publicitários simulados). Obra paga exige aquisição confirmada para ser lida.

## O que esta decisão contraria, e por quê

A ADR 011 afirma, com todas as letras: *"Ler nunca passa por uma tela de doação, e nenhuma obra fica atrás de pagamento."* Isso deixa de valer para a modalidade `PAGA`.

A mudança é deliberada e vem da especificação de outubro de 2026, que pede monetização opcional para a autoria. A justificativa é a sustentabilidade da plataforma sem abandonar a finalidade social — e o desenho preserva essa finalidade de três maneiras:

1. **Gratuita continua sendo o padrão**, no banco e no formulário. Nenhuma obra existente mudou de modalidade: a migration define `GRATUITA` para todas.
2. **A escolha é da autoria**, obra a obra. A plataforma não impõe preço nem força modalidade.
3. **Doação e aquisição não se confundem.** Apoiar o projeto continua não liberando nada, e continua sem tela de pagamento no caminho da leitura de obra gratuita.

## As regras que moram no servidor

O documento de especificação é explícito: validação de preço que existe só no navegador não é validação. Três garantias foram implementadas fora do alcance do cliente.

| Regra | Onde é garantida |
| --- | --- |
| O preço é lido do banco, nunca da requisição | `createPurchase` consulta `works.price_cents`; o schema da requisição **não tem campo de valor** e é `.strict()`, então mandar `priceCents` é erro 400 — não um campo ignorado em silêncio |
| Preço existe se, e somente se, a obra é `PAGA`, e cabe no teto | Validação na API **e** `CHECK works_price_matches_monetization` no banco |
| Uma pessoa, uma aquisição confirmada por obra | `CREATE UNIQUE INDEX ... WHERE status = 'CONFIRMADA'` |

A terceira merece destaque: é o que transforma idempotência de promessa em garantia. Dois cliques simultâneos não geram duas compras porque o **banco** recusa a segunda, não porque a aplicação se lembrou de verificar.

A confirmação usa a mesma ideia: o `UPDATE` exige que a linha ainda esteja `PENDENTE`. Se duas requisições chegarem juntas, só uma encontra a linha nesse estado; a outra relê o resultado em vez de confirmar de novo.

## Onde a autorização é verificada

Na entrega do conteúdo — `getWorkFileInfo` e `getWorkAudioInfo` —, não na tela.

A faixa de audiodescrição entra na mesma guarda de propósito. Para quem depende dela, **ela é a obra**; deixá-la aberta numa obra paga seria uma porta dos fundos contra exatamente o público que a plataforma existe para servir.

O detalhe da obra expõe `access: { required, granted }`, mas isso é informação **para a interface** decidir entre "ler" e "adquirir". Forçar esse valor no navegador não abre nada: o endpoint do arquivo refaz a verificação por conta própria.

## Monetização não substitui curadoria

Definir um preço não publica a obra nem concede o Selo Livrin. Obra fora do catálogo não pode ser adquirida — `createPurchase` devolve 404 para obra que não está `APROVADO`, como já fazia o resto do sistema.

Na interface, a modalidade aparece **ao lado** do selo, nunca dentro dele. Os dois dizem coisas diferentes: o selo é o que a curadoria verificou; a modalidade é como a obra é disponibilizada. Juntá-los sugeriria que pagar compra selo.

Por outro lado, a monetização **é** editável depois da aprovação, junto com os metadados de divulgação: é decisão comercial, não conteúdo. Mudar o preço não altera o que a curadoria examinou.

## Decisões de modelagem

| Escolha | Por quê |
| --- | --- |
| Tabela `purchases` separada de `donations` | Doação apoia o projeto e não libera nada; aquisição libera uma obra e não é doação. São estados e permissões diferentes |
| `price_cents` copiado para a aquisição | O preço é congelado na compra. Se a autoria mudar o valor amanhã, o histórico de quem já pagou não pode mudar junto |
| `user_id` obrigatório, com `cascade` | Aquisição pertence a uma conta, nunca a uma sessão ou a um navegador — é o que faz a obra continuar disponível em outro aparelho e depois de sair e entrar |
| `expires_at` por meio de pagamento | PIX 30min, cartão 15min, boleto 3 dias. Sem isso, uma cobrança abandonada ficaria "aguardando pagamento" para sempre e bloquearia nova tentativa |
| Nenhum dado de cartão armazenado | O formulário valida formato e o servidor descarta. A aplicação não fala com adquirente: guardar número, validade ou CVV não traria utilidade nenhuma e traria obrigação de PCI-DSS |

## Publicidade: demonstração declarada

Não existe integração publicitária, e inventar uma seria simular receita como se fosse verdadeira — o oposto do que a especificação pede.

O que existe é uma faixa identificada como demonstração, fora do corpo do texto, **sem script de terceiro, sem rastreamento e sem coleta de dado algum**. Ela informa a divisão de receita que seria aplicada (padrão de 70% para a autoria, configurável por obra em `ad_revenue_author_share`), deixando explícito que impressões e repasses são fictícios.

O percentual é um valor **de demonstração**, não uma regra de negócio aprovada. Ele é configurável justamente para não parecer definitivo.

## O que continua valendo da 011

A arquitetura `PaymentService → PaymentProvider → método`, o provedor `simulado` como padrão declarando `isReal: false`, dinheiro em centavos inteiros, e a discrição do convite ao apoio. As opções de provedor real continuam levantadas em [pagamento-real-opcoes.md](../pagamento-real-opcoes.md).
