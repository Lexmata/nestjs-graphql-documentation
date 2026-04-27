import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { buildTestAppModule, DriverChoice } from './fixtures/test-app.module';

describe.each<DriverChoice>(['apollo', 'mercurius'])('forRoot with %s driver', (driver) => {
  let app: INestApplication;

  beforeEach(async () => {
    const AppModule = buildTestAppModule({
      driver,
      docs: { path: '/graphql/docs', title: 'Fixture API' },
    });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    if (driver === 'mercurius') {
      app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
      await app.init();
      await (app as NestFastifyApplication).getHttpAdapter().getInstance().ready();
    } else {
      app = moduleRef.createNestApplication();
      await app.init();
    }

  });

  afterEach(async () => {
    await app.close();
  });

  it('serves HTML at /graphql/docs', async () => {
    const res = await request(app.getHttpServer()).get('/graphql/docs');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('Fixture API');
  });

  it('serves JS at /graphql/docs/app.js', async () => {
    const res = await request(app.getHttpServer()).get('/graphql/docs/app.js');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/javascript/);
    expect(res.text).toContain('history.pushState');
  });

  it('serves CSS at /graphql/docs/app.css', async () => {
    const res = await request(app.getHttpServer()).get('/graphql/docs/app.css');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/css/);
    expect(res.text).toContain('.ngd-sidebar');
  });

  it('serves schema JSON with the fixture entities', async () => {
    const res = await request(app.getHttpServer()).get('/graphql/docs/schema.json');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.text);
    expect(body.queries.map((q: { name: string }) => q.name)).toContain('user');
    expect(body.mutations.map((m: { name: string }) => m.name)).toContain('createUser');
    const userQuery = body.queries.find((q: { name: string }) => q.name === 'user');
    expect(userQuery.tags.auth).toBe('user');
    expect(userQuery.tags.examples[0]).toContain('query { user(id: 1)');
  });

  it('renders deep links with __INITIAL_ENTITY__', async () => {
    const res = await request(app.getHttpServer()).get('/graphql/docs/queries/user');
    expect(res.status).toBe(200);
    expect(res.text).toContain('__INITIAL_ENTITY__');
    expect(res.text).toMatch(/"kind":"Query","name":"user"/);
  });
});
