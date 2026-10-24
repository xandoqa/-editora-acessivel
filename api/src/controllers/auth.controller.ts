import type { Request, Response } from 'express';
import { currentUser } from '../middlewares/auth';
import * as authService from '../services/auth.service';
import { changePasswordSchema, loginSchema, registerSchema, updateProfileSchema } from '../validators/auth.schemas';
import { parse } from '../validators/common';

export async function register(req: Request, res: Response) {
  const result = await authService.register(parse(registerSchema, req.body));
  res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
  res.json(await authService.login(parse(loginSchema, req.body)));
}

export async function me(req: Request, res: Response) {
  res.json({ user: await authService.getProfile(currentUser(req).id) });
}

export async function updateMe(req: Request, res: Response) {
  res.json({ user: await authService.updateProfile(currentUser(req).id, parse(updateProfileSchema, req.body)) });
}

export async function changePassword(req: Request, res: Response) {
  await authService.changePassword(currentUser(req).id, parse(changePasswordSchema, req.body));
  res.status(204).end();
}

/** Leitor ativa o perfil de escritor para poder publicar as próprias obras. */
export async function enableWriter(req: Request, res: Response) {
  res.json({ user: await authService.enableWriterRole(currentUser(req).id) });
}
