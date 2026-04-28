import { describe, it, expect } from 'vitest';
import {
  renderHtml,
  renderSchemaJson,
  PICO_CSS_HREF,
  PICO_CSS_INTEGRITY,
} from '../../src/render/html-renderer';
import type { DocsModel } from '../../src/harvest/docs-model';

const MODEL: DocsModel = {
  meta: { title: 'Test API', generatedAt: '2026-04-27T00:00:00Z', isFederated: false },
  queries: [
    {
      name: 'me',
      description: 'Current user.',
      args: [],
      returnType: { kind: 'NAMED', name: 'User', namedKind: 'OBJECT' },
      tags: { examples: [] },
    },
  ],
  mutations: [],
  subscriptions: [],
  objectTypes: [
    {
      name: 'User',
      description: '<script>alert(1)</script>',
      fields: [],
    },
  ],
  inputTypes: [],
  interfaces: [],
  unions: [],
  enums: [],
  scalars: [],
  directives: [],
};

describe('renderHtml', () => {
  it('includes doctype and title', () => {
    const html = renderHtml(MODEL, { path: '/docs' });
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain('<title>Test API</title>');
  });

  it('includes Pico CSS link with SRI', () => {
    const html = renderHtml(MODEL, { path: '/docs' });
    expect(html).toContain(PICO_CSS_HREF);
    expect(html).toContain('integrity="' + PICO_CSS_INTEGRITY + '"');
    expect(html).toContain('crossorigin="anonymous"');
  });

  it('includes local CSS and JS links using configured path', () => {
    const html = renderHtml(MODEL, { path: '/api/docs' });
    expect(html).toContain('href="/api/docs/app.css"');
    expect(html).toContain('src="/api/docs/app.js"');
    expect(html).toContain('data-ngd-base="/api/docs"');
  });

  it('escapes XSS in type descriptions (XSS test)', () => {
    const html = renderHtml(MODEL, { path: '/docs' });
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('embeds __INITIAL_ENTITY__ when URL contains an entity tail', () => {
    const html = renderHtml(MODEL, { path: '/docs' }, '/docs/queries/me');
    expect(html).toMatch(/__INITIAL_ENTITY__\s*=\s*\{"kind":"Query","name":"me"\}/);
  });

  it('embeds __INITIAL_ENTITY__ as null when URL has no tail', () => {
    const html = renderHtml(MODEL, { path: '/docs' }, '/docs');
    expect(html).toMatch(/__INITIAL_ENTITY__\s*=\s*null/);
  });

  it('includes [data-ngd-nav], [data-ngd-main], [data-ngd-search] hooks', () => {
    const html = renderHtml(MODEL, { path: '/docs' });
    expect(html).toContain('data-ngd-nav');
    expect(html).toContain('data-ngd-main');
    expect(html).toContain('data-ngd-search');
  });

  it('embeds __INITIAL_ENTITY__ as null when requestPath does not share the mount path prefix', () => {
    // e.g. a request coming from behind a reverse proxy that rewrote the URL.
    const html = renderHtml(MODEL, { path: '/docs' }, '/unrelated/route/here');
    expect(html).toMatch(/__INITIAL_ENTITY__\s*=\s*null/);
  });

  it('embeds __INITIAL_ENTITY__ as null when the URL tail uses an unknown segment', () => {
    const html = renderHtml(MODEL, { path: '/docs' }, '/docs/whatever/name');
    expect(html).toMatch(/__INITIAL_ENTITY__\s*=\s*null/);
  });
});

describe('renderSchemaJson', () => {
  it('returns canonical JSON string of the model', () => {
    const out = renderSchemaJson(MODEL);
    expect(JSON.parse(out)).toEqual(MODEL);
  });
});
