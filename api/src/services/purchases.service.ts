import { and, desc, eq, inArray, lt } from 'drizzle-orm';
import { db } from '../db/client';
import { purchases, users, works, type Purchase, type PaymentMethod } from '../db/schema';
import type { AuthUser } from '../middlewares/auth';
import { badRequest, conflict, forbidden, notFound } from '../utils/http-error';
import { logger } from '../utils/logger';
import { formatBRL, provedorAtual } from './payments/payment.service';

/**
 * Aquisição de obras pagas.
 *
 * Três regras guiam este arquivo, e todas valem no SERVIDOR — o documento de
 * especificação é explícito quanto a isso, e com razão: validação de preço que
 * mora só no navegador não é validação, é sugestão.
 *
 *  1. **O preço vem do banco.** O cliente diz qual obra quer, nunca quanto vai
 *     pagar. Alterar o preço no navegador não muda o que é cobrado.
 *  2. **Acesso é consequência de pagamento aprovado**, e aprovação acontece
 *     aqui, não no front. Nenhuma rota libera obra porque a tela disse que
 *     deu certo.
 *  3. **Uma compra, um acesso.** Cliques repetidos reaproveitam a cobrança
 *     pendente em vez de abrir outra, e o índice único parcial do banco
 *     garante que nunca existam duas aquisições confirmadas da mesma obra pela
 *     mesma pessoa.
 *
 * Dados de cartão não passam por aqui. O formulário da tela valida formato e
 * descarta: nada de número, validade ou CVV entra em banco, log ou resposta.
 */

/** Teto de preço definido pelo autor: R$ 50,00, em centavos. */
export const MAX_PRECO_CENTAVOS = 5_000;
/** Piso: abaixo disso a cobrança não se paga nem em provedor real. */
export const MIN_PRECO_CENTAVOS = 100;

/** Prazo de uma cobrança pendente, por meio de pagamento. */
const VALIDADE_MS: Record<PaymentMethod, number> = {
  PIX: 30 * 60 * 1000, // 30 minutos
  CARTAO: 15 * 60 * 1000, // 15 minutos
  BOLETO: 3 * 24 * 60 * 60 * 1000, // 3 dias
};

function toPurchaseDto(p: Purchase) {
  return {
    id: p.id,
    workId: p.workId,
    priceCents: p.priceCents,
    currency: p.currency,
    method: p.method,
    status: p.status,
    provider: p.provider,
    createdAt: p.createdAt,
    confirmedAt: p.confirmedAt,
    expiresAt: p.expiresAt,
  };
}

export type PurchaseDto = ReturnType<typeof toPurchaseDto>;

/**
 * Marca como EXPIRADA toda cobrança pendente cujo prazo passou.
 *
 * Roda antes de consultar ou abrir uma compra. Sem isto, uma cobrança aberta e
 * abandonada ficaria "aguardando pagamento" para sempre, e bloquearia uma nova
 * tentativa do mesmo leitor — que é o estado que quase todo sistema de
 * pagamento acadêmico esquece de tratar.
 */
export async function expirarPendentesVencidas(userId?: number): Promise<number> {
  const condicoes = [eq(purchases.status, 'PENDENTE'), lt(purchases.expiresAt, new Date())];
  if (userId !== undefined) condicoes.push(eq(purchases.userId, userId));
  const expiradas = await db
    .update(purchases)
    .set({ status: 'EXPIRADA' })
    .where(and(...condicoes))
    .returning({ id: purchases.id });
  if (expiradas.length) logger.info(`${expiradas.length} cobrança(s) pendente(s) expiradas por prazo.`);
  return expiradas.length;
}

/**
 * A pessoa pode ler esta obra?
 *
 * Obra gratuita ou com publicidade: sim, como sempre foi. Obra paga: só com
 * aquisição confirmada — exceto para a própria autoria e para a administração,
 * que precisam conseguir abrir a obra para revisar.
 */
export async function temAcessoDeLeitura(
  work: { id: number; monetization: string; authorId: number },
  viewer?: AuthUser,
): Promise<boolean> {
  if (work.monetization !== 'PAGA') return true;
  if (!viewer) return false;
  if (viewer.role === 'ADMIN' || viewer.id === work.authorId) return true;
  const [aquisicao] = await db
    .select({ id: purchases.id })
    .from(purchases)
    .where(and(eq(purchases.userId, viewer.id), eq(purchases.workId, work.id), eq(purchases.status, 'CONFIRMADA')))
    .limit(1);
  return Boolean(aquisicao);
}

/** Abre uma cobrança para adquirir uma obra paga. */
export async function createPurchase(workId: number, method: PaymentMethod, viewer: AuthUser) {
  const provedor = provedorAtual();
  if (!provedor.methods.includes(method)) {
    throw badRequest(`O meio de pagamento ${method} não está disponível nesta instalação.`);
  }

  const [obra] = await db
    .select({
      id: works.id,
      title: works.title,
      status: works.status,
      authorId: works.authorId,
      monetization: works.monetization,
      priceCents: works.priceCents,
    })
    .from(works)
    .where(eq(works.id, workId));

  if (!obra) throw notFound('Obra não encontrada.');
  // Obra fora do catálogo não se vende: publicar e adquirir são estados
  // diferentes, e a curadoria vem antes do comércio.
  if (obra.status !== 'APROVADO') throw notFound('Obra não encontrada.');
  if (obra.monetization !== 'PAGA') throw badRequest('Esta obra é de leitura livre: não há nada a adquirir.');
  if (obra.authorId === viewer.id) throw conflict('Você é a autoria desta obra: ela já está disponível para você.');

  // O preço SAI DO BANCO. O cliente não manda valor nenhum.
  const precoCentavos = obra.priceCents;
  if (precoCentavos === null || precoCentavos <= 0 || precoCentavos > MAX_PRECO_CENTAVOS) {
    throw conflict('O preço desta obra está inconsistente. Fale com a administração.');
  }

  await expirarPendentesVencidas(viewer.id);

  const existentes = await db
    .select()
    .from(purchases)
    .where(
      and(
        eq(purchases.userId, viewer.id),
        eq(purchases.workId, workId),
        inArray(purchases.status, ['CONFIRMADA', 'PENDENTE']),
      ),
    )
    .orderBy(desc(purchases.createdAt));

  const confirmada = existentes.find((p) => p.status === 'CONFIRMADA');
  if (confirmada) throw conflict('Você já adquiriu esta obra. Ela está na sua biblioteca.');

  // Idempotência: clicar de novo reaproveita a cobrança aberta, em vez de
  // abrir outra e cobrar duas vezes pela mesma obra.
  const pendente = existentes.find((p) => p.status === 'PENDENTE' && p.method === method);
  if (pendente) {
    return { purchase: toPurchaseDto(pendente), checkout: null, reaproveitada: true as const };
  }

  const cobranca = await provedor.createCharge({
    amountCents: precoCentavos,
    currency: 'BRL',
    method,
    donorName: viewer.name ?? null,
    message: `Aquisição da obra "${obra.title}"`,
  });

  const [registro] = await db
    .insert(purchases)
    .values({
      userId: viewer.id,
      workId,
      priceCents: precoCentavos,
      currency: 'BRL',
      method,
      provider: provedor.name,
      providerRef: cobranca.providerRef,
      status: cobranca.status === 'CONFIRMADA' ? 'CONFIRMADA' : 'PENDENTE',
      confirmedAt: cobranca.status === 'CONFIRMADA' ? new Date() : null,
      expiresAt: new Date(Date.now() + VALIDADE_MS[method]),
    })
    .returning();

  logger.info(
    `Aquisição #${registro.id} aberta: obra ${workId}, ${formatBRL(precoCentavos)}, ${method}, ${provedor.name}.`,
  );

  return {
    purchase: toPurchaseDto(registro),
    checkout: {
      code: cobranca.code,
      instruction: cobranca.instruction,
      checkoutUrl: cobranca.checkoutUrl,
      isReal: provedor.isReal,
    },
    reaproveitada: false as const,
  };
}

/**
 * Conclui a cobrança e, só então, libera a obra.
 *
 * Num provedor real este caminho também seria disparado por webhook. É por
 * isso que a decisão mora aqui e não na rota: a origem da confirmação muda, a
 * regra não.
 */
export async function confirmPurchase(id: number, viewer: AuthUser) {
  const [registro] = await db.select().from(purchases).where(eq(purchases.id, id));
  if (!registro) throw notFound('Aquisição não encontrada.');
  if (registro.userId !== viewer.id && viewer.role !== 'ADMIN') throw notFound('Aquisição não encontrada.');

  // Já confirmada: devolve o mesmo resultado em vez de confirmar de novo.
  // Repetir a requisição não pode gerar um segundo registro nem um segundo
  // "pagamento".
  if (registro.status === 'CONFIRMADA') return toPurchaseDto(registro);

  if (registro.expiresAt && registro.expiresAt < new Date()) {
    // Deixa o registro coerente ANTES de recusar: quem voltar a esta tela vê
    // "expirada", e não uma cobrança eternamente "aguardando pagamento".
    await db
      .update(purchases)
      .set({ status: 'EXPIRADA' })
      .where(and(eq(purchases.id, id), eq(purchases.status, 'PENDENTE')));
    throw conflict('Esta cobrança expirou. Abra uma nova para adquirir a obra.');
  }

  if (registro.status !== 'PENDENTE') {
    throw conflict('Esta cobrança não está mais aguardando pagamento.');
  }

  const provedor = provedorAtual();
  const situacao = await provedor.confirmCharge(registro.providerRef);
  const novoStatus = situacao === 'CONFIRMADA' ? 'CONFIRMADA' : situacao === 'FALHOU' ? 'FALHOU' : 'PENDENTE';

  // O UPDATE exige que o registro AINDA esteja PENDENTE. Se duas requisições
  // chegarem juntas, só uma encontra a linha nesse estado; a outra volta vazia
  // e relê o resultado, em vez de confirmar duas vezes.
  const [atualizado] = await db
    .update(purchases)
    .set({ status: novoStatus, confirmedAt: novoStatus === 'CONFIRMADA' ? new Date() : null })
    .where(and(eq(purchases.id, id), eq(purchases.status, 'PENDENTE')))
    .returning();

  if (!atualizado) {
    const [atual] = await db.select().from(purchases).where(eq(purchases.id, id));
    return toPurchaseDto(atual);
  }
  if (novoStatus === 'CONFIRMADA') {
    logger.info(`Aquisição #${id} confirmada: obra ${registro.workId} liberada para o usuário ${registro.userId}.`);
  }
  return toPurchaseDto(atualizado);
}

/** Cancela uma cobrança pendente. Não libera a obra. */
export async function cancelPurchase(id: number, viewer: AuthUser) {
  const [registro] = await db.select().from(purchases).where(eq(purchases.id, id));
  if (!registro) throw notFound('Aquisição não encontrada.');
  if (registro.userId !== viewer.id && viewer.role !== 'ADMIN') throw notFound('Aquisição não encontrada.');
  if (registro.status === 'CONFIRMADA') throw conflict('Esta obra já foi adquirida e não pode ser cancelada aqui.');
  if (registro.status !== 'PENDENTE') return toPurchaseDto(registro);

  const [atualizado] = await db
    .update(purchases)
    .set({ status: 'CANCELADA' })
    .where(and(eq(purchases.id, id), eq(purchases.status, 'PENDENTE')))
    .returning();
  return toPurchaseDto(atualizado ?? registro);
}

/** Uma aquisição específica, para a tela acompanhar o estado da cobrança. */
export async function getPurchase(id: number, viewer: AuthUser) {
  await expirarPendentesVencidas(viewer.id);
  const [registro] = await db.select().from(purchases).where(eq(purchases.id, id));
  if (!registro) throw notFound('Aquisição não encontrada.');
  if (registro.userId !== viewer.id && viewer.role !== 'ADMIN') throw notFound('Aquisição não encontrada.');
  return toPurchaseDto(registro);
}

/**
 * Biblioteca pessoal: as obras que a pessoa adquiriu.
 *
 * Continua acessível depois de sair e entrar de novo, porque o vínculo é com a
 * conta, não com o navegador.
 */
export async function listMyLibrary(userId: number) {
  const linhas = await db
    .select({
      purchaseId: purchases.id,
      priceCents: purchases.priceCents,
      method: purchases.method,
      confirmedAt: purchases.confirmedAt,
      work: {
        id: works.id,
        title: works.title,
        subtitle: works.subtitle,
        coverPath: works.coverPath,
        format: works.format,
        pages: works.pages,
        monetization: works.monetization,
      },
      author: { id: users.id, name: users.name },
    })
    .from(purchases)
    .innerJoin(works, eq(works.id, purchases.workId))
    .innerJoin(users, eq(users.id, works.authorId))
    .where(and(eq(purchases.userId, userId), eq(purchases.status, 'CONFIRMADA')))
    .orderBy(desc(purchases.confirmedAt));
  return linhas;
}

/** Histórico de compras, com todos os estados. */
export async function listMyPurchases(userId: number) {
  await expirarPendentesVencidas(userId);
  const linhas = await db
    .select({
      id: purchases.id,
      priceCents: purchases.priceCents,
      method: purchases.method,
      status: purchases.status,
      createdAt: purchases.createdAt,
      confirmedAt: purchases.confirmedAt,
      expiresAt: purchases.expiresAt,
      work: { id: works.id, title: works.title },
    })
    .from(purchases)
    .innerJoin(works, eq(works.id, purchases.workId))
    .where(eq(purchases.userId, userId))
    .orderBy(desc(purchases.createdAt))
    .limit(100);
  return linhas;
}

/** Guarda de leitura: lança 402-equivalente quando falta adquirir. */
export async function exigirAcessoDeLeitura(
  work: { id: number; monetization: string; authorId: number; title: string },
  viewer?: AuthUser,
): Promise<void> {
  if (await temAcessoDeLeitura(work, viewer)) return;
  throw forbidden(
    viewer
      ? 'Esta obra é paga e ainda não está na sua biblioteca. Adquira a obra para ler.'
      : 'Esta obra é paga. Entre na sua conta e adquira a obra para ler.',
  );
}
