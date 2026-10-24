import { Router } from 'express';
import { query } from '../config/database.js';
import categoryRoutes from './categoryRoutes.js';
import productRoutes from './productRoutes.js';
import authRoutes from './authRoutes.js';
import cityRoutes from './cityRoutes.js';
import couponRoutes from './couponRoutes.js';
import shippingRoutes from './shippingRoutes.js';
import orderRoutes from './orderRoutes.js';
import metricsRoutes from './metricsRoutes.js';
import { ApiError } from '../utils/errors.js';

const router = Router();

router.get('/health', async (_req, res, next) => {
  try {
    await query('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'ok' });
  } catch {
    next(new ApiError(503, 'La base de datos no está disponible.'));
  }
});

router.use('/auth', authRoutes);
router.use('/ciudades', cityRoutes);
router.use('/envios', shippingRoutes);
router.use('/cupones', couponRoutes);
router.use('/ordenes', orderRoutes);
router.use('/', metricsRoutes);
router.use('/categorias', categoryRoutes);
router.use('/productos', productRoutes);

export default router;
