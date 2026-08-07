import { describe, expect, it } from 'vitest';
import { catalogImagePath } from '../../utils/catalogImages.js';

describe('catalogImagePath', () => {
  it('uses the optimized JPG for a local PNG reference', () => {
    expect(catalogImagePath({
      source: '/product-images/velvety-dark-chocolate-main.png',
    })).toBe('/product-images/velvety-dark-chocolate-main.jpg');
  });

  it('replaces obsolete demo URLs using the category asset', () => {
    expect(catalogImagePath({
      source: 'https://res.cloudinary.com/demo/image/upload/w_400/chocolate_098.jpg',
      categorySlug: 'sugar-free',
      productName: 'Midnight Sugar-Free - Mexico 69%',
    })).toBe('/product-images/midnight-sugar-free-main.jpg');
  });

  it('preserves a valid external image URL', () => {
    const source = 'https://images.example.com/catalog/dark-bar.webp';
    expect(catalogImagePath({ source })).toBe(source);
  });
});
