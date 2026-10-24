import { and, desc, eq, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { env } from '../../config/env';
import { db } from '../../db/client';
import { donations, users, works, type Donation } from '../../db/schema';
import type { AuthUser } from '../../middlewares/auth';
import { badRequest, conflict, notFound } from '../../utils/http-error';
import { logger } from '../../utils/logger';
import { paginated } from '../../validators/common';
import type { adminDonationListSchema, donationSchema } from '../../validators/donations.schemas';
import type { PaymentProvider } from './payment-provider';
import { SimulatedPaymentProvider } from './simulated.provider';

/**
 * Serviço de doações.
 *
 *     PaymentService  →  PaymentProvider  →  método de pagamento
 *
 * O serviço cuida das regras (limites, registro, confirmação) e nunca sabe
 * COMO o dinheiro é cobrado. Trocar de provedor é registrar outra
 * implementação em PROVEDORES e apontar PAYMENT_PROVIDER no ambiente — nenhuma
 * rota, controller ou tela muda.
 */

const PROVEDORES: Record<string, PaymentProvider> = {
  simulado: new SimulatedPaymentProvider(),
};

export function provedorAtual(): PaymentProvider {
  const escolhido = PROVEDORES[env.PAYMENT_PROVIDER];
  if (escolhido) return escolhido;
  logger.warn(`PAYMENT_PROVIDER="${env.PAYMENT_PROVIDER}" não está registrado. Usando o provedor simulado.`);
  return PROVEDORES.simulado;
}

/** Valores mínimo e máximo por doação, em centavos. */
export const MIN_CENTAVOS = 500; // R$ 5,00
export const MAX_CENTAVOS = 500_000; // R$ 5.000,00

/** O que a interface precisa saber antes de montar o formulário. */
export function describeProvider() {
  const p = provedorAtual();
  return {
    provider: p.name,
    label: p.label,
    isReal: p.isReal,
    methods: p.methods,
    minCents: MIN_CENTAVOS,
    maxCents: MAX_CENTAVOS,
    currency: 'BRL',
  };
}

function toDonationDto(d: Donation) {
  return {
    id: d.id,
    amountCents: d.amountCents,
    currency: d.currency,
    method: d.method,
    status: d.status,
    provider: d.provider,
    donorName: d.donorName,
    message: d.message,
    workId: d.workId,
    createdAt: d.createdAt,
    confirmedAt: d.confirmedAt,
  };
}

export type DonationDto = ReturnType<typeof toDonationDto>;

/** Abre uma doação. A obra é opcional: dá para apoiar o projeto como um todo. */
export async function createDonation(input: z.infer<typeof donationSchema>, viewer?: AuthUser) {
  const provedor = provedorAtual();

  if (!provedor.methods.includes(input.method)) {
    throw badRequest(`O meio de pagamento ${input.method} não está disponível nesta instalação.`);
  }
  if (input.amountCents < MIN_CENTAVOS || input.amountCents > MAX_CENTAVOS) {
    throw badRequest(
      `O valor precisa ficar entre ${formatBRL(MIN_CENTAVOS)} e ${formatBRL(MAX_CENTAVOS)}.`,
    );
  }
  if (input.workId) {
    const [obra] = await db.select({ id: works.id }).from(works).where(eq(works.id, input.workId));
    if (!obra) throw notFound('Obra não encontrada.');
  }

  const cobranca = await provedor.createCharge({
    amountCents: input.amountCents,
    currency: 'BRL',
    method: input.method,
    donorName: input.donorName ?? viewer?.name ?? null,
    message: input.message ?? null,
  });

  const [registro] = await db
    .insert(donations)
    .values({
      userId: viewer?.id ?? null,
      workId: input.workId ?? null,
      donorName: input.donorName ?? viewer?.name ?? null,
      amountCents: input.amountCents,
      currency: 'BRL',
      method: input.method,
      provider: provedor.name,
      providerRef: cobranca.providerRef,
      status: cobranca.status,
      message: input.message ?? null,
      confirmedAt: cobranca.status === 'CONFIRMADA' ? new Date() : null,
    })
    .returning();

  logger.info(`Doação #${registro.id} aberta (${formatBRL(registro.amountCents)}, ${registro.method}, ${provedor.name}).`);

  return {
    donation: toDonationDto(registro),
    checkout: {
      checkoutUrl: cobranca.checkoutUrl,
      code: cobranca.code,
      instruction: cobranca.instruction,
      isReal: provedor.isReal,
    },
  };
}

/**
 * Conclui a cobrança. Num provedor real este caminho seria disparado também
 * por webhook — a lógica de "confirmar e registrar a data" fica aqui, não na
 * rota, exatamente por isso.
 */
export async function confirmDonation(id: number, viewer?: AuthUser) {
  const [registro] = await db.select().from(donations).where(eq(donations.id, id));
  if (!registro) throw notFound('Doação não encontrada.');
  // Doação anônima é confirmada por quem a abriu, na mesma sessão da tela.
  if (registro.userId && registro.userId !== viewer?.id && viewer?.role !== 'ADMIN') {
    throw notFound('Doação não encontrada.');
  }
  if (registro.status === 'CONFIRMADA') return toDonationDto(registro);
  if (registro.status !== 'PENDENTE') throw conflict('Esta doação não está mais aguardando pagamento.');

  const provedor = PROVEDORES[registro.provider] ?? provedorAtual();
  const situacao = await provedor.confirmCharge(registro.providerRef);

  const [atualizado] = await db
    .update(donations)
    .set({ status: situacao, confirmedAt: situacao === 'CONFIRMADA' ? new Date() : null })
    .where(eq(donations.id, id))
    .returning();
  return toDonationDto(atualizado);
}

/** Doações da pessoa autenticada. */
export async function listMyDonations(userId: number) {
  const linhas = await db
    .select()
    .from(donations)
    .where(eq(donations.userId, userId))
    .orderBy(desc(donations.createdAt))
    .limit(50);
  return linhas.map(toDonationDto);
}

/* ------------------------------ Administração ------------------------------ */

export async function listDonationsAdmin(query: z.infer<typeof adminDonationListSchema>) {
  const where = and(
    query.status ? eq(donations.status, query.status) : undefined,
    query.method ? eq(donations.method, query.method) : undefined,
  );
  const base = db
    .select({
      id: donations.id,
      amountCents: donations.amountCents,
      currency: donations.currency,
      method: donations.method,
      status: donations.status,
      provider: donations.provider,
      donorName: donations.donorName,
      message: donations.message,
      createdAt: donations.createdAt,
      confirmedAt: donations.confirmedAt,
      user: { id: users.id, name: users.name, email: users.email },
      work: { id: works.id, title: works.title },
    })
    .from(donations)
    .leftJoin(users, eq(users.id, donations.userId))
    .leftJoin(works, eq(works.id, donations.workId));

  const [linhas, [{ total }]] = await Promise.all([
    base
      .where(where)
      .orderBy(desc(donations.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(donations).where(where),
  ]);
  return paginated(linhas, total, query.page, query.pageSize);
}

/** Números do apoio para o painel administrativo. */
export async function donationStats() {
  const [linha] = await db
    .select({
      total: sql<number>`count(*)`.mapWith(Number),
      confirmadas: sql<number>`count(*) filter (where ${donations.status} = 'CONFIRMADA')`.mapWith(Number),
      centavosConfirmados: sql<number>`coalesce(sum(${donations.amountCents}) filter (where ${donations.status} = 'CONFIRMADA'), 0)`.mapWith(
        Number,
      ),
      apoiadores: sql<number>`count(distinct ${donations.userId}) filter (where ${donations.status} = 'CONFIRMADA')`.mapWith(Number),
    })
    .from(donations);
  return { ...linha, provider: provedorAtual().name, isReal: provedorAtual().isReal };
}

export function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
