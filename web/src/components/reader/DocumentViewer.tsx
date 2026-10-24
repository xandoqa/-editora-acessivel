import { lazy, Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileWarning } from 'lucide-react';
import { api, downloadAuthenticated, errorMessage, safeStorage, TOKEN_KEY } from '../../lib/api';
import type { FileType } from '../../types/api';
import { ErrorState, Spinner } from '../ui';
import type { ViewerCommonProps } from './types';

const PdfViewer = lazy(() => import('./PdfViewer'));
const EpubViewer = lazy(() => import('./EpubViewer'));
const CbzViewer = lazy(() => import('./CbzViewer'));
const DocxViewer = lazy(() => import('./DocxViewer'));

interface Props extends ViewerCommonProps {
  workId: number;
  fileType: FileType;
}

/** Base da API: caminho relativo por padrão (proxy do Vite/Nginx). */
const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

const carregando = (label: string) => (
  <div className="flex min-h-[320px] items-center justify-center">
    <Spinner label={label} />
  </div>
);

/**
 * Escolhe o renderizador pelo formato e cuida de como cada um recebe o arquivo.
 *
 *  - PDF  → lido direto da URL, em pedaços (Range). Nada é baixado por inteiro
 *           antes da primeira página aparecer.
 *  - EPUB, CBZ e DOCX → são arquivos ZIP, precisam vir completos. Aqui o
 *           download é feito com indicador de progresso, em vez de uma espera muda.
 *  - CBR  → RAR não é lido no navegador; oferecemos o download.
 */
export default function DocumentViewer({ workId, fileType, ...viewer }: Props) {
  const [progresso, setProgresso] = useState(0);
  // DOCX também é um ZIP: como o EPUB e o CBZ, precisa vir completo.
  const precisaDoArquivoInteiro = fileType === 'EPUB' || fileType === 'CBZ' || fileType === 'DOCX';

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['work-file', workId],
    queryFn: async () =>
      (
        await api.get<ArrayBuffer>(`/works/${workId}/file`, {
          responseType: 'arraybuffer',
          onDownloadProgress: (e) => e.total && setProgresso(Math.round((e.loaded / e.total) * 100)),
        })
      ).data,
    enabled: precisaDoArquivoInteiro,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    retry: 1,
  });

  if (fileType === 'CBR') {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <FileWarning className="h-10 w-10 text-warn" aria-hidden />
        <p className="max-w-md text-sm">
          Arquivos CBR (RAR) ainda não podem ser exibidos diretamente no navegador. Baixe a obra para ler em um aplicativo de quadrinhos, ou
          acompanhe a audiodescrição abaixo.
        </p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => void downloadAuthenticated(`/works/${workId}/file?download=1`, `${viewer.title}.cbr`)}
        >
          <Download className="h-4 w-4" aria-hidden /> Baixar arquivo CBR
        </button>
      </div>
    );
  }

  if (fileType === 'PDF') {
    const token = safeStorage.get(TOKEN_KEY);
    return (
      <Suspense fallback={carregando('Preparando leitor...')}>
        <PdfViewer
          url={`${apiBase}/works/${workId}/file`}
          authorization={token ? `Bearer ${token}` : undefined}
          {...viewer}
        />
      </Suspense>
    );
  }

  if (isLoading) return carregando(progresso > 0 ? `Carregando a obra... ${progresso}%` : 'Carregando arquivo da obra...');
  if (isError || !data) return <ErrorState message={errorMessage(error, 'Não foi possível carregar o arquivo da obra.')} onRetry={() => refetch()} />;

  return (
    <Suspense fallback={carregando('Preparando leitor...')}>
      {fileType === 'EPUB' && <EpubViewer data={data} {...viewer} />}
      {fileType === 'CBZ' && <CbzViewer data={data} {...viewer} />}
      {fileType === 'DOCX' && <DocxViewer data={data} {...viewer} />}
    </Suspense>
  );
}
