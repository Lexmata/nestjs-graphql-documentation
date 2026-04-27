import { describe, it, expect } from 'vitest';
import { GraphQLDocsModule } from '../../src/graphql-docs.module';
import { GRAPHQL_DOCS_OPTIONS } from '../../src/options';

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
});
