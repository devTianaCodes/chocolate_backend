const CATALOG_CACHE_CONTROL =
  'public, max-age=60, s-maxage=300, stale-while-revalidate=300';

export function setCatalogCacheHeaders(res) {
  res.set('Cache-Control', CATALOG_CACHE_CONTROL);
}
