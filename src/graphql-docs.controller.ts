import { Controller, Get, Inject, Optional, Req, Res } from '@nestjs/common';
import { SchemaHarvesterService } from './harvest/schema-harvester.service.js';
import { GRAPHQL_DOCS_OPTIONS, GraphQLDocsOptions } from './options.js';
import { renderHtml, renderSchemaJson } from './render/html-renderer.js';
import { renderCss } from './render/css.js';
import { CLIENT_APP_JS } from './render/client-app.js';
import { DocsCacheService } from './cache/docs-cache.service.js';

interface HttpResLike {
  setHeader?(key: string, value: string): void;
  // Fastify's reply exposes .header(name, value) instead of setHeader.
  header?(key: string, value: string): unknown;
}

interface HttpReqLike {
  originalUrl?: string;
  url?: string;
}

const STATIC_ASSET_CACHE_CONTROL = 'public, max-age=3600';
// schema.json may reflect user-specific GraphQL fields once host apps gate the
// docs route behind auth. Keep it cacheable in the browser but not in shared
// caches, so a CDN/proxy won't serve one tenant's schema to another.
const SCHEMA_JSON_CACHE_CONTROL = 'private, max-age=3600';

function setHeader(res: HttpResLike, key: string, value: string): void {
  if (typeof res.setHeader === 'function') {
    res.setHeader(key, value);
  } else if (typeof res.header === 'function') {
    res.header(key, value);
  }
}

function setStaticAssetHeaders(res: HttpResLike, contentType: string): void {
  setHeader(res, 'Content-Type', contentType);
  setHeader(res, 'Cache-Control', STATIC_ASSET_CACHE_CONTROL);
}

function setSchemaJsonHeaders(res: HttpResLike): void {
  setHeader(res, 'Content-Type', 'application/json; charset=utf-8');
  setHeader(res, 'Cache-Control', SCHEMA_JSON_CACHE_CONTROL);
}

function setHtmlHeaders(res: HttpResLike): void {
  setHeader(res, 'Content-Type', 'text/html; charset=utf-8');
}

@Controller()
export class GraphQLDocsController {
  // Both caches deferred to first request. Doing either at construction time
  // would let a misconfigured option (customCss, schema) take down the host
  // app's entire DI container - which matters because GraphQLDocsModule and
  // GraphQLModule share an app. Lazy init contains the blast radius to the
  // docs route and keeps the Nest boot green.
  private cachedCss: string | undefined;
  private cachedSchemaJson: string | undefined;

  constructor(
    private readonly harvester: SchemaHarvesterService,
    @Inject(GRAPHQL_DOCS_OPTIONS) private readonly options: GraphQLDocsOptions,
    @Optional() private readonly docsCache?: DocsCacheService,
  ) {}

  @Get()
  async getHtml(
    @Res({ passthrough: true }) res: HttpResLike,
    @Req() req?: HttpReqLike | string,
  ): Promise<string> {
    const path =
      typeof req === 'string' ? req : (req?.originalUrl ?? req?.url ?? this.options.path);
    const cleanPath = stripQuery(path);
    setHtmlHeaders(res);

    if (this.docsCache?.isEnabled()) {
      const tail = cleanPath.startsWith(this.options.path)
        ? cleanPath.slice(this.options.path.length).replace(/^\//, '')
        : '';
      const cacheKey = `ngd:html:${tail}`;
      const cached = await this.docsCache.get(cacheKey);
      if (cached) return cached;
      const html = renderHtml(
        this.harvester.getModel(),
        { path: this.options.path, title: this.options.title },
        cleanPath,
      );
      await this.docsCache.set(cacheKey, html);
      return html;
    }

    return renderHtml(
      this.harvester.getModel(),
      { path: this.options.path, title: this.options.title },
      cleanPath,
    );
  }

  @Get('app.js')
  getJs(@Res({ passthrough: true }) res: HttpResLike): string {
    setStaticAssetHeaders(res, 'application/javascript; charset=utf-8');
    return CLIENT_APP_JS;
  }

  @Get('app.css')
  getCss(@Res({ passthrough: true }) res: HttpResLike): string {
    setStaticAssetHeaders(res, 'text/css; charset=utf-8');
    this.cachedCss ??= renderCss(this.options.customCss);
    return this.cachedCss;
  }

  @Get('schema.json')
  async getSchemaJson(@Res({ passthrough: true }) res: HttpResLike): Promise<string> {
    setSchemaJsonHeaders(res);

    if (this.docsCache?.isEnabled()) {
      const cached = await this.docsCache.get('ngd:schema.json');
      if (cached) return cached;
      this.harvester.reharvest();
      await this.docsCache.invalidate();
      const json = renderSchemaJson(this.harvester.getModel());
      await this.docsCache.set('ngd:schema.json', json);
      return json;
    }

    this.cachedSchemaJson ??= renderSchemaJson(this.harvester.getModel());
    return this.cachedSchemaJson;
  }

  @Get(':segment/:name')
  async getHtmlDeep(
    @Res({ passthrough: true }) res: HttpResLike,
    @Req() req: HttpReqLike,
  ): Promise<string> {
    return this.getHtml(res, req.originalUrl ?? req.url ?? this.options.path);
  }
}

function stripQuery(path: string): string {
  const i = path.indexOf('?');
  return i === -1 ? path : path.slice(0, i);
}
