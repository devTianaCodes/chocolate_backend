import { Router } from 'express';
import * as cartController from '../controllers/cart.controller.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, cartController.getCart);
router.post('/items', optionalAuth, cartController.addItem);
router.patch('/items/:id', optionalAuth, cartController.updateItem);
router.delete('/items/:id', optionalAuth, cartController.removeItem);
router.post('/merge', optionalAuth, cartController.mergeCart);

export default router;
