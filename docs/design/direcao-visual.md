# Direção visual

O que a interface do Livrin quer ser, o que já é, e o que ainda não é. Este documento existe para que uma mudança visual futura não precise redescobrir as restrições — algumas delas não são estéticas, são o motivo do projeto.

- **Prévia interativa:** [`previa-visual.html`](previa-visual.html) — abra no navegador. Tem as três paletas e as opções de tipografia lado a lado, com os contrastes medidos.
- **Telas do protótipo:** [`telas/`](telas/), e o [protótipo no Figma](telas/prototipo-figma.url).

---

## A intenção

A seção 14 da especificação pede uma estética **editorial e artesanal**, inspirada no espírito das obras de Ziraldo, e pede explicitamente para **evitar aparência de dashboard**. Inspirada no espírito: o projeto não reproduz personagens, traços nem obras de terceiros — o que se toma emprestado é a atitude, não o desenho.

A atitude, em três frases:

1. A página é calma; o desenho é que fala.
2. Nada é perfeitamente simétrico, porque simetria perfeita é o que faz uma interface parecer gerada.
3. Cor é acontecimento, não revestimento.

## O que já está implementado

Tudo vive em dois arquivos, de propósito: `web/src/styles/global.css` (tokens e classes de componente) e `web/tailwind.config.js` (cores, sombras, tipografia). Mudar a identidade inteira não deveria exigir abrir componente nenhum.

| Camada | Estado atual |
| --- | --- |
| Superfície | Papel claro e pouco saturado (`246 243 236`), com um grão sutil em SVG inline a 3% |
| Traço | Fio de tinta de 1px contornando cards e controles |
| Sombra | Sombra dura deslocada, reservada ao botão principal e ao Selo Livrin — não é papel de parede |
| Cantos | Raios irregulares (14px/18px alternados), nunca iguais nos quatro cantos |
| Tipografia | Plus Jakarta Sans nos títulos, Inter no corpo; títulos em peso 700, parágrafos limitados a 72 caracteres |
| Micro-rótulo | Versalete com `letter-spacing` de 0.22em — o recurso que mais dá ar editorial e custa nada |
| Temas | Papel (claro), Noite (escuro) e Alto Contraste (amarelo/preto), com os **mesmos nomes de token** |

### A regra dos tokens

Os três temas redefinem as mesmas variáveis. Nenhum componente sabe em qual tema está, e nenhum componente deve passar a saber. Uma cor escrita direto no componente quebra os três temas de uma vez.

## O que qualquer mudança precisa preservar

Esta é a parte que não é gosto. O projeto é uma plataforma de acessibilidade: layout que quebra um destes itens está errado, por mais bonito que fique.

- **Contraste AAA (7:1)** em todo texto, sobre todas as superfícies, nos três temas.
- **Contraste 3:1 em bordas e elementos não textuais** (critério WCAG 1.4.11). O fio de 1px passa com folga porque a **cor** não mudou quando a espessura caiu — contraste é cor, não espessura.
- **Foco sempre visível** (`:focus-visible`). Uma versão anterior do projeto aplicava `focus:outline-none` nos campos e apagava justamente o indicador de foco, numa plataforma de acessibilidade.
- **Alvo de toque de 44px** nos controles.
- **Ordem de leitura e rótulos**: `aria-label`, `role` e a sequência do DOM continuam valendo. Mudar posição é livre; mudar rótulo quebra a suíte de ponta a ponta, que seleciona por nome acessível — e essa suíte é a rede de proteção da reforma.
- **`prefers-reduced-motion`** e o modo Leitor Otimizado, que desliga animação e grão.

## As referências, e como lê-las

As referências trazidas para a próxima rodada são de **landing page**: herói grande, muito branco, baixa densidade. Elas resolvem um problema diferente — convencer quem acabou de chegar. O Livrin tem catálogo com filtros, painel, fila de curadoria e leitor: é aplicação, não página de entrada.

O que delas traduz bem para tela densa:

- respiro generoso entre blocos, em vez de caixa em volta de cada coisa;
- filete fino como separador, no lugar de borda fechada;
- título grande e calmo, com peso baixo e entrelinha curta;
- moldura vazada deslocada sobre a imagem;
- versalete largo nos rótulos pequenos.

O que não traduz: herói de altura inteira, texto centralizado em bloco largo, e densidade baixa em telas que precisam mostrar muitas obras de uma vez.

Referências que servem melhor a este caso, e que carregam o mesmo silêncio: **sumário de revista**, **etiqueta de parede de museu**, **catálogo de biblioteca** e as capas de grade da Penguin. Todas organizam bastante informação com filete, versalete e espaço — que é exatamente o problema do Livrin.

## O que ainda não foi feito

A revisão da série 3.1.x mexeu em **tokens**: paleta, peso do traço, sombra, tipografia e respiro. Isso aliviou a página, mas não entrega o que as referências mostram, porque o que falta é **layout** — estrutura e posição, não variável.

| Etapa | Estado |
| --- | --- |
| 1. Catálogo e card da obra | **feita** — capa sem moldura, título fora da imagem, ação contornada, filtros em aba |
| 2. Cabeçalho, barra lateral e página da obra | **feita** — traços de 2px para 1px, item ativo com filete à esquerda, abertura sem caixa |
| 3. Leitura em voz alta | **feita** — palavra sob o cursor, no lugar da página inteira |
| 4. Leitor | **feita** — painel de preferências sem caixa dentro de caixa |
| Formulários e administração | pendente — estrutural, pouco visual |

Cada etapa é um commit próprio, para que reverter uma não derrube as outras.

### O que ficou de fora, e por quê

O fundo escuro do menu em tela pequena (`bg-black/70`) continua fixo: um véu atrás de um diálogo precisa escurecer em qualquer tema, e trocá-lo por token o faria desaparecer no tema Noite.

## Capas e obras

As capas das obras de demonstração são composições geométricas originais, geradas por [`ferramentas/gerar-capas.py`](../../ferramentas/gerar-capas.py): campo de cor chapada, uma forma grande, um filete. Não têm texto, porque o card do catálogo já escreve título e autoria por cima.

Qualquer capa nova deve seguir o mesmo vocabulário — e **nunca** reproduzir capa de obra protegida por direito autoral, mesmo em trabalho acadêmico: o repositório é público, e ser acadêmico não cria exceção.
