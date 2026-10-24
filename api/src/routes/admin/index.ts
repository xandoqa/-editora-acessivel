import { Router } from 'express';
import * as admin from '../../controllers/admin/admin.controller';
import * as donations from '../../controllers/donations.controller';
import { authenticate, requireAdmin } from '../../middlewares/auth';
import { workUpload } from '../../middlewares/upload';

/**
 * Rotas administrativas (/api/admin/*). TODAS passam por `authenticate` +
 * `requireAdmin`: a autorização é verificada no servidor, independentemente do
 * que a interface exibe. Um token de USER recebe 403 em qualquer rota abaixo.
 */
const router = Router();
router.use(authenticate, requireAdmin);

router.get('/stats', admin.stats);

router.get('/users', admin.listUsers);
router.post('/users', admin.createUser);
router.get('/users/:id', admin.getUser);
router.patch('/users/:id', admin.updateUser);
router.post('/users/:id/reset-password', admin.resetPassword);
router.delete('/users/:id', admin.deleteUser);

router.get('/works', admin.listWorks);
router.post('/works', workUpload, admin.createWork);
router.get('/works/:id', admin.getWork);
router.patch('/works/:id', workUpload, admin.updateWork);
router.patch('/works/:id/status', admin.changeStatus);
router.delete('/works/:id', admin.deleteWork);
router.post('/works/:id/checks', admin.addCheck);
router.patch('/works/:id/checks/:checkId', admin.updateCheck);
router.delete('/works/:id/checks/:checkId', admin.deleteCheck);
router.post('/works/:id/notes', admin.addNote);
router.delete('/notes/:id', admin.deleteNote);

router.get('/genres', admin.listGenres);
router.post('/genres', admin.createGenre);
router.patch('/genres/:id', admin.updateGenre);
router.delete('/genres/:id', admin.deleteGenre);

router.get('/donations', donations.listAdmin);
router.get('/donations/stats', donations.statsAdmin);

router.get('/feedbacks', admin.listFeedbacks);
router.patch('/feedbacks/:id', admin.updateFeedback);
router.delete('/feedbacks/:id', admin.deleteFeedback);

export default router;
