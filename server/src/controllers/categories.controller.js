import * as categoriesService from '../services/categories.service.js';
import { setCatalogCacheHeaders } from '../utils/catalogHttpCache.js';

export async function list(req, res, next) {
  try {
    const data = await categoriesService.listCategories();
    setCatalogCacheHeaders(res);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function productsByCategory(req, res, next) {
  try {
    const result = await categoriesService.getProductsByCategorySlug(req.params.slug);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    setCatalogCacheHeaders(res);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
