import type { Request, Response } from 'express';
import { currentUser } from '../middlewares/auth';
import * as dashboard from '../services/author-dashboard.service';
import * as genresService from '../services/genres.service';

export async function myWorks(req: Request, res: Response) {
  res.json(await dashboard.listMyWorks(currentUser(req).id));
}

export async function mySummary(req: Request, res: Response) {
  res.json(await dashboard.getMySummary(currentUser(req).id));
}

export async function myDashboard(req: Request, res: Response) {
  res.json(await dashboard.getAuthorDashboard(currentUser(req).id));
}

export async function listGenres(_req: Request, res: Response) {
  res.json(await genresService.listGenres(false));
}
