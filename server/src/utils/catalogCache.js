const DEFAULT_TTL_MS = 60_000;
const MAX_ENTRIES = 100;
const entries = new Map();
let generation = 0;

function storeEntry(key, entry) {
  entries.delete(key);
  entries.set(key, entry);

  while (entries.size > MAX_ENTRIES) {
    entries.delete(entries.keys().next().value);
  }
}

function removeExpiredEntries(now) {
  entries.forEach((entry, key) => {
    if (!entry.pending && entry.expiresAt <= now) entries.delete(key);
  });
}

export function clearCatalogCache() {
  generation += 1;
  entries.clear();
}

export async function withCatalogCache(key, load, ttlMs = DEFAULT_TTL_MS) {
  const now = Date.now();
  removeExpiredEntries(now);
  const cached = entries.get(key);
  if (cached?.value !== undefined && cached.expiresAt > now) {
    return cached.value;
  }
  if (cached?.pending) return cached.pending;

  const loadGeneration = generation;
  const pending = Promise.resolve().then(load);
  storeEntry(key, { pending });

  try {
    const value = await pending;
    if (loadGeneration === generation && entries.get(key)?.pending === pending) {
      storeEntry(key, { value, expiresAt: Date.now() + ttlMs });
    }
    return value;
  } catch (error) {
    if (entries.get(key)?.pending === pending) entries.delete(key);
    throw error;
  }
}
