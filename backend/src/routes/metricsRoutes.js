import { Router } from 'express';
import * as controller from '../controllers/metricsController.js';
import { requireAdmin } from '../middlewares/auth.js';

const router = Router();
router.get('/resumen', requireAdmin, controller.summary);
router.get('/alertas-reposicion', requireAdmin, controller.replenishmentAlerts);
export default router;
