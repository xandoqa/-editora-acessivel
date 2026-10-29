import { useState, type ReactNode } from 'react';
import { AlertTriangle, Copy, CreditCard, FileText, Loader2, QrCode, ShieldAlert } from 'lucide-react';
import { Modal, TextInput } from '../ui';
import { errorMessage } from '../../lib/api';
import { formatCents } from '../../lib/format';
import type { CardInput, PaymentMethod, Purchase, PurchaseCheckout } from '../../types/api';

/**
 * O fluxo de pagamento simulado, em um só lugar.
 *
 * Comprar uma obra e assinar o plano têm a mesma mecânica: escolher o meio,
 * preencher o cartão quando for o caso, abrir a cobrança, confirmar e ver o
 * resultado. Duplicar essa tela para cada caso seria manter dois fluxos de
 * pagamento que precisam concordar entre si — e um dia não concordariam.
 *
 * Três decisões continuam valendo aqui, e são as mesmas da ADR 014:
 *
 *  1. **O preço é mostrado, não enviado.** Quem define quanto será cobrado é
 *     o servidor; esta tela só exibe para conferência.
 *  2. **A aprovação não acontece aqui.** O botão pergunta ao servidor como
 *     ficou a cobrança. O que libera é a resposta dele.
 *  3. **Nada finge ser real.** Código, linha digitável e formulário de cartão
 *     dizem que são de demonstração, e o cartão é descartado no servidor.
 */

type Etapa = 'metodo' | 'cartao' | 'pagamento' | 'pronto';

const METODOS: { valor: PaymentMethod; rotulo: string; icone: typeof QrCode; ajuda: string }[] = [
  { valor: 'PIX', rotulo: 'Pix', icone: QrCode, ajuda: 'Código copiável, confirmação imediata na simulação' },
  { valor: 'CARTAO', rotulo: 'Cartão', icone: CreditCard, ajuda: 'Formulário de demonstração, com dados fictícios' },
  { valor: 'BOLETO', rotulo: 'Boleto', icone: FileText, ajuda: 'Linha digitável de demonstração, não pagável' },
];

const CARTAO_VAZIO: CardInput = { holder: '', number: '', expiry: '', cvv: '' };

export interface LinhaDoResumo {
  rotulo: string;
  valor: string;
}

export interface PagamentoSimuladoProps {
  open: boolean;
  onClose: () => void;
  /** Título do diálogo antes da conclusão. */
  titulo: string;
  /** Título depois de aprovado. */
  tituloPronto: string;
  /** Linhas de conferência (obra e autoria, ou nome do plano). */
  resumo: LinhaDoResumo[];
  precoCents: number;
  /** Rótulo do valor — "Valor" para obra, "Mensalidade" para plano. */
  rotuloDoValor?: string;
  abrirCobranca: (method: PaymentMethod, card?: CardInput) => Promise<{ purchase: Purchase; checkout: PurchaseCheckout | null }>;
  confirmarCobranca: (purchaseId: number) => Promise<Purchase>;
  cancelarCobranca: (purchaseId: number) => Promise<unknown>;
  /** O que aparece depois da aprovação. Recebe a cobrança confirmada. */
  aoConcluir: (purchase: Purchase | null, fechar: () => void) => ReactNode;
}

export default function PagamentoSimuladoDialog({
  open,
  onClose,
  titulo,
  tituloPronto,
  resumo,
  precoCents,
  rotuloDoValor = 'Valor',
  abrirCobranca,
  confirmarCobranca,
  cancelarCobranca,
  aoConcluir,
}: PagamentoSimuladoProps) {
  const [etapa, setEtapa] = useState<Etapa>('metodo');
  const [metodo, setMetodo] = useState<PaymentMethod>('PIX');
  const [cartao, setCartao] = useState<CardInput>(CARTAO_VAZIO);
  const [checkout, setCheckout] = useState<PurchaseCheckout | null>(null);
  const [cobranca, setCobranca] = useState<Purchase | null>(null);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const fechar = () => {
    setEtapa('metodo');
    setCartao(CARTAO_VAZIO);
    setCheckout(null);
    setCobranca(null);
    setErro('');
    setCopiado(false);
    setOcupado(false);
    onClose();
  };

  const abrir = async (card?: CardInput) => {
    setErro('');
    setOcupado(true);
    try {
      const resultado = await abrirCobranca(metodo, card);
      setCobranca(resultado.purchase);
      setCheckout(resultado.checkout);
      setEtapa(resultado.purchase.status === 'CONFIRMADA' ? 'pronto' : 'pagamento');
    } catch (e) {
      setErro(errorMessage(e, 'Não foi possível abrir a cobrança.'));
    } finally {
      setOcupado(false);
    }
  };

  const confirmar = async () => {
    if (!cobranca) return;
    setErro('');
    setOcupado(true);
    try {
      const atualizada = await confirmarCobranca(cobranca.id);
      setCobranca(atualizada);
      if (atualizada.status === 'CONFIRMADA') setEtapa('pronto');
      else setErro('O pagamento não foi aprovado. Nada foi liberado.');
    } catch (e) {
      setErro(errorMessage(e, 'Não foi possível confirmar o pagamento.'));
    } finally {
      setOcupado(false);
    }
  };

  const cancelar = async () => {
    if (!cobranca) return fechar();
    try {
      await cancelarCobranca(cobranca.id);
    } catch {
      // Cancelar é cortesia: se falhar, a cobrança expira sozinha pelo prazo.
    }
    fechar();
  };

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro('Não foi possível copiar automaticamente. Selecione o código e copie com Ctrl+C.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={etapa === 'pagamento' ? cancelar : fechar}
      title={etapa === 'pronto' ? tituloPronto : titulo}
    >
      {/* O aviso vem antes de qualquer campo: a pessoa precisa saber que é
          demonstração ANTES de digitar o que quer que seja. */}
      <p className="mb-4 flex gap-3 rounded-xl border-l-4 border-warn bg-surface-high p-3 text-sm text-ink">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden />
        <span>
          <strong>Ambiente de demonstração.</strong> Nenhum dinheiro é movimentado e nenhuma cobrança é emitida. Use
          apenas dados fictícios.
        </span>
      </p>

      {erro && (
        <p className="mb-4 flex gap-2 rounded-xl border-l-4 border-danger bg-surface-high p-3 text-sm text-ink" role="alert">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
          {erro}
        </p>
      )}

      {etapa !== 'pronto' && (
        <dl className="mb-5 rounded-xl bg-surface-high p-4 text-sm">
          {resumo.map((linha) => (
            <div key={linha.rotulo} className="flex items-baseline justify-between gap-3 first:mt-0 [&+&]:mt-1">
              <dt className="text-ink-muted">{linha.rotulo}</dt>
              <dd className="text-right text-ink">{linha.valor}</dd>
            </div>
          ))}
          <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-outline/25 pt-2">
            <dt className="text-ink-muted">{rotuloDoValor}</dt>
            <dd className="text-right text-lg font-bold text-ink">{formatCents(precoCents)}</dd>
          </div>
        </dl>
      )}

      {etapa === 'metodo' && (
        <>
          <p className="eyebrow mb-2 text-ink-subtle">Como você quer pagar</p>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Meio de pagamento">
            {METODOS.map((m) => {
              const Icone = m.icone;
              const ativo = metodo === m.valor;
              return (
                <button
                  key={m.valor}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => setMetodo(m.valor)}
                  className={`flex min-h-[44px] flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
                    ativo ? 'border-primary bg-primary-container' : 'border-outline/60 hover:bg-surface-high'
                  }`}
                >
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    <Icone className="h-4 w-4" aria-hidden /> {m.rotulo}
                  </span>
                  <span className="text-xs text-ink-muted">{m.ajuda}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={ocupado}
              onClick={() => (metodo === 'CARTAO' ? setEtapa('cartao') : void abrir())}
            >
              {ocupado && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Continuar
            </button>
            <button type="button" className="btn-secondary" onClick={fechar}>
              Cancelar
            </button>
          </div>
        </>
      )}

      {etapa === 'cartao' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void abrir(cartao);
          }}
        >
          <p className="mb-3 text-sm text-ink-muted">
            Nenhum destes dados é armazenado: o servidor confere o formato e descarta. Não digite um cartão real.
          </p>
          <TextInput
            label="Nome do titular"
            required
            autoComplete="off"
            value={cartao.holder}
            onChange={(e) => setCartao({ ...cartao, holder: e.target.value })}
          />
          <TextInput
            label="Número do cartão"
            required
            inputMode="numeric"
            autoComplete="off"
            placeholder="4111 1111 1111 1111"
            hint="Use um número de teste. 4111 1111 1111 1111 serve."
            value={cartao.number}
            onChange={(e) => setCartao({ ...cartao, number: e.target.value })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput
              label="Validade"
              required
              placeholder="MM/AA"
              autoComplete="off"
              value={cartao.expiry}
              onChange={(e) => setCartao({ ...cartao, expiry: e.target.value })}
            />
            <TextInput
              label="Código de segurança"
              required
              inputMode="numeric"
              autoComplete="off"
              placeholder="123"
              value={cartao.cvv}
              onChange={(e) => setCartao({ ...cartao, cvv: e.target.value })}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" className="btn-primary" disabled={ocupado}>
              {ocupado && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Pagar {formatCents(precoCents)}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setEtapa('metodo')}>
              Voltar
            </button>
          </div>
        </form>
      )}

      {etapa === 'pagamento' && (
        <>
          {checkout?.instruction && <p className="mb-3 text-sm leading-relaxed text-ink-muted">{checkout.instruction}</p>}

          {checkout?.code && (
            <div className="mb-4">
              <p className="eyebrow mb-1 text-ink-subtle">
                {cobranca?.method === 'BOLETO' ? 'Linha digitável (demonstração)' : 'Código Pix (demonstração)'}
              </p>
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-high p-3">
                <code className="min-w-0 flex-1 break-all font-mono text-xs text-ink">{checkout.code}</code>
                <button type="button" className="btn-secondary" onClick={() => void copiar(checkout.code!)}>
                  <Copy className="h-4 w-4" aria-hidden /> {copiado ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                Este código não é reconhecido por banco nenhum e não gera cobrança.
              </p>
            </div>
          )}

          <p className="mb-4 text-sm text-ink-muted">
            Situação: <strong className="text-ink">aguardando pagamento</strong>
            {cobranca?.expiresAt && <> · expira em {new Date(cobranca.expiresAt).toLocaleString('pt-BR')}</>}
          </p>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={() => void confirmar()} disabled={ocupado}>
              {ocupado && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Simular pagamento aprovado
            </button>
            <button type="button" className="btn-secondary" onClick={() => void cancelar()}>
              Cancelar cobrança
            </button>
          </div>
        </>
      )}

      {etapa === 'pronto' && aoConcluir(cobranca, fechar)}
    </Modal>
  );
}
