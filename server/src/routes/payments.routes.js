import { Router } from 'express';
import * as paymentsController from '../controllers/payments.controller.js';

const router = Router();

router.post('/stripe/intent', paymentsController.createStripeIntent);
router.post('/stripe/webhook', paymentsController.handleStripeWebhook);

export default router;
