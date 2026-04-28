import { describe, it, expect } from 'vitest';
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

  it('getHtml returns HTML with text/html content-type', () => {
    const ctl = new GraphQLDocsController(harvester, options);
    const res = mockRes();
    const body = ctl.getHtml(res as never, '/docs');
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

  it('getSchemaJson returns the serialized model with private cache header', () => {
    const ctl = new GraphQLDocsController(harvester, options);
    const res = mockRes();
    const body = ctl.getSchemaJson(res as never);
    expect(JSON.parse(body)).toEqual(model);
    expect(res.getHeader('Content-Type')).toBe('application/json; charset=utf-8');
    expect(res.getHeader('Cache-Control')).toBe('private, max-age=3600');
  });

  it('getSchemaJson returns the same cached string on repeated calls', () => {
    const ctl = new GraphQLDocsController(harvester, options);
    const body1 = ctl.getSchemaJson(mockRes() as never);
    const body2 = ctl.getSchemaJson(mockRes() as never);
    expect(body2).toBe(body1);
  });

  it('getHtml reads the path from request.originalUrl when a request object is passed', () => {
    const ctl = new GraphQLDocsController(harvester, options);
    const body = ctl.getHtml(mockRes() as never, { originalUrl: '/docs/queries/me' } as never);
    expect(body).toContain('__INITIAL_ENTITY__');
  });

  it('getHtml falls back to request.url when originalUrl is absent', () => {
    const ctl = new GraphQLDocsController(harvester, options);
    const body = ctl.getHtml(mockRes() as never, { url: '/docs' } as never);
    // No entity tail in /docs, so the initial entity stays null.
    expect(body).toMatch(/__INITIAL_ENTITY__\s*=\s*null/);
  });

  it('getHtml falls back to options.path when neither originalUrl nor url is present', () => {
    const ctl = new GraphQLDocsController(harvester, options);
    const body = ctl.getHtml(mockRes() as never, {} as never);
    expect(body).toMatch(/__INITIAL_ENTITY__\s*=\s*null/);
  });

  it('getHtml strips the query string before parsing the initial entity', () => {
    const ctl = new GraphQLDocsController(harvester, options);
    const body = ctl.getHtml(mockRes() as never, '/docs/queries/me?utm_source=slack');
    expect(body).toContain('__INITIAL_ENTITY__');
    expect(body).not.toContain('utm_source');
  });

  it('getHtmlDeep forwards the full request path to getHtml', () => {
    const ctl = new GraphQLDocsController(harvester, options);
    const body = ctl.getHtmlDeep(
      mockRes() as never,
      { originalUrl: '/docs/mutations/createUser' } as never,
    );
    expect(body).toMatch(/"kind":"Mutation","name":"createUser"/);
  });

  it('getHtmlDeep falls back to request.url when originalUrl is absent', () => {
    const ctl = new GraphQLDocsController(harvester, options);
    const body = ctl.getHtmlDeep(mockRes() as never, { url: '/docs/queries/me' } as never);
    expect(body).toMatch(/"kind":"Query","name":"me"/);
  });

  it('getHtmlDeep falls back to options.path when the request has neither URL field', () => {
    const ctl = new GraphQLDocsController(harvester, options);
    const body = ctl.getHtmlDeep(mockRes() as never, {} as never);
    expect(body).toMatch(/__INITIAL_ENTITY__\s*=\s*null/);
  });
});
