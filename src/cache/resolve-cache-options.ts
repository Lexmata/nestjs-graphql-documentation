const DEFAULT_TTL = 300;
const DEFAULT_CACHE_TOKEN = 'CACHE_MANAGER';

export interface ResolvedCacheOptions {
  enabled: true;
  ttl: number;
  cacheToken: symbol | string;
}

export interface CacheOptionsObject {
  ttl?: number;
  cacheToken?: symbol | string;
}

export type CacheOption = boolean | CacheOptionsObject;

export function resolveCacheOptions(
  raw: CacheOption | undefined,
): ResolvedCacheOptions | undefined {
  if (!raw) return undefined;
  if (raw === true) {
    return { enabled: true, ttl: DEFAULT_TTL, cacheToken: DEFAULT_CACHE_TOKEN };
  }
  return {
    enabled: true,
    ttl: raw.ttl ?? DEFAULT_TTL,
    cacheToken: raw.cacheToken ?? DEFAULT_CACHE_TOKEN,
  };
}
