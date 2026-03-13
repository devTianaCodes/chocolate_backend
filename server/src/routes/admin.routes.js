import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { auth } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminOnly.js';

const router = Router();

router.use(auth, adminOnly);

router.get('/products', adminController.listProducts);
router.post('/products', adminController.createProduct);
router.patch('/products/:id', adminController.updateProduct);
router.patch('/inventory/:productId', adminController.updateInventory);
router.get('/orders', adminController.listOrders);
router.patch('/orders/:id/status', adminController.updateOrderStatus);

export default router;
