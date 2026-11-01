# ADR 021 — Coleções por autor derivadas das obras, e retratos desenhados em vez de fotos

**Data:** 01/11/2026 · **Versão:** 3.7.0 · **Estado:** aceita

## Contexto

A especificação de 01/11 pediu três coisas para a página inicial: uma vitrine de lançamentos com cara de plataforma de entretenimento, uma "roleta de autores famosos que apoiam o Livrin", e coleções organizadas por autor.

A referência enviada era a home de uma editora de quadrinhos: uma fileira de **fotografias de quadrinistas reais** — identificáveis — sob a chamada "Compre por Mestre". A tarefa, portanto, trazia junto duas perguntas que não são de código: de onde vêm os autores e de onde vêm os rostos.

## Decisão 1 — Autor não é tabela nova; é quem publicou

A lista de autores é **derivada** das obras aprovadas. Não existe cadastro de autor para manter em dia.

`works.author_id` aponta para `users` desde a primeira versão do esquema. Criar uma tabela `authors` ao lado significaria duas fontes para o mesmo fato — e, no dia em que discordassem, a página de autores mostraria uma coleção que o catálogo não confirma. É o defeito clássico dessas telas.

Consequências, que valem estar escritas:

- quem publica uma obra e tem ela aprovada **aparece no mesmo instante**, sem ninguém cadastrar nada;
- quem tem só rascunho **não aparece** — a página é pública, e rascunho não é;
- `GET /api/authors/:id` responde **404** para conta sem obra aprovada, mesmo que a conta exista. Um 200 com coleção vazia contaria a um visitante quem tem cadastro aqui.

A única coluna nova é `users.bio` (migration 0009), aditiva e anulável. É coluna própria em vez de esticar `headline` porque as duas têm funções diferentes: `headline` é etiqueta de uma linha ao lado do nome, em avaliações e notas; `bio` é parágrafo de apresentação. Esticar a primeira mudaria o sentido dela em todos os lugares onde já aparece.

## Decisão 2 — Os autores são fictícios, e a interface diz isso

Os autores da roleta são os **autores do acervo de demonstração**, que são fictícios e já existiam no seed desde a 1.0. Não há convidado famoso, real ou inventado.

O que **não** foi feito, e por quê:

- **Nada de fotos de pessoas reais.** Não são nossas para usar, e colocá-las sob a frase "autores que sustentam o Livrin" atribuiria a elas um apoio que nunca deram. O Livrin é um trabalho acadêmico; ninguém o endossou.
- **Nada de depoimento entre aspas.** Nem de pessoa real, nem de personagem. O que aparece de cada autoria é a linha de apresentação que ela tem no cadastro — não uma frase inventada sobre a plataforma.
- **O aviso de ficção fica na própria seção**, visível, com ícone, e não num rodapé. É aquela seção que poderia ser lida como "gente importante apoia isto", então é nela que a correção precisa estar.

## Decisão 3 — Retrato geométrico gerado do nome

Cada autoria tem um retrato desenhado em SVG, montado a partir de um hash do nome.

Por que não avatar de iniciais: duas letras num círculo colorido é o que todo sistema faz quando desistiu do assunto, e aqui havia uma referência visual forte a honrar — uma roda de retratos. Por que não imagem gerada e guardada em arquivo: seria mais um binário no repositório, mais uma rota estática e mais uma coisa que o seed precisa copiar, para um desenho que o navegador monta em microssegundos.

O desenho é uma composição no mesmo vocabulário das capas do acervo — campo de cor chapada, uma forma grande, um filete: busto, cabeça (redonda ou quadrada), gola e um ornamento entre seis. São 6 paletas × 6 ornamentos × 2 formatos × 5 alturas × 6 larguras × 2 halos, mais de quatro mil combinações.

Duas propriedades que importam:

1. **Determinístico.** O mesmo nome dá sempre o mesmo retrato, em qualquer navegador e em qualquer recarregamento. Sem isso, a pessoa mudaria de cara a cada visita.
2. **Sem cor literal.** Todas as cores saem dos tokens, então o retrato acompanha os sete temas — inclusive o alto contraste — sem nenhuma regra extra.

O desenho mora em `web/src/components/autores/retrato.ts`, separado do componente React, porque `ferramentas/previa-retratos.mjs` **importa esse mesmo módulo** para gerar a folha de contato em `docs/design/previa-retratos.png`. Uma prévia que reimplementasse o desenho divergiria no primeiro ajuste e passaria a mostrar um retrato que o site não desenha.

Isso não é zelo teórico: a primeira versão do busto usava um arco de raio igual à meia-largura dos ombros — um semicírculo que subia até a altura da cabeça e a engolia. SVG válido, tipos válidos, contraste intacto, e o desenho errado. Foi olhando a prévia que o erro apareceu.

## Decisão 4 — A vitrine não gira sozinha

Carrossel que avança sem ser pedido reprova no critério **2.2.2** da WCAG (movimento automático com mais de cinco segundos precisa de pausa). E, antes de reprovar, atrapalha: quem lê devagar perde o cartão no meio da frase, e quem usa ampliação de tela perde a posição.

Aqui o movimento só acontece quando alguém pede — seta, rolagem ou tecla. As setas se **desabilitam** nas pontas em vez de sumirem, porque botão que desaparece tira a referência de quem está com a tela ampliada.

O volume dos livros (lombada, corte das páginas, giro de 13°) é CSS, não imagem: nenhum mockup, nenhuma textura baixada, nada que precise de arquivo. E **só a capa gira** — o título e a autoria ficam fora da transformação. Na primeira versão o cartão inteiro girava, texto junto, e o resultado era uma frase em perspectiva: legível, mas pior de ler. Não é uma concessão que este projeto faça por enfeite.

`prefers-reduced-motion` e o Leitor Otimizado desligam a **rotação inteira**, não só a transição. Desligar a transição e manter o giro entregaria capas tortas e paradas — o pior dos dois mundos para quem tem vertigem ou usa ampliação, porque a imagem fica deformada e nada explica por quê.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Tabela `authors` própria | Duas fontes para o mesmo fato; divergência inevitável entre a lista e o acervo |
| Fotos de quadrinistas reais, como na referência | Não são nossas, e a chamada da seção lhes atribuiria um apoio inexistente |
| Autores famosos inventados com depoimentos | Depoimento falso é depoimento falso, ainda que de pessoa inventada: a frase fala da plataforma, e a plataforma é real |
| Avatar de iniciais | Desiste da referência visual sem economizar nada |
| Retratos gerados em arquivo (PNG/WebP) | Binários no repositório, rota estática e cópia no seed, para um desenho que o navegador monta sozinho |
| Carrossel com avanço automático | Critério 2.2.2; e atrapalha justamente quem este projeto existe para atender |

## Consequências

- A página de autores não tem manutenção própria: ela segue o acervo.
- Publicar uma obra nova muda três telas de uma vez — catálogo, vitrine e coleção do autor — porque as três leem a mesma fonte.
- O retrato é uma função do nome. Renomear uma autoria muda o retrato dela, o que é aceitável: o retrato nunca foi retrato de ninguém.
- Qualquer painel ou seção futura que use fotografia de pessoa real volta a abrir a pergunta desta ADR.
