import type { ReaderPrefs } from './readerPrefs';

export interface ViewerProps {
  data: ArrayBuffer;
  /** Página atual (base 1). */
  page: number;
  onPageCount: (total: number) => void;
  /** Usado pelo EPUB, cuja paginação é controlada pelo próprio renderizador. */
  onPageChange?: (page: number) => void;
  prefs: ReaderPrefs;
  title: string;
  /** Texto alternativo da página (vem da audiodescrição, quando existe). */
  pageAlt?: string;
}
