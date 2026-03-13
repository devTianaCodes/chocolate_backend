import * as categoriesService from '../services/categories.service.js';

export async function list(req, res, next) {
  try {
    const data = await categoriesService.listCategories();
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
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
