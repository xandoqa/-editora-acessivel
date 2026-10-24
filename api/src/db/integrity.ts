import fs from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { env } from '../config/env';
import { ensureUploadDirs, importLocalFile, type UploadKind } from '../services/storage.service';
import { logger } from '../utils/logger';
import { closeDb, db } from './client';
import { users, works, type NewWork } from './schema';
import { DEMO_USERS, DEMO_WORKS } from './seed-data';

/**
 * Verificação de integridade entre o banco e o volume de uploads.
 *
 * O banco guarda apenas o caminho relativo de cada arquivo (`cover_path`,
 * `file_path`, `audio_path`); os bytes ficam no volume `uploads`. São dois
 * volumes Docker com ciclos de vida independentes, então eles PODEM sair de
 * sincronia — por exemplo quando alguém remove só o volume de uploads, troca de
 * máquina ou reconstrói parte do ambiente.
 *
 * Antes desta verificação, o seed se dava por concluído consultando um usuário
 * no banco e nunca recopiava nada: o banco seguia apontando para capas que não
 * existiam mais e a interface exibia imagens quebradas para sempre.
 *
 * Esta rotina roda a cada inicialização, logo depois do seed, e para cada
 * caminho registrado no banco:
 *   1. confere se o arquivo existe no volume;
 *   2. se faltar e a obra for de demonstração, recopia de `seed-assets`;
 *   3. se faltar e não houver origem, apaga a referência do banco, para que a
 *      interface mostre o estado real em vez de uma imagem quebrada.
 *
 * Atende à regra da seção 5 da especificação: os dados não podem deixar de
 * aparecer quando o projeto é executado novamente.
 */

const ASSETS = path.resolve(__dirname, '../../seed-assets');

interface Slot {
  column: 'coverPath' | 'filePath' | 'audioPath';
  kind: UploadKind;
  /** Pasta correspondente dentro de seed-assets. */
  assetFolder: 'covers' | 'works';
  label: string;
}

const SLOTS: Slot[] = [
  { column: 'coverPath', kind: 'cover', assetFolder: 'covers', label: 'capa' },
  { column: 'filePath', kind: 'work', assetFolder: 'works', label: 'arquivo da obra' },
  { column: 'audioPath', kind: 'audio', assetFolder: 'works', label: 'faixa de audiodescrição' },
];

export interface IntegrityReport {
  /** Caminhos registrados no banco que foram conferidos. */
  checked: number;
  /** Quantos deles não existiam no volume. */
  missing: number;
  /** Quantos foram recopiados de seed-assets. */
  restored: number;
  /** Quantos foram apagados do banco por não haver origem. */
  cleared: number;
}

const demoUserEmail = (key: string): string | undefined => DEMO_USERS.find((u) => u.key === key)?.email;

/**
 * Caminho do arquivo de demonstração correspondente, quando a obra é de
 * demonstração. Casa título **e** e-mail do autor: uma obra enviada por alguém
 * com o mesmo título de uma obra de exemplo não deve receber o arquivo dela.
 */
function demoAssetFor(title: string, authorEmail: string, slot: Slot): string | undefined {
  const demo = DEMO_WORKS.find((w) => w.title === title && demoUserEmail(w.author) === authorEmail);
  if (!demo) return undefined;
  const name = slot.column === 'coverPath' ? demo.cover : slot.column === 'filePath' ? demo.file : undefined;
  if (!name) return undefined;
  const full = path.join(ASSETS, slot.assetFolder, name);
  return fs.existsSync(full) ? full : undefined;
}

/** Existe no volume? Caminhos que tentem sair de UPLOAD_DIR contam como inválidos. */
function storedFileExists(relativePath: string): boolean {
  const resolved = path.resolve(env.uploadDir, relativePath);
  if (!resolved.startsWith(env.uploadDir + path.sep)) return false;
  return fs.existsSync(resolved);
}

/** Atribuição explícita: escrever por chave de união não passa no TypeScript estrito. */
function assignSlot(patch: Partial<NewWork>, column: Slot['column'], value: string | null): void {
  if (column === 'coverPath') patch.coverPath = value;
  else if (column === 'filePath') patch.filePath = value;
  else patch.audioPath = value;
}

export async function verifyStoredFiles(): Promise<IntegrityReport> {
  ensureUploadDirs();
  const report: IntegrityReport = { checked: 0, missing: 0, restored: 0, cleared: 0 };

  const rows = await db
    .select({
      id: works.id,
      title: works.title,
      authorEmail: users.email,
      coverPath: works.coverPath,
      filePath: works.filePath,
      audioPath: works.audioPath,
    })
    .from(works)
    .innerJoin(users, eq(users.id, works.authorId));

  for (const row of rows) {
    const patch: Partial<NewWork> = {};

    for (const slot of SLOTS) {
      const stored = row[slot.column];
      if (!stored) continue;
      report.checked += 1;
      if (storedFileExists(stored)) continue;
      report.missing += 1;

      const asset = demoAssetFor(row.title, row.authorEmail, slot);
      if (asset) {
        const imported = await importLocalFile(asset, slot.kind);
        assignSlot(patch, slot.column, imported.relativePath);
        if (slot.column === 'filePath') {
          patch.fileType = imported.fileType;
          patch.fileSizeBytes = imported.sizeBytes;
          patch.fileOriginalName = imported.originalName;
        }
        report.restored += 1;
        logger.warn(`[integridade] "${row.title}": ${slot.label} não estava no volume (${stored}). Recopiada de seed-assets.`);
      } else {
        assignSlot(patch, slot.column, null);
        if (slot.column === 'filePath') {
          patch.fileType = null;
          patch.fileSizeBytes = null;
          patch.fileOriginalName = null;
        }
        report.cleared += 1;
        logger.warn(
          `[integridade] "${row.title}": ${slot.label} não estava no volume (${stored}) e não há origem para restaurar. ` +
            'A referência foi removida do banco; reenvie o arquivo pela interface.',
        );
      }
    }

    if (Object.keys(patch).length > 0) {
      await db.update(works).set(patch).where(eq(works.id, row.id));
    }
  }

  if (report.missing === 0) {
    logger.info(`[integridade] ${report.checked} arquivo(s) conferido(s): todos presentes no volume de uploads.`);
  } else {
    logger.warn(
      `[integridade] ${report.checked} arquivo(s) conferido(s), ${report.missing} ausente(s): ` +
        `${report.restored} restaurado(s), ${report.cleared} referência(s) removida(s).`,
    );
  }
  return report;
}

if (require.main === module) {
  verifyStoredFiles()
    .then(() => logger.info('Verificação de integridade concluída.'))
    .catch((err) => {
      logger.error('Falha na verificação de integridade', err);
      process.exitCode = 1;
    })
    .finally(() => closeDb());
}
