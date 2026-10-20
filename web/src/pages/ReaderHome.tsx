import { Navigate, Link } from 'react-router-dom';
import { useCatalog } from '../hooks/queries';
import { safeStorage } from '../lib/api';
import { EmptyState, LoadingState } from '../components/ui';
import { LAST_READ_KEY } from './Reader';

/** "Leitor Acessível" no menu: retoma a última obra lida ou abre o destaque mais recente do catálogo. */
export default function ReaderHome() {
  const last = Number(safeStorage.get(LAST_READ_KEY));
  const { data, isLoading } = useCatalog({ pageSize: 1, sort: 'recent' });
  if (Number.isInteger(last) && last > 0) return <Navigate to={`/reader/${last}`} replace />;
  if (isLoading) return <LoadingState label="Abrindo o Leitor Acessível..." />;
  const first = data?.data[0];
  if (first) return <Navigate to={`/reader/${first.id}`} replace />;
  return (
    <EmptyState
      title="Nenhuma obra disponível para leitura"
      description="Assim que obras forem publicadas no catálogo, você poderá lê-las aqui com audiodescrição e tipografia inclusiva."
      action={
        <Link to="/" className="btn-primary">
          Ir para o catálogo
        </Link>
      }
    />
  );
}
