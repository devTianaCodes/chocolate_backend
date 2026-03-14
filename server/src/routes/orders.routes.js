import { Router } from 'express';
import * as ordersController from '../controllers/orders.controller.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.post('/', auth, ordersController.createOrder);
router.get('/', auth, ordersController.listOrders);
router.get('/:id', auth, ordersController.getOrder);

export default router;
