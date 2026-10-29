# 016 — Janela de Libras com VLibras

**Decisão.** A barra superior ganha um botão que liga uma janela com avatar sinalizando em Libras o texto selecionado, usando o **VLibras** — suíte livre do governo federal desenvolvida com a UFPB, em uso no gov.br e em vários tribunais. O recurso é opcional, começa desligado, e o script só é baixado quando alguém o liga.

## Por que não é um vídeo de intérprete

Esta era a alternativa, e ela foi descartada por um motivo simples: não há vídeos. Hospedar vídeo exigiria campo, rota, armazenamento e, principalmente, alguém gravando — e um sistema pronto para receber vídeos que nunca chegam não entrega nada a ninguém.

O VLibras entrega algo hoje, para qualquer texto do site, sem depender de produção de conteúdo.

## A promessa que o projeto não cumpria

Ao implementar isto, veio à tona que a marcação `hasLibras` dizia:

> **Janela de Libras** — Intérprete de Libras nos diálogos principais.

E não existia nenhum campo de vídeo no sistema. O catálogo exibia o selo, o filtro "Com Janela de Libras" funcionava, e por trás não havia nada. É a mesma família do vazamento da audiodescrição: **uma promessa que o sistema não podia cumprir.**

O rótulo passou a dizer o que a marcação de fato significa — *"Libras no conteúdo: a autoria declara que a obra traz sinalização em Libras em suas páginas"* —, e a tradução automática ficou onde ela é: na barra superior, declarada como automática. São coisas diferentes e não podem se confundir.

## As quatro regras da implementação

| Regra | Por quê |
| --- | --- |
| Opcional, começa desligada | Mesma mecânica da leitura em voz alta. Recurso de acessibilidade imposto a todos atrapalha quem não precisa dele |
| O script só baixa ao ligar | Enquanto desligado, a aplicação **não faz uma única requisição** a `vlibras.gov.br`. É a única exceção à regra de não carregar script de terceiro, e acontece por escolha explícita da pessoa |
| A falha é dita, não escondida | O avatar vem de serviço externo. Fora do ar ou sem internet, o botão avisa em vez de girar para sempre. Recurso de acessibilidade que falha em silêncio é pior que um ausente |
| Diz que é automática | Libras é língua com gramática própria, não português sinalizado. Tradução por avatar tem limites de compreensão reconhecidos; apresentá-la como equivalente a intérprete humano seria exagerar o que se entrega |

Detalhe técnico que custa caro quando esquecido: o `new window.VLibras.Widget(...)` roda **dentro do `onload`** do script, não depois da tag. Inicializar antes de o plugin terminar de carregar quebra com `onLoadPlayer is not a function`.

A marcação que o plugin procura é montada por portal no `body`: nascendo dentro do cabeçalho, que é `sticky` e cria contexto de empilhamento, a janela do avatar ficaria presa dentro da barra.

## O que se sabe e o que não se sabe

**Verificado:** o caminho de falha. Com o domínio inacessível, o `onerror` dispara, o botão volta a desligado e a mensagem aparece — testado em navegador headless.

**Não verificado:** o caminho feliz, com o avatar na tela. O ambiente de desenvolvimento usado tem saída de rede restrita a uma lista de domínios, e `vlibras.gov.br` não está nela. **Precisa ser testado numa máquina com internet aberta antes da apresentação** — é um clique.

**Risco assumido:** o avatar depende de um serviço de terceiro. Se ele estiver fora no dia, o recurso não aparece. Por isso ele é opcional e por isso a falha é explícita: nada mais na plataforma quebra junto.
