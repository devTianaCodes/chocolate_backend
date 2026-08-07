const CATEGORY_ASSETS = {
  'dark-chocolate': 'velvety-dark-chocolate',
  'milk-chocolate': 'roasted-milk-chocolate',
  'white-chocolate': 'hand-tempered-white-chocolate',
  'ruby-chocolate': 'single-harvest-ruby-chocolate',
  'filled-pralines': 'stone-ground-filled-and-pralines',
  'drinking-chocolate': 'silk-smooth-drinking-chocolate',
  'vegan-dairy-free': 'cacao-rich-vegan-and-dairy-free',
  'sugar-free': 'midnight-sugar-free',
  'single-origin': 'amber-single-origin',
  'seasonal-limited-edition': 'luxe-seasonal-and-limited-edition',
  'gift-boxes': 'golden-gift-boxes',
  'spreads-creams': 'estate-spreads-and-creams',
  'raw-organic': 'vintage-raw-and-organic',
  'chocolate-covered-nuts': 'signature-chocolate-covered-nuts',
  'chocolate-bars': 'artisan-chocolate-bars',
};

const PRODUCT_ASSETS = Object.values(CATEGORY_ASSETS);
const LOCAL_PNG_PATTERN = /^\/product-images\/(.+)-(main|detail)\.png$/i;
const DEMO_IMAGE_PATTERN =
  /^https:\/\/res\.cloudinary\.com\/demo\/image\/upload\/.*\/chocolate_\d+\.jpg$/i;

function assetFromProductName(productName = '') {
  const normalizedName = productName.toLowerCase().replaceAll(' ', '-');
  return PRODUCT_ASSETS.find((asset) => normalizedName.startsWith(asset));
}

export function catalogImagePath({ source, categorySlug, productName, variant = 'main' }) {
  if (!source) return '';

  const localMatch = source.match(LOCAL_PNG_PATTERN);
  if (localMatch) {
    return `/product-images/${localMatch[1]}-${localMatch[2]}.jpg`;
  }

  if (!DEMO_IMAGE_PATTERN.test(source)) return source;

  const asset = CATEGORY_ASSETS[categorySlug] || assetFromProductName(productName);
  return asset ? `/product-images/${asset}-${variant}.jpg` : source;
}

export function normalizeCatalogProduct(product, categorySlug = product.category_slug) {
  return {
    ...product,
    image: catalogImagePath({
      source: product.image,
      categorySlug,
      productName: product.name,
    }),
    hover_image: catalogImagePath({
      source: product.hover_image,
      categorySlug,
      productName: product.name,
      variant: 'detail',
    }) || null,
  };
}
