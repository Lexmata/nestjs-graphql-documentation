import { describe, it, expect } from 'vitest';
import { resolveCacheOptions } from '../../src/cache/resolve-cache-options';

describe('resolveCacheOptions', () => {
  it('returns undefined for undefined input', () => {
    expect(resolveCacheOptions(undefined)).toBeUndefined();
  });

  it('returns undefined for false', () => {
    expect(resolveCacheOptions(false)).toBeUndefined();
  });

  it('returns defaults for true', () => {
    expect(resolveCacheOptions(true)).toEqual({
      enabled: true,
      ttl: 300,
      cacheToken: 'CACHE_MANAGER',
    });
  });

  it('merges ttl with defaults', () => {
    expect(resolveCacheOptions({ ttl: 60 })).toEqual({
      enabled: true,
      ttl: 60,
      cacheToken: 'CACHE_MANAGER',
    });
  });

  it('merges cacheToken with defaults', () => {
    const token = Symbol('MY_CACHE');
    expect(resolveCacheOptions({ cacheToken: token })).toEqual({
      enabled: true,
      ttl: 300,
      cacheToken: token,
    });
  });

  it('uses both ttl and cacheToken when provided', () => {
    const token = Symbol('X');
    expect(resolveCacheOptions({ ttl: 10, cacheToken: token })).toEqual({
      enabled: true,
      ttl: 10,
      cacheToken: token,
    });
  });
});
