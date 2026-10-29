import type { Request, Response } from 'express';
import { currentUser } from '../middlewares/auth';
import * as purchases from '../services/purchases.service';
import * as historico from '../services/reading-history.service';
import { idParams, parse } from '../validators/common';
import { assinaturaSchema, createPurchaseSchema } from '../validators/purchases.schemas';

/**
 * Aquisição de obras pagas.
 *
 * Repare no que o corpo da requisição NÃO aceita: valor. O preço é lido da
 * obra, no servidor. O cliente escolhe a obra e o meio de pagamento, e só.
 */
export async function create(req: Request, res: Response) {
  const { id } = parse(idParams, req.params);
  const { method, card } = parse(createPurchaseSchema, req.body);
  // Os dados de cartão são validados no schema e descartados aqui: nenhum
  // número, validade ou código de segurança entra em banco, log ou resposta.
  void card;
  const resultado = await purchases.createPurchase(id, method, currentUser(req));
  res.status(resultado.reaproveitada ? 200 : 201).json(resultado);
}

export async function confirm(req: Request, res: Response) {
  const { id } = parse(idParams, req.params);
  res.json(await purchases.confirmPurchase(id, currentUser(req)));
}

export async function cancel(req: Request, res: Response) {
  const { id } = parse(idParams, req.params);
  res.json(await purchases.cancelPurchase(id, currentUser(req)));
}

export async function show(req: Request, res: Response) {
  const { id } = parse(idParams, req.params);
  res.json(await purchases.getPurchase(id, currentUser(req)));
}

/** Biblioteca pessoal: as obras que a pessoa adquiriu. */
export async function library(req: Request, res: Response) {
  res.json(await purchases.listMyLibrary(currentUser(req).id));
}

/** Histórico de compras, com todos os estados. */
export async function history(req: Request, res: Response) {
  res.json(await purchases.listMyPurchases(currentUser(req).id));
}

/* ------------------------------- Plano premium ------------------------------ */

/** O que a tela de planos precisa: preço, meios aceitos e se o provedor é real. */
export async function planOptions(_req: Request, res: Response) {
  res.json(purchases.descreverPlanos());
}

export async function subscribe(req: Request, res: Response) {
  const { method, card } = parse(assinaturaSchema, req.body);
  // Como na compra de obra: o cartão é validado em formato e descartado.
  void card;
  const resultado = await purchases.assinarPlano(method, currentUser(req));
  res.status(resultado.reaproveitada ? 200 : 201).json(resultado);
}

export async function cancelPlan(req: Request, res: Response) {
  res.json(await purchases.cancelarPlano(currentUser(req)));
}

/* ----------------------------- Histórico de leitura ---------------------------- */

export async function readingHistory(req: Request, res: Response) {
  res.json(await historico.listReadingHistory(currentUser(req).id));
}

export async function clearHistory(req: Request, res: Response) {
  const apagadas = await historico.clearReadingHistory(currentUser(req).id);
  res.json({ removidas: apagadas });
}
