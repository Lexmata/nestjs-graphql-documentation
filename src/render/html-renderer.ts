import type { DocsModel } from '../harvest/docs-model';
import { escapeHtml, escapeAttr } from '../util/escape';

export const PICO_CSS_HREF = 'https://cdn.jsdelivr.net/npm/@picocss/pico@2.1.1/css/pico.min.css';
export const PICO_CSS_INTEGRITY =
  'sha384-L1dWfspMTHU/ApYnFiMz2QID/PlP1xCW9visvBdbEkOLkSSWsP6ZJWhPw6apiXxU';

export interface RenderHtmlOptions {
  path: string;
  title?: string;
}

export function renderHtml(
  model: DocsModel,
  opts: RenderHtmlOptions,
  requestPath?: string,
): string {
  const title = opts.title ?? model.meta.title;
  const base = opts.path;
  const initial = parseInitialEntity(base, requestPath);
  const initialJson = initial ? JSON.stringify(initial) : 'null';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${PICO_CSS_HREF}" integrity="${PICO_CSS_INTEGRITY}" crossorigin="anonymous">
<link rel="stylesheet" href="${escapeAttr(base)}/app.css">
</head>
<body>
<div class="ngd-layout">
  <aside class="ngd-sidebar">
    <h1>${escapeHtml(title)}</h1>
    <input class="ngd-search" type="search" placeholder="Filter..." data-ngd-search aria-label="Filter entities">
    <nav data-ngd-nav></nav>
  </aside>
  <main class="ngd-main" data-ngd-main>
    <article><h2>${escapeHtml(title)}</h2><p>Loading schema…</p></article>
  </main>
</div>
<script data-ngd-base="${escapeAttr(base)}">window.__INITIAL_ENTITY__ = ${initialJson};</script>
<script src="${escapeAttr(base)}/app.js"></script>
</body>
</html>`;
}

export function renderSchemaJson(model: DocsModel): string {
  return JSON.stringify(model);
}

const SEG_TO_KIND: Record<string, string> = {
  queries: 'Query',
  mutations: 'Mutation',
  subscriptions: 'Subscription',
  types: 'ObjectType',
  inputs: 'InputType',
  interfaces: 'Interface',
  unions: 'Union',
  enums: 'Enum',
  scalars: 'Scalar',
  directives: 'Directive',
};

function parseInitialEntity(
  base: string,
  requestPath?: string,
): { kind: string; name: string } | null {
  if (!requestPath) return null;
  if (!requestPath.startsWith(base)) return null;
  const tail = requestPath.slice(base.length);
  const m = tail.match(/^\/([a-z]+)\/([^/]+)$/);
  if (!m) return null;
  const kind = SEG_TO_KIND[m[1]];
  if (!kind) return null;
  return { kind, name: decodeURIComponent(m[2]) };
}
