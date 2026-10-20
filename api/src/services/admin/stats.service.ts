import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { feedbacks, genres, readingSessions, users, works } from '../../db/schema';
import { countByStatus } from '../works.service';
import { baseWorkQuery, toWorkDto } from '../work-queries';

const count = sql<number>`count(*)`.mapWith(Number);

/** Visão geral do sistema para o dashboard administrativo (somente dados reais do banco). */
export async function getAdminStats() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [
    [userStats],
    worksByStatus,
    [feedbackStats],
    [sessionStats],
    [genreStats],
    pendingQueue,
    recentUsers,
    worksByFormat,
  ] = await Promise.all([
    db
      .select({
        total: count,
        active: sql<number>`count(*) filter (where ${users.isActive})`.mapWith(Number),
        admins: sql<number>`count(*) filter (where ${users.role} = 'ADMIN')`.mapWith(Number),
        newLast30: sql<number>`count(*) filter (where ${users.createdAt} >= ${since.toISOString()})`.mapWith(Number),
      })
      .from(users),
    countByStatus(),
    db
      .select({
        total: count,
        hidden: sql<number>`count(*) filter (where not ${feedbacks.isVisible})`.mapWith(Number),
        average: sql<number>`coalesce(round(avg(${feedbacks.rating})::numeric, 1), 0)`.mapWith(Number),
      })
      .from(feedbacks),
    db
      .select({
        total: count,
        last30: sql<number>`count(*) filter (where ${readingSessions.startedAt} >= ${since.toISOString()})`.mapWith(Number),
        audioDesc: sql<number>`count(*) filter (where ${readingSessions.usedAudioDesc})`.mapWith(Number),
      })
      .from(readingSessions),
    db
      .select({ total: count, active: sql<number>`count(*) filter (where ${genres.isActive})`.mapWith(Number) })
      .from(genres),
    baseWorkQuery().where(eq(works.status, 'EM_ANALISE')).orderBy(works.submittedAt).limit(5),
    db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(5),
    db.select({ format: works.format, total: count }).from(works).groupBy(works.format),
  ]);

  return {
    users: userStats,
    works: {
      total: Object.values(worksByStatus).reduce((a, b) => a + b, 0),
      byStatus: worksByStatus,
      byFormat: Object.fromEntries(worksByFormat.map((r) => [r.format, r.total])),
    },
    feedbacks: feedbackStats,
    sessions: sessionStats,
    genres: genreStats,
    pendingQueue: pendingQueue.map(toWorkDto),
    recentUsers,
  };
}
