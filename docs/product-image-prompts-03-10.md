# Product Image Prompts 03-10

Style rules for every product:
- light cream-peach background `#F5E6D3`
- eco-friendly kraft paper packaging
- hyperrealistic commercial product photography
- warm natural side lighting
- wide shot = packaged bar hero image
- detail shot = close ingredient texture image
- output names: `{title-slug}-main.png` and `{title-slug}-detail.png`

## Product 3: Hand-Tempered White Chocolate
- Files:
  - `hand-tempered-white-chocolate-main.png`
  - `hand-tempered-white-chocolate-detail.png`
- Wide:
  - Luxurious white chocolate bar with raspberry pieces displayed in eco-friendly kraft paper packaging against a light cream-peach background. The bar sits at a 45-degree angle with dried raspberries, rose petals, and pink blossoms scattered around. Hyperrealistic commercial product photography, warm natural side lighting, professional depth of field, premium ecommerce style.
- Detail:
  - Macro close-up of glossy white chocolate with raspberry pieces and freeze-dried berry crumbs on crumpled kraft paper. Rose petals and a soft cream-peach background with gentle bokeh. Hyperrealistic detail photography, warm diffused light, premium texture-focused composition.

## Product 4: Single-Harvest Ruby Chocolate
- Files:
  - `single-harvest-ruby-chocolate-main.png`
  - `single-harvest-ruby-chocolate-detail.png`
- Wide:
  - An elegant ruby chocolate bar packaging displayed on creamy kraft paper against a light cream-peach background (#F5E6D3). The bar is positioned diagonally, showing its refined packaging and the rosy ruby chocolate surface. Fresh red currants, pomegranate seeds, and freeze-dried berry pieces are scattered artfully around, some with glossy jewel-like highlights. Delicate pink and crimson edible flowers such as rose petals, peony petals, and hibiscus create a romantic border. Ruby cocoa dust and subtle berry crumbs accent the composition. Warm, soft natural lighting with gentle shadows. Hyperrealistic product photography, professional styling, 400x500px composition. Sharp focus on chocolate, elegant and sophisticated aesthetic.
- Detail:
  - Extreme macro close-up of ruby chocolate bar surface with texture details, positioned on textured kraft paper. Freeze-dried berry pieces, red currants, and pomegranate seed fragments are placed directly on and beside the chocolate, highlighting the glossy pink ruby surface. Scattered berry seeds, ruby cocoa dust, and delicate pink edible petals frame the shot. Soft rose and cream tones dominate. Hyperrealistic detail photography with macro lens, warm diffused lighting, professional commercial styling. Light cream-peach background with soft focus. 400x500px intense detail composition.
- SQL:
  ```sql
  START TRANSACTION;

  UPDATE products
  SET image = '/product-images/single-harvest-ruby-chocolate-main.png'
  WHERE id = 4;

  DELETE FROM product_images
  WHERE product_id = 4;

  INSERT INTO product_images (product_id, url, alt_text, is_primary)
  VALUES
    (4, '/product-images/single-harvest-ruby-chocolate-main.png', 'Single-Harvest Ruby Chocolate', 1),
    (4, '/product-images/single-harvest-ruby-chocolate-detail.png', 'Single-Harvest Ruby Chocolate', 0);

  COMMIT;
  ```

## Product 5: Stone-Ground Filled & Pralines
- Files:
  - `stone-ground-filled-and-pralines-main.png`
  - `stone-ground-filled-and-pralines-detail.png`
- Wide:
  - Premium praline-filled chocolate pieces displayed with eco-friendly kraft paper packaging on a light cream-peach background. Hazelnuts, caramel shards, and cocoa dust frame the scene. Hyperrealistic luxury product photography, warm natural side lighting, elegant ecommerce styling.
- Detail:
  - Macro close-up of praline-filled chocolate with a glossy shell and creamy nut filling slightly exposed. Crushed hazelnuts, cocoa powder, and caramel flakes on kraft paper, soft cream-peach bokeh background, rich commercial detail photography.

## Product 6: Silk-Smooth Drinking Chocolate
- Files:
  - `silk-smooth-drinking-chocolate-main.png`
  - `silk-smooth-drinking-chocolate-detail.png`
- Wide:
  - Premium drinking chocolate product with kraft paper packaging on a light cream-peach background. Dark chocolate pieces, cocoa powder, cinnamon sticks, and a ceramic cup create a refined composition. Hyperrealistic commercial product photography, warm side lighting, luxurious mood.
- Detail:
  - Macro close-up of dark drinking chocolate shards with cocoa powder and delicate spice dust on crumpled kraft paper. Cream-peach background with soft bokeh, warm diffused light, texture-rich premium detail image.

## Product 7: Cacao-Rich Vegan & Dairy-Free
- Files:
  - `cacao-rich-vegan-and-dairy-free-main.png`
  - `cacao-rich-vegan-and-dairy-free-detail.png`
- Wide:
  - Luxurious dairy-free dark chocolate bar in eco-friendly kraft packaging on a light cream-peach background. Coconut flakes, cacao nibs, and subtle botanical accents surround the product. Hyperrealistic commercial photography, natural side lighting, elegant premium composition.
- Detail:
  - Macro close-up of vegan dark chocolate with cacao nib texture and coconut accents on kraft paper. Soft cream-peach bokeh background, warm diffused light, premium detail shot with crisp texture.

## Product 8: Midnight Sugar-Free
- Files:
  - `midnight-sugar-free-main.png`
  - `midnight-sugar-free-detail.png`
- Wide:
  - Sophisticated sugar-free dark chocolate bar in eco-friendly kraft packaging displayed on a light cream-peach background. Cocoa nibs, vanilla pods, and a sparse dusting of cocoa create a minimal premium arrangement. Hyperrealistic commercial product photography, warm side lighting.
- Detail:
  - Macro close-up of sugar-free dark chocolate with crisp snap texture, cocoa dust, and vanilla bean details on kraft paper. Cream-peach background with soft bokeh, warm commercial detail lighting.

## Product 9: Amber Single Origin
- Files:
  - `amber-single-origin-main.png`
  - `amber-single-origin-detail.png`
- Wide:
  - Elegant single-origin chocolate bar with refined kraft packaging on a light cream-peach background. Cocoa pods, cacao beans, and amber-toned petals frame the product. Hyperrealistic commercial product photography, natural side lighting, premium artisan composition.
- Detail:
  - Macro close-up of single-origin chocolate with glossy surface, cocoa bean fragments, and fine cocoa dust on crumpled kraft paper. Warm cream-peach bokeh background, luxurious texture-focused photography.

## Product 10: Luxe Seasonal & Limited Edition
- Files:
  - `luxe-seasonal-and-limited-edition-main.png`
  - `luxe-seasonal-and-limited-edition-detail.png`
- Wide:
  - Limited-edition artisan chocolate bar in premium kraft packaging on a light cream-peach background. Seasonal edible flowers, delicate spice elements, and elegant garnish surround the bar. Hyperrealistic commercial product photography, warm natural lighting, premium editorial ecommerce style.
- Detail:
  - Macro close-up of seasonal chocolate with decorative toppings and luxurious glossy finish on kraft paper. Soft cream-peach bokeh background, warm diffused light, high-end texture detail composition.
