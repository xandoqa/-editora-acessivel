import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Check, Crown, Megaphone, X } from 'lucide-react';
import { ConfirmDialog, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import PagamentoSimuladoDialog from '../components/works/PagamentoSimulado';
import { useAuth } from '../auth/AuthContext';
import { useAssinarPlano, useCancelarCobranca, useCancelarPlano, useConfirmarCobranca, usePlanoOpcoes } from '../hooks/purchases';
import { api, errorMessage } from '../lib/api';
import { formatCents, formatDate } from '../lib/format';
import type { User } from '../types/api';

/**
 * Planos do Livrin.
 *
 * O plano premium é **simulado e deliberadamente pequeno**: ele faz uma coisa
 * só, que é remover os anúncios das obras que a autoria monetizou por
 * publicidade.
 *
 * E há uma coisa que ele **não** faz, dita aqui com todas as letras: não
 * libera obra paga. Quem define o preço de uma obra é a autoria, e o dinheiro
 * de uma assinatura da plataforma não é dela — um passe livre sobre obras
 * pagas seria a plataforma vendendo trabalho de terceiros.
 *
 * O pagamento é o mesmo fluxo simulado da compra de obra, e a ativação
 * acontece no servidor, ao confirmar a cobrança. Cancelar devolve a conta ao
 * gratuito e mantém o histórico de pagamento.
 */

const GRATUITO = [
  'Catálogo completo e leitura das obras de leitura livre',
  'Leitor acessível: audiodescrição, alto contraste, fonte para dislexia e zoom',
  'Leitura em voz alta e janela de Libras',
  'Biblioteca pessoal e histórico de leitura',
];

const PREMIUM = [
  'Tudo do plano gratuito',
  'Leitura sem anúncios nas obras monetizadas por publicidade',
  'Apoio direto à manutenção da plataforma',
];

export default function Planos() {
  const { user, updateUser } = useAuth();
  const opcoes = usePlanoOpcoes();
  const assinar = useAssinarPlano();
  const confirmar = useConfirmarCobranca();
  const cancelarCobranca = useCancelarCobranca();
  const cancelarPlano = useCancelarPlano();
  const toast = useToast();
  const [pagando, setPagando] = useState(false);
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);

  const premium = user?.plan === 'PREMIUM';

  /** Relê o perfil para que o plano novo valha na hora, sem recarregar a página. */
  const recarregarPerfil = async () => {
    try {
      const { data } = await api.get<{ user: User }>('/auth/me');
      updateUser(data.user);
    } catch {
      // Se a releitura falhar, o plano já mudou no servidor; o próximo
      // carregamento pega. Não vale travar a tela por isso.
    }
  };

  const cancelar = async () => {
    try {
      await cancelarPlano.mutateAsync();
      await recarregarPerfil();
      toast.success('Plano cancelado. Sua conta voltou ao gratuito.');
    } catch (e) {
      toast.error(errorMessage(e, 'Não foi possível cancelar o plano.'));
    } finally {
      setConfirmandoCancelamento(false);
    }
  };

  if (opcoes.isLoading) return <LoadingState label="Carregando os planos..." />;
  if (opcoes.isError || !opcoes.data) {
    return <ErrorState message={errorMessage(opcoes.error)} onRetry={() => void opcoes.refetch()} />;
  }

  const preco = opcoes.data.precoCents;

  return (
    <>
      <PageHeader
        eyebrow="Planos"
        title="Planos do Livrin"
        description="Ler continua de graça. O plano premium existe para sustentar a plataforma e tirar os anúncios de quem preferir."
        icon={<Crown className="h-6 w-6" aria-hidden />}
      />

      {!opcoes.data.isReal && (
        <p className="mb-6 flex gap-3 rounded-xl border-l-4 border-warn bg-surface-high p-4 text-sm text-ink">
          <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden />
          <span>
            <strong>Assinatura de demonstração.</strong> Nenhum dinheiro é movimentado e não há renovação automática.
            O plano é ativado de verdade no sistema, e você pode cancelar a qualquer momento.
          </span>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gratuito */}
        <section className="card flex flex-col p-6" aria-labelledby="plano-gratuito">
          <p className="eyebrow text-ink-subtle">Plano</p>
          <h2 id="plano-gratuito" className="mt-1 font-display text-2xl font-semibold text-ink">
            Gratuito
          </h2>
          <p className="mt-1 text-3xl font-bold text-ink">R$ 0</p>
          <p className="mt-1 text-sm text-ink-muted">Para sempre, sem cadastro de cartão.</p>

          <ul className="mt-5 flex-1 space-y-2 text-sm text-ink">
            {GRATUITO.map((b) => (
              <li key={b} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                {b}
              </li>
            ))}
          </ul>

          <p className="mt-5 flex items-center gap-2 text-sm text-ink-muted">
            {!premium && <BadgeCheck className="h-4 w-4 text-accent" aria-hidden />}
            {premium ? 'Disponível se você cancelar o premium.' : 'Este é o seu plano atual.'}
          </p>
        </section>

        {/* Premium */}
        <section className="card flex flex-col border-primary/60 p-6" aria-labelledby="plano-premium">
          <p className="eyebrow text-ink-subtle">Plano</p>
          <h2 id="plano-premium" className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold text-ink">
            <Crown className="h-5 w-5 text-primary" aria-hidden /> Premium
          </h2>
          <p className="mt-1 text-3xl font-bold text-ink">
            {formatCents(preco)}
            <span className="text-base font-normal text-ink-muted"> /mês</span>
          </p>
          <p className="mt-1 text-sm text-ink-muted">Cancele quando quiser, em um clique.</p>

          <ul className="mt-5 flex-1 space-y-2 text-sm text-ink">
            {PREMIUM.map((b) => (
              <li key={b} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                {b}
              </li>
            ))}
            {/* O que o plano NÃO faz fica na mesma lista, e não em letra
                miúda no rodapé: é a informação que mais evita frustração. */}
            <li className="flex gap-2 text-ink-muted">
              <X className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
              Não libera obras pagas — quem define o preço de uma obra é a autoria, e a assinatura não é dela.
            </li>
          </ul>

          <div className="mt-6">
            {!user ? (
              <Link to="/login" className="btn-primary w-full">
                Entrar para assinar
              </Link>
            ) : premium ? (
              <>
                <p className="mb-3 flex items-center gap-2 rounded-xl bg-accent-container p-3 text-sm font-semibold text-accent">
                  <BadgeCheck className="h-5 w-5" aria-hidden />
                  Este é o seu plano atual{user.planSince ? ` desde ${formatDate(user.planSince)}` : ''}.
                </p>
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => setConfirmandoCancelamento(true)}
                >
                  Cancelar plano
                </button>
              </>
            ) : (
              <button type="button" className="btn-primary w-full" onClick={() => setPagando(true)}>
                <Crown className="h-4 w-4" aria-hidden /> Assinar por {formatCents(preco)}
              </button>
            )}
          </div>
        </section>
      </div>

      <p className="mt-8 text-sm text-ink-muted">
        Apoiar o projeto com uma doação é outra coisa, e continua disponível em{' '}
        <Link to="/apoiar" className="underline underline-offset-2">
          Apoiar o Livrin
        </Link>
        : a doação não libera obra nem remove anúncio, é apoio direto ao projeto.
      </p>

      {user && (
        <PagamentoSimuladoDialog
          open={pagando}
          onClose={() => setPagando(false)}
          titulo="Assinar o plano premium"
          tituloPronto="Plano ativado"
          resumo={[
            { rotulo: 'Plano', valor: 'Premium' },
            { rotulo: 'Conta', valor: user.email },
          ]}
          precoCents={preco}
          rotuloDoValor="Mensalidade"
          abrirCobranca={(method, card) => assinar.mutateAsync({ method, card })}
          confirmarCobranca={async (id) => {
            const cobranca = await confirmar.mutateAsync(id);
            // O servidor ativou o plano ao confirmar; aqui só relemos o
            // perfil para a interface acompanhar na mesma hora.
            if (cobranca.status === 'CONFIRMADA') await recarregarPerfil();
            return cobranca;
          }}
          cancelarCobranca={(id) => cancelarCobranca.mutateAsync(id)}
          aoConcluir={(cobranca, fechar) => (
            <>
              <p className="mb-4 rounded-xl border-l-4 border-accent bg-surface-high p-4 text-sm text-ink">
                Seu plano <strong>Premium</strong> está ativo. As obras monetizadas por publicidade passam a abrir sem
                anúncios.
              </p>
              <dl className="mb-5 rounded-xl bg-surface-high p-4 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Mensalidade</dt>
                  <dd className="font-semibold text-ink">{formatCents(cobranca?.priceCents ?? preco)}</dd>
                </div>
                <div className="mt-1 flex justify-between gap-3">
                  <dt className="text-ink-muted">Comprovante</dt>
                  <dd className="font-mono text-xs text-ink">#{cobranca?.id}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary" onClick={fechar}>
                  Voltar aos planos
                </button>
                <Link to="/" className="btn-secondary" onClick={fechar}>
                  Ir para o catálogo
                </Link>
              </div>
            </>
          )}
        />
      )}

      <ConfirmDialog
        open={confirmandoCancelamento}
        title="Cancelar o plano premium?"
        message="Sua conta volta para o gratuito e os anúncios reaparecem nas obras monetizadas por publicidade. O histórico de pagamento é mantido, e você pode assinar de novo quando quiser."
        confirmLabel="Cancelar plano"
        danger
        busy={cancelarPlano.isPending}
        onConfirm={() => void cancelar()}
        onClose={() => setConfirmandoCancelamento(false)}
      />
    </>
  );
}
