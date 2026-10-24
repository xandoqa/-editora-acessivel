import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PALETTES, textStyle } from './readerPrefs';
import type { PdfViewerProps } from './types';
import { Spinner } from '../ui';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

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
    const task = pdfjsLib.getDocument({
      url,
      httpHeaders: authorization ? { Authorization: authorization } : undefined,
      isEvalSupported: false,
      // Pedaços de 256 KB: o servidor responde Range (Express `sendFile`).
      rangeChunkSize: 256 * 1024,
    });
    let active = true;
    task.promise
      .then((d) => {
        if (!active) return;
        setDoc(d);
        onPageCount(d.numPages);
      })
      .catch(() => active && setError('Não foi possível abrir este PDF.'));
    return () => {
      active = false;
      void task.destroy();
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

  if (error) return <p className="p-6 text-center text-danger">{error}</p>;
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
