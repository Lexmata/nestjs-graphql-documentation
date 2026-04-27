import { Controller, Get, Inject, Req, Res } from '@nestjs/common';
import { SchemaHarvesterService } from './harvest/schema-harvester.service';
import { GRAPHQL_DOCS_OPTIONS, GraphQLDocsOptions } from './options';
import { renderHtml, renderSchemaJson } from './render/html-renderer';
import { renderCss } from './render/css';
import { CLIENT_APP_JS } from './render/client-app';

interface HttpResLike {
  setHeader?(key: string, value: string): void;
  // Fastify's reply exposes .header(name, value) instead of setHeader.
  header?(key: string, value: string): unknown;
}

interface HttpReqLike {
  originalUrl?: string;
  url?: string;
}

const STATIC_CACHE_CONTROL = 'public, max-age=3600';

function setHeader(res: HttpResLike, key: string, value: string): void {
  if (typeof res.setHeader === 'function') {
    res.setHeader(key, value);
  } else if (typeof res.header === 'function') {
    res.header(key, value);
  }
}

function setContentHeaders(res: HttpResLike, contentType: string, cacheable: boolean): void {
  setHeader(res, 'Content-Type', contentType);
  if (cacheable) setHeader(res, 'Cache-Control', STATIC_CACHE_CONTROL);
}

@Controller()
export class GraphQLDocsController {
  private readonly cachedCss: string;
  private cachedSchemaJson: string | undefined;

  constructor(
    private readonly harvester: SchemaHarvesterService,
    @Inject(GRAPHQL_DOCS_OPTIONS) private readonly options: GraphQLDocsOptions,
  ) {
    this.cachedCss = renderCss(this.options.customCss);
  }

  @Get()
  getHtml(
    @Res({ passthrough: true }) res: HttpResLike,
    @Req() req?: HttpReqLike | string,
  ): string {
    const path =
      typeof req === 'string'
        ? req
        : req?.originalUrl ?? req?.url ?? this.options.path;
    setContentHeaders(res, 'text/html; charset=utf-8', false);
    return renderHtml(
      this.harvester.getModel(),
      { path: this.options.path, title: this.options.title },
      stripQuery(path),
    );
  }

  @Get('app.js')
  getJs(@Res({ passthrough: true }) res: HttpResLike): string {
    setContentHeaders(res, 'application/javascript; charset=utf-8', true);
    return CLIENT_APP_JS;
  }

  @Get('app.css')
  getCss(@Res({ passthrough: true }) res: HttpResLike): string {
    setContentHeaders(res, 'text/css; charset=utf-8', true);
    return this.cachedCss;
  }

  @Get('schema.json')
  getSchemaJson(@Res({ passthrough: true }) res: HttpResLike): string {
    setContentHeaders(res, 'application/json; charset=utf-8', true);
    this.cachedSchemaJson ??= renderSchemaJson(this.harvester.getModel());
    return this.cachedSchemaJson;
  }

  @Get(':segment/:name')
  getHtmlDeep(@Res({ passthrough: true }) res: HttpResLike, @Req() req: HttpReqLike): string {
    return this.getHtml(res, req.originalUrl ?? req.url ?? this.options.path);
  }
}

function stripQuery(path: string): string {
  const i = path.indexOf('?');
  return i === -1 ? path : path.slice(0, i);
}
