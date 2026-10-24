import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as controller from '../controllers/authController.js';
import { requireAdmin } from '../middlewares/auth.js';
import { requireSameOrigin } from '../config/security.js';

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: 'Demasiados intentos. Intenta de nuevo más tarde.' }),
});

router.post('/login', requireSameOrigin, loginLimiter, controller.login);
router.post('/logout', requireSameOrigin, controller.logout);
router.get('/me', requireAdmin, controller.me);

export default router;
