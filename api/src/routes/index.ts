import { Router } from 'express';
import * as authCtrl from '../controllers/auth.controller';
import * as donationsCtrl from '../controllers/donations.controller';
import * as meCtrl from '../controllers/me.controller';
import * as purchasesCtrl from '../controllers/purchases.controller';
import * as worksCtrl from '../controllers/works.controller';
import { authenticate, optionalAuth, requireWriter } from '../middlewares/auth';
import { authLimiter, sessionLimiter } from '../middlewares/rate-limit';
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
router.post('/auth/me/password', authenticate, authCtrl.changePassword);
router.post('/auth/me/writer', authenticate, authCtrl.enableWriter); // leitor → escritor // autenticado

/* ------------------------------ Gêneros ------------------------------- */
router.get('/genres', meCtrl.listGenres); // público

/* ------------------------- Área do autor (me) ------------------------- */
router.get('/me/works', authenticate, meCtrl.myWorks);
router.get('/me/summary', authenticate, meCtrl.mySummary);
router.get('/me/dashboard', authenticate, meCtrl.myDashboard);

/* ------------------------------- Obras -------------------------------- */
router.get('/works', worksCtrl.listCatalog); // público (somente obras aprovadas)
router.post('/works', authenticate, requireWriter, workUpload, worksCtrl.createWork); // leitor recebe 403
router.get('/works/:id', optionalAuth, worksCtrl.getWork);
router.patch('/works/:id', authenticate, workUpload, worksCtrl.updateWork);
router.delete('/works/:id', authenticate, worksCtrl.deleteWork);
router.post('/works/:id/submit', authenticate, worksCtrl.submitWork);
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
router.post('/works/:id/sessions', sessionLimiter, optionalAuth, worksCtrl.startSession);
// Exige o cabeçalho X-Session-Token devolvido na criação da sessão.
router.patch('/sessions/:sessionId', worksCtrl.updateSession);

/* ------------------------------ Doações ------------------------------- */
router.get('/donations/options', donationsCtrl.options); // público
router.post('/donations', authLimiter, optionalAuth, donationsCtrl.create); // público (apoio anônimo permitido)
router.post('/donations/:id/confirm', optionalAuth, donationsCtrl.confirm);
router.get('/me/donations', authenticate, donationsCtrl.mine);

/* ---------------------------- Aquisições ------------------------------ */
// Todas exigem conta: aquisição pertence a uma pessoa, não a um navegador.
// O limitador do fluxo de autenticação é reaproveitado na abertura da
// cobrança — é o caminho que cria registro financeiro e merece freio.
router.post('/works/:id/purchase', authLimiter, authenticate, purchasesCtrl.create);
router.get('/purchases/:id', authenticate, purchasesCtrl.show);
router.post('/purchases/:id/confirm', authenticate, purchasesCtrl.confirm);
router.post('/purchases/:id/cancel', authenticate, purchasesCtrl.cancel);
router.get('/me/library', authenticate, purchasesCtrl.library);
router.get('/me/purchases', authenticate, purchasesCtrl.history);

/* --------------------------- Administração ---------------------------- */
router.use('/admin', adminRoutes);

export default router;
