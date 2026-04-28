import { Controller, Get, Inject, Optional, Req, Res } from '@nestjs/common';
import { SchemaHarvesterService } from './harvest/schema-harvester.service.js';
import { GRAPHQL_DOCS_OPTIONS, GraphQLDocsOptions } from './options.js';
import { renderHtml, renderSchemaJson } from './render/html-renderer.js';
import { renderCss } from './render/css.js';
import { CLIENT_APP_JS } from './render/client-app.js';
import { DocsCacheService } from './cache/docs-cache.service.js';

interface HttpResLike {
  setHeader?(key: string, value: string): void;
  header?(key: string, value: string): unknown;
}

interface HttpReqLike {
  originalUrl?: string;
  url?: string;
}

const STATIC_ASSET_CACHE_CONTROL = 'public, max-age=3600';
const SCHEMA_JSON_CACHE_CONTROL = 'private, max-age=3600';

const CACHE_KEY_SCHEMA = 'ngd:schema.json';
const CACHE_KEY_HTML_PREFIX = 'ngd:html:';

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
  private cachedCss: string | undefined;

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
      const tail = cleanPath.slice(this.options.path.length).replace(/^\//, '');
      const cacheKey = `${CACHE_KEY_HTML_PREFIX}${tail}`;
      const cached = await this.docsCache.get(cacheKey);
      if (cached) return cached;
      const html = this.renderHtmlResponse(cleanPath);
      await this.docsCache.set(cacheKey, html);
      return html;
    }

    return this.renderHtmlResponse(cleanPath);
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
      const cached = await this.docsCache.get(CACHE_KEY_SCHEMA);
      if (cached) return cached;
      this.harvester.reharvest();
      await this.docsCache.invalidate();
      const json = renderSchemaJson(this.harvester.getModel());
      await this.docsCache.set(CACHE_KEY_SCHEMA, json);
      return json;
    }

    return renderSchemaJson(this.harvester.getModel());
  }

  @Get(':segment/:name')
  async getHtmlDeep(
    @Res({ passthrough: true }) res: HttpResLike,
    @Req() req: HttpReqLike,
  ): Promise<string> {
    return this.getHtml(res, req.originalUrl ?? req.url ?? this.options.path);
  }

  private renderHtmlResponse(cleanPath: string): string {
    return renderHtml(
      this.harvester.getModel(),
      { path: this.options.path, title: this.options.title },
      cleanPath,
    );
  }
}

function stripQuery(path: string): string {
  const i = path.indexOf('?');
  return i === -1 ? path : path.slice(0, i);
}
