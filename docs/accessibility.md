# Acessibilidade

A proposta da Livrin é ser uma editora de quadrinhos acessíveis; a própria interface segue as diretrizes WCAG 2.2 (meta AAA nos pontos abaixo). Este documento descreve o que foi implementado e como funciona.

## Recursos globais (barra superior e login)

| Recurso | Implementação |
| --- | --- |
| **Alto contraste** (botão ◐ / "Alto Contraste") | Todas as cores são variáveis CSS (`web/src/styles/global.css`). A classe `.hc` no `<html>` troca a paleta inteira para amarelo/preto. |
| **A- / A+** | Ajustam `--font-scale` (87,5% a 150%) aplicado ao `font-size` raiz; como tudo usa `rem`, a interface inteira escala. |
| **Ler em voz alta** (🔊) | Web Speech API (`speechSynthesis`, voz pt-BR) fala a **palavra sob o ponteiro**. Sem mouse, as setas ← → andam palavra a palavra — e, enquanto o recurso está ligado, elas pertencem a ele e não viram página. Há seletor de voz e de velocidade. |
| **Janela de Libras** (✋) | Avatar do VLibras sinaliza o texto selecionado. Opcional, começa desligada, e o script só é baixado ao ligar. Ver a seção própria, abaixo. |
| **Leitor Otimizado** | Sublinha links, reforça o contorno de foco, aumenta entrelinha e desativa animações. |
| Preferências persistentes | Salvas no navegador (`localStorage`, com tratamento de erro se o armazenamento estiver bloqueado). |

## Base da interface

- Contraste do texto principal ≥ 7:1 sobre os fundos (tokens `ink`, `ink-muted`, `ink-subtle` calibrados para AAA no tema escuro).
- Foco sempre visível (`:focus-visible` com contorno de 3px; 5px no Leitor Otimizado).
- Link "Pular para o conteúdo" no início de cada página.
- Alvos de toque de no mínimo 44×44px nos botões principais.
- Formulários com `<label>` associado, `aria-invalid` e mensagens de erro ligadas por `aria-describedby`; contadores de caracteres.
- Avisos (toasts) anunciados por `aria-live`; contadores e paginação do leitor com `aria-live="polite"`.
- Diálogos com `<dialog>` nativo (foco preso, `Esc` fecha); menus com `aria-expanded`/`aria-haspopup`.
- Tabelas administrativas com `<caption>`, cabeçalhos ordenáveis com `aria-sort`.
- Respeito a `prefers-reduced-motion`.
- Layout responsivo; no celular a navegação vira uma gaveta acessível.

## Leitor Acessível

| Recurso | Como funciona |
| --- | --- |
| Formatos | PDF (pdf.js, canvas; ver *Leitura de PDF em três vias* abaixo), **DOCX** (leitor próprio: o XML do Word vira blocos tipados, nunca HTML injetado), EPUB (epub.js, iframe sem scripts), CBZ (JSZip, imagens). CBR é aceito no upload e oferecido para download (não há descompressor RAR no navegador). |
| Formato mais acessível | **DOCX e EPUB**, porque o texto reflui: aceitam tipografia, espaçamento, escala e paleta de verdade, e o leitor de tela recebe texto na ordem certa. O PDF é página fixa — a camada de texto ajuda, mas não reflui. Vale dizer isso a quem publica. |
| Texto alternativo das páginas | A audiodescrição da página é usada como `alt`/`aria-label` da imagem da página. |
| Texto do PDF | "Texto desta página" extrai a camada de texto do PDF e a exibe com a tipografia escolhida — legível por leitores de tela. **Só funciona se o PDF tiver camada de texto**: um PDF digitalizado é imagem, e imagem não tem o que extrair. As obras de demonstração em PDF foram geradas com texto real justamente por isso. |

### Leitura de PDF em três vias

O pdf.js é uma implementação em JavaScript e recusa arquivos que leitores nativos abrem sem reclamar — tabela de referências cruzadas quebrada, cifra de permissão, objetos empacotados fora do esperado. Em digitalização antiga isso é a regra. O leitor tenta, nesta ordem:

1. **Por pedaços** (requisições HTTP Range): a primeira página aparece sem esperar o arquivo inteiro.
2. **Arquivo completo**, quando o transporte não repassa Range — proxy que não encaminha, resposta sem `Content-Range`.
3. **Leitor embutido do navegador**, como última saída. Aqui a navegação por páginas do Livrin e o "Texto desta página" não valem, e a tela avisa isso.

Antes das três vias, o arquivo já é **normalizado no envio** pelo `qpdf` (ver [architecture.md](architecture.md)), que resolve a maior parte desses casos na origem.

> Atenção ao testar: o leitor embutido do **Firefox é o próprio pdf.js**. Se o arquivo falha no Livrin, falha igual lá. O Chrome usa o PDFium, que é outro motor e mais tolerante.
| Escala do texto | 70%–200%; no PDF/CBZ amplia a página (com rolagem horizontal), no DOCX, no EPUB e nos textos amplia a fonte. |
| Espaçamento | Padrão / Amplo / Largo (entrelinha, espaçamento entre letras e palavras). |
| Tipografia | Inter, Lexend e **OpenDyslexic** — fontes empacotadas localmente (também injetadas dentro do EPUB). |
| Paletas | Escuro, Claro, Sépia, Amarelo/Preto. No DOCX, no EPUB e nos textos as cores mudam de fato; nas páginas em imagem (PDF/CBZ) aplica-se filtro (sépia ou alto contraste em escala de cinza), já que não é possível recolorir a arte. |
| Navegadores | Chrome/Edge 90+, Firefox 90+, Safari 15.4+ — o piso vem de `<dialog>`, `:focus-visible` e `aspect-ratio`. Detalhes e caminhos alternativos em [navegadores.md](navegadores.md). |
| Leitura em voz alta | Liga pelo alto-falante da barra superior. Fala **a palavra sob o ponteiro**; sem mouse, as setas ← → andam palavra a palavra e a palavra corrente é selecionada, ficando visível. Há seletor de voz e velocidade. |
| Qualidade da voz | Vem do sistema operacional, não do Livrin. No Linux a voz padrão em português costuma ser o espeak, que é robótico; Windows, macOS e Chrome trazem vozes melhores. O painel avisa quando não encontra nenhuma voz em português instalada. |
| Audiodescrição | Descrição do quadro + falas (personagem, tom de voz, texto) por página. |
| Player | Se a obra tem faixa gravada (MP3/OGG/M4A): play/pausa, ±10s, barra de posição, velocidade 1.0×/1.25×/1.5×. Sem faixa: narração por **voz sintetizada** página a página, avançando as páginas do leitor em sincronia. |
| Teclado | ← → trocam de página; Espaço reproduz/pausa o áudio-guia. |
| Métricas | O uso de audiodescrição, alto contraste, fonte para dislexia e zoom é registrado (anonimamente para visitantes) e aparece no painel do autor. |

## Janela de Libras

Botão na barra superior, ao lado da leitura em voz alta. Liga uma janela com avatar que sinaliza em Libras o texto selecionado, pelo [VLibras](https://www.gov.br/governodigital/pt-br/acessibilidade-e-usuario/vlibras), suíte livre do governo federal feita com a UFPB.

| Decisão | Por quê |
| --- | --- |
| Opcional, começa desligada | Recurso de acessibilidade imposto a todos atrapalha quem não precisa dele |
| O script só baixa ao ligar | Com o botão desligado, a aplicação não faz nenhuma requisição a `vlibras.gov.br`. É a única exceção à regra de não carregar script de terceiro |
| A falha é dita | Serviço indisponível: o botão avisa e volta a desligado, em vez de girar para sempre |
| Declarada como automática | Ver "Limitações conhecidas", abaixo |

Detalhes de implementação em [ADR 016](decisions/016-janela-de-libras.md).

## Acesso a obra paga

Obra que a autoria marcou como paga exige aquisição confirmada para ser lida ou baixada. A verificação vale para os **três** caminhos pelos quais o conteúdo pode sair: o arquivo, a faixa de áudio e a **lista de audiodescrição** — que, num quadrinho, é a obra em texto.

Essa última foi uma brecha real, corrigida na 3.3.0: deixá-la aberta seria uma porta dos fundos contra exatamente o público que a plataforma existe para servir. Ver [ADR 015](decisions/015-publicidade-e-plano.md).

Publicidade, quando a obra a tem, aparece **entre** páginas e nunca sobre o texto, sem movimento, sem sobreposição e sem rastreamento. O plano premium a remove.

## Catálogo

- Filtros por recurso assistivo (audiodescrição, Libras no conteúdo, leitura fácil) e por formato. **"Libras no conteúdo" é declaração da autoria sobre a própria obra**, conferida pela curadoria — coisa diferente da janela de tradução automática da barra superior.
- "Ouvir sinopse" em cada card e "Ouvir introdução da página" no topo.
- Selos de recursos com ícone **e** texto (a informação nunca depende só de cor).

## Limitações conhecidas

- A síntese de voz depende das vozes instaladas no sistema/navegador; em alguns navegadores sem voz pt-BR, a leitura usa a voz padrão.
- **Janela de Libras: é tradução automática.** O avatar do VLibras sinaliza a partir do texto em português, e Libras é uma língua com gramática própria, não português sinalizado. A compreensão por avatar tem limites reconhecidos na literatura e pela comunidade surda. O recurso é um apoio declarado como automático — não substitui intérprete humano, e a plataforma **não hospeda vídeo de intérprete**.
- A janela de Libras depende de um serviço externo (`vlibras.gov.br`). Fora do ar ou sem internet, o recurso não sobe; o botão avisa e volta a desligado, sem derrubar o resto da página.
- Não foi realizada auditoria WCAG formal com usuários; recomenda-se validar com NVDA, VoiceOver e TalkBack antes de produção.
