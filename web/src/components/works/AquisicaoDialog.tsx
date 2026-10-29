import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BookOpen, Copy, CreditCard, FileText, Loader2, QrCode, ShieldAlert } from 'lucide-react';
import { Modal, TextInput } from '../ui';
import { errorMessage } from '../../lib/api';
import { formatCents } from '../../lib/format';
import { useAbrirCobranca, useCancelarCobranca, useConfirmarCobranca } from '../../hooks/purchases';
import type { CardInput, PaymentMethod, Purchase, PurchaseCheckout, Work } from '../../types/api';

/**
 * Fluxo de aquisição de uma obra paga.
 *
 * Três decisões moldam esta tela:
 *
 *  1. **O preço é mostrado, não enviado.** A pessoa confere o valor antes de
 *     pagar, mas quem define quanto será cobrado é o servidor. Alterar o
 *     número aqui no navegador não muda nada.
 *  2. **A aprovação não acontece aqui.** O botão de confirmar pergunta ao
 *     servidor como ficou a cobrança; a obra abre porque o servidor aprovou,
 *     nunca porque esta tela decidiu que deu certo.
 *  3. **Nada finge ser real.** Código PIX, linha digitável e formulário de
 *     cartão dizem, com todas as letras, que são de demonstração — e os dados
 *     do cartão são descartados no servidor, não guardados.
 */

type Etapa = 'metodo' | 'cartao' | 'pagamento' | 'pronto';

const METODOS: { valor: PaymentMethod; rotulo: string; icone: typeof QrCode; ajuda: string }[] = [
  { valor: 'PIX', rotulo: 'Pix', icone: QrCode, ajuda: 'Código copiável, confirmação imediata na simulação' },
  { valor: 'CARTAO', rotulo: 'Cartão', icone: CreditCard, ajuda: 'Formulário de demonstração, com dados fictícios' },
  { valor: 'BOLETO', rotulo: 'Boleto', icone: FileText, ajuda: 'Linha digitável de demonstração, não pagável' },
];

const CARTAO_VAZIO: CardInput = { holder: '', number: '', expiry: '', cvv: '' };

export default function AquisicaoDialog({ work, open, onClose }: { work: Work; open: boolean; onClose: () => void }) {
  const [etapa, setEtapa] = useState<Etapa>('metodo');
  const [metodo, setMetodo] = useState<PaymentMethod>('PIX');
  const [cartao, setCartao] = useState<CardInput>(CARTAO_VAZIO);
  const [checkout, setCheckout] = useState<PurchaseCheckout | null>(null);
  const [cobranca, setCobranca] = useState<Purchase | null>(null);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);

  const abrir = useAbrirCobranca(work.id);
  const confirmar = useConfirmarCobranca();
  const cancelar = useCancelarCobranca();

  const preco = work.priceCents ?? 0;

  const fechar = () => {
    setEtapa('metodo');
    setCartao(CARTAO_VAZIO);
    setCheckout(null);
    setCobranca(null);
    setErro('');
    setCopiado(false);
    onClose();
  };

  const abrirCobranca = async (card?: CardInput) => {
    setErro('');
    try {
      const resultado = await abrir.mutateAsync({ method: metodo, card });
      setCobranca(resultado.purchase);
      setCheckout(resultado.checkout);
      // Cobrança reaproveitada não traz checkout novo: é a mesma de antes.
      setEtapa(resultado.purchase.status === 'CONFIRMADA' ? 'pronto' : 'pagamento');
    } catch (e) {
      setErro(errorMessage(e, 'Não foi possível abrir a cobrança.'));
    }
  };

  const confirmarPagamento = async () => {
    if (!cobranca) return;
    setErro('');
    try {
      const atualizada = await confirmar.mutateAsync(cobranca.id);
      setCobranca(atualizada);
      if (atualizada.status === 'CONFIRMADA') setEtapa('pronto');
      else setErro('O pagamento não foi aprovado. A obra continua indisponível.');
    } catch (e) {
      setErro(errorMessage(e, 'Não foi possível confirmar o pagamento.'));
    }
  };

  const cancelarPagamento = async () => {
    if (!cobranca) return fechar();
    try {
      await cancelar.mutateAsync(cobranca.id);
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

  const ocupado = abrir.isPending || confirmar.isPending;

  return (
    <Modal
      open={open}
      onClose={etapa === 'pagamento' ? cancelarPagamento : fechar}
      title={etapa === 'pronto' ? 'Obra adquirida' : `Adquirir "${work.title}"`}
    >
      {/* O aviso vem primeiro e fica em todas as etapas: a pessoa precisa
          saber que é demonstração ANTES de digitar qualquer coisa. */}
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
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-muted">Obra</dt>
            <dd className="text-right font-semibold text-ink">{work.title}</dd>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <dt className="text-ink-muted">Autoria</dt>
            <dd className="text-right text-ink">{work.author.name}</dd>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-outline/25 pt-2">
            <dt className="text-ink-muted">Valor</dt>
            <dd className="text-right text-lg font-bold text-ink">{formatCents(preco)}</dd>
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
              onClick={() => (metodo === 'CARTAO' ? setEtapa('cartao') : abrirCobranca())}
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
            void abrirCobranca(cartao);
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
              {ocupado && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Pagar {formatCents(preco)}
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
            <button type="button" className="btn-primary" onClick={confirmarPagamento} disabled={ocupado}>
              {confirmar.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Simular pagamento
              aprovado
            </button>
            <button type="button" className="btn-secondary" onClick={cancelarPagamento} disabled={cancelar.isPending}>
              Cancelar cobrança
            </button>
          </div>
        </>
      )}

      {etapa === 'pronto' && (
        <>
          <p className="mb-4 rounded-xl border-l-4 border-accent bg-surface-high p-4 text-sm text-ink">
            <strong>{work.title}</strong> entrou na sua biblioteca. Ela continua disponível quando você voltar, mesmo
            depois de sair da conta.
          </p>
          <dl className="mb-5 rounded-xl bg-surface-high p-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Valor</dt>
              <dd className="font-semibold text-ink">{formatCents(cobranca?.priceCents ?? preco)}</dd>
            </div>
            <div className="mt-1 flex justify-between gap-3">
              <dt className="text-ink-muted">Comprovante</dt>
              <dd className="font-mono text-xs text-ink">#{cobranca?.id}</dd>
            </div>
            <div className="mt-1 flex justify-between gap-3">
              <dt className="text-ink-muted">Confirmado em</dt>
              <dd className="text-ink">
                {cobranca?.confirmedAt ? new Date(cobranca.confirmedAt).toLocaleString('pt-BR') : '—'}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Link to={`/reader/${work.id}`} className="btn-primary" onClick={fechar}>
              <BookOpen className="h-4 w-4" aria-hidden /> Ler agora
            </Link>
            <Link to="/biblioteca" className="btn-secondary" onClick={fechar}>
              Ver minha biblioteca
            </Link>
          </div>
        </>
      )}
    </Modal>
  );
}
