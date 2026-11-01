import type { Request, Response } from 'express';
import * as authorsService from '../services/authors.service';
import { idParams, parse } from '../validators/common';

/**
 * Coleções por autor. Tudo público: são obras já aprovadas, as mesmas que
 * qualquer visitante vê no catálogo — só que agrupadas por quem as escreveu.
 */

export async function listAuthors(_req: Request, res: Response) {
  res.json(await authorsService.listAuthors());
}

export async function getAuthor(req: Request, res: Response) {
  res.json(await authorsService.getAuthor(parse(idParams, req.params).id));
}
