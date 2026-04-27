import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { buildTestAppModule } from './fixtures/test-app.module';

describe('forRootAsync (synchronous factory)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const AppModule = buildTestAppModule({
      driver: 'apollo',
      docsAsync: { useFactory: () => ({ path: '/api/docs', title: 'Async Title' }) },
    });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('resolves path and title from factory', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Async Title');
  });
});

describe('forRootAsync with async factory (v0.1.0 limitation)', () => {
  it('throws at registration time if the factory returns a Promise', () => {
    expect(() =>
      buildTestAppModule({
        driver: 'apollo',
        docsAsync: { useFactory: async () => ({ path: '/docs' }) },
      }),
    ).toThrow(/synchronous useFactory/);
  });
});
