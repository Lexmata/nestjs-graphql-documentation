import { describe, it, expect, vi } from 'vitest';
import { GraphQLDocsController } from '../../src/graphql-docs.controller';
import type { DocsModel } from '../../src/harvest/docs-model';

const model: DocsModel = {
  meta: { title: 'T', generatedAt: '2026-04-27T00:00:00Z', isFederated: false },
  queries: [],
  mutations: [],
  subscriptions: [],
  objectTypes: [],
  inputTypes: [],
  interfaces: [],
  unions: [],
  enums: [],
  scalars: [],
  directives: [],
};

function mockRes() {
  const headers: Record<string, string> = {};
  return {
    setHeader(k: string, v: string) {
      headers[k] = v;
    },
    getHeader(k: string) {
      return headers[k];
    },
  };
}

describe('GraphQLDocsController', () => {
  const harvester = { getModel: () => model } as never;
  const options = { path: '/docs' };

  it('getHtml returns HTML with text/html content-type', async () => {
    const ctl = new GraphQLDocsController(harvester, options);
    const res = mockRes();
    const body = await ctl.getHtml(res as never, '/docs');
    expect(body).toMatch(/^<!DOCTYPE html>/);
    expect(res.getHeader('Content-Type')).toBe('text/html; charset=utf-8');
  });

  it('getJs returns JS with application/javascript and cache header', () => {
    const ctl = new GraphQLDocsController(harvester, options);
    const res = mockRes();
    const body = ctl.getJs(res as never);
    expect(typeof body).toBe('string');
    expect(body.length).toBeGreaterThan(100);
    expect(res.getHeader('Content-Type')).toBe('application/javascript; charset=utf-8');
    expect(res.getHeader('Cache-Control')).toBe('public, max-age=3600');
  });

  it('getCss returns CSS with text/css and cache header', () => {
    const ctl = new GraphQLDocsController(harvester, { path: '/docs', customCss: '.x{}' });
    const res = mockRes();
    const body = ctl.getCss(res as never);
    expect(body).toContain('.ngd-sidebar');
    expect(body).toContain('.x{}');
    expect(res.getHeader('Content-Type')).toBe('text/css; charset=utf-8');
    expect(res.getHeader('Cache-Control')).toBe('public, max-age=3600');
  });

  it('getCss returns the same cached string on repeated calls', () => {
    const ctl = new GraphQLDocsController(harvester, { path: '/docs', customCss: '.x{}' });
    const body1 = ctl.getCss(mockRes() as never);
    const body2 = ctl.getCss(mockRes() as never);
    expect(body2).toBe(body1);
  });

  it('getSchemaJson returns the serialized model with private cache header', async () => {
    const ctl = new GraphQLDocsController(harvester, options);
    const res = mockRes();
    const body = await ctl.getSchemaJson(res as never);
    expect(JSON.parse(body)).toEqual(model);
    expect(res.getHeader('Content-Type')).toBe('application/json; charset=utf-8');
    expect(res.getHeader('Cache-Control')).toBe('private, max-age=3600');
  });

  it('getSchemaJson returns consistent output on repeated calls', async () => {
    const ctl = new GraphQLDocsController(harvester, options);
    const body1 = await ctl.getSchemaJson(mockRes() as never);
    const body2 = await ctl.getSchemaJson(mockRes() as never);
    expect(body2).toEqual(body1);
  });

  it('falls back to Fastify-style .header() when res.setHeader is absent', () => {
    const calls: Array<[string, string]> = [];
    const fastifyLikeRes = {
      header: (k: string, v: string) => {
        calls.push([k, v]);
      },
    };
    const ctl = new GraphQLDocsController(harvester, options);
    ctl.getJs(fastifyLikeRes as never);
    expect(calls).toContainEqual(['Content-Type', 'application/javascript; charset=utf-8']);
    expect(calls).toContainEqual(['Cache-Control', 'public, max-age=3600']);
  });

  it('silently no-ops when neither setHeader nor header is available', () => {
    const ctl = new GraphQLDocsController(harvester, options);
    // Exercise the final `else` branch in the header helper - no crash, just
    // skip the header write. Useful when callers pass through a test double
    // that omits both methods.
    const body = ctl.getJs({} as never);
    expect(typeof body).toBe('string');
  });

  it('getHtml reads the path from request.originalUrl when a request object is passed', async () => {
    const ctl = new GraphQLDocsController(harvester, options);
    const body = await ctl.getHtml(
      mockRes() as never,
      { originalUrl: '/docs/queries/me' } as never,
    );
    expect(body).toContain('__INITIAL_ENTITY__');
  });

  it('getHtml falls back to request.url when originalUrl is absent', async () => {
    const ctl = new GraphQLDocsController(harvester, options);
    const body = await ctl.getHtml(mockRes() as never, { url: '/docs' } as never);
    // No entity tail in /docs, so the initial entity stays null.
    expect(body).toMatch(/__INITIAL_ENTITY__\s*=\s*null/);
  });

  it('getHtml falls back to options.path when neither originalUrl nor url is present', async () => {
    const ctl = new GraphQLDocsController(harvester, options);
    const body = await ctl.getHtml(mockRes() as never, {} as never);
    expect(body).toMatch(/__INITIAL_ENTITY__\s*=\s*null/);
  });

  it('getHtml strips the query string before parsing the initial entity', async () => {
    const ctl = new GraphQLDocsController(harvester, options);
    const body = await ctl.getHtml(mockRes() as never, '/docs/queries/me?utm_source=slack');
    expect(body).toContain('__INITIAL_ENTITY__');
    expect(body).not.toContain('utm_source');
  });

  it('getHtmlDeep forwards the full request path to getHtml', async () => {
    const ctl = new GraphQLDocsController(harvester, options);
    const body = await ctl.getHtmlDeep(
      mockRes() as never,
      { originalUrl: '/docs/mutations/createUser' } as never,
    );
    expect(body).toMatch(/"kind":"Mutation","name":"createUser"/);
  });

  it('getHtmlDeep falls back to request.url when originalUrl is absent', async () => {
    const ctl = new GraphQLDocsController(harvester, options);
    const body = await ctl.getHtmlDeep(mockRes() as never, { url: '/docs/queries/me' } as never);
    expect(body).toMatch(/"kind":"Query","name":"me"/);
  });

  it('getHtmlDeep falls back to options.path when the request has neither URL field', async () => {
    const ctl = new GraphQLDocsController(harvester, options);
    const body = await ctl.getHtmlDeep(mockRes() as never, {} as never);
    expect(body).toMatch(/__INITIAL_ENTITY__\s*=\s*null/);
  });

  describe('with DocsCacheService', () => {
    it('getSchemaJson returns cached value on hit', async () => {
      const cache = {
        isEnabled: () => true,
        get: vi.fn(async () => '{"cached":true}'),
        set: vi.fn(),
        invalidate: vi.fn(),
      };
      const ctl = new GraphQLDocsController(harvester, options, cache as never);
      const res = mockRes();
      const body = await ctl.getSchemaJson(res as never);
      expect(body).toBe('{"cached":true}');
      expect(cache.get).toHaveBeenCalledWith('ngd:schema.json');
    });

    it('getSchemaJson reharvests and caches on miss', async () => {
      const cache = {
        isEnabled: () => true,
        get: vi.fn(async () => undefined),
        set: vi.fn(),
        invalidate: vi.fn(),
      };
      const mockHarvester = {
        getModel: () => model,
        reharvest: vi.fn(),
      };
      const ctl = new GraphQLDocsController(mockHarvester as never, options, cache as never);
      const res = mockRes();
      const body = await ctl.getSchemaJson(res as never);
      expect(mockHarvester.reharvest).toHaveBeenCalled();
      expect(cache.invalidate).toHaveBeenCalled();
      expect(cache.set).toHaveBeenCalled();
      expect(JSON.parse(body)).toEqual(model);
    });

    it('getHtml returns cached value on hit', async () => {
      const cache = {
        isEnabled: () => true,
        get: vi.fn(async () => '<!DOCTYPE html>cached'),
        set: vi.fn(),
        invalidate: vi.fn(),
      };
      const ctl = new GraphQLDocsController(harvester, options, cache as never);
      const res = mockRes();
      const body = await ctl.getHtml(res as never, '/docs/queries/user');
      expect(body).toBe('<!DOCTYPE html>cached');
      expect(cache.get).toHaveBeenCalledWith('ngd:html:queries/user');
    });

    it('getHtml renders and caches on miss', async () => {
      const cache = {
        isEnabled: () => true,
        get: vi.fn(async () => undefined),
        set: vi.fn(),
        invalidate: vi.fn(),
      };
      const ctl = new GraphQLDocsController(harvester, options, cache as never);
      const res = mockRes();
      const body = await ctl.getHtml(res as never, '/docs');
      expect(body).toMatch(/^<!DOCTYPE html>/);
      expect(cache.set).toHaveBeenCalledWith('ngd:html:', expect.any(String));
    });

    it('falls through when docsCache is undefined', async () => {
      const ctl = new GraphQLDocsController(harvester, options, undefined);
      const res = mockRes();
      const body = await ctl.getSchemaJson(res as never);
      expect(JSON.parse(body as string)).toEqual(model);
    });
  });
});
