import { Router } from 'express';
import * as paymentsController from '../controllers/payments.controller.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.post('/stripe/intent', auth, paymentsController.createStripeIntent);
router.post('/stripe/webhook', paymentsController.handleStripeWebhook);

export default router;
