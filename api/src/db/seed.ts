import path from 'node:path';
import { eq } from 'drizzle-orm';
import { env } from '../config/env';
import { DEFAULT_REVIEW_CHECKS } from '../services/work-policy';
import { ensureUploadDirs, importLocalFile } from '../services/storage.service';
import { logger } from '../utils/logger';
import { hashPassword, verifyPassword } from '../utils/password';
import { slugify } from '../utils/text';
import { closeDb, db } from './client';
import {
  audioDescriptions,
  feedbacks,
  genres,
  readingSessions,
  reviewChecks,
  reviewNotes,
  users,
  works,
  type CheckStatus,
} from './schema';
import { DEMO_AUDIO_DESCRIPTIONS, DEMO_FEEDBACKS, DEMO_REVIEW_NOTES, DEMO_USERS, DEMO_WORKS, GENRES } from './seed-data';

const ASSETS = path.resolve(__dirname, '../../seed-assets');
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

/**
 * Seed idempotente: pode rodar a cada inicialização do container sem duplicar dados.
 *  1. Gêneros literários padrão (sempre).
 *  2. Administrador inicial, se ADMIN_EMAIL e ADMIN_PASSWORD estiverem definidos e o e-mail ainda não existir.
 *  3. Dados de demonstração, se SEED_DEMO_DATA=true e ainda não houver dados de demonstração.
 */
export async function runSeed(): Promise<void> {
  ensureUploadDirs();
  await seedGenres();
  await seedAdmin();
  if (env.SEED_DEMO_DATA) await seedDemo();
}

async function seedGenres() {
  await db
    .insert(genres)
    .values(GENRES.map((name) => ({ name, slug: slugify(name) })))
    .onConflictDoNothing();
}

async function seedAdmin() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    logger.info('ADMIN_EMAIL/ADMIN_PASSWORD não definidos: nenhum administrador inicial criado (use `npm run admin:create`).');
    return;
  }
  if (env.ADMIN_PASSWORD.length < 8) {
    logger.warn('ADMIN_PASSWORD precisa ter pelo menos 8 caracteres. Administrador inicial NÃO criado.');
    return;
  }
  const email = env.ADMIN_EMAIL.toLowerCase();
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    // Mantém a conta do .env sincronizada: garante papel ADMIN/ativa e aplica a senha atual do .env.
    const samePassword = await verifyPassword(env.ADMIN_PASSWORD, existing.passwordHash);
    await db
      .update(users)
      .set({
        role: 'ADMIN',
        isActive: true,
        ...(samePassword ? {} : { passwordHash: await hashPassword(env.ADMIN_PASSWORD) }),
      })
      .where(eq(users.id, existing.id));
    if (!samePassword || existing.role !== 'ADMIN' || !existing.isActive) logger.info(`Administrador ${email} atualizado a partir do .env.`);
    return;
  }
  await db.insert(users).values({
    name: env.ADMIN_NAME,
    email,
    role: 'ADMIN',
    headline: 'Administração Livrin',
    passwordHash: await hashPassword(env.ADMIN_PASSWORD),
  });
  logger.info(`Administrador inicial criado: ${email}`);
}

/** Gerador pseudoaleatório determinístico (mesmos dados a cada seed). */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

async function seedDemo() {
  const marker = DEMO_USERS[0].email;
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, marker));
  if (exists) {
    logger.info('Dados de demonstração já existem: seed de demonstração ignorado.');
    return;
  }
  if (!env.DEMO_USER_PASSWORD || env.DEMO_USER_PASSWORD.length < 8) {
    logger.warn('SEED_DEMO_DATA=true, mas DEMO_USER_PASSWORD não foi definido (mín. 8 caracteres). Demonstração ignorada.');
    return;
  }

  const passwordHash = await hashPassword(env.DEMO_USER_PASSWORD);
  const genreRows = await db.select().from(genres);
  const genreId = (name: string) => {
    const g = genreRows.find((r) => r.name === name);
    if (!g) throw new Error(`Gênero de demonstração inexistente: ${name}`);
    return g.id;
  };

  await db.transaction(async (tx) => {
    const userIds: Record<string, number> = {};
    for (const u of DEMO_USERS) {
      const [row] = await tx
        .insert(users)
        .values({ name: u.name, email: u.email, role: u.role, headline: u.headline, passwordHash })
        .returning({ id: users.id });
      userIds[u.key] = row.id;
    }

    const workIds: Record<string, number> = {};
    for (const w of DEMO_WORKS) {
      const cover = w.cover ? await importLocalFile(path.join(ASSETS, 'covers', w.cover), 'cover') : undefined;
      const file = w.file ? await importLocalFile(path.join(ASSETS, 'works', w.file), 'work') : undefined;
      const submittedAt =
        w.status === 'RASCUNHO' ? null : daysAgo(w.submittedDaysAgo ?? (w.publishedDaysAgo ?? 0) + 15);
      const [row] = await tx
        .insert(works)
        .values({
          title: w.title,
          subtitle: w.subtitle,
          authorId: userIds[w.author],
          genreId: genreId(w.genre),
          format: w.format,
          pages: w.pages,
          synopsis: w.synopsis,
          status: w.status,
          editionLabel: w.editionLabel,
          isbn: w.isbn,
          ageRating: w.ageRating ?? 'L',
          authorNotes: w.authorNotes,
          tags: w.tags ?? [],
          ...w.flags,
          audioDescriber: w.audioDescriber,
          audioNarrator: w.audioNarrator,
          audioReviewer: w.audioReviewer,
          coverPath: cover?.relativePath,
          filePath: file?.relativePath,
          fileType: file?.fileType,
          fileSizeBytes: file?.sizeBytes,
          fileOriginalName: file?.originalName,
          submittedAt,
          reviewedAt: ['APROVADO', 'PUBLICADO'].includes(w.status) ? daysAgo((w.publishedDaysAgo ?? 1) + 2) : null,
          publishedAt: w.publishedDaysAgo !== undefined ? daysAgo(w.publishedDaysAgo) : null,
        })
        .returning({ id: works.id });
      workIds[w.key] = row.id;

      if (w.status !== 'RASCUNHO') {
        // Obras em análise: 2 itens concluídos e 2 em andamento (como no protótipo); demais: todos aprovados.
        const statusFor = (i: number): CheckStatus =>
          w.status === 'EM_ANALISE' ? (i % 2 === 0 ? 'APROVADO' : 'EM_ANDAMENTO') : 'APROVADO';
        await tx
          .insert(reviewChecks)
          .values(DEFAULT_REVIEW_CHECKS.map((label, i) => ({ workId: row.id, label, position: i, status: statusFor(i) })));
      }
    }

    for (const [key, items] of Object.entries(DEMO_AUDIO_DESCRIPTIONS)) {
      await tx.insert(audioDescriptions).values(items.map((ad) => ({ ...ad, workId: workIds[key] })));
    }
    await tx.insert(feedbacks).values(
      DEMO_FEEDBACKS.map((f, i) => ({
        workId: workIds[f.work],
        userId: userIds[f.user],
        rating: f.rating,
        content: f.content,
        aspect: f.aspect,
        createdAt: daysAgo(i + 1),
      })),
    );
    await tx.insert(reviewNotes).values(
      DEMO_REVIEW_NOTES.map((n) => ({
        workId: workIds[n.work],
        userId: userIds[n.user],
        content: n.content,
        createdAt: new Date(Date.now() - n.hoursAgo * 60 * 60 * 1000),
      })),
    );

    // Sessões de leitura de demonstração para popular as métricas dos painéis.
    const random = rng(2024);
    const volume: Record<string, number> = { mapa: 140, alem: 110, raizes: 60, terra: 35, chamas: 45, vozes: 25 };
    const sessions = Object.entries(volume).flatMap(([key, n]) =>
      Array.from({ length: n }, () => {
        const started = daysAgo(random() * 60);
        return {
          workId: workIds[key],
          startedAt: started,
          lastActivityAt: started,
          lastPage: 1 + Math.floor(random() * 4),
          usedAudioDesc: random() < 0.58,
          usedHighContrast: random() < 0.29,
          usedDyslexicFont: random() < 0.1,
          usedZoom: random() < 0.06,
        };
      }),
    );
    await tx.insert(readingSessions).values(sessions);
  });
  logger.info(`Dados de demonstração criados (${DEMO_USERS.length} usuários, ${DEMO_WORKS.length} obras).`);
}

if (require.main === module) {
  runSeed()
    .then(() => logger.info('Seed concluído.'))
    .catch((err) => {
      logger.error('Falha no seed', err);
      process.exitCode = 1;
    })
    .finally(() => closeDb());
}
