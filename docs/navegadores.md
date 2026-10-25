# Navegadores aceitos

O piso está declarado em `web/vite.config.ts`, não herdado do padrão da ferramenta:

```js
target: ['es2022', 'chrome90', 'firefox90', 'safari15.4', 'edge90']
```

| Navegador | Mínimo | Desde |
| --- | --- | --- |
| Chrome / Edge | 90 | abril de 2021 |
| Firefox | 90 | julho de 2021 |
| Safari (macOS e iOS) | 15.4 | março de 2022 |

## Por que o Safari 15.4, e não antes

Três recursos chegam juntos nessa versão, e os três são estruturais aqui:

| Recurso | Onde o projeto usa | O que acontece sem ele |
| --- | --- | --- |
| `<dialog>` com `showModal()` | confirmações — "aprovar e publicar", "arquivar", exclusões | o diálogo não abria: o botão respondia e nada aparecia. Há desvio: sem `showModal`, o diálogo é mostrado sem prender o foco. Pior que o nativo, muito melhor que o silêncio |
| `:focus-visible` | indicador de foco em toda a interface | a regra seria descartada e **a página ficaria sem foco visível**. Há uma regra `:focus` de reserva, anulada por `@supports` onde `:focus-visible` existe |
| `aspect-ratio` | proporção das capas no catálogo | a capa passa a usar a proporção natural da imagem; o layout continua de pé |

## Recursos com caminho alternativo

Nada aqui depende de um navegador específico — onde há divergência, os dois dialetos estão implementados.

| Recurso | Chrome / Edge | Firefox | Safari |
| --- | --- | --- | --- |
| Palavra sob o cursor | `caretPositionFromPoint` (128+) ou `caretRangeFromPoint` | `caretPositionFromPoint` | `caretRangeFromPoint` |
| Leitura de PDF | pdf.js; se recusar, o leitor nativo (PDFium) costuma abrir | pdf.js; o leitor nativo **é o mesmo pdf.js**, então não adianta como alternativa | pdf.js; `<object>` com PDF funciona no desktop e é limitado no iOS |
| Síntese de voz | vozes próprias do Chrome, em geral as melhores | vozes do sistema operacional | vozes do sistema operacional |

## Onde a experiência muda, e não é defeito nosso

- **Qualidade da voz.** Quem fala é o sistema operacional. No Linux a voz padrão em português costuma ser o espeak, que é robótico; no Chrome há vozes próprias, bem melhores. O painel de leitura tem seletor de voz e avisa quando não encontra nenhuma em português.
- **PDF no iPhone e iPad.** O Safari do iOS tem limitações para exibir PDF embutido; o botão de baixar continua valendo. Para leitura acessível de verdade, DOCX e EPUB são os formatos certos — PDF digitalizado é imagem, e imagem não é lida por leitor de tela em navegador nenhum.
- **Passar o mouse por cima.** Em tela sensível ao toque não existe "passar por cima": a leitura por palavra ali depende das setas do teclado, e a leitura é ignorada no toque de propósito, para não atrapalhar a rolagem.

## Como conferir

Não há teste automatizado de navegador cruzado — a suíte de ponta a ponta roda em um. Ao mexer em interface, vale abrir em um navegador de cada motor: **Blink** (Chrome ou Edge), **Gecko** (Firefox) e **WebKit** (Safari). Testar Chrome e Edge é testar o mesmo motor duas vezes.
