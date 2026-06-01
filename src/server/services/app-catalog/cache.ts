import { AppTemplate } from "../../config/app-templates";
import { CacheEntry, CatalogMeta, CatalogSyncResult } from "./types";

const REMOTE_CATALOG_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function getCacheKey(source: string, url?: string): string {
  return `${source}:${(url ?? "").trim()}`;
}

export function getCachedCatalog(key: string): CacheEntry | undefined {
  const entry = REMOTE_CATALOG_CACHE.get(key);
  if (!entry) return undefined;

  if (entry.expiresAt <= Date.now()) {
    REMOTE_CATALOG_CACHE.delete(key);
    return undefined;
  }

  return entry;
}

export function setCachedCatalog(
  key: string,
  templates: AppTemplate[],
  meta: CatalogMeta,
): CatalogSyncResult {
  const expiresAt = Date.now() + CACHE_TTL_MS;
  const cacheMeta: CatalogMeta = {
    ...meta,
    cached: false,
    expiresAt: new Date(expiresAt).toISOString(),
  };

  REMOTE_CATALOG_CACHE.set(key, {
    templates,
    meta: cacheMeta,
    expiresAt,
  });

  return { templates, meta: cacheMeta };
}

export function makeCachedResult(entry: CacheEntry): CatalogSyncResult {
  return {
    templates: entry.templates,
    meta: {
      ...entry.meta,
      cached: true,
      expiresAt: new Date(entry.expiresAt).toISOString(),
    },
  };
}
