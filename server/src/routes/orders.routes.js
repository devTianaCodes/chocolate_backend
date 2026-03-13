import { Router } from 'express';
import * as ordersController from '../controllers/orders.controller.js';

const router = Router();

router.post('/', ordersController.createOrder);
router.get('/', ordersController.listOrders);
router.get('/:id', ordersController.getOrder);

export default router;
