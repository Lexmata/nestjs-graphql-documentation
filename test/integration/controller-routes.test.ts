import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { buildTestAppModule } from './fixtures/test-app.module';

describe('enabled: false', () => {
  let app: INestApplication;
  beforeEach(async () => {
    const AppModule = buildTestAppModule({
      driver: 'apollo',
      docs: { path: '/docs', enabled: false },
    });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });
  afterEach(async () => {
    await app.close();
  });

  it('does not mount the docs routes', async () => {
    const res = await request(app.getHttpServer()).get('/docs');
    expect(res.status).toBe(404);
  });
});

describe('include/exclude filters', () => {
  let app: INestApplication;
  beforeEach(async () => {
    const AppModule = buildTestAppModule({
      driver: 'apollo',
      docs: {
        path: '/docs',
        exclude: (e) => e.kind === 'Mutation' && e.name === 'createUser',
      },
    });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });
  afterEach(async () => {
    await app.close();
  });

  it('removes excluded entities from schema.json', async () => {
    const res = await request(app.getHttpServer()).get('/docs/schema.json');
    const body = JSON.parse(res.text);
    expect(body.mutations.map((m: { name: string }) => m.name)).not.toContain('createUser');
  });
});

describe('customCss', () => {
  let app: INestApplication;
  beforeEach(async () => {
    const AppModule = buildTestAppModule({
      driver: 'apollo',
      docs: { path: '/docs', customCss: '.my-brand { color: hotpink; }' },
    });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });
  afterEach(async () => {
    await app.close();
  });

  it('appends customCss to the served stylesheet', async () => {
    const res = await request(app.getHttpServer()).get('/docs/app.css');
    expect(res.text).toContain('.my-brand { color: hotpink; }');
  });
});
