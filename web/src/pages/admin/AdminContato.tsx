import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, Inbox, Mail, MailX, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { Badge, ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader, Pagination } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';
import { useT } from '../../i18n/I18nContext';
import type { ChaveDeTraducao } from '../../i18n/tipos';

/**
 * Caixa de entrada do Fale Conosco.
 *
 * O que esta tela mostra e a de fora não: o **resultado da entrega**. A
 * mensagem é sempre gravada; o e-mail pode não ter saído. Separar as duas
 * informações aqui é o que permite ao administrador perceber que o SMTP caiu —
 * em vez de achar que ninguém escreveu.
 *
 * Responder é um `mailto:` com assunto e citação já montados. Não há envio de
 * resposta pela API de propósito: isso exigiria caixa de saída, fila e
 * tratamento de retorno, e a resposta de verdade sai melhor do cliente de
 * e-mail de quem responde, com assinatura e histórico.
 */

type Status = 'NOVA' | 'LIDA' | 'RESPONDIDA' | 'ARQUIVADA';

interface Mensagem {
  id: number;
  name: string;
  email: string;
  subject: string;
  orderRef: string | null;
  message: string;
  status: Status;
  deliveredAt: string | null;
  deliveryError: string | null;
  createdAt: string;
}

interface Resposta {
  data: Mensagem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
  novas: number;
  entregaConfigurada: boolean;
}

const STATUS: Status[] = ['NOVA', 'LIDA', 'RESPONDIDA', 'ARQUIVADA'];

const TOM: Record<Status, 'primary' | 'accent' | 'muted' | 'warn'> = {
  NOVA: 'primary',
  LIDA: 'muted',
  RESPONDIDA: 'accent',
  ARQUIVADA: 'muted',
};

export default function AdminContato() {
  const t = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<Status | ''>('');
  const [page, setPage] = useState(1);
  const [paraApagar, setParaApagar] = useState<Mensagem | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'contato', filtro, page],
    queryFn: async () =>
      (
        await api.get<Resposta>('/admin/contact-messages', {
          params: { status: filtro || undefined, page, pageSize: 20 },
        })
      ).data,
  });

  const mudar = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: Status }) =>
      (await api.patch(`/admin/contact-messages/${id}`, { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'contato'] }),
    onError: (err) => toast.error(errorMessage(err)),
  });

  const apagar = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/contact-messages/${id}`),
    onSuccess: () => {
      setParaApagar(null);
      qc.invalidateQueries({ queryKey: ['admin', 'contato'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={errorMessage(error)} onRetry={refetch} />;

  const mensagens = data?.data ?? [];

  return (
    <div>
      <PageHeader
        eyebrow={data?.novas ? t('caixa.novas', { n: data.novas }) : undefined}
        icon={<Inbox className="h-4 w-4" aria-hidden />}
        title={t('caixa.titulo')}
        description={t('caixa.subtitulo')}
      />

      {/* O aviso de entrega desligada é a informação mais importante da tela
          quando ela é verdadeira: sem ele, o administrador olha para "e-mail
          não saiu" em tudo e procura defeito onde não há. */}
      {data && !data.entregaConfigurada && (
        <p className="mb-6 flex items-start gap-2 rounded-xl border border-warn bg-warn-container px-4 py-3 text-sm leading-relaxed text-warn">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {t('caixa.entregaDesligada')}
        </p>
      )}

      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label={t('caixa.marcar')}>
        <button
          type="button"
          className={`chip border ${filtro === '' ? 'border-primary bg-primary-container text-primary-onContainer' : 'border-outline/50 text-ink-muted'}`}
          onClick={() => {
            setFiltro('');
            setPage(1);
          }}
          aria-pressed={filtro === ''}
        >
          {t('caixa.todas')}
        </button>
        {STATUS.map((s) => (
          <button
            key={s}
            type="button"
            className={`chip border ${filtro === s ? 'border-primary bg-primary-container text-primary-onContainer' : 'border-outline/50 text-ink-muted'}`}
            onClick={() => {
              setFiltro(s);
              setPage(1);
            }}
            aria-pressed={filtro === s}
          >
            {t(`status.${s}` as ChaveDeTraducao)}
          </button>
        ))}
      </div>

      {mensagens.length === 0 ? (
        <EmptyState title={t('caixa.vazia')} />
      ) : (
        <ul className="space-y-4">
          {mensagens.map((m) => (
            <li key={m.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-bold text-ink">
                    {t(`assunto.${m.subject}` as ChaveDeTraducao)}
                    {m.orderRef && <span className="ml-2 font-sans text-sm font-normal text-ink-subtle">#{m.orderRef}</span>}
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    {t('caixa.de')} <strong className="font-semibold text-ink">{m.name}</strong> ·{' '}
                    <a href={`mailto:${m.email}`} className="underline underline-offset-2">
                      {m.email}
                    </a>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-subtle">
                    {t('caixa.recebidaEm')} {formatDateTime(m.createdAt)} · #{m.id}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Badge tone={TOM[m.status]}>{t(`status.${m.status}` as ChaveDeTraducao)}</Badge>
                  {m.deliveredAt ? (
                    <Badge tone="accent">
                      <Mail className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                      {t('caixa.entregue')}
                    </Badge>
                  ) : (
                    <Badge tone="muted">
                      <MailX className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                      {t('caixa.naoEntregue')}
                    </Badge>
                  )}
                </div>
              </div>

              {/* `whitespace-pre-wrap`: a quebra de linha que a pessoa escreveu
                  faz parte do que ela quis dizer. */}
              <p className="mt-4 whitespace-pre-wrap rounded-xl bg-surface-low p-4 text-sm leading-relaxed text-ink">
                {m.message}
              </p>

              {m.deliveryError && (
                <p className="mt-2 text-xs text-danger">
                  <AlertTriangle className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                  {m.deliveryError}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <a
                  className="btn-secondary"
                  href={`mailto:${m.email}?subject=${encodeURIComponent(
                    `Re: [Livrin] ${t(`assunto.${m.subject}` as ChaveDeTraducao)}`,
                  )}&body=${encodeURIComponent(`\n\n--- Sua mensagem (#${m.id}) ---\n${m.message}`)}`}
                >
                  <Mail className="h-4 w-4" aria-hidden /> {t('caixa.responder')}
                </a>

                {STATUS.filter((s) => s !== m.status).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="btn-ghost"
                    onClick={() => mudar.mutate({ id: m.id, status: s })}
                    disabled={mudar.isPending}
                  >
                    <Check className="h-4 w-4" aria-hidden /> {t(`status.${s}` as ChaveDeTraducao)}
                  </button>
                ))}

                <button type="button" className="btn-ghost text-danger" onClick={() => setParaApagar(m)}>
                  <Trash2 className="h-4 w-4" aria-hidden /> {t('caixa.apagar')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && data.meta.totalPages > 1 && (
        <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={setPage} />
      )}

      <ConfirmDialog
        open={!!paraApagar}
        title={t('caixa.apagar')}
        message={t('caixa.confirmarApagar')}
        confirmLabel={t('caixa.apagar')}
        danger
        busy={apagar.isPending}
        onConfirm={() => paraApagar && apagar.mutate(paraApagar.id)}
        onClose={() => setParaApagar(null)}
      />
    </div>
  );
}
