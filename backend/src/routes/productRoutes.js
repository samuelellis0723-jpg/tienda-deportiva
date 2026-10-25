import { Router } from 'express';
import * as controller from '../controllers/productController.js';
import { requireAdmin } from '../middlewares/auth.js';
import { requireSameOrigin } from '../config/security.js';

const router = Router();
router.get('/tipos', controller.types);
router.get('/', (req, res, next) => {
  if (req.query.estado !== undefined || req.query.stockBajo !== undefined) return requireAdmin(req, res, next);
  return next();
}, controller.list);
router.post('/', requireSameOrigin, requireAdmin, controller.create);
router.get('/:id', (req, res, next) => {
  if (req.query.vista === 'admin') return requireAdmin(req, res, next);
  return next();
}, controller.get);
router.patch('/:id', requireSameOrigin, requireAdmin, controller.update);
router.delete('/:id', requireSameOrigin, requireAdmin, controller.remove);
router.post('/:id/publicar', requireSameOrigin, requireAdmin, controller.publish);
router.post('/:id/despublicar', requireSameOrigin, requireAdmin, controller.unpublish);

export default router;
