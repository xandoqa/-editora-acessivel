import { Megaphone, ShoppingBag, Unlock } from 'lucide-react';
import { formatCents } from '../../lib/format';
import type { Monetization } from '../../types/api';

/**
 * Como a obra é disponibilizada, dito em uma linha.
 *
 * A estante precisa diferenciar as três modalidades **antes** do clique: a
 * pessoa tem que saber que vai pagar, e quanto, antes de abrir qualquer tela
 * de pagamento. A indicação é texto com ícone, e não cor sozinha — cor sozinha
 * não chega a quem não a distingue.
 */

const ROTULO: Record<Monetization, { texto: string; icone: typeof Unlock }> = {
  GRATUITA: { texto: 'Leitura livre', icone: Unlock },
  PUBLICIDADE: { texto: 'Livre, com publicidade', icone: Megaphone },
  PAGA: { texto: 'Obra paga', icone: ShoppingBag },
};

export function Modalidade({
  monetization,
  priceCents,
  className = '',
}: {
  monetization: Monetization;
  priceCents: number | null;
  className?: string;
}) {
  const { texto, icone: Icone } = ROTULO[monetization];
  const pago = monetization === 'PAGA' && priceCents !== null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${pago ? 'font-semibold text-ink' : 'text-ink-muted'} ${className}`}>
      <Icone className="h-3.5 w-3.5" aria-hidden />
      {pago ? formatCents(priceCents) : texto}
    </span>
  );
}

/**
 * Espaço publicitário simulado.
 *
 * Não existe integração publicitária neste projeto, e inventar uma seria
 * fingir receita que não há. O que esta faixa faz é ocupar o lugar que um
 * anúncio ocuparia, dizendo o que é — sem rastrear ninguém, sem carregar
 * script de terceiro e sem coletar dado algum. Fica fora do corpo do texto,
 * para não atrapalhar a leitura.
 */
export function EspacoPublicitario({ share }: { share: number }) {
  return (
    <aside
      aria-label="Espaço publicitário de demonstração"
      className="my-6 rounded-[14px_10px_14px_10px] border border-dashed border-outline/70 bg-surface-high p-4 text-center"
    >
      <p className="eyebrow text-ink-subtle">Espaço publicitário · demonstração</p>
      <p className="mt-1 text-sm text-ink-muted">
        Nenhum anúncio real é exibido e nenhuma receita é gerada. Numa operação real, a divisão aplicada seria de{' '}
        <strong className="text-ink">{share}% para a autoria</strong> e {100 - share}% para a plataforma — percentuais
        de demonstração, configuráveis por obra.
      </p>
    </aside>
  );
}
