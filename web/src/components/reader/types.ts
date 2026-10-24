import type { ReaderPrefs } from './readerPrefs';

/** O que todo renderizador do leitor recebe, independente do formato. */
export interface ViewerCommonProps {
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

/**
 * Formatos que precisam do arquivo inteiro na memória: o EPUB e o CBZ são
 * arquivos ZIP e só fazem sentido abertos por completo.
 */
export interface ViewerProps extends ViewerCommonProps {
  data: ArrayBuffer;
}

/**
 * O PDF é lido direto da URL, em pedaços (Range), sem baixar o arquivo inteiro
 * antes de mostrar a primeira página — o limite de upload é de 180 MB.
 */
export interface PdfViewerProps extends ViewerCommonProps {
  url: string;
  /** Valor do cabeçalho Authorization, quando há sessão. */
  authorization?: string;
}
