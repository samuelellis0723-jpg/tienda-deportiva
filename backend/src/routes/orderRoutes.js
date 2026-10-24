import { Router } from 'express';
import * as controller from '../controllers/orderController.js';
import { requireAdmin } from '../middlewares/auth.js';
import { requireSameOrigin } from '../config/security.js';

const router = Router();
router.post('/', requireSameOrigin, controller.create);
router.post('/:id/pago/confirmar', requireSameOrigin, requireAdmin, controller.confirmPayment);
router.get('/', requireAdmin, controller.list);
router.get('/:id', requireAdmin, controller.get);
router.patch('/:id/estado', requireSameOrigin, requireAdmin, controller.advance);
router.post('/:id/cancelar', requireSameOrigin, requireAdmin, controller.cancel);
export default router;
