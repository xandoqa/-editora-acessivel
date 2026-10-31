import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, History, Trash2 } from 'lucide-react';
import { ConfirmDialog, Cover, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { useApagarHistorico, useReadingHistory } from '../hooks/purchases';
import { errorMessage } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { FORMAT_SHORT } from '../lib/labels';
import { useT } from '../i18n/I18nContext';

/**
 * Histórico de leitura.
 *
 * Mostra as obras que a pessoa **de fato abriu**, não as que salvou ou
 * comprou. Os dados vêm das sessões de leitura que o sistema já registrava
 * para as métricas da autoria — é a mesma informação lida do outro lado.
 *
 * O vínculo é com a conta, então o histórico sobrevive a sair e entrar de
 * novo, e acompanha a pessoa em outro aparelho.
 */
export default function Historico() {
  const t = useT();
  const historico = useReadingHistory();
  const apagar = useApagarHistorico();
  const toast = useToast();
  const [confirmando, setConfirmando] = useState(false);

  const limpar = async () => {
    try {
      const { removidas } = await apagar.mutateAsync();
      toast.success(
        removidas ? `Histórico apagado: ${removidas} leitura(s) removida(s).` : 'Não havia nada para apagar.',
      );
    } catch (e) {
      toast.error(errorMessage(e, 'Não foi possível apagar o histórico.'));
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Minha conta"
        title={t('historico.titulo')}
        description="As obras que você abriu, da mais recente para a mais antiga. Fica ligado à sua conta, então continua aqui quando você voltar."
        icon={<History className="h-6 w-6" aria-hidden />}
        actions={
          historico.data && historico.data.length > 0 ? (
            <button type="button" className="btn-secondary" onClick={() => setConfirmando(true)}>
              <Trash2 className="h-4 w-4" aria-hidden /> Apagar histórico
            </button>
          ) : undefined
        }
      />

      {historico.isLoading && <LoadingState label={t('historico.carregando')} />}
      {historico.isError && (
        <ErrorState message={errorMessage(historico.error)} onRetry={() => void historico.refetch()} />
      )}

      {historico.data && historico.data.length === 0 && (
        <EmptyState
          title={t('historico.vazio')}
          description="Assim que abrir uma obra no leitor, ela aparece aqui — com a página em que você parou."
          action={
            <Link to="/" className="btn-primary">
              Ver o catálogo
            </Link>
          }
        />
      )}

      {historico.data && historico.data.length > 0 && (
        <ul className="space-y-4">
          {historico.data.map((item) => (
            <li key={item.work.id} className="card flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
              <Link
                to={`/reader/${item.work.id}`}
                className="block w-24 shrink-0 overflow-hidden rounded-[10px_14px_10px_14px] border border-outline/70"
                tabIndex={-1}
                aria-hidden
              >
                <Cover url={item.work.coverUrl} title={item.work.title} alt="" className="aspect-[16/9] w-full" />
              </Link>

              <div className="min-w-0 flex-1">
                <p className="eyebrow text-ink-subtle">
                  {t(FORMAT_SHORT[item.work.format as keyof typeof FORMAT_SHORT])} ·{' '}
                  {item.work.pages}p
                </p>
                <h2 className="mt-0.5 font-display text-lg font-semibold leading-tight text-ink">
                  <Link to={`/reader/${item.work.id}`} className="underline-offset-2 hover:underline">
                    {item.work.title}
                  </Link>
                </h2>
                <p className="text-sm text-ink-muted">{item.author.name}</p>

                {/* A barra mostra até onde a pessoa chegou. O número ao lado
                    existe porque barra sozinha não é lida por leitor de tela
                    nem distinguida por quem não enxerga a cor. */}
                <div className="mt-2 flex items-center gap-3">
                  <div
                    className="h-2 flex-1 overflow-hidden rounded-full bg-surface-highest"
                    role="progressbar"
                    aria-valuenow={item.progresso}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progresso em ${item.work.title}`}
                  >
                    <div className="h-full rounded-full bg-primary" style={{ width: `${item.progresso}%` }} />
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-ink">
                    {item.progresso}% · pág. {item.lastPage}
                  </span>
                </div>

                <p className="mt-1.5 text-xs text-ink-subtle">
                  Última leitura em {formatDateTime(item.lastReadAt)}
                  {item.sessions > 1 && ` · você voltou ${item.sessions} vezes`}
                </p>
              </div>

              <Link
                to={`/reader/${item.work.id}`}
                className="btn-secondary shrink-0"
                aria-label={`Continuar lendo: ${item.work.title}`}
              >
                <BookOpen className="h-4 w-4" aria-hidden /> Continuar
              </Link>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmando}
        title={t('historico.apagarTitulo')}
        message="As obras somem desta lista e o progresso de leitura deixa de aparecer. As obras adquiridas continuam na sua biblioteca, e as estatísticas de quem publicou seguem contando a leitura, sem ligação com a sua conta."
        confirmLabel="Apagar histórico"
        danger
        busy={apagar.isPending}
        onConfirm={() => void limpar()}
        onClose={() => setConfirmando(false)}
      />
    </>
  );
}
