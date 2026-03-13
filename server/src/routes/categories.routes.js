import { Router } from 'express';
import * as categoriesController from '../controllers/categories.controller.js';

const router = Router();

router.get('/', categoriesController.list);
router.get('/:slug/products', categoriesController.productsByCategory);

export default router;
