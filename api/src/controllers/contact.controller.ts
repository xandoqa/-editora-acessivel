import type { Request, Response } from 'express';
import * as contactService from '../services/contact.service';
import { idParams, parse } from '../validators/common';
import { contactListSchema, contactSchema, contactStatusSchema } from '../validators/contact.schemas';

/**
 * Fale Conosco.
 *
 * A resposta diz separadamente o que aconteceu com cada etapa — `gravada` e
 * `entregue` —, em vez de um "sucesso" que esconde a diferença. A tela usa
 * isso para não prometer um e-mail que não saiu.
 */
export async function enviar(req: Request, res: Response) {
  const { website: _armadilha, ...dados } = parse(contactSchema, req.body);
  const resultado = await contactService.receberMensagem(dados, req.user?.id);
  res.status(201).json(resultado);
}

/* -------------------------- Caixa de entrada (admin) ----------------------- */

export async function listar(req: Request, res: Response) {
  res.json(await contactService.listarMensagens(parse(contactListSchema, req.query)));
}

export async function mudarStatus(req: Request, res: Response) {
  const { id } = parse(idParams, req.params);
  const { status } = parse(contactStatusSchema, req.body);
  res.json(await contactService.mudarStatus(id, status));
}

export async function apagar(req: Request, res: Response) {
  await contactService.apagarMensagem(parse(idParams, req.params).id);
  res.status(204).end();
}
