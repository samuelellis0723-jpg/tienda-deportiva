import { Router } from 'express';
import * as controller from '../controllers/couponController.js';
import { requireAdmin } from '../middlewares/auth.js';
import { requireSameOrigin } from '../config/security.js';

const router = Router();
router.post('/validar', controller.validate);
router.use(requireAdmin);
router.get('/', controller.list);
router.post('/', requireSameOrigin, controller.create);
router.get('/:id', controller.get);
router.patch('/:id', requireSameOrigin, controller.update);
router.delete('/:id', requireSameOrigin, controller.remove);
export default router;
