import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PALETTES, textStyle } from './readerPrefs';
import type { PdfViewerProps } from './types';
import { Spinner } from '../ui';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * Traduz a falha do pdf.js para algo acionável.
 *
 * Antes, qualquer erro virava "Não foi possível abrir este PDF." — uma frase
 * que não distingue arquivo sumido do volume, PDF com senha e arquivo
 * corrompido, e que deixa quem lê (e quem mantém) sem o próximo passo. O
 * pdf.js identifica cada caso pelo nome da exceção; quando o problema é de
 * HTTP, a própria API manda a explicação no corpo da resposta, então vale
 * buscá-la em vez de inventar uma.
 */
async function mensagemDeErro(err: unknown, url: string, authorization?: string): Promise<string> {
  const nome = (err as { name?: string })?.name ?? '';

  if (nome === 'PasswordException') {
    return 'Este PDF está protegido por senha e não pode ser aberto no navegador. Baixe o arquivo para ler em um leitor de PDF, ou reenvie a obra sem proteção.';
  }
  if (nome === 'InvalidPDFException') {
    return 'O arquivo enviado não é um PDF válido — pode ter sido renomeado ou corrompido no envio. Reenvie a obra.';
  }

  // MissingPDFException (404) e UnexpectedResponseException (outros status):
  // a API explica o motivo no corpo. Pedimos só o primeiro byte, com Range,
  // para não baixar a obra inteira só para ler uma mensagem de erro.
  if (nome === 'MissingPDFException' || nome === 'UnexpectedResponseException') {
    try {
      const resposta = await fetch(url, {
        headers: { ...(authorization ? { Authorization: authorization } : {}), Range: 'bytes=0-0' },
      });
      if (!resposta.ok) {
        const corpo = (await resposta.json().catch(() => null)) as { error?: { message?: string } } | null;
        if (corpo?.error?.message) return corpo.error.message;
        return `O servidor recusou o arquivo desta obra (HTTP ${resposta.status}).`;
      }
    } catch {
      return 'Não foi possível falar com o servidor para buscar o arquivo. Confira se a API está no ar.';
    }
    return 'O arquivo desta obra não foi encontrado no servidor. Reenvie a obra pela interface.';
  }

  // Resto: PDFs que existem, chegam inteiros e ainda assim o pdf.js recusa —
  // xref quebrado, estrutura de um gerador exótico, cifra que o navegador não
  // abre. Não dá para prever a lista, e esconder o motivo atrás de uma frase
  // genérica é pior do que mostrá-lo: sem o nome da exceção ninguém, nem quem
  // usa nem quem mantém, tem por onde começar.
  const detalhe = [(err as { name?: string })?.name, (err as { message?: string })?.message]
    .filter(Boolean)
    .join(': ');
  return (
    'Este PDF existe no servidor e chegou inteiro, mas o leitor do navegador não conseguiu interpretá-lo. ' +
    'Costuma ser um arquivo gerado por um programa que escreve a estrutura fora do padrão, ou protegido por cifra. ' +
    'Use o botão de baixar para ler em um leitor de PDF do computador.' +
    (detalhe ? `\n\nDetalhe técnico: ${detalhe}` : '')
  );
}

/**
 * Renderiza PDFs com pdf.js (canvas). Além da imagem da página, extrai a camada
 * de texto do PDF e a exibe em "Texto desta página" com a tipografia escolhida
 * pelo leitor (fonte para dislexia, espaçamento, escala) — o que também torna o
 * conteúdo legível por leitores de tela.
 *
 * O arquivo é lido pela URL, em pedaços: o pdf.js busca só os trechos de que
 * precisa (requisições Range), então a primeira página aparece sem esperar o
 * download inteiro. Antes o arquivo todo era baixado como ArrayBuffer antes de
 * qualquer coisa ser exibida — com o limite de 180 MB, isso é muito tempo de
 * espera e muita memória na aba.
 */
export default function PdfViewer({ url, authorization, page, onPageCount, prefs, title, pageAlt }: PdfViewerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState('');
  const [pageText, setPageText] = useState('');
  const [rendering, setRendering] = useState(true);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let ativo = true;
    let tarefa: ReturnType<typeof pdfjsLib.getDocument> | null = null;

    const abrir = (semPedacos: boolean) => {
      tarefa = pdfjsLib.getDocument({
        url,
        httpHeaders: authorization ? { Authorization: authorization } : undefined,
        isEvalSupported: false,
        // Pedaços de 256 KB: o servidor responde Range (Express `sendFile`).
        rangeChunkSize: 256 * 1024,
        disableRange: semPedacos,
        disableStream: semPedacos,
      });
      return tarefa.promise;
    };

    void (async () => {
      try {
        const d = await abrir(false);
        if (!ativo) return;
        setDoc(d);
        onPageCount(d.numPages);
      } catch (primeiroErro) {
        if (!ativo) return;
        /*
         * Segunda tentativa, baixando o arquivo inteiro.
         *
         * Boa parte dos "não abre" não é do arquivo, é do transporte: um proxy
         * que não repassa requisições Range, uma resposta sem `Content-Range`,
         * um intermediário que recomprime. Nesses casos o pdf.js falha na
         * leitura por pedaços e funciona perfeitamente com o arquivo completo.
         * Custa uma espera maior, e só acontece quando a primeira via falhou —
         * é melhor do que desistir e mandar a pessoa embora.
         */
        try {
          const d = await abrir(true);
          if (!ativo) return;
          setDoc(d);
          onPageCount(d.numPages);
        } catch (segundoErro) {
          const texto = await mensagemDeErro(segundoErro, url, authorization);
          if (ativo) setError(texto);
        }
      }
    })();

    return () => {
      ativo = false;
      void tarefa?.destroy();
    };
  }, [url, authorization, onPageCount]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(Math.round(entries[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!doc || !width || !canvasRef.current) return;
    let renderTask: RenderTask | null = null;
    let cancelled = false;
    setRendering(true);
    (async () => {
      const pdfPage = await doc.getPage(Math.min(Math.max(1, page), doc.numPages));
      if (cancelled) return;
      const base = pdfPage.getViewport({ scale: 1 });
      const cssScale = (width / base.width) * (prefs.scale / 100);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = pdfPage.getViewport({ scale: cssScale * dpr });
      const canvas = canvasRef.current!;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
      canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
      renderTask = pdfPage.render({ canvasContext: canvas.getContext('2d')!, viewport });
      await renderTask.promise;
      const content = await pdfPage.getTextContent();
      if (cancelled) return;
      setPageText(
        content.items
          .map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : ''))
          .join('')
          .replace(/[ \t]+/g, ' ')
          .trim(),
      );
      setRendering(false);
    })().catch((err: unknown) => {
      if ((err as { name?: string })?.name !== 'RenderingCancelledException' && !cancelled) setError('Falha ao renderizar a página.');
    });
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [doc, page, width, prefs.scale]);

  if (error) {
    return (
      <div className="mx-auto max-w-prose p-6 text-center" role="alert">
        <p className="whitespace-pre-line text-sm text-danger">{error}</p>
      </div>
    );
  }
  const palette = PALETTES[prefs.palette];
  return (
    <div>
      <div ref={wrapRef} className="relative w-full overflow-x-auto">
        {rendering && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner label="Renderizando página..." />
          </div>
        )}
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={pageAlt ? `Página ${page}: ${pageAlt}` : `Página ${page} de ${title}`}
          className="mx-auto block rounded-lg"
          style={{ filter: palette.imageFilter }}
        />
      </div>
      {pageText && (
        <details className="mt-4 rounded-xl p-4" style={{ background: palette.surface, color: palette.text }}>
          <summary className="cursor-pointer text-sm font-semibold">Texto desta página (com sua tipografia)</summary>
          <p className="mt-3 whitespace-pre-line" style={textStyle(prefs)}>
            {pageText}
          </p>
        </details>
      )}
    </div>
  );
}
