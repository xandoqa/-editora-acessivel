import { randomUUID } from 'node:crypto';
import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { TMP_DIR, extensionOf, isAllowedExtension, ruleLabel, type UploadKind } from '../services/storage.service';
import { HttpError, badRequest } from '../utils/http-error';

/**
 * Upload multipart/form-data das obras. Campos aceitos:
 *   - file  → arquivo original da obra (PDF, EPUB, CBZ, CBR)
 *   - cover → capa (JPG, PNG, WEBP)
 *   - audio → faixa de audiodescrição (MP3, OGG, M4A)
 * Os arquivos vão para UPLOAD_DIR/tmp e só são movidos para o destino final após
 * validação completa (ver storage.service.commitUpload).
 */
const FIELD_KIND: Record<string, UploadKind> = { file: 'work', cover: 'cover', audio: 'audio' };

const multerInstance = multer({
  storage: multer.diskStorage({
    destination: TMP_DIR,
    filename: (_req, file, cb) => cb(null, `${randomUUID()}.${extensionOf(file.originalname) || 'bin'}`),
  }),
  limits: { fileSize: env.maxUploadBytes, files: 3, fields: 60, fieldSize: 64 * 1024 },
  fileFilter: (_req, file, cb) => {
    const kind = FIELD_KIND[file.fieldname];
    if (!kind) return cb(badRequest(`Campo de arquivo inesperado: ${file.fieldname}.`));
    if (!isAllowedExtension(kind, file.originalname)) {
      return cb(badRequest(`Formato inválido para "${file.fieldname}". Envie ${ruleLabel(kind)}.`));
    }
    cb(null, true);
  },
});

const fieldsHandler = multerInstance.fields([
  { name: 'file', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
]);

/** Middleware que converte os erros do multer em erros HTTP amigáveis. */
export function workUpload(req: Request, res: Response, next: NextFunction): void {
  fieldsHandler(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof HttpError) return next(err);
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(badRequest(`Arquivo muito grande. Limite máximo: ${env.MAX_UPLOAD_MB} MB.`));
      }
      return next(badRequest(`Falha no upload: ${err.message}`));
    }
    next(err);
  });
}

export type UploadedFiles = Partial<Record<'file' | 'cover' | 'audio', Express.Multer.File[]>>;

export function uploadedFile(req: Request, field: 'file' | 'cover' | 'audio'): Express.Multer.File | undefined {
  return (req.files as UploadedFiles | undefined)?.[field]?.[0];
}
