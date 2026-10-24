# 012 — Manuscrito em `.docx` lido no navegador

**Decisão.** Aceitar `.docx` como formato de obra e **lê-lo direto no navegador**, convertendo o XML do Word em blocos tipados que o React desenha. Não há conversão para PDF nem para EPUB no servidor, e nenhuma dependência nova foi adicionada.

**Por que `.docx`.** É o formato em que uma pessoa que escreve realmente entrega o texto. Exigir PDF ou EPUB de quem está publicando o primeiro livro empurra o trabalho de conversão — e os erros dele — para quem tem menos recurso para fazê-lo. A proposta do projeto é baixar a barreira para publicar; aceitar o arquivo que o autor já tem é a parte mais concreta disso.

**Por que ler, e não converter.** Esta é a decisão que mais pesa, porque a intuição é o contrário.

| Caminho | Consequência |
| --- | --- |
| Converter para PDF no envio | O PDF é **página fixa**: o texto para de refluir. Escala, entrelinha, tipografia e paleta deixam de valer de verdade, e o leitor de tela passa a depender da camada de texto. Converter é **perder** acessibilidade — exatamente o que o projeto existe para dar. |
| Converter para EPUB no envio | Preserva o refluxo, mas exige LibreOffice ou Pandoc na imagem Docker: centenas de megabytes, uma superfície de ataque grande (conversor de documento rodando sobre arquivo enviado por terceiro) e um passo que falha calado. |
| Ler o `.docx` no leitor | O texto reflui, obedece a tudo que a pessoa escolheu e chega ao leitor de tela na ordem certa. O arquivo original fica intacto para download. |

O `.docx` e o EPUB passam a ser os **formatos mais acessíveis** do leitor. Isso é dito a quem publica, na tela de envio: é informação útil, não enfeite.

**Por que sem dependência nova.** Um `.docx` é um ZIP cujo texto mora em `word/document.xml`. O projeto já traz JSZip (usado pelo leitor de CBZ) e o navegador já traz `DOMParser` — a conversão não custa pacote nenhum. Mammoth ou docx-preview resolveriam o caso, mas trazem peso e, sobretudo, devolvem **HTML**.

**Por que o parser devolve estrutura, e não HTML.** Devolver HTML de um arquivo enviado por terceiros obriga a higienizar a marcação antes de injetar, e um erro nessa higienização vira execução de script na página de quem lê. O parser (`web/src/components/reader/docxParser.ts`) devolve blocos tipados — título, parágrafo, item, tabela, com negrito e itálico — e cada bloco vira um componente React. Não existe marcação de terceiro para injetar: não há o que higienizar.

**Paginação.** Um `.docx` não tem páginas; a paginação é do programa que imprime, não do arquivo. O leitor do Livrin navega por página, então os blocos são agrupados em telas de tamanho parecido, e um título nunca fica sozinho no fim de uma tela — o que um livro impresso também evita.

**Validação.** A API confere a extensão e a assinatura binária. DOCX, EPUB e CBZ são ZIP e compartilham a assinatura `PK\x03\x04`; o que os distingue é a extensão declarada, e um executável renomeado para `.docx` é recusado. A migração `0005_docx` acrescenta `DOCX` ao fim do enum `file_type`, sem tocar nos valores existentes.

**O que fica de fora do parser.** Imagens embutidas, notas de rodapé, numeração automática de listas, colunas e quebras de seção. Um manuscrito de texto corrido — que é o caso de uso — não depende de nenhum deles; uma obra que dependa continua melhor servida por PDF ou EPUB, e os dois continuam aceitos.
