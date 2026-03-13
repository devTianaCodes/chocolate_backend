import { Router } from 'express';
import * as productsController from '../controllers/products.controller.js';

const router = Router();

router.get('/', productsController.list);
router.get('/:slug', productsController.getBySlug);

export default router;
