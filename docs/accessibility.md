# Acessibilidade

A proposta da Livrin é ser uma editora de quadrinhos acessíveis; a própria interface segue as diretrizes WCAG 2.2 (meta AAA nos pontos abaixo). Este documento descreve o que foi implementado e como funciona.

## Recursos globais (barra superior e login)

| Recurso | Implementação |
| --- | --- |
| **Alto contraste** (botão ◐ / "Alto Contraste") | Todas as cores são variáveis CSS (`web/src/styles/global.css`). A classe `.hc` no `<html>` troca a paleta inteira para amarelo/preto. |
| **A- / A+** | Ajustam `--font-scale` (87,5% a 150%) aplicado ao `font-size` raiz; como tudo usa `rem`, a interface inteira escala. |
| **Ler a página em voz alta** (🔊) | Web Speech API do navegador (`speechSynthesis`, voz pt-BR) lê o conteúdo principal. Para ao trocar de página. |
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
| Formatos | PDF (pdf.js, canvas), EPUB (epub.js, iframe sem scripts), CBZ (JSZip, imagens). CBR é aceito no upload e oferecido para download (não há descompressor RAR no navegador). |
| Texto alternativo das páginas | A audiodescrição da página é usada como `alt`/`aria-label` da imagem da página. |
| Texto do PDF | "Texto desta página" extrai a camada de texto do PDF e a exibe com a tipografia escolhida — legível por leitores de tela. |
| Escala do texto | 70%–200%; no PDF/CBZ amplia a página (com rolagem horizontal), no EPUB e nos textos amplia a fonte. |
| Espaçamento | Padrão / Amplo / Largo (entrelinha, espaçamento entre letras e palavras). |
| Tipografia | Inter, Lexend e **OpenDyslexic** — fontes empacotadas localmente (também injetadas dentro do EPUB). |
| Paletas | Escuro, Claro, Sépia, Amarelo/Preto. No EPUB e nos textos as cores mudam de fato; nas páginas em imagem (PDF/CBZ) aplica-se filtro (sépia ou alto contraste em escala de cinza), já que não é possível recolorir a arte. |
| Audiodescrição | Descrição do quadro + falas (personagem, tom de voz, texto) por página. |
| Player | Se a obra tem faixa gravada (MP3/OGG/M4A): play/pausa, ±10s, barra de posição, velocidade 1.0×/1.25×/1.5×. Sem faixa: narração por **voz sintetizada** página a página, avançando as páginas do leitor em sincronia. |
| Teclado | ← → trocam de página; Espaço reproduz/pausa o áudio-guia. |
| Métricas | O uso de audiodescrição, alto contraste, fonte para dislexia e zoom é registrado (anonimamente para visitantes) e aparece no painel do autor. |

## Catálogo

- Filtros por recurso assistivo (audiodescrição, Libras, leitura fácil) e por formato.
- "Ouvir sinopse" em cada card e "Ouvir introdução da página" no topo.
- Selos de recursos com ícone **e** texto (a informação nunca depende só de cor).

## Limitações conhecidas

- A síntese de voz depende das vozes instaladas no sistema/navegador; em alguns navegadores sem voz pt-BR, a leitura usa a voz padrão.
- Janela de Libras: a plataforma registra o recurso declarado pela obra, mas não há player de vídeo de Libras embutido.
- Não foi realizada auditoria WCAG formal com usuários; recomenda-se validar com NVDA, VoiceOver e TalkBack antes de produção.
