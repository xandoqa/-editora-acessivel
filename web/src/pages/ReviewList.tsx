import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, ClipboardList } from 'lucide-react';
import { useMyWorks } from '../hooks/queries';
import { errorMessage } from '../lib/api';
import { formatDate } from '../lib/format';
import { Cover, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from '../components/ui';

/** "Em Análise": obras do autor no fluxo de curadoria. Com uma única obra em análise, abre direto o acompanhamento. */
export default function ReviewList() {
  const { data, isLoading, isError, error, refetch } = useMyWorks();
  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;

  const inFlow = data.filter((w) => ['EM_ANALISE', 'APROVADO', 'REJEITADO'].includes(w.status));
  const inReview = inFlow.filter((w) => w.status === 'EM_ANALISE');
  if (inFlow.length === 1 && inReview.length === 1) return <Navigate to={`/review/${inReview[0].id}`} replace />;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Fluxo de avaliação editorial"
        icon={<ClipboardList className="h-4 w-4" aria-hidden />}
        title="Obras em processo editorial"
        description="Acompanhe as validações de conteúdo, diagramação inclusiva e testes de audiodescrição de cada obra enviada."
      />
      {inFlow.length === 0 ? (
        <EmptyState
          title="Nenhuma obra em análise no momento"
          description="Quando você enviar uma obra para a curadoria, o andamento aparecerá aqui."
          action={
            <Link to="/submit" className="btn-primary">
              Submeter uma obra
            </Link>
          }
        />
      ) : (
        <ul className="space-y-4">
          {inFlow.map((w) => (
            <li key={w.id}>
              <Link to={`/review/${w.id}`} className="card flex items-center gap-4 p-4 hover:bg-surface-high">
                <Cover url={w.coverUrl} title={w.title} className="h-20 w-14 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-ink">{w.title}</h2>
                    <StatusBadge status={w.status} />
                  </div>
                  <p className="text-sm text-ink-muted">
                    Enviada em {formatDate(w.submittedAt)} · checklist {w.reviewProgress}% concluído
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-ink-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
