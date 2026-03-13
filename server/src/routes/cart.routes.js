import { Router } from 'express';
import * as cartController from '../controllers/cart.controller.js';

const router = Router();

router.get('/', cartController.getCart);
router.post('/items', cartController.addItem);
router.patch('/items/:id', cartController.updateItem);
router.delete('/items/:id', cartController.removeItem);
router.post('/merge', cartController.mergeCart);

export default router;
