import { useEffect, useRef, useState } from 'react';
import ePub from 'epubjs';
import type Book from 'epubjs/types/book';
import type Rendition from 'epubjs/types/rendition';
import type Contents from 'epubjs/types/contents';
import lexendUrl from '@fontsource/lexend/files/lexend-latin-400-normal.woff2?url';
import dyslexicUrl from '@fontsource/opendyslexic/files/opendyslexic-latin-400-normal.woff2?url';
import dyslexicBoldUrl from '@fontsource/opendyslexic/files/opendyslexic-latin-700-normal.woff2?url';
import { PALETTES, SPACING_VALUES, TYPOGRAPHY_FAMILY } from './readerPrefs';
import type { ViewerProps } from './types';
import { Spinner } from '../ui';

/** As fontes precisam ser declaradas dentro do iframe do EPUB para valerem no texto do livro. */
const FONT_FACES = `
@font-face { font-family: 'Lexend'; src: url('${new URL(lexendUrl, window.location.origin)}') format('woff2'); font-weight: 400; }
@font-face { font-family: 'OpenDyslexic'; src: url('${new URL(dyslexicUrl, window.location.origin)}') format('woff2'); font-weight: 400; }
@font-face { font-family: 'OpenDyslexic'; src: url('${new URL(dyslexicBoldUrl, window.location.origin)}') format('woff2'); font-weight: 700; }
`;

/**
 * Leitor EPUB (epub.js). Os controles de escala, espaçamento, tipografia e paleta
 * são aplicados diretamente ao conteúdo do livro. A "página" é a posição calculada
 * pelo epub.js (locations), já que EPUB é um formato refluível.
 */
export default function EpubViewer({ data, page, onPageCount, onPageChange, prefs, title }: ViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const currentRef = useRef(1);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hostRef.current) return;
    const book = ePub(data.slice(0));
    bookRef.current = book;
    const rendition = book.renderTo(hostRef.current, { width: '100%', height: '70vh', flow: 'paginated', spread: 'none', allowScriptedContent: false } as never);
    renditionRef.current = rendition;
    rendition.hooks.content.register((contents: Contents) => {
      const style = contents.document.createElement('style');
      style.textContent = FONT_FACES;
      contents.document.head.appendChild(style);
    });
    rendition.on('relocated', (location: { start: { location: number } }) => {
      const p = (location?.start?.location ?? 0) + 1;
      currentRef.current = p;
      onPageChange?.(p);
    });
    let active = true;
    book.ready
      .then(() => book.locations.generate(900))
      .then(() => {
        if (!active) return;
        onPageCount(Math.max(1, book.locations.length()));
        return rendition.display();
      })
      .then(() => active && setReady(true))
      .catch(() => active && setError('Não foi possível abrir este EPUB.'));
    return () => {
      active = false;
      rendition.destroy();
      book.destroy();
    };
    // Dependência intencionalmente só em `data`: o livro é remontado ao trocar de arquivo,
    // não a cada mudança de preferência (isso é tratado no efeito seguinte).
  }, [data]);

  // Navegação externa (setas / "Pág X de Y").
  useEffect(() => {
    const book = bookRef.current;
    const rendition = renditionRef.current;
    if (!ready || !book || !rendition || page === currentRef.current) return;
    const cfi = book.locations.cfiFromLocation(page - 1);
    if (cfi) void rendition.display(cfi);
  }, [page, ready]);

  // Preferências de leitura aplicadas ao conteúdo do livro.
  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;
    const palette = PALETTES[prefs.palette];
    const spacing = SPACING_VALUES[prefs.spacing];
    rendition.themes.override('color', palette.text, true);
    rendition.themes.override('background', palette.surface, true);
    rendition.themes.override('font-family', TYPOGRAPHY_FAMILY[prefs.typography], true);
    rendition.themes.override('line-height', String(spacing.lineHeight), true);
    rendition.themes.override('letter-spacing', spacing.letterSpacing, true);
    rendition.themes.override('word-spacing', spacing.wordSpacing, true);
    rendition.themes.fontSize(`${prefs.scale}%`);
  }, [prefs, ready]);

  return (
    <div className="relative">
      {!ready && !error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <Spinner label="Abrindo livro..." />
        </div>
      )}
      {error && <p className="p-6 text-center text-danger">{error}</p>}
      <div
        ref={hostRef}
        role="document"
        aria-label={`Conteúdo do livro ${title}`}
        className="min-h-[70vh] overflow-hidden rounded-lg"
        style={{ background: PALETTES[prefs.palette].surface }}
      />
    </div>
  );
}
