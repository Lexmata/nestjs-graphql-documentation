import { describe, it, expect } from 'vitest';
import { GraphQLDocsController } from '../../src/graphql-docs.controller';
import type { DocsModel } from '../../src/harvest/docs-model';

const model: DocsModel = {
  meta: { title: 'T', generatedAt: '2026-04-27T00:00:00Z', isFederated: false },
  queries: [], mutations: [], subscriptions: [],
  objectTypes: [], inputTypes: [], interfaces: [],
  unions: [], enums: [], scalars: [], directives: [],
};

function mockRes() {
  const headers: Record<string, string> = {};
  return {
    setHeader(k: string, v: string) { headers[k] = v; },
    getHeader(k: string) { return headers[k]; },
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

  it('getCss returns CSS with text/css', () => {
    const ctl = new GraphQLDocsController(harvester, { path: '/docs', customCss: '.x{}' });
    const res = mockRes();
    const body = ctl.getCss(res as never);
    expect(body).toContain('.ngd-sidebar');
    expect(body).toContain('.x{}');
    expect(res.getHeader('Content-Type')).toBe('text/css; charset=utf-8');
  });

  it('getSchemaJson returns the serialized model', () => {
    const ctl = new GraphQLDocsController(harvester, options);
    const res = mockRes();
    const body = ctl.getSchemaJson(res as never);
    expect(JSON.parse(body)).toEqual(model);
    expect(res.getHeader('Content-Type')).toBe('application/json; charset=utf-8');
  });
});
