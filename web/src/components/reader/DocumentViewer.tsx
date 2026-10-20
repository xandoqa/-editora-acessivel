import { lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileWarning } from 'lucide-react';
import { api, downloadAuthenticated, errorMessage } from '../../lib/api';
import type { FileType } from '../../types/api';
import { ErrorState, Spinner } from '../ui';
import type { ViewerProps } from './types';

const PdfViewer = lazy(() => import('./PdfViewer'));
const EpubViewer = lazy(() => import('./EpubViewer'));
const CbzViewer = lazy(() => import('./CbzViewer'));

interface Props extends Omit<ViewerProps, 'data'> {
  workId: number;
  fileType: FileType;
}

/** Baixa o arquivo da obra (com o token, se houver) e escolhe o renderizador pelo formato. */
export default function DocumentViewer({ workId, fileType, ...viewer }: Props) {
  const supported = fileType !== 'CBR';
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['work-file', workId],
    queryFn: async () => (await api.get<ArrayBuffer>(`/works/${workId}/file`, { responseType: 'arraybuffer' })).data,
    enabled: supported,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    retry: 1,
  });

  if (!supported) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <FileWarning className="h-10 w-10 text-warn" aria-hidden />
        <p className="max-w-md text-sm">
          Arquivos CBR (RAR) ainda não podem ser exibidos diretamente no navegador. Baixe a obra para ler em um aplicativo de quadrinhos, ou
          acompanhe a audiodescrição abaixo.
        </p>
        <button type="button" className="btn-secondary" onClick={() => void downloadAuthenticated(`/works/${workId}/file?download=1`, `${viewer.title}.cbr`)}>
          <Download className="h-4 w-4" aria-hidden /> Baixar arquivo CBR
        </button>
      </div>
    );
  }
  if (isLoading) return <div className="flex min-h-[320px] items-center justify-center"><Spinner label="Carregando arquivo da obra..." /></div>;
  if (isError || !data) return <ErrorState message={errorMessage(error, 'Não foi possível carregar o arquivo da obra.')} onRetry={() => refetch()} />;

  return (
    <Suspense fallback={<div className="flex min-h-[320px] items-center justify-center"><Spinner label="Preparando leitor..." /></div>}>
      {fileType === 'PDF' && <PdfViewer data={data} {...viewer} />}
      {fileType === 'EPUB' && <EpubViewer data={data} {...viewer} />}
      {fileType === 'CBZ' && <CbzViewer data={data} {...viewer} />}
    </Suspense>
  );
}
