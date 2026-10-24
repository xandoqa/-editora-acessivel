# 013 — PDF: normalizar no envio e ler em três vias

**Decisão.** Todo PDF enviado passa pelo `qpdf` antes de entrar no acervo, e o leitor tenta abri-lo por três caminhos: pedaços (HTTP Range), arquivo completo e, por último, o leitor embutido do navegador.

**O problema.** O pdf.js é uma implementação de PDF em JavaScript, e é mais estrita que os leitores nativos. Ele recusa arquivos que o Chrome abre sem reclamar: tabela de referências cruzadas quebrada, cifra de permissão sem senha de abertura, objetos empacotados de um jeito que ele não espera. Em digitalização antiga — que é exatamente o acervo que uma editora independente recebe — isso é a regra, não a exceção.

Uma obra que não abre é a falha mais grave possível aqui. O projeto existe para a pessoa conseguir ler.

**Por que normalizar no envio, e não contornar no leitor.** Consertar na leitura significa reprocessar o arquivo a cada abertura, em cada navegador, para cada pessoa. Consertar no envio é uma vez só, no servidor, e beneficia todo mundo que abrir depois. O `qpdf` preserva o conteúdo: só reescreve a estrutura.

| Entrada | O que o `qpdf` faz |
| --- | --- |
| PDF já correto | reescreve igual; nada se perde |
| Cifrado sem senha de abertura (permissão) | remove a cifra |
| Tabela de referências cruzadas quebrada | reconstrói (sai com código 3, "avisos", e o arquivo é bom) |
| Arquivo que não é PDF | falha; o original é mantido como chegou |

**Por que o conserto é opcional.** Se o `qpdf` não estiver instalado — rodando a API fora do Docker, por exemplo — ou se ele falhar, o original segue para o storage intacto. Normalizar é ganho, não requisito, e transformar isso em dependência obrigatória quebraria o desenvolvimento local de quem não tem o binário.

**Por que três vias na leitura.** Mesmo com a normalização, sobra uma faixa de casos:

1. **Pedaços (Range).** O caminho normal: a primeira página aparece sem esperar o arquivo inteiro, o que importa com o limite de 180 MB.
2. **Arquivo completo.** Boa parte dos "não abre" é do transporte, não do arquivo: proxy que não repassa Range, resposta sem `Content-Range`. Desistir na primeira via descartaria um arquivo que funcionaria.
3. **Leitor do navegador.** Última saída, para o que o pdf.js recusa e o motor nativo aceita. A tela avisa que ali a navegação por páginas e o "Texto desta página" não valem — não é equivalente, é melhor que nada.

**O limite honesto.** O leitor embutido do Firefox é o próprio pdf.js: lá a terceira via não acrescenta nada, e a interface diz isso em vez de fingir. E, acima de tudo, PDF digitalizado é imagem: mesmo abrindo, não é legível por leitor de tela. Para leitura acessível de verdade a resposta não é o PDF, é DOCX ou EPUB — e é o que a interface recomenda a quem publica.

**O que mudou junto, e por quê.** A conferência de `%%EOF` no envio nasceu do mesmo caso: a assinatura `%PDF-` continua intacta num arquivo cortado no meio do upload, então ele era aceito e só falhava depois, no leitor, longe da causa.
