import type { Request, Response } from 'express';
import { z } from 'zod';
import { currentUser } from '../../middlewares/auth';
import * as adminWorks from '../../services/admin/admin-works.service';
import * as statsService from '../../services/admin/stats.service';
import * as usersService from '../../services/admin/users.service';
import * as feedbackService from '../../services/feedbacks.service';
import * as genresService from '../../services/genres.service';
import * as reviewService from '../../services/review.service';
import * as worksService from '../../services/works.service';
import {
  adminCreateUserSchema,
  adminCreateWorkSchema,
  adminFeedbackListSchema,
  adminFeedbackUpdateSchema,
  adminResetPasswordSchema,
  adminStatusSchema,
  adminUpdateUserSchema,
  adminUserListSchema,
  adminWorkListSchema,
  checkCreateSchema,
  checkUpdateSchema,
  genreSchema,
  genreUpdateSchema,
} from '../../validators/admin.schemas';
import { idParam, idParams, parse } from '../../validators/common';
import { reviewNoteSchema, updateWorkSchema } from '../../validators/works.schemas';
import { filesFrom } from '../works.controller';

const id = (req: Request) => parse(idParams, req.params).id;

/* -------------------------------- Dashboard -------------------------------- */

export async function stats(_req: Request, res: Response) {
  res.json(await statsService.getAdminStats());
}

/* --------------------------------- Usuários -------------------------------- */

export async function listUsers(req: Request, res: Response) {
  res.json(await usersService.listUsers(parse(adminUserListSchema, req.query)));
}
export async function getUser(req: Request, res: Response) {
  res.json(await usersService.getUser(id(req)));
}
export async function createUser(req: Request, res: Response) {
  res.status(201).json(await usersService.createUser(parse(adminCreateUserSchema, req.body)));
}
export async function updateUser(req: Request, res: Response) {
  res.json(await usersService.updateUser(id(req), currentUser(req), parse(adminUpdateUserSchema, req.body)));
}
export async function resetPassword(req: Request, res: Response) {
  await usersService.resetPassword(id(req), parse(adminResetPasswordSchema, req.body).password);
  res.status(204).end();
}
export async function deleteUser(req: Request, res: Response) {
  await usersService.deleteUser(id(req), currentUser(req));
  res.status(204).end();
}

/* ---------------------------------- Obras ---------------------------------- */

export async function listWorks(req: Request, res: Response) {
  res.json(await adminWorks.listWorksAdmin(parse(adminWorkListSchema, req.query)));
}
export async function getWork(req: Request, res: Response) {
  res.json(await adminWorks.getWorkAdmin(id(req), currentUser(req)));
}
export async function createWork(req: Request, res: Response) {
  res.status(201).json(await worksService.createWorkAsAdmin(parse(adminCreateWorkSchema, req.body), filesFrom(req)));
}
export async function updateWork(req: Request, res: Response) {
  const patch = parse(updateWorkSchema.extend({ authorId: idParam.optional() }), req.body);
  res.json(await worksService.updateWorkAsAdmin(id(req), patch, filesFrom(req)));
}
export async function changeStatus(req: Request, res: Response) {
  const { status, reason } = parse(adminStatusSchema, req.body);
  res.json(await worksService.changeStatusAsAdmin(id(req), status, reason));
}
export async function deleteWork(req: Request, res: Response) {
  await worksService.deleteWork(id(req), currentUser(req));
  res.status(204).end();
}

/* ------------------------- Curadoria (checklist/notas) --------------------- */

const checkParams = z.object({ id: idParam, checkId: idParam });

export async function addCheck(req: Request, res: Response) {
  res.status(201).json(await reviewService.addCheck(id(req), parse(checkCreateSchema, req.body).label));
}
export async function updateCheck(req: Request, res: Response) {
  const p = parse(checkParams, req.params);
  res.json(await reviewService.updateCheck(p.id, p.checkId, parse(checkUpdateSchema, req.body)));
}
export async function deleteCheck(req: Request, res: Response) {
  const p = parse(checkParams, req.params);
  await reviewService.deleteCheck(p.id, p.checkId);
  res.status(204).end();
}
export async function addNote(req: Request, res: Response) {
  const { content } = parse(reviewNoteSchema, req.body);
  res.status(201).json(await reviewService.addNote(id(req), currentUser(req), content));
}
export async function deleteNote(req: Request, res: Response) {
  await reviewService.deleteNote(id(req));
  res.status(204).end();
}

/* --------------------------------- Gêneros --------------------------------- */

export async function listGenres(_req: Request, res: Response) {
  res.json(await genresService.listGenres(true));
}
export async function createGenre(req: Request, res: Response) {
  res.status(201).json(await genresService.createGenre(parse(genreSchema, req.body)));
}
export async function updateGenre(req: Request, res: Response) {
  res.json(await genresService.updateGenre(id(req), parse(genreUpdateSchema, req.body)));
}
export async function deleteGenre(req: Request, res: Response) {
  await genresService.deleteGenre(id(req));
  res.status(204).end();
}

/* -------------------------------- Avaliações ------------------------------- */

export async function listFeedbacks(req: Request, res: Response) {
  res.json(await feedbackService.listFeedbacksAdmin(parse(adminFeedbackListSchema, req.query)));
}
export async function updateFeedback(req: Request, res: Response) {
  res.json(await feedbackService.setFeedbackVisibility(id(req), parse(adminFeedbackUpdateSchema, req.body).isVisible));
}
export async function deleteFeedback(req: Request, res: Response) {
  await feedbackService.deleteFeedback(id(req));
  res.status(204).end();
}
