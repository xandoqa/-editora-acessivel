import type { Request, Response } from 'express';
import { z } from 'zod';
import { currentUser } from '../middlewares/auth';
import { uploadedFile } from '../middlewares/upload';
import * as adService from '../services/audio-descriptions.service';
import * as feedbackService from '../services/feedbacks.service';
import * as reviewService from '../services/review.service';
import * as sessionService from '../services/sessions.service';
import * as worksService from '../services/works.service';
import { idParam, idParams, parse } from '../validators/common';
import {
  audioDescriptionSchema,
  catalogQuerySchema,
  createWorkSchema,
  feedbackSchema,
  reviewNoteSchema,
  sessionUpdateSchema,
  updateWorkSchema,
} from '../validators/works.schemas';

const MIME: Record<string, string> = {
  PDF: 'application/pdf',
  EPUB: 'application/epub+zip',
  CBZ: 'application/vnd.comicbook+zip',
  CBR: 'application/vnd.comicbook-rar',
};

export function filesFrom(req: Request): worksService.WorkFiles {
  return { file: uploadedFile(req, 'file'), cover: uploadedFile(req, 'cover'), audio: uploadedFile(req, 'audio') };
}

const workId = (req: Request) => parse(idParams, req.params).id;

/* ---------------------------------- Obras ---------------------------------- */

export async function listCatalog(req: Request, res: Response) {
  res.json(await worksService.listCatalog(parse(catalogQuerySchema, req.query)));
}

export async function getWork(req: Request, res: Response) {
  res.json(await worksService.getWork(workId(req), req.user));
}

export async function createWork(req: Request, res: Response) {
  const fields = parse(createWorkSchema, req.body);
  res.status(201).json(await worksService.createWork(currentUser(req), fields, filesFrom(req)));
}

export async function updateWork(req: Request, res: Response) {
  const patch = parse(updateWorkSchema, req.body);
  res.json(await worksService.updateWorkAsAuthor(workId(req), currentUser(req), patch, filesFrom(req)));
}

export async function submitWork(req: Request, res: Response) {
  res.json(await worksService.submitWork(workId(req), currentUser(req)));
}

export async function publishWork(req: Request, res: Response) {
  res.json(await worksService.publishWork(workId(req), currentUser(req)));
}

export async function deleteWork(req: Request, res: Response) {
  await worksService.deleteWork(workId(req), currentUser(req));
  res.status(204).end();
}

/** Envia o arquivo da obra. `?download=1` força o download com nome amigável. */
export async function streamWorkFile(req: Request, res: Response) {
  const info = await worksService.getWorkFileInfo(workId(req), req.user);
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.query.download === '1') {
    res.download(info.absPath, info.downloadName);
    return;
  }
  res.type(MIME[info.fileType]).sendFile(info.absPath);
}

export async function streamWorkAudio(req: Request, res: Response) {
  const info = await worksService.getWorkAudioInfo(workId(req), req.user);
  res.setHeader('Cache-Control', 'private, no-store');
  res.sendFile(info.absPath); // sendFile suporta Range (avançar/retroceder no player)
}

/* ----------------------------- Audiodescrição ------------------------------ */

const adParams = z.object({ id: idParam, adId: idParam });

export async function listAudioDescriptions(req: Request, res: Response) {
  res.json(await adService.listAudioDescriptions(workId(req), req.user));
}

export async function createAudioDescription(req: Request, res: Response) {
  const input = parse(audioDescriptionSchema, req.body);
  res.status(201).json(await adService.createAudioDescription(workId(req), currentUser(req), input));
}

export async function updateAudioDescription(req: Request, res: Response) {
  const { id, adId } = parse(adParams, req.params);
  res.json(await adService.updateAudioDescription(id, adId, currentUser(req), parse(audioDescriptionSchema, req.body)));
}

export async function deleteAudioDescription(req: Request, res: Response) {
  const { id, adId } = parse(adParams, req.params);
  await adService.deleteAudioDescription(id, adId, currentUser(req));
  res.status(204).end();
}

/* ------------------------------- Curadoria -------------------------------- */

export async function getReview(req: Request, res: Response) {
  res.json(await reviewService.getReview(workId(req), currentUser(req)));
}

export async function addReviewNote(req: Request, res: Response) {
  const { content } = parse(reviewNoteSchema, req.body);
  res.status(201).json(await reviewService.addNote(workId(req), currentUser(req), content));
}

/* ------------------------------- Avaliações -------------------------------- */

export async function listFeedbacks(req: Request, res: Response) {
  res.json(await feedbackService.listWorkFeedbacks(workId(req)));
}

export async function myFeedback(req: Request, res: Response) {
  res.json(await feedbackService.getMyFeedback(workId(req), currentUser(req)));
}

export async function upsertFeedback(req: Request, res: Response) {
  const input = parse(feedbackSchema, req.body);
  res.status(201).json(await feedbackService.upsertFeedback(workId(req), currentUser(req), input));
}

/* -------------------------- Sessões de leitura ----------------------------- */

export async function startSession(req: Request, res: Response) {
  res.status(201).json(await sessionService.startSession(workId(req), req.user));
}

export async function updateSession(req: Request, res: Response) {
  const { sessionId } = parse(z.object({ sessionId: z.string().uuid('Sessão inválida') }), req.params);
  await sessionService.updateSession(sessionId, parse(sessionUpdateSchema, req.body));
  res.status(204).end();
}
