# ADR 020 — Seis temas, escolhidos por motivo e verificados por medição

**Data:** 31/10/2026 · **Versão:** 3.5.5 · **Estado:** aceita

## Contexto

A interface tinha dois temas na lista — Papel e Noite — mais o alto contraste num botão à parte. A especificação de 31/10 pediu mais opções, e pediu que não fossem "simplesmente uma coleção aleatória de cores": que usassem teoria das cores, contraste, hierarquia visual e legibilidade, e que fizessem sentido para a identidade do projeto.

O projeto já tinha a parte difícil pronta: nenhum componente conhece cor. Tudo lê token (`--c-ink`, `--c-surface`, `--c-primary`…), e o tema é um conjunto de tokens aplicado por uma classe na raiz. Acrescentar tema, portanto, não exigia tocar em componente nenhum — exigia escolher bem e provar que a escolha se sustenta.

## Decisão

**Seis temas**, cada um com um motivo escrito no próprio CSS, e **todos verificados por medição**.

| Tema | Tom | Por que existe |
| --- | --- | --- |
| **Papel** | claro | O padrão. Branco quente, tinta azul-escura. Intocado |
| **Sépia** | claro | A convenção dos leitores de tinta eletrônica: papel âmbar, tinta marrom. Reduz a componente azul da luz emitida, que é a queixa mais comum de quem lê horas seguidas |
| **Tinta** | claro | O oposto do Papel: neutro frio, sem tom quente. Para quem acha o bege sujo — e para projetor ruim, onde fundo quente lava |
| **Noite** | escuro | Escuro de fundo arroxeado. Intocado |
| **Grafite** | escuro | Escuro cinza-azulado, sem o roxo do Noite. A opção escura neutra |
| **Índigo** | escuro | O único que troca a **cor de ação**: âmbar no lugar do azul |

O Índigo não está na lista só por variedade. Ele é a prova de que o sistema de tokens aguenta mudar a cor de destaque sem que nenhum componente precise saber — se algum lugar tivesse azul escrito à mão, ele apareceria imediatamente.

### O alto contraste continua fora da lista

É recurso de acessibilidade, não gosto. Vence qualquer tema escolhido e precisa continuar alcançável num clique, não enterrado numa lista de seis. Por isso mantém botão próprio ao lado do seletor.

### Alternar claro/escuro preserva a escolha de cada lado

Quem está no Sépia e alterna vai para o escuro e, ao voltar, volta para o **Sépia** — não para o Papel. Um atalho que descarta a escolha da pessoa é um atalho que ensina a não usá-lo.

## A verificação é o ponto

`ferramentas/conferir-contraste.py` lê os tokens direto do CSS, calcula **39 pares por tema** pela fórmula da WCAG 2 e reprova com código 1 se algum cair abaixo do exigido:

- texto principal, secundário e discreto sobre **todas** as cinco superfícies do tema → AAA, 7:1;
- link, sucesso, atenção, erro e administração sobre as superfícies onde de fato aparecem → 4,5:1;
- texto dentro de botão e de pílula colorida → 4,5:1;
- limite de campo e borda em destaque → 3:1, critério 1.4.11.

São 273 pares no total. **Todos passam.**

Dois resultados valem registro:

**Os três temas que já existiam passaram.** A promessa de AAA que o projeto fazia desde a 3.0.0 estava correta — e agora está medida, não afirmada.

**Os quatro novos não passaram de primeira.** Três tokens de texto discreto ficaram entre 6,43:1 e 7,00:1 sobre a superfície mais densa do próprio tema, e foram ajustados até passarem com margem. Sem a ferramenta, os três teriam entrado assim: a olho nu, 6,8:1 e 7,2:1 são indistinguíveis.

Os patamares são os da WCAG 2 ([WebAIM](https://webaim.org/articles/contrast/)): 4,5:1 para texto normal em AA, 7:1 em AAA, 3:1 para componente de interface.

## Sobre as cores escuras

Nenhum tema escuro usa branco puro sobre preto puro. A combinação produz halo em volta das letras para muita gente, e o projeto já evitava isso no Noite antes desta mudança — o Grafite e o Índigo seguem a mesma regra, com tinta levemente quebrada e fundo nunca em zero.

A exceção é o alto contraste, e ela é deliberada: ali o objetivo é contraste máximo para quem precisa dele, e amarelo sobre preto é a convenção estabelecida.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Deixar a pessoa escolher a cor de destaque livremente | Qualquer cor escolhida pode cair abaixo de 4,5:1 contra as superfícies. A liberdade destruiria a garantia que o projeto promete |
| Seguir a preferência do sistema operacional (`prefers-color-scheme`) | Boa ideia e não exclui esta: entraria como opção "automático". Ficou de fora desta rodada para não mudar o comportamento de quem já escolheu um tema |
| Doze temas em vez de seis | Lista que ninguém lê. Seis já exige agrupar em claros e escuros e escrever uma linha explicando cada um |
| Juntar o alto contraste à lista | Transformaria recurso de acessibilidade em item de gosto, e o esconderia atrás de um menu |

## Consequências

- Acrescentar um tema é acrescentar um bloco de tokens no CSS e uma entrada em `web/src/preferences/temas.ts`. Nenhum componente muda.
- **A ferramenta roda na integração contínua**, no job "Interface — contraste dos temas". Mexer num token e derrubar um par reprova o PR, em vez de chegar ao `main` e só aparecer quando alguém reclamar de não conseguir ler.
- O tema escolhido fica no navegador de quem escolheu, como as demais preferências de acessibilidade.
