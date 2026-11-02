import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import { db } from '../db/client';
import { contactMessages, type ContactStatus } from '../db/schema';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { notFound } from '../utils/http-error';
import { enviarEmail } from './smtp';

/**
 * "Fale Conosco".
 *
 * A regra que organiza tudo aqui: **gravar primeiro, entregar depois**.
 *
 * A tentação é mandar o e-mail e responder "enviado". Só que entrega de e-mail
 * falha de um jeito que não dá para prever da tela: servidor fora do ar, senha
 * de app revogada, rede caída, provedor recusando por volume. Se a mensagem só
 * existisse no caminho do envio, ela sumiria junto com a falha — e a pessoa
 * que escreveu nunca saberia.
 *
 * Então a mensagem é gravada no banco antes de qualquer coisa. O envio é uma
 * segunda etapa cujo resultado fica registrado (`deliveredAt`,
 * `deliveryError`) e **nunca derruba a requisição**: quem escreveu recebe
 * confirmação porque a mensagem está guardada, não porque o e-mail saiu. A
 * administração vê as duas informações separadas na caixa de entrada.
 *
 * Consequência boa para a apresentação: sem SMTP configurado, ou sem internet,
 * o formulário continua funcionando por inteiro. A mensagem entra na caixa do
 * administrador do mesmo jeito.
 */

export interface DadosDeContato {
  name: string;
  email: string;
  subject: string;
  orderRef?: string;
  message: string;
}

/** Assuntos oferecidos no formulário. O Zod valida contra esta lista. */
export const ASSUNTOS = [
  'DUVIDA',
  'ACESSIBILIDADE',
  'PUBLICAR',
  'PEDIDO',
  'PROBLEMA',
  'IMPRENSA',
  'OUTRO',
] as const;
export type Assunto = (typeof ASSUNTOS)[number];

const ROTULO_ASSUNTO: Record<Assunto, string> = {
  DUVIDA: 'Dúvida geral',
  ACESSIBILIDADE: 'Acessibilidade',
  PUBLICAR: 'Quero publicar uma obra',
  PEDIDO: 'Sobre um pedido',
  PROBLEMA: 'Problema no site',
  IMPRENSA: 'Imprensa',
  OUTRO: 'Outro assunto',
};

/** Está configurado para entregar por e-mail? */
export function entregaConfigurada(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.CONTATO_EMAIL_DESTINO);
}

function corpoDoEmail(id: number, dados: DadosDeContato): string {
  const rotulo = ROTULO_ASSUNTO[dados.subject as Assunto] ?? dados.subject;
  return [
    `Mensagem #${id} recebida pelo Fale Conosco do Livrin.`,
    '',
    `Nome:    ${dados.name}`,
    `E-mail:  ${dados.email}`,
    `Assunto: ${rotulo}`,
    dados.orderRef ? `Pedido:  ${dados.orderRef}` : '',
    '',
    '---',
    '',
    dados.message,
    '',
    '---',
    'Responder este e-mail escreve direto para quem mandou a mensagem.',
  ]
    .filter((l) => l !== '')
    .join('\n');
}

/**
 * Grava a mensagem e tenta entregar. Devolve o que de fato aconteceu com cada
 * etapa, para a tela poder dizer a verdade em vez de "enviado com sucesso".
 */
export async function receberMensagem(
  dados: DadosDeContato,
  userId?: number,
): Promise<{ id: number; gravada: true; entregue: boolean }> {
  const [linha] = await db
    .insert(contactMessages)
    .values({
      name: dados.name,
      email: dados.email,
      subject: dados.subject,
      orderRef: dados.orderRef,
      message: dados.message,
      userId,
    })
    .returning({ id: contactMessages.id });

  if (!entregaConfigurada()) return { id: linha.id, gravada: true, entregue: false };

  try {
    await enviarEmail(
      {
        host: env.SMTP_HOST!,
        port: env.SMTP_PORT,
        user: env.SMTP_USER!,
        pass: env.SMTP_PASS!,
        para: env.CONTATO_EMAIL_DESTINO!,
        remetenteNome: env.SMTP_FROM_NAME,
      },
      {
        assunto: `[Livrin] ${ROTULO_ASSUNTO[dados.subject as Assunto] ?? dados.subject} — ${dados.name}`,
        corpo: corpoDoEmail(linha.id, dados),
        // Responder no cliente de e-mail escreve para quem mandou, não para
        // a própria caixa. É a diferença entre uma caixa de entrada útil e um
        // monte de mensagens que ele mesmo mandou.
        responderPara: dados.email,
      },
    );
    await db
      .update(contactMessages)
      .set({ deliveredAt: new Date(), deliveryError: null })
      .where(eq(contactMessages.id, linha.id));
    return { id: linha.id, gravada: true, entregue: true };
  } catch (err) {
    const motivo = err instanceof Error ? err.message : String(err);
    // A falha é registrada e segue a vida. Derrubar a requisição aqui faria a
    // pessoa reenviar e duplicar uma mensagem que JÁ está guardada.
    logger.warn(`Mensagem #${linha.id} gravada, mas o e-mail não saiu: ${motivo}`);
    await db
      .update(contactMessages)
      .set({ deliveryError: motivo.slice(0, 500) })
      .where(eq(contactMessages.id, linha.id));
    return { id: linha.id, gravada: true, entregue: false };
  }
}

/* ------------------------- Caixa de entrada (admin) ------------------------ */

export async function listarMensagens(query: {
  status?: ContactStatus;
  page: number;
  pageSize: number;
}) {
  const where: SQL | undefined = query.status ? eq(contactMessages.status, query.status) : undefined;
  const offset = (query.page - 1) * query.pageSize;

  const [linhas, [{ total }], [{ novas }]] = await Promise.all([
    db
      .select()
      .from(contactMessages)
      .where(where)
      .orderBy(desc(contactMessages.createdAt), desc(contactMessages.id))
      .limit(query.pageSize)
      .offset(offset),
    db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(contactMessages).where(where),
    db
      .select({ novas: sql<number>`count(*)`.mapWith(Number) })
      .from(contactMessages)
      .where(eq(contactMessages.status, 'NOVA')),
  ]);

  return {
    data: linhas,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
    novas,
    entregaConfigurada: entregaConfigurada(),
  };
}

export async function mudarStatus(id: number, status: ContactStatus) {
  const [linha] = await db
    .update(contactMessages)
    .set({ status })
    .where(eq(contactMessages.id, id))
    .returning();
  if (!linha) throw notFound('Mensagem não encontrada.');
  return linha;
}

export async function apagarMensagem(id: number) {
  const [linha] = await db.delete(contactMessages).where(eq(contactMessages.id, id)).returning({ id: contactMessages.id });
  if (!linha) throw notFound('Mensagem não encontrada.');
}

/** Quantas mensagens novas há. Usado pelo painel para o aviso no menu. */
export async function contarNovas(): Promise<number> {
  const [{ novas }] = await db
    .select({ novas: sql<number>`count(*)`.mapWith(Number) })
    .from(contactMessages)
    .where(and(eq(contactMessages.status, 'NOVA')));
  return novas;
}
