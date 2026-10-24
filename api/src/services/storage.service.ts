import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env';
import type { FileType } from '../db/schema';
import { badRequest } from '../utils/http-error';
import { logger } from '../utils/logger';

/**
 * Armazenamento de arquivos em disco local (volume Docker `uploads`).
 *
 *   UPLOAD_DIR/
 *   ├── tmp/     uploads recebidos pelo multer, ainda não validados
 *   ├── covers/  capas (públicas, servidas em /uploads/covers/<uuid>.<ext>)
 *   ├── works/   arquivos originais das obras (privados, servidos com checagem de permissão)
 *   └── audio/   faixas de audiodescrição (privadas, idem)
 *
 * Os nomes no disco são UUIDs: o nome original enviado pelo usuário nunca é
 * usado como caminho (evita path traversal e colisões).
 */
export type UploadKind = 'work' | 'cover' | 'audio';

const DIRS: Record<UploadKind, string> = { work: 'works', cover: 'covers', audio: 'audio' };

interface KindRule {
  extensions: string[];
  maxBytes: number;
  /** Verifica a assinatura binária (magic number) do arquivo. */
  sniff: (head: Buffer, ext: string) => boolean;
  label: string;
}

const startsWith = (head: Buffer, bytes: number[], offset = 0) => bytes.every((b, i) => head[offset + i] === b);
const ascii = (head: Buffer, text: string, offset = 0) => head.subarray(offset, offset + text.length).toString('latin1') === text;

const RULES: Record<UploadKind, KindRule> = {
  work: {
    extensions: ['pdf', 'epub', 'cbz', 'cbr', 'docx'],
    maxBytes: env.maxUploadBytes,
    label: 'PDF, DOCX, EPUB, CBZ ou CBR',
    sniff: (head, ext) => {
      if (ext === 'pdf') return ascii(head, '%PDF-');
      // DOCX, EPUB e CBZ são arquivos ZIP: a assinatura é a mesma (PK\x03\x04).
      if (ext === 'epub' || ext === 'cbz' || ext === 'docx') return startsWith(head, [0x50, 0x4b, 0x03, 0x04]);
      if (ext === 'cbr') return ascii(head, 'Rar!');
      return false;
    },
  },
  cover: {
    extensions: ['jpg', 'jpeg', 'png', 'webp'],
    maxBytes: 5 * 1024 * 1024,
    label: 'JPG, PNG ou WEBP (até 5 MB)',
    sniff: (head) =>
      startsWith(head, [0xff, 0xd8, 0xff]) ||
      startsWith(head, [0x89, 0x50, 0x4e, 0x47]) ||
      (ascii(head, 'RIFF') && ascii(head, 'WEBP', 8)),
  },
  audio: {
    extensions: ['mp3', 'ogg', 'm4a'],
    maxBytes: env.maxUploadBytes,
    label: 'MP3, OGG ou M4A',
    sniff: (head, ext) => {
      if (ext === 'mp3') return ascii(head, 'ID3') || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0);
      if (ext === 'ogg') return ascii(head, 'OggS');
      if (ext === 'm4a') return ascii(head, 'ftyp', 4);
      return false;
    },
  },
};

export const TMP_DIR = path.join(env.uploadDir, 'tmp');

/** Garante que a estrutura de diretórios exista (chamado na inicialização). */
export function ensureUploadDirs(): void {
  for (const dir of ['tmp', ...Object.values(DIRS)]) {
    fs.mkdirSync(path.join(env.uploadDir, dir), { recursive: true });
  }
}

export function extensionOf(filename: string): string {
  return path.extname(filename).slice(1).toLowerCase();
}

export function isAllowedExtension(kind: UploadKind, filename: string): boolean {
  return RULES[kind].extensions.includes(extensionOf(filename));
}

export function ruleLabel(kind: UploadKind): string {
  return RULES[kind].label;
}

export interface StoredFile {
  relativePath: string;
  sizeBytes: number;
  originalName: string;
  fileType?: FileType;
}

/** O PDF termina com a marca "%%EOF"? Olha só o último KB, não o arquivo todo. */
async function terminaComEOF(caminho: string, tamanho: number): Promise<boolean> {
  const janela = Math.min(1024, tamanho);
  const cauda = Buffer.alloc(janela);
  const handle = await fsp.open(caminho, 'r');
  try {
    await handle.read(cauda, 0, janela, tamanho - janela);
  } finally {
    await handle.close();
  }
  return cauda.toString('latin1').includes('%%EOF');
}

/**
 * Valida (extensão, tamanho e assinatura binária) e move um arquivo temporário
 * do multer para o diretório definitivo. Lança 400 se o conteúdo for inválido.
 */
export async function commitUpload(file: Express.Multer.File, kind: UploadKind): Promise<StoredFile> {
  const rule = RULES[kind];
  const ext = extensionOf(file.originalname);
  try {
    if (!rule.extensions.includes(ext)) throw badRequest(`Formato de arquivo inválido. Envie ${rule.label}.`);
    if (file.size > rule.maxBytes) {
      throw badRequest(`Arquivo muito grande. Limite: ${Math.round(rule.maxBytes / 1024 / 1024)} MB.`);
    }
    if (file.size === 0) throw badRequest('O arquivo enviado está vazio.');

    const handle = await fsp.open(file.path, 'r');
    const head = Buffer.alloc(16);
    try {
      await handle.read(head, 0, 16, 0);
    } finally {
      await handle.close();
    }
    if (!rule.sniff(head, ext)) {
      throw badRequest(`O conteúdo do arquivo não corresponde a um ${ext.toUpperCase()} válido.`);
    }

    /*
     * Assinatura no começo prova o tipo, não prova que o arquivo chegou
     * inteiro. Um PDF cortado no meio do envio continua começando com "%PDF-"
     * e passa na conferência acima — e só vai falhar lá na frente, no leitor,
     * com um erro que não aponta para o envio. Um PDF íntegro termina com
     * "%%EOF" (pode haver alguns bytes de sobra depois), então olhar o fim é
     * barato e pega o caso antes de a obra entrar no catálogo.
     */
    if (ext === 'pdf' && !(await terminaComEOF(file.path, file.size))) {
      throw badRequest(
        'O PDF parece ter chegado incompleto: falta a marca de fim de arquivo. ' +
          'Isso costuma ser conexão interrompida durante o envio. Tente enviar novamente.',
      );
    }

    const relativePath = path.posix.join(DIRS[kind], `${randomUUID()}.${ext}`);
    await fsp.rename(file.path, path.join(env.uploadDir, relativePath));
    return {
      relativePath,
      sizeBytes: file.size,
      originalName: file.originalname.slice(0, 255),
      fileType: kind === 'work' ? (ext.toUpperCase() as FileType) : undefined,
    };
  } catch (err) {
    await removeFile(file.path, true);
    throw err;
  }
}

/** Resolve um caminho relativo armazenado no banco para o caminho absoluto, impedindo sair de UPLOAD_DIR. */
export function absolutePath(relativePath: string): string {
  const resolved = path.resolve(env.uploadDir, relativePath);
  if (!resolved.startsWith(env.uploadDir + path.sep)) throw badRequest('Caminho de arquivo inválido.');
  return resolved;
}

/**
 * O banco e o volume de uploads têm ciclos de vida independentes e podem sair
 * de sincronia — trocar de `docker-compose.yml` para o de desenvolvimento, por
 * exemplo, troca o volume e mantém o banco. Quando isso acontece, o registro
 * continua apontando para um arquivo que não está mais lá.
 *
 * Sem esta conferência, quem pede o arquivo recebe o erro do `sendFile`, que
 * não diz nada de útil e chega ao leitor como "não foi possível abrir". Com
 * ela, a resposta nomeia o problema e diz o que fazer.
 */
export function storedFileExists(relativePath: string): boolean {
  try {
    return fs.existsSync(absolutePath(relativePath));
  } catch {
    return false; // caminho inválido (tentativa de sair do UPLOAD_DIR)
  }
}

export async function removeFile(fileOrRelative: string | null | undefined, isAbsolute = false): Promise<void> {
  if (!fileOrRelative) return;
  try {
    await fsp.unlink(isAbsolute ? fileOrRelative : absolutePath(fileOrRelative));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') logger.warn(`Não foi possível remover ${fileOrRelative}`, err);
  }
}

/** Remove arquivos temporários de uma requisição que falhou (chamado pelo middleware de erros). */
export async function cleanupRequestFiles(files: unknown): Promise<void> {
  if (!files || typeof files !== 'object') return;
  const list: Express.Multer.File[] = Array.isArray(files)
    ? files
    : Object.values(files as Record<string, Express.Multer.File[]>).flat();
  await Promise.all(list.map((f) => (f.path?.startsWith(TMP_DIR) ? removeFile(f.path, true) : undefined)));
}

/** URL pública da capa (ou null). */
export function coverUrl(coverPath: string | null | undefined): string | null {
  return coverPath ? `/uploads/${coverPath}` : null;
}

/** Copia um arquivo local (seed) para o storage, retornando o caminho relativo. */
export async function importLocalFile(sourcePath: string, kind: UploadKind): Promise<StoredFile> {
  const ext = extensionOf(sourcePath);
  const relativePath = path.posix.join(DIRS[kind], `${randomUUID()}.${ext}`);
  await fsp.copyFile(sourcePath, path.join(env.uploadDir, relativePath));
  const stat = await fsp.stat(sourcePath);
  return {
    relativePath,
    sizeBytes: stat.size,
    originalName: path.basename(sourcePath),
    fileType: kind === 'work' ? (ext.toUpperCase() as FileType) : undefined,
  };
}
