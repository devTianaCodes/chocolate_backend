START TRANSACTION;

UPDATE products
SET image = '/product-images/velvety-dark-chocolate-main.png'
WHERE id = 1;

UPDATE products
SET image = '/product-images/roasted-milk-chocolate-main.png'
WHERE id = 2;

UPDATE products
SET image = '/product-images/hand-tempered-white-chocolate-main.png'
WHERE id = 3;

DELETE FROM product_images
WHERE product_id IN (1, 2, 3);

INSERT INTO product_images (product_id, url, alt_text, is_primary)
VALUES
  (1, '/product-images/velvety-dark-chocolate-main.png', 'Velvety Dark Chocolate', 1),
  (1, '/product-images/velvety-dark-chocolate-detail.png', 'Velvety Dark Chocolate', 0),
  (2, '/product-images/roasted-milk-chocolate-main.png', 'Roasted Milk Chocolate', 1),
  (2, '/product-images/roasted-milk-chocolate-detail.png', 'Roasted Milk Chocolate', 0),
  (3, '/product-images/hand-tempered-white-chocolate-main.png', 'Hand-Tempered White Chocolate', 1),
  (3, '/product-images/hand-tempered-white-chocolate-detail.png', 'Hand-Tempered White Chocolate', 0);

COMMIT;
