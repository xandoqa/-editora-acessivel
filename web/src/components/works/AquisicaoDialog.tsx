import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import PagamentoSimuladoDialog from './PagamentoSimulado';
import { formatCents } from '../../lib/format';
import { useAbrirCobranca, useCancelarCobranca, useConfirmarCobranca } from '../../hooks/purchases';
import type { Work } from '../../types/api';

/**
 * Aquisição de uma obra paga.
 *
 * O fluxo em si (escolher meio, preencher cartão, abrir, confirmar) vive em
 * `PagamentoSimulado`, compartilhado com a assinatura do plano: os dois têm a
 * mesma mecânica, e manter duas cópias significaria mantê-las concordando
 * para sempre. Aqui fica só o que é específico de comprar uma obra.
 */
export default function AquisicaoDialog({ work, open, onClose }: { work: Work; open: boolean; onClose: () => void }) {
  const abrir = useAbrirCobranca(work.id);
  const confirmar = useConfirmarCobranca();
  const cancelar = useCancelarCobranca();
  const preco = work.priceCents ?? 0;

  return (
    <PagamentoSimuladoDialog
      open={open}
      onClose={onClose}
      titulo={`Adquirir "${work.title}"`}
      tituloPronto="Obra adquirida"
      resumo={[
        { rotulo: 'Obra', valor: work.title },
        { rotulo: 'Autoria', valor: work.author.name },
      ]}
      precoCents={preco}
      abrirCobranca={(method, card) => abrir.mutateAsync({ method, card })}
      confirmarCobranca={(id) => confirmar.mutateAsync(id)}
      cancelarCobranca={(id) => cancelar.mutateAsync(id)}
      aoConcluir={(cobranca, fechar) => (
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
    />
  );
}
