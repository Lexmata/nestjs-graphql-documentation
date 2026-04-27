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

function setHeader(res: HttpResLike, key: string, value: string): void {
  if (typeof res.setHeader === 'function') {
    res.setHeader(key, value);
  } else if (typeof res.header === 'function') {
    res.header(key, value);
  }
}

interface HttpReqLike {
  originalUrl?: string;
  url?: string;
}

@Controller()
export class GraphQLDocsController {
  constructor(
    private readonly harvester: SchemaHarvesterService,
    @Inject(GRAPHQL_DOCS_OPTIONS) private readonly options: GraphQLDocsOptions,
  ) {}

  @Get()
  getHtml(
    @Res({ passthrough: true }) res: HttpResLike,
    @Req() req?: HttpReqLike | string,
  ): string {
    const path =
      typeof req === 'string'
        ? req
        : req?.originalUrl ?? req?.url ?? this.options.path;
    setHeader(res, 'Content-Type', 'text/html; charset=utf-8');
    return renderHtml(
      this.harvester.getModel(),
      { path: this.options.path, title: this.options.title },
      stripQuery(path),
    );
  }

  @Get('app.js')
  getJs(@Res({ passthrough: true }) res: HttpResLike): string {
    setHeader(res, 'Content-Type', 'application/javascript; charset=utf-8');
    setHeader(res, 'Cache-Control', 'public, max-age=3600');
    return CLIENT_APP_JS;
  }

  @Get('app.css')
  getCss(@Res({ passthrough: true }) res: HttpResLike): string {
    setHeader(res, 'Content-Type', 'text/css; charset=utf-8');
    setHeader(res, 'Cache-Control', 'public, max-age=3600');
    return renderCss(this.options.customCss);
  }

  @Get('schema.json')
  getSchemaJson(@Res({ passthrough: true }) res: HttpResLike): string {
    setHeader(res, 'Content-Type', 'application/json; charset=utf-8');
    setHeader(res, 'Cache-Control', 'public, max-age=3600');
    return renderSchemaJson(this.harvester.getModel());
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
