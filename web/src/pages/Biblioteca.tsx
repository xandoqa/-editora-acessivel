import { Link } from 'react-router-dom';
import { BookOpen, Library, Receipt } from 'lucide-react';
import { Cover, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { useMyLibrary, useMyPurchases } from '../hooks/purchases';
import { errorMessage } from '../lib/api';
import { formatCents, formatDateTime } from '../lib/format';
import { FORMAT_SHORT } from '../lib/labels';
import type { PurchaseStatus } from '../types/api';
import { useT } from '../i18n/I18nContext';

/**
 * Biblioteca pessoal: as obras que a pessoa adquiriu.
 *
 * O vínculo é com a CONTA, não com o navegador: sair e entrar de novo, ou
 * entrar de outro aparelho, não muda o que está aqui. É a diferença entre
 * "comprei" e "este navegador lembra que cliquei".
 */

const ROTULO_STATUS: Record<PurchaseStatus, string> = {
  PENDENTE: 'Aguardando pagamento',
  CONFIRMADA: 'Paga',
  FALHOU: 'Não aprovada',
  CANCELADA: 'Cancelada',
  EXPIRADA: 'Expirada',
};

export default function Biblioteca() {
  const t = useT();
  const biblioteca = useMyLibrary();
  const historico = useMyPurchases();

  return (
    <>
      <PageHeader
        eyebrow="Minha conta"
        title={t('biblioteca.titulo')}
        description="As obras que você adquiriu ficam aqui e continuam disponíveis sempre que você voltar."
        icon={<Library className="h-6 w-6" aria-hidden />}
      />

      {biblioteca.isLoading && <LoadingState label={t('biblioteca.carregando')} />}
      {biblioteca.isError && (
        <ErrorState message={errorMessage(biblioteca.error)} onRetry={() => void biblioteca.refetch()} />
      )}

      {biblioteca.data && biblioteca.data.length === 0 && (
        <EmptyState
          title={t('biblioteca.vazia')}
          description={t('biblioteca.vaziaTexto')}
          action={
            <Link to="/" className="btn-primary">
              Ver o catálogo
            </Link>
          }
        />
      )}

      {biblioteca.data && biblioteca.data.length > 0 && (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {biblioteca.data.map((item) => (
            <li key={item.purchaseId} className="flex flex-col">
              <Link
                to={`/reader/${item.work.id}`}
                className="block overflow-hidden rounded-[10px_14px_10px_14px] border border-outline/70 bg-surface-high"
                tabIndex={-1}
                aria-hidden
              >
                <Cover url={item.work.coverUrl} title={item.work.title} alt="" className="aspect-[16/9] w-full" />
              </Link>
              <p className="eyebrow mt-3 text-ink-subtle">
                {t(FORMAT_SHORT[item.work.format])} · {item.work.pages}p
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold leading-tight text-ink">{item.work.title}</h2>
              <p className="mt-1 text-sm text-ink-muted">{item.author.name}</p>
              <p className="mt-1 text-xs text-ink-subtle">
                Adquirida em {formatDateTime(item.confirmedAt)} por {formatCents(item.priceCents)}
              </p>
              <Link
                to={`/reader/${item.work.id}`}
                className="btn-secondary mt-3"
                aria-label={`Ler agora: ${item.work.title}`}
              >
                <BookOpen className="h-4 w-4" aria-hidden /> Ler agora
              </Link>
            </li>
          ))}
        </ul>
      )}

      {historico.data && historico.data.length > 0 && (
        <section className="mt-12">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
            <Receipt className="h-5 w-5" aria-hidden /> Histórico de compras
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Todas as cobranças abertas por você, inclusive as que não foram concluídas.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-outline/40 text-left">
                  <th scope="col" className="py-2 pr-3 font-semibold text-ink">{t('biblioteca.colObra')}</th>
                  <th scope="col" className="py-2 pr-3 font-semibold text-ink">{t('biblioteca.colValor')}</th>
                  <th scope="col" className="py-2 pr-3 font-semibold text-ink">{t('biblioteca.colSituacao')}</th>
                  <th scope="col" className="py-2 font-semibold text-ink">{t('biblioteca.colQuando')}</th>
                </tr>
              </thead>
              <tbody>
                {historico.data.map((linha) => (
                  <tr key={linha.id} className="border-b border-outline/20">
                    <td className="py-2 pr-3 text-ink">
                      <Link to={`/reader/${linha.work.id}`} className="underline-offset-2 hover:underline">
                        {linha.work.title}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-ink-muted">{formatCents(linha.priceCents)}</td>
                    <td className="py-2 pr-3 text-ink-muted">{ROTULO_STATUS[linha.status]}</td>
                    <td className="py-2 text-ink-muted">{formatDateTime(linha.confirmedAt ?? linha.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
