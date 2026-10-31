import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, CheckCircle2, CircleDashed, CircleEllipsis, Headset, Hourglass, Info, LockKeyhole, MessageSquareText, RefreshCw, ShieldCheck, Upload, XCircle } from 'lucide-react';
import { useAudioDescriptions, useReview, useWork } from '../hooks/queries';
import { api, errorMessage } from '../lib/api';
import { formatBytes, formatDate, formatDateTime, formatRelative } from '../lib/format';
import { STATUS_LABEL } from '../lib/labels';
import type { CheckStatus, ReviewCheck } from '../types/api';
import { Avatar, Cover, ErrorState, LoadingState, Modal, TextArea } from '../components/ui';
import { useToast } from '../components/ui/Toast';

const CHECK_ICON: Record<CheckStatus, JSX.Element> = {
  APROVADO: <CheckCircle2 className="h-5 w-5 text-accent" aria-hidden />,
  EM_ANDAMENTO: <CircleEllipsis className="h-5 w-5 text-warn" aria-hidden />,
  PENDENTE: <CircleDashed className="h-5 w-5 text-ink-subtle" aria-hidden />,
  REPROVADO: <XCircle className="h-5 w-5 text-danger" aria-hidden />,
};
const CHECK_TEXT: Record<CheckStatus, string> = { APROVADO: 'aprovado', EM_ANDAMENTO: 'em andamento', PENDENTE: 'pendente', REPROVADO: 'reprovado' };

function StepDot({ state, n }: { state: 'done' | 'active' | 'todo' | 'failed'; n: number }) {
  if (state === 'done') return <span className="z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-on"><Check className="h-6 w-6" aria-hidden /></span>;
  if (state === 'active') return <span className="z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-warn-container text-warn"><RefreshCw className="h-5 w-5" aria-hidden /></span>;
  if (state === 'failed') return <span className="z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-danger-container text-danger"><XCircle className="h-5 w-5" aria-hidden /></span>;
  return <span className="z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-highest font-bold text-ink-muted">{n}</span>;
}

function ChecksGrid({ checks }: { checks: ReviewCheck[] }) {
  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
      {checks.map((c) => (
        <li key={c.id} className="card-high flex items-center justify-between gap-3 p-3 text-sm text-ink">
          <span>{c.label}</span>
          <span className="flex items-center" title={CHECK_TEXT[c.status]}>
            {CHECK_ICON[c.status]}
            <span className="sr-only">: {CHECK_TEXT[c.status]}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function ReviewStatus() {
  const { id } = useParams();
  const workId = Number(id);
  const qc = useQueryClient();
  const toast = useToast();
  const { data: work, isLoading, isError, error, refetch } = useWork(workId);
  const { data: review } = useReview(work ? workId : undefined);
  const { data: descriptions = [] } = useAudioDescriptions(work ? workId : undefined);
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState('');

  const sendNote = useMutation({
    mutationFn: async () => api.post(`/works/${workId}/review/notes`, { content: message }),
    onSuccess: () => {
      toast.success('Mensagem enviada ao time de acessibilidade.');
      setMessage('');
      setChatOpen(false);
      void qc.invalidateQueries({ queryKey: ['me', 'review', workId] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading) return <LoadingState />;
  if (isError || !work) return <ErrorState message={errorMessage(error, 'Obra não encontrada.')} onRetry={() => refetch()} />;

  const status = work.status;
  const approved = status === 'APROVADO';
  const rejected = status === 'REJEITADO';
  const progress = review?.progress ?? 0;
  const checks = review?.checks ?? [];
  const notes = review?.notes ?? [];
  const stage = approved ? 3 : work.submittedAt ? 2 : 1;

  const title = approved
    ? 'Sua obra está no catálogo!'
    : rejected
      ? 'Sua obra precisa de ajustes'
      : status === 'RASCUNHO'
        ? 'Sua obra ainda é um rascunho'
        : 'Seu livro em processo editorial';

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    sendNote.mutate();
  };

  return (
    <div>
      <header className="mb-6">
        <p className="eyebrow mb-2 flex items-center gap-2 text-primary">
          <Hourglass className="h-4 w-4" aria-hidden /> Fluxo de avaliação editorial · Protocolo #{review?.protocol ?? '—'}
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-3 max-w-3xl text-lg text-ink-muted">
          Acompanhe em tempo real as validações de conteúdo, diagramação inclusiva e testes de audiodescrição para publicação na plataforma.
        </p>
      </header>

      <section className="card mb-6 flex flex-col gap-4 p-5 md:flex-row md:items-center" aria-live="polite">
        <Info className="h-7 w-7 shrink-0 text-primary" aria-hidden />
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-ink">
            {approved ? 'Avaliação técnica concluída' : rejected ? 'Ajustes solicitados pela curadoria' : 'Avaliação Técnica em Andamento'}
          </h2>
          <p className="text-sm text-ink-muted">
            {approved
              ? 'Todas as etapas foram aprovadas pela curadoria de acessibilidade.'
              : rejected
                ? work.rejectionReason ?? 'Revise as notas dos pareceristas, ajuste a obra e reenvie para análise.'
                : 'Seu livro está sendo avaliado. O processo pode levar alguns dias, conforme o volume da fila e os testes de contraste, tipografia e leitura por leitores de tela.'}
          </p>
        </div>
        <span className="chip shrink-0 bg-accent-container text-accent">
          <ShieldCheck className="h-4 w-4" aria-hidden /> Padrão Livrin Ativo
        </span>
      </section>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <div className="card overflow-hidden">
            <div className="relative">
              <Cover url={work.coverUrl} title={work.title} className="aspect-[4/3] w-full" />
              <span className="chip absolute right-3 top-3 bg-black/80 text-warn">
                <span className="h-2 w-2 rounded-full bg-current" aria-hidden /> {STATUS_LABEL[status]}
              </span>
              <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-3 pb-2 pt-8 text-xs font-bold uppercase tracking-wider text-white">
                {work.genre.name}
              </p>
            </div>
            <div className="p-5">
              <h2 className="text-2xl font-semibold text-ink">{work.title}</h2>
              <p className="text-ink-muted">
                {work.genre.name} · {work.pages} páginas
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="card-high p-3">
                  <dt className="text-ink-muted">Formato</dt>
                  <dd className="mt-1 font-semibold text-ink">{work.file?.type ?? 'Pendente'}</dd>
                </div>
                <div className="card-high p-3">
                  <dt className="text-ink-muted">Audiodescrição</dt>
                  <dd className={`mt-1 font-semibold ${approved ? 'text-accent' : 'text-warn'}`}>
                    {!work.hasAudioDesc ? 'Não declarada' : approved ? 'Validada' : `Em teste (${progress}%)`}
                  </dd>
                </div>
                <div className="card-high p-3">
                  <dt className="text-ink-muted">Submissão</dt>
                  <dd className="mt-1 font-semibold text-ink">{formatDateTime(work.submittedAt)}</dd>
                </div>
                <div className="card-high p-3">
                  <dt className="text-ink-muted">Painéis descritos</dt>
                  <dd className="mt-1 font-semibold text-ink">{descriptions.length} páginas</dd>
                </div>
              </dl>
              <div className="card-high mt-3 p-3 text-sm">
                <p className="flex justify-between font-semibold text-ink">
                  Checklist da curadoria <span className="text-primary">{approved ? 'concluído' : 'em andamento'}</span>
                </p>
                <div className="my-2 flex h-2 overflow-hidden rounded-full bg-surface-low" role="progressbar" aria-label="Conformidade estimada" aria-valuenow={approved ? 100 : progress} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full bg-accent" style={{ width: `${approved ? 100 : progress}%` }} />
                  {!approved && <div className="h-full bg-warn" style={{ width: `${Math.min(15, 100 - progress)}%` }} />}
                </div>
                <p className="text-xs text-ink-muted">
                  Aprovado: {approved ? 'todas as verificações' : `${checks.filter((c) => c.status === 'APROVADO').length} de ${checks.length} itens`}
                </p>
              </div>
            </div>
          </div>
          <div className="card flex items-center gap-3 p-4">
            <Headset className="h-6 w-6 shrink-0 text-primary" aria-hidden />
            <p className="flex-1 text-sm text-ink-muted">
              <strong className="block text-ink">Dúvidas editoriais?</strong> Fale com o time de acessibilidade
            </p>
            <button type="button" className="btn-secondary" onClick={() => setChatOpen(true)}>
              Abrir Chat
            </button>
          </div>
        </aside>

        <div className="space-y-6">
          <section className="card p-5 md:p-7" aria-labelledby="steps-title">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h2 id="steps-title" className="text-2xl font-semibold text-ink">
                  Etapas da análise
                </h2>
                <p className="text-sm text-ink-muted">Progresso estrutural das verificações editoriais e de inclusão</p>
              </div>
              <span className="chip bg-surface-highest text-primary">Etapa {stage} de 3</span>
            </div>
            <ol className="relative space-y-8 before:absolute before:bottom-6 before:left-[21px] before:top-6 before:w-0.5 before:bg-outline">
              <li className="relative flex gap-4">
                <StepDot state={work.submittedAt ? 'done' : 'active'} n={1} />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-ink">Etapa 1: Recebimento do PDF / Arquivo</h3>
                    {work.submittedAt ? (
                      <span className="chip bg-accent-container text-accent">Concluído · {formatDate(work.submittedAt)}</span>
                    ) : (
                      <span className="chip bg-warn-container text-warn">Aguardando envio</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    {work.submittedAt
                      ? 'Arquivo recebido e validado: extensão, tamanho e assinatura binária conferidos no envio.'
                      : 'Envie o arquivo original da obra para iniciar a análise.'}
                  </p>
                  {work.file && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-accent">
                      <CheckCircle2 className="h-4 w-4" aria-hidden /> {work.file.type} · {formatBytes(work.file.sizeBytes)} · {work.pages} páginas informadas
                    </p>
                  )}
                </div>
              </li>
              <li className="relative flex gap-4">
                <StepDot state={approved ? 'done' : rejected ? 'failed' : stage === 2 ? 'active' : 'todo'} n={2} />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-ink">Etapa 2: Revisão de conteúdo & testes de acessibilidade</h3>
                  <span className={`chip mt-1 ${approved ? 'bg-accent-container text-accent' : rejected ? 'bg-danger-container text-danger' : 'bg-warn-container text-warn'}`}>
                    {approved ? 'Concluído' : rejected ? 'Ajustes solicitados' : stage === 2 ? 'Em andamento' : 'Pendente'}
                  </span>
                  <p className="mt-2 text-sm text-ink-muted">
                    Avaliação semântica das pranchas e balões de diálogo. Verificação de contraste de cores, suporte a fontes adaptadas para dislexia
                    e teste com sintetizadores de voz para audiodescrição.
                  </p>
                  {checks.length > 0 && <ChecksGrid checks={checks} />}
                </div>
              </li>
              <li className="relative flex gap-4">
                <StepDot state={approved ? 'done' : 'todo'} n={3} />
                <div className={`flex-1 ${approved ? '' : 'opacity-70'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-ink">Etapa 3: Aprovação final</h3>
                    <span className={`chip ${approved ? 'bg-accent-container text-accent' : 'bg-surface-highest text-ink-muted'}`}>
                      {approved ? `Concluído · ${formatDate(work.reviewedAt)}` : 'Pendente'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    Emissão do selo de certificação Livrin Acessível, geração das trilhas acessíveis e liberação da publicação no catálogo global e na
                    vitrine dos leitores.
                  </p>
                </div>
              </li>
            </ol>
          </section>

          <section className="card p-5 md:p-7" aria-labelledby="notes-title">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 id="notes-title" className="flex items-center gap-2 text-2xl font-semibold text-ink">
                <MessageSquareText className="h-6 w-6 text-primary" aria-hidden /> Notas dos Pareceristas da Livrin
              </h2>
              <span className="text-sm font-semibold text-ink-muted">{notes.length} observações registradas</span>
            </div>
            {notes.length === 0 ? (
              <p className="text-sm text-ink-muted">Ainda não há observações sobre esta obra.</p>
            ) : (
              <ul className="space-y-3">
                {notes.map((n) => (
                  <li key={n.id} className="card-high p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="flex flex-wrap items-center gap-2 text-sm">
                        <Avatar name={n.user.name} size="sm" tone={n.user.role === 'ADMIN' ? 'primary' : 'accent'} />
                        <strong className="text-ink">{n.user.name}</strong>
                        <span className="text-xs font-semibold text-ink-subtle">· {n.user.role === 'ADMIN' ? n.user.headline ?? 'Curadoria Livrin' : 'Autoria'}</span>
                      </p>
                      <span className="text-xs font-semibold text-ink-muted">{formatRelative(n.createdAt)}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-ink-muted">“{n.content}”</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center" aria-live="polite">
            <LockKeyhole className="h-7 w-7 shrink-0 text-ink-muted" aria-hidden />
            <div className="flex-1 text-sm">
              {approved ? (
                <>
                  <p className="font-semibold text-ink">Obra publicada</p>
                  <p className="text-ink-muted">
                    A aprovação da curadoria já colocou sua obra no catálogo. Ela está disponível para todos os leitores da Livrin.
                  </p>
                </>
              ) : rejected ? (
                <>
                  <p className="font-semibold text-ink">Reenvio necessário</p>
                  <p className="text-ink-muted">Ajuste a obra conforme as notas e reenvie para uma nova análise.</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-ink">Aguardando a curadoria</p>
                  <p className="text-ink-muted">Assim que a curadoria aprovar, sua obra entra no catálogo automaticamente.</p>
                </>
              )}
            </div>
            {approved ? (
              <Link to={`/reader/${work.id}`} className="btn-primary px-6 py-3">
                <Upload className="h-5 w-5" aria-hidden /> Ver no catálogo
              </Link>
            ) : rejected || status === 'RASCUNHO' ? (
              <Link to={`/works/${work.id}/edit`} className="btn-tonal px-6 py-3">
                Corrigir e reenviar
              </Link>
            ) : (
              <span className="chip bg-warn-container px-4 py-2 text-warn">Em análise pela curadoria</span>
            )}
          </section>
        </div>
      </div>

      <Modal
        open={chatOpen}
        title="Fale com o time de acessibilidade"
        onClose={() => setChatOpen(false)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setChatOpen(false)}>
              Cancelar
            </button>
            <button type="submit" form="chat-form" className="btn-primary" disabled={sendNote.isPending || message.trim().length < 2}>
              Enviar mensagem
            </button>
          </>
        }
      >
        <form id="chat-form" onSubmit={onSend}>
          <TextArea
            label="Sua mensagem"
            required
            rows={5}
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            hint="A mensagem fica registrada nas notas desta obra e é respondida pelos pareceristas."
          />
        </form>
      </Modal>
    </div>
  );
}
