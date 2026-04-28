import { describe, it, expect, vi } from 'vitest';
import { DocsCacheService } from '../../src/cache/docs-cache.service';

function makeMockCache() {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key)),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    del: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    store,
  };
}

const harvester = {
  reharvest: vi.fn(),
  getModel: vi.fn(() => ({ meta: { title: 'T' } })),
} as never;

describe('DocsCacheService', () => {
  it('isEnabled returns false when cache resolution fails', () => {
    const throwingRef = {
      get: () => {
        throw new Error('not found');
      },
    } as never;
    const svc = new DocsCacheService(throwingRef, harvester, {
      path: '/docs',
      cache: true,
    } as never);
    svc.onModuleInit();
    expect(svc.isEnabled()).toBe(false);
  });

  it('isEnabled returns true when cache resolves', () => {
    const cache = makeMockCache();
    const ref = { get: () => cache } as never;
    const svc = new DocsCacheService(ref, harvester, {
      path: '/docs',
      cache: true,
    } as never);
    svc.onModuleInit();
    expect(svc.isEnabled()).toBe(true);
  });

  it('get returns cached value on hit', async () => {
    const cache = makeMockCache();
    cache.store.set('ngd:schema.json', '{"cached":true}');
    const ref = { get: () => cache } as never;
    const svc = new DocsCacheService(ref, harvester, {
      path: '/docs',
      cache: true,
    } as never);
    svc.onModuleInit();
    expect(await svc.get('ngd:schema.json')).toBe('{"cached":true}');
  });

  it('get returns undefined on miss', async () => {
    const cache = makeMockCache();
    const ref = { get: () => cache } as never;
    const svc = new DocsCacheService(ref, harvester, {
      path: '/docs',
      cache: true,
    } as never);
    svc.onModuleInit();
    expect(await svc.get('ngd:schema.json')).toBeUndefined();
  });

  it('set writes with configured TTL and tracks the key', async () => {
    const cache = makeMockCache();
    const ref = { get: () => cache } as never;
    const svc = new DocsCacheService(ref, harvester, {
      path: '/docs',
      cache: { ttl: 60 },
    } as never);
    svc.onModuleInit();
    await svc.set('ngd:schema.json', '{}');
    expect(cache.set).toHaveBeenCalledWith('ngd:schema.json', '{}', 60_000);
  });

  it('invalidate deletes all tracked keys', async () => {
    const cache = makeMockCache();
    const ref = { get: () => cache } as never;
    const svc = new DocsCacheService(ref, harvester, {
      path: '/docs',
      cache: true,
    } as never);
    svc.onModuleInit();
    await svc.set('ngd:schema.json', '{}');
    await svc.set('ngd:html:queries/user', '<html>');
    await svc.invalidate();
    expect(cache.del).toHaveBeenCalledWith('ngd:schema.json');
    expect(cache.del).toHaveBeenCalledWith('ngd:html:queries/user');
  });

  it('get catches store errors and returns undefined', async () => {
    const cache = {
      get: vi.fn(async () => {
        throw new Error('redis down');
      }),
      set: vi.fn(),
      del: vi.fn(),
    };
    const ref = { get: () => cache } as never;
    const svc = new DocsCacheService(ref, harvester, {
      path: '/docs',
      cache: true,
    } as never);
    const warn = vi.fn();
    (svc as unknown as { logger: { warn: ReturnType<typeof vi.fn> } }).logger = {
      warn,
    } as never;
    svc.onModuleInit();
    expect(await svc.get('ngd:x')).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it('set catches store errors without throwing', async () => {
    const cache = {
      get: vi.fn(),
      set: vi.fn(async () => {
        throw new Error('redis down');
      }),
      del: vi.fn(),
    };
    const ref = { get: () => cache } as never;
    const svc = new DocsCacheService(ref, harvester, {
      path: '/docs',
      cache: true,
    } as never);
    const warn = vi.fn();
    (svc as unknown as { logger: { warn: ReturnType<typeof vi.fn> } }).logger = {
      warn,
    } as never;
    svc.onModuleInit();
    await svc.set('ngd:x', 'v');
    expect(warn).toHaveBeenCalled();
  });

  it('get returns undefined when disabled', async () => {
    const throwingRef = {
      get: () => {
        throw new Error('not found');
      },
    } as never;
    const svc = new DocsCacheService(throwingRef, harvester, {
      path: '/docs',
      cache: true,
    } as never);
    svc.onModuleInit();
    expect(await svc.get('ngd:x')).toBeUndefined();
  });
});
