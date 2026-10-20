# 005 — Leitor no navegador e audiodescrição

**Decisão.** Renderizar no navegador: **pdf.js** (canvas + extração da camada de texto), **epub.js** (iframe sem scripts, com temas para cor, fonte, espaçamento e tamanho) e **JSZip** para CBZ. A audiodescrição é estruturada no banco por página (descrição + falas) e narrada por: (a) faixa de áudio enviada pelo autor, quando existe; ou (b) **Web Speech API** (voz sintetizada do navegador), sincronizando a troca de páginas.

**Alternativas.** Converter no servidor (PDF → imagens/HTML) — mais pesado, exige bibliotecas nativas e fila de processamento; TTS em nuvem (Polly, Azure, Google) — qualidade maior, mas exige chave paga e envio de conteúdo a terceiros.

**Por que.** Atende ao relatório de transição (integrar epub.js/pdf.js e áudio real) sem serviços externos nem custos, funciona offline em relação a APIs de terceiros e mantém o servidor simples. A audiodescrição estruturada é reaproveitada como texto alternativo das páginas, painel visível e roteiro do TTS — uma única fonte para três usos acessíveis.

**Limitações aceitas.** CBR (RAR) não é renderizado (download oferecido); recolorir páginas em imagem não é possível (aplica-se filtro); a qualidade da voz depende do sistema do leitor.
