import { Router } from 'express';
import * as controller from '../controllers/cityController.js';
import { optionalAdmin, requireAdmin } from '../middlewares/auth.js';
import { requireSameOrigin } from '../config/security.js';

const router = Router();
router.get('/', (req, res, next) => req.query.incluirInactivas === 'true'
  ? requireAdmin(req, res, next) : controller.list(req, res, next));
router.get('/:id', optionalAdmin, controller.get);
router.post('/', requireSameOrigin, requireAdmin, controller.create);
router.patch('/:id', requireSameOrigin, requireAdmin, controller.update);
router.delete('/:id', requireSameOrigin, requireAdmin, controller.remove);
export default router;
