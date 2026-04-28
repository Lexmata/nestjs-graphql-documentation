import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CacheModule } from '@nestjs/cache-manager';
import request from 'supertest';
import { buildTestAppModule } from './fixtures/test-app.module';

describe('cache integration', () => {
  describe('with CacheModule registered', () => {
    let app: INestApplication;

    beforeEach(async () => {
      const AppModule = buildTestAppModule({
        driver: 'apollo',
        docs: { path: '/graphql/docs', title: 'Cache Test', cache: { ttl: 1 } },
      });
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule, CacheModule.register()],
      }).compile();
      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('serves schema.json successfully with caching enabled', async () => {
      const res = await request(app.getHttpServer()).get('/graphql/docs/schema.json');
      expect(res.status).toBe(200);
      const body = JSON.parse(res.text);
      expect(body.queries).toBeDefined();
    });

    it('serves consistent schema.json on second request (cache hit)', async () => {
      const res1 = await request(app.getHttpServer()).get('/graphql/docs/schema.json');
      expect(res1.status).toBe(200);
      const res2 = await request(app.getHttpServer()).get('/graphql/docs/schema.json');
      expect(res2.status).toBe(200);
      expect(res2.text).toBe(res1.text);
    });

    it('still serves correct schema.json after TTL expires', async () => {
      const res1 = await request(app.getHttpServer()).get('/graphql/docs/schema.json');
      expect(res1.status).toBe(200);
      // Wait for TTL to expire (1s TTL + buffer)
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const res2 = await request(app.getHttpServer()).get('/graphql/docs/schema.json');
      expect(res2.status).toBe(200);
      // Content should still be correct after reharvest
      expect(JSON.parse(res2.text).queries).toBeDefined();
    });

    it('serves HTML with caching enabled', async () => {
      const res = await request(app.getHttpServer()).get('/graphql/docs');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Cache Test');
    });

    it('caches deep-link HTML responses', async () => {
      const res1 = await request(app.getHttpServer()).get('/graphql/docs/queries/user');
      expect(res1.status).toBe(200);
      const res2 = await request(app.getHttpServer()).get('/graphql/docs/queries/user');
      expect(res2.status).toBe(200);
      expect(res2.text).toBe(res1.text);
    });
  });

  describe('without CacheModule (graceful degradation)', () => {
    let app: INestApplication;

    beforeEach(async () => {
      const AppModule = buildTestAppModule({
        driver: 'apollo',
        docs: { path: '/graphql/docs', title: 'No Cache', cache: true },
      });
      // Deliberately NOT importing CacheModule — DocsCacheService should degrade gracefully
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('still serves schema.json without crashing', async () => {
      const res = await request(app.getHttpServer()).get('/graphql/docs/schema.json');
      expect(res.status).toBe(200);
      expect(JSON.parse(res.text).queries).toBeDefined();
    });

    it('still serves HTML without crashing', async () => {
      const res = await request(app.getHttpServer()).get('/graphql/docs');
      expect(res.status).toBe(200);
      expect(res.text).toContain('No Cache');
    });
  });
});
