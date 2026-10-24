import { Router } from 'express';
import * as controller from '../controllers/shippingController.js';

const router = Router();
router.post('/cotizar', controller.quote);
export default router;
