import { describe, it, expect } from 'vitest';
import { GraphQLDocsModule } from '../../src/graphql-docs.module';
import { GRAPHQL_DOCS_OPTIONS } from '../../src/options';
import { DocsCacheService } from '../../src/cache/docs-cache.service';

describe('GraphQLDocsModule', () => {
  it('forRoot registers a path-bound controller, harvester, and options provider', () => {
    const def = GraphQLDocsModule.forRoot({ path: '/docs' });
    expect(def.module).toBe(GraphQLDocsModule);
    expect(def.controllers ?? []).toHaveLength(1);
    const providers = def.providers ?? [];
    const hasOptions = providers.some(
      (p) =>
        typeof p === 'object' &&
        p !== null &&
        (p as { provide?: unknown }).provide === GRAPHQL_DOCS_OPTIONS,
    );
    expect(hasOptions).toBe(true);
  });

  it('forRoot with enabled:false returns an empty module definition', () => {
    const def = GraphQLDocsModule.forRoot({ path: '/docs', enabled: false });
    expect(def.controllers ?? []).toEqual([]);
    expect(def.providers ?? []).toEqual([]);
    expect(def.imports ?? []).toEqual([]);
  });

  it('forRootAsync with synchronous factory registers a controller and options provider', () => {
    const def = GraphQLDocsModule.forRootAsync({
      useFactory: () => ({ path: '/docs' }),
    });
    expect(def.module).toBe(GraphQLDocsModule);
    expect(def.controllers ?? []).toHaveLength(1);
    const providers = def.providers ?? [];
    const hasOptions = providers.some(
      (p) =>
        typeof p === 'object' &&
        p !== null &&
        (p as { provide?: unknown }).provide === GRAPHQL_DOCS_OPTIONS,
    );
    expect(hasOptions).toBe(true);
  });

  it('forRootAsync throws when the factory returns a Promise', () => {
    expect(() =>
      GraphQLDocsModule.forRootAsync({
        useFactory: async () => ({ path: '/docs' }),
      }),
    ).toThrow(/synchronous useFactory/);
  });

  it('forRootAsync throws when the factory returns options with no path', () => {
    expect(() =>
      GraphQLDocsModule.forRootAsync({
        useFactory: () => ({ path: '' }),
      }),
    ).toThrow(/did not return a path/);
  });

  it('forRootAsync honors the inject array by passing placeholder args to the factory', () => {
    let received: unknown[] = [];
    const def = GraphQLDocsModule.forRootAsync({
      inject: ['TOKEN_A', 'TOKEN_B'],
      useFactory: (...args) => {
        received = args;
        return { path: '/docs' };
      },
    });
    expect(def.module).toBe(GraphQLDocsModule);
    expect(received).toHaveLength(2);
  });

  it('forRootAsync forwards the imports array onto the returned module definition', () => {
    class FakeModule {}
    const def = GraphQLDocsModule.forRootAsync({
      imports: [FakeModule],
      useFactory: () => ({ path: '/docs' }),
    });
    expect(def.imports).toContain(FakeModule);
  });

  it('forRoot with cache:true registers DocsCacheService as a provider', () => {
    const def = GraphQLDocsModule.forRoot({ path: '/docs', cache: true });
    const providers = def.providers ?? [];
    const hasCacheService = providers.includes(DocsCacheService);
    expect(hasCacheService).toBe(true);
  });

  it('forRoot without cache does NOT register DocsCacheService', () => {
    const def = GraphQLDocsModule.forRoot({ path: '/docs' });
    const providers = def.providers ?? [];
    const hasCacheService = providers.includes(DocsCacheService);
    expect(hasCacheService).toBe(false);
  });
});
