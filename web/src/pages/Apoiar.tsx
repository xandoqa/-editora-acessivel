import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Copy, HandHeart, Info, Loader2, QrCode, Receipt, CreditCard } from 'lucide-react';
import { api, errorMessage, fieldErrors } from '../lib/api';
import { formatCents, formatDate, parseCents } from '../lib/format';
import { useWork } from '../hooks/queries';
import { useAuth } from '../auth/AuthContext';
import type { Donation, DonationCheckout, DonationOptions, PaymentMethod } from '../types/api';
import { ErrorState, LoadingState, PageHeader, SelectInput, TextArea, TextInput } from '../components/ui';
import { OndaDivisoria, PilhaDeLivros } from '../components/ui/Ornamentos';
import { useToast } from '../components/ui/Toast';

/**
 * "Apoiar o Livrin" — seções 17 a 19 da especificação.
 *
 * O apoio é voluntário e nunca condiciona a leitura: nenhuma obra fica atrás
 * dele, e os pontos de entrada no resto do site são discretos de propósito. A
 * prioridade continua sendo descobrir, publicar e ler obras.
 *
 * Nenhum dado de cartão passa por esta tela. A API abre a cobrança no provedor
 * e devolve um código ou uma URL; o pagamento acontece do lado do provedor.
 */

const VALORES_SUGERIDOS = [1000, 2500, 5000, 10000];

const METODO: Record<PaymentMethod, { label: string; icon: typeof QrCode; ajuda: string }> = {
  PIX: { label: 'Pix', icon: QrCode, ajuda: 'Você recebe um código para copiar e colar no seu banco.' },
  CARTAO: { label: 'Cartão', icon: CreditCard, ajuda: 'Você é levado à página segura do provedor para pagar.' },
  BOLETO: { label: 'Boleto', icon: Receipt, ajuda: 'Você recebe uma linha digitável para pagar no banco.' },
};

/** Aviso honesto quando o provedor não movimenta dinheiro de verdade. */
function AvisoSimulado() {
  return (
    <p className="flex items-start gap-3 rounded-xl border border-warn/50 bg-warn-container p-4 text-sm text-ink" role="note">
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden />
      <span>
        <strong>Ambiente de demonstração.</strong> Esta instalação usa um provedor de pagamento simulado: nenhuma cobrança é feita e nenhum
        dinheiro é movimentado. O fluxo é completo para que dê para conferir como funcionaria com um provedor real.
      </span>
    </p>
  );
}

export default function Apoiar() {
  const [params] = useSearchParams();
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();

  const obraId = Number(params.get('obra')) || undefined;
  const { data: obra } = useWork(obraId);

  const { data: opcoes, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['donation-options'],
    queryFn: async () => (await api.get<DonationOptions>('/donations/options')).data,
    staleTime: 5 * 60_000,
  });

  const { data: meusApoios = [] } = useQuery({
    queryKey: ['me', 'donations', user?.id],
    queryFn: async () => (await api.get<Donation[]>('/me/donations')).data,
    enabled: !!user,
  });

  const [valorTexto, setValorTexto] = useState('25,00');
  const [metodo, setMetodo] = useState<PaymentMethod | ''>('');
  const [nome, setNome] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<DonationCheckout | null>(null);
  const [copiado, setCopiado] = useState(false);

  const metodosDisponiveis = opcoes?.methods ?? [];
  const metodoEfetivo: PaymentMethod | '' = metodo || metodosDisponiveis[0] || '';

  const abrir = useMutation({
    mutationFn: async () => {
      const amountCents = parseCents(valorTexto);
      if (amountCents === null) throw new Error('valor-invalido');
      const corpo = {
        amountCents,
        method: metodoEfetivo,
        workId: obraId,
        donorName: nome.trim() || undefined,
        message: mensagem.trim() || undefined,
      };
      return (await api.post<DonationCheckout>('/donations', corpo)).data;
    },
    onSuccess: (dados) => {
      setErros({});
      setResultado(dados);
      void qc.invalidateQueries({ queryKey: ['me', 'donations'] });
    },
    onError: (err) => {
      if (err instanceof Error && err.message === 'valor-invalido') {
        setErros({ amountCents: 'Informe um valor como 25,00.' });
        return;
      }
      setErros(fieldErrors(err));
      toast.error(errorMessage(err, 'Não foi possível abrir o apoio.'));
    },
  });

  const confirmar = useMutation({
    mutationFn: async (id: number) => (await api.post<Donation>(`/donations/${id}/confirm`)).data,
    onSuccess: (doacao) => {
      setResultado((atual) => (atual ? { ...atual, donation: doacao } : atual));
      void qc.invalidateQueries({ queryKey: ['me', 'donations'] });
      if (doacao.status === 'CONFIRMADA') toast.success('Apoio confirmado. Obrigado!');
      else toast.error('O provedor ainda não confirmou este pagamento.');
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const copiarCodigo = async (codigo: string) => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      toast.error('Não foi possível copiar. Selecione o código e copie manualmente.');
    }
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    abrir.mutate();
  };

  if (isLoading) return <LoadingState label="Carregando as formas de apoiar..." />;
  if (isError || !opcoes) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Apoio voluntário"
        icon={<HandHeart className="h-4 w-4" aria-hidden />}
        title="Apoiar o Livrin"
        description={
          obra
            ? `Seu apoio vai para o projeto e fica registrado junto de “${obra.title}”. Ler continua sendo de graça.`
            : 'O Livrin existe para que quem não tem como bancar um lançamento tradicional consiga publicar e ser lido. Apoiar é opcional, e ler continua sendo de graça.'
        }
      />

      {!opcoes.isReal && (
        <div className="mb-8">
          <AvisoSimulado />
        </div>
      )}

      {resultado ? (
        resultado.donation.status === 'CONFIRMADA' ? (
        <section className="card p-8 text-center" aria-live="polite">
          <PilhaDeLivros className="mx-auto mb-4 h-24 w-24 text-accent" />
          <h2 className="font-display text-3xl font-bold text-ink">Obrigado de verdade</h2>
          <p className="mx-auto mt-3 max-w-lg text-ink-muted">
            Seu apoio de <strong className="text-ink">{formatCents(resultado.donation.amountCents)}</strong> foi registrado. Ele ajuda a manter a
            curadoria de acessibilidade e a audiodescrição das obras.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn-primary">
              Voltar ao catálogo
            </Link>
            <button type="button" className="btn-secondary" onClick={() => setResultado(null)}>
              Apoiar de novo
            </button>
          </div>
        </section>
        ) : (
        <section className="card p-6 md:p-8" aria-live="polite" aria-labelledby="pagamento-titulo">
          <h2 id="pagamento-titulo" className="font-display text-2xl font-bold text-ink">
            Falta concluir o pagamento
          </h2>
          <p className="mt-2 text-ink-muted">
            Apoio de <strong className="text-ink">{formatCents(resultado.donation.amountCents)}</strong> por {METODO[resultado.donation.method].label}.
          </p>

          {resultado.checkout.instruction && <p className="mt-4 text-ink">{resultado.checkout.instruction}</p>}

          {resultado.checkout.code && (
            <div className="mt-5">
              <p className="label" id="codigo-label">
                Código para pagamento
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <code
                  aria-labelledby="codigo-label"
                  className="min-w-0 flex-1 break-all rounded-xl bg-surface-high px-4 py-3 font-mono text-sm text-ink"
                >
                  {resultado.checkout.code}
                </code>
                <button type="button" className="btn-secondary" onClick={() => void copiarCodigo(resultado.checkout.code!)}>
                  <Copy className="h-4 w-4" aria-hidden /> {copiado ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          )}

          {resultado.checkout.checkoutUrl && (
            <a href={resultado.checkout.checkoutUrl} className="btn-primary mt-5" target="_blank" rel="noopener noreferrer">
              Abrir a página de pagamento
            </a>
          )}

          <OndaDivisoria className="my-6" />

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" onClick={() => confirmar.mutate(resultado.donation.id)} disabled={confirmar.isPending}>
              {confirmar.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              <BadgeCheck className="h-4 w-4" aria-hidden /> Já paguei, confirmar
            </button>
            <button type="button" className="btn-ghost" onClick={() => setResultado(null)}>
              Cancelar
            </button>
          </div>
        </section>
        )
      ) : (
        <form onSubmit={enviar} className="card space-y-7 p-6 md:p-8" noValidate>
          <fieldset>
            <legend className="label">Quanto você quer apoiar?</legend>
            <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Valores sugeridos">
              {VALORES_SUGERIDOS.map((centavos) => {
                const texto = (centavos / 100).toFixed(2).replace('.', ',');
                const ativo = valorTexto === texto;
                return (
                  <button
                    key={centavos}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => setValorTexto(texto)}
                    className={`hc-border min-h-[44px] rounded-xl border px-5 font-display text-base font-bold transition-colors ${
                      ativo ? 'border-transparent bg-primary text-primary-on' : 'border-outline bg-surface-high text-ink hover:bg-surface-highest'
                    }`}
                  >
                    {formatCents(centavos)}
                  </button>
                );
              })}
            </div>
            <TextInput
              label="Outro valor (R$)"
              inputMode="decimal"
              value={valorTexto}
              onChange={(e) => setValorTexto(e.target.value)}
              error={erros.amountCents}
              hint={`Entre ${formatCents(opcoes.minCents)} e ${formatCents(opcoes.maxCents)}.`}
            />
          </fieldset>

          <SelectInput
            label="Como você quer pagar"
            required
            value={metodoEfetivo}
            onChange={(e) => setMetodo(e.target.value as PaymentMethod)}
            error={erros.method}
            hint={metodoEfetivo ? METODO[metodoEfetivo].ajuda : undefined}
          >
            {metodosDisponiveis.map((m) => (
              <option key={m} value={m}>
                {METODO[m].label}
              </option>
            ))}
          </SelectInput>

          <TextInput
            label="Seu nome (opcional)"
            maxLength={120}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            error={erros.donorName}
            placeholder={user?.name ?? 'Pode apoiar anonimamente'}
            hint="Deixe em branco para apoiar sem se identificar."
          />

          <TextArea
            label="Mensagem (opcional)"
            rows={3}
            maxLength={400}
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            error={erros.message}
            aside={`${mensagem.length}/400`}
            placeholder="Um recado para quem publica no Livrin."
          />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-sm text-sm text-ink-subtle">
              Nenhum dado de cartão passa pelo Livrin. A cobrança é aberta no provedor e o pagamento acontece lá.
            </p>
            <button type="submit" className="btn-primary px-6 py-3 text-base" disabled={abrir.isPending}>
              {abrir.isPending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <HandHeart className="h-5 w-5" aria-hidden />}
              Continuar
            </button>
          </div>
        </form>
      )}

      {meusApoios.length > 0 && (
        <section className="mt-10" aria-labelledby="meus-apoios">
          <h2 id="meus-apoios" className="mb-3 font-display text-xl font-bold text-ink">
            Seus apoios
          </h2>
          <ul className="space-y-2">
            {meusApoios.map((d) => (
              <li key={d.id} className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <span className="font-display text-lg font-bold text-ink">{formatCents(d.amountCents)}</span>
                <span className="text-ink-muted">
                  {METODO[d.method].label} · {formatDate(d.createdAt)}
                </span>
                <span className={d.status === 'CONFIRMADA' ? 'chip bg-accent-container text-accent' : 'chip bg-surface-highest text-ink-muted'}>
                  {d.status === 'CONFIRMADA' ? 'Confirmado' : d.status === 'PENDENTE' ? 'Aguardando pagamento' : 'Não concluído'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
