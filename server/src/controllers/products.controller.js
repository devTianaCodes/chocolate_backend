import * as productsService from '../services/products.service.js';

export async function list(req, res, next) {
  try {
    const data = await productsService.listProducts(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getBySlug(req, res, next) {
  try {
    const product = await productsService.getProductBySlug(req.params.slug);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}
