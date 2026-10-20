import { Router } from 'express';
import * as authCtrl from '../controllers/auth.controller';
import * as meCtrl from '../controllers/me.controller';
import * as worksCtrl from '../controllers/works.controller';
import { authenticate, optionalAuth } from '../middlewares/auth';
import { authLimiter } from '../middlewares/rate-limit';
import { workUpload } from '../middlewares/upload';
import adminRoutes from './admin';

/**
 * Mapa de rotas da API (todas sob /api). Legenda de acesso:
 *   público      → qualquer visitante
 *   opcional     → público, mas reconhece o usuário logado (ex.: autor vê o próprio rascunho)
 *   autenticado  → exige token JWT válido
 *   admin        → exige papel ADMIN (ver routes/admin/index.ts)
 */
const router = Router();

/* ---------------------------- Autenticação ---------------------------- */
router.post('/auth/register', authLimiter, authCtrl.register); // público
router.post('/auth/login', authLimiter, authCtrl.login); // público
router.get('/auth/me', authenticate, authCtrl.me); // autenticado
router.patch('/auth/me', authenticate, authCtrl.updateMe); // autenticado
router.post('/auth/me/password', authenticate, authCtrl.changePassword); // autenticado

/* ------------------------------ Gêneros ------------------------------- */
router.get('/genres', meCtrl.listGenres); // público

/* ------------------------- Área do autor (me) ------------------------- */
router.get('/me/works', authenticate, meCtrl.myWorks);
router.get('/me/summary', authenticate, meCtrl.mySummary);
router.get('/me/dashboard', authenticate, meCtrl.myDashboard);

/* ------------------------------- Obras -------------------------------- */
router.get('/works', worksCtrl.listCatalog); // público (somente publicadas)
router.post('/works', authenticate, workUpload, worksCtrl.createWork);
router.get('/works/:id', optionalAuth, worksCtrl.getWork);
router.patch('/works/:id', authenticate, workUpload, worksCtrl.updateWork);
router.delete('/works/:id', authenticate, worksCtrl.deleteWork);
router.post('/works/:id/submit', authenticate, worksCtrl.submitWork);
router.post('/works/:id/publish', authenticate, worksCtrl.publishWork);
router.get('/works/:id/file', optionalAuth, worksCtrl.streamWorkFile);
router.get('/works/:id/audio', optionalAuth, worksCtrl.streamWorkAudio);

/* --------------------------- Audiodescrição --------------------------- */
router.get('/works/:id/audio-descriptions', optionalAuth, worksCtrl.listAudioDescriptions);
router.post('/works/:id/audio-descriptions', authenticate, worksCtrl.createAudioDescription);
router.put('/works/:id/audio-descriptions/:adId', authenticate, worksCtrl.updateAudioDescription);
router.delete('/works/:id/audio-descriptions/:adId', authenticate, worksCtrl.deleteAudioDescription);

/* ------------------------- Curadoria (autor) -------------------------- */
router.get('/works/:id/review', authenticate, worksCtrl.getReview);
router.post('/works/:id/review/notes', authenticate, worksCtrl.addReviewNote);

/* ----------------------------- Avaliações ----------------------------- */
router.get('/works/:id/feedbacks', worksCtrl.listFeedbacks); // público
router.get('/works/:id/feedbacks/mine', authenticate, worksCtrl.myFeedback);
router.post('/works/:id/feedbacks', authenticate, worksCtrl.upsertFeedback);

/* ------------------------- Sessões de leitura ------------------------- */
router.post('/works/:id/sessions', optionalAuth, worksCtrl.startSession);
router.patch('/sessions/:sessionId', worksCtrl.updateSession);

/* --------------------------- Administração ---------------------------- */
router.use('/admin', adminRoutes);

export default router;
