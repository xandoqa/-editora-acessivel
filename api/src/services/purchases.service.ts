import { and, desc, eq, inArray, lt } from 'drizzle-orm';
import { db } from '../db/client';
import { purchases, users, works, type PaymentMethod, type Purchase } from '../db/schema';
import type { AuthUser } from '../middlewares/auth';
import { badRequest, conflict, forbidden, notFound } from '../utils/http-error';
import { logger } from '../utils/logger';
import { formatBRL, provedorAtual } from './payments/payment.service';
import { coverUrl } from './storage.service';

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

/**
 * Mensalidade do plano premium, em centavos.
 *
 * Valor de demonstração: não há cobrança real, nem renovação automática, nem
 * meio de receber dinheiro. Vive aqui, numa constante, porque inventar uma
 * tabela de preços de planos seria construir a burocracia de um produto que
 * não existe.
 */
export const PRECO_PLANO_CENTAVOS = 990;

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
    kind: p.kind,
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
/**
 * Por que esta pessoa pode (ou não) ler a obra.
 *
 * Devolver o MOTIVO, e não só um sim/não, resolve uma confusão real: ao testar
 * com a conta da administração, a obra paga abre — e parece que o bloqueio não
 * funciona, quando na verdade é a regra de revisão agindo. Com o motivo na
 * mão, a interface consegue dizer "você está lendo como administração", que é
 * a diferença entre um sistema que falha e um que se explica.
 */
export type MotivoAcesso = 'LIVRE' | 'COMPRADA' | 'AUTORIA' | 'ADMINISTRACAO' | 'NEGADO';

export async function motivoDeAcesso(
  work: { id: number; monetization: string; authorId: number },
  viewer?: AuthUser,
): Promise<MotivoAcesso> {
  if (work.monetization !== 'PAGA') return 'LIVRE';
  if (!viewer) return 'NEGADO';
  // A autoria precisa abrir a própria obra; a administração precisa abrir
  // qualquer uma para revisar. Nenhum dos dois é uma compra.
  if (viewer.id === work.authorId) return 'AUTORIA';
  if (viewer.role === 'ADMIN') return 'ADMINISTRACAO';
  const [aquisicao] = await db
    .select({ id: purchases.id })
    .from(purchases)
    .where(
      and(
        eq(purchases.userId, viewer.id),
        eq(purchases.kind, 'OBRA'),
        eq(purchases.workId, work.id),
        eq(purchases.status, 'CONFIRMADA'),
      ),
    )
    .limit(1);
  return aquisicao ? 'COMPRADA' : 'NEGADO';
}

export async function temAcessoDeLeitura(
  work: { id: number; monetization: string; authorId: number },
  viewer?: AuthUser,
): Promise<boolean> {
  return (await motivoDeAcesso(work, viewer)) !== 'NEGADO';
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
        eq(purchases.kind, 'OBRA'),
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
      kind: 'OBRA',
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
    if (registro.kind === 'PLANO') {
      /*
       * O plano é ativado AQUI, ao confirmar o pagamento — não na tela.
       * É a mesma regra das obras: o acesso é consequência de uma aprovação
       * do servidor, nunca de o cliente dizer que deu certo.
       */
      await db
        .update(users)
        .set({ plan: 'PREMIUM', planSince: new Date() })
        .where(eq(users.id, registro.userId));
      logger.info(`Plano premium ativado para o usuário ${registro.userId} (aquisição #${id}).`);
    } else {
      logger.info(`Aquisição #${id} confirmada: obra ${registro.workId} liberada para o usuário ${registro.userId}.`);
    }
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
    .where(and(eq(purchases.userId, userId), eq(purchases.kind, 'OBRA'), eq(purchases.status, 'CONFIRMADA')))
    .orderBy(desc(purchases.confirmedAt));
  // O caminho interno do arquivo nunca sai da API: a tela recebe a URL pública
  // da capa, como no resto do catálogo.
  return linhas.map(({ work, ...resto }) => ({
    ...resto,
    work: { ...work, coverPath: undefined, coverUrl: coverUrl(work.coverPath) },
  }));
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
      kind: purchases.kind,
      work: { id: works.id, title: works.title },
    })
    .from(purchases)
    // `leftJoin` porque a mensalidade do plano não tem obra: com `innerJoin`
    // ela sumiria do histórico, e o histórico financeiro é justamente o que
    // não pode esconder nada.
    .leftJoin(works, eq(works.id, purchases.workId))
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

/* ------------------------------- Plano premium ------------------------------ */

/**
 * Abre a cobrança da mensalidade do plano.
 *
 * Reaproveita inteiro o caminho da aquisição de obra: mesmo provedor, mesma
 * idempotência, mesma expiração, mesma tabela. O que muda é `kind` e a
 * ausência de obra.
 *
 * ## Por que esta função trava a linha do usuário
 *
 * A compra de obra tem uma garantia de banco contra cobrança duplicada: o
 * índice único parcial `purchases_one_confirmed_per_user_work`, sobre
 * `(user_id, work_id)` onde o estado é `CONFIRMADA`. Assinatura grava
 * `work_id` nulo, e no PostgreSQL nulos são distintos entre si num índice
 * único — então **aquela garantia não alcança o plano**.
 *
 * Estender o índice com `NULLS NOT DISTINCT` seria o reflexo óbvio, e está
 * errado: uma pessoa pode assinar, cancelar e assinar de novo meses depois, e
 * o cancelamento **mantém** a cobrança anterior como `CONFIRMADA`, porque
 * cancelar assinatura não apaga o que foi pago. Um índice único sobre
 * assinaturas confirmadas impediria a segunda assinatura legítima — trocaria
 * uma corrida improvável por um defeito garantido.
 *
 * O que sobra é serializar: a transação trava a linha do usuário com `FOR
 * UPDATE`, e duas requisições simultâneas da mesma conta passam a entrar em
 * fila. A segunda encontra ou a conta já premium, ou a cobrança pendente que a
 * primeira abriu — e os dois caminhos já existiam.
 *
 * A chamada ao provedor fica dentro da transação, segurando a conexão. Com o
 * provedor simulado é instantâneo; com um provedor real valeria mover a
 * abertura da cobrança para fora e reservar a transação só para a decisão.
 */
export async function assinarPlano(method: PaymentMethod, viewer: AuthUser) {
  const provedor = provedorAtual();
  if (!provedor.methods.includes(method)) {
    throw badRequest(`O meio de pagamento ${method} não está disponível nesta instalação.`);
  }

  // Fora da transação de propósito: mexe em outras linhas e não precisa do travamento.
  await expirarPendentesVencidas(viewer.id);

  return db.transaction(async (tx) => {
    const [conta] = await tx
      .select({ plan: users.plan })
      .from(users)
      .where(eq(users.id, viewer.id))
      .for('update');
    if (!conta) throw notFound('Conta não encontrada.');
    if (conta.plan === 'PREMIUM') throw conflict('Sua conta já está no plano premium.');

    // Clique repetido reaproveita a cobrança aberta, em vez de abrir outra.
    const [pendente] = await tx
      .select()
      .from(purchases)
      .where(
        and(
          eq(purchases.userId, viewer.id),
          eq(purchases.kind, 'PLANO'),
          eq(purchases.method, method),
          eq(purchases.status, 'PENDENTE'),
        ),
      )
      .orderBy(desc(purchases.createdAt));
    if (pendente) return { purchase: toPurchaseDto(pendente), checkout: null, reaproveitada: true as const };

    const cobranca = await provedor.createCharge({
      amountCents: PRECO_PLANO_CENTAVOS,
      currency: 'BRL',
      method,
      donorName: viewer.name ?? null,
      message: 'Assinatura do plano premium do Livrin',
    });

    const [registro] = await tx
      .insert(purchases)
      .values({
        userId: viewer.id,
        workId: null,
        kind: 'PLANO',
        priceCents: PRECO_PLANO_CENTAVOS,
        currency: 'BRL',
        method,
        provider: provedor.name,
        providerRef: cobranca.providerRef,
        status: cobranca.status === 'CONFIRMADA' ? 'CONFIRMADA' : 'PENDENTE',
        confirmedAt: cobranca.status === 'CONFIRMADA' ? new Date() : null,
        expiresAt: new Date(Date.now() + VALIDADE_MS[method]),
      })
      .returning();

    // Cobrança já confirmada na abertura: ativa na hora, como faz o confirm.
    if (registro.status === 'CONFIRMADA') {
      await tx.update(users).set({ plan: 'PREMIUM', planSince: new Date() }).where(eq(users.id, viewer.id));
    }

    logger.info(`Assinatura #${registro.id} aberta para o usuário ${viewer.id} (${method}).`);
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
  });
}

/**
 * Cancela o plano.
 *
 * Volta a conta para o gratuito e **mantém o histórico de pagamento**: cancelar
 * uma assinatura não apaga o que foi pago, nem aqui nem em lugar nenhum.
 */
export async function cancelarPlano(viewer: AuthUser) {
  const [conta] = await db.select({ plan: users.plan }).from(users).where(eq(users.id, viewer.id));
  if (!conta) throw notFound('Conta não encontrada.');
  if (conta.plan !== 'PREMIUM') throw conflict('Sua conta já está no plano gratuito.');

  // Cobrança de plano ainda pendente perde o sentido depois do cancelamento.
  await db
    .update(purchases)
    .set({ status: 'CANCELADA' })
    .where(and(eq(purchases.userId, viewer.id), eq(purchases.kind, 'PLANO'), eq(purchases.status, 'PENDENTE')));

  const [atualizado] = await db
    .update(users)
    .set({ plan: 'GRATUITO', planSince: null })
    .where(eq(users.id, viewer.id))
    .returning({ plan: users.plan, planSince: users.planSince });
  logger.info(`Plano premium cancelado pelo usuário ${viewer.id}.`);
  return atualizado;
}

/** O que a tela de planos precisa saber. */
export function descreverPlanos() {
  const p = provedorAtual();
  return {
    precoCents: PRECO_PLANO_CENTAVOS,
    currency: 'BRL',
    provider: p.name,
    isReal: p.isReal,
    methods: p.methods,
  };
}
