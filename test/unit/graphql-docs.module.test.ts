import { describe, it, expect } from 'vitest';
import { GraphQLDocsModule } from '../../src/graphql-docs.module';
import { GRAPHQL_DOCS_OPTIONS } from '../../src/options';

describe('GraphQLDocsModule', () => {
  it('forRoot registers controller, harvester, and options provider (via inner module)', () => {
    const def = GraphQLDocsModule.forRoot({ path: '/docs' });
    expect(def.module).toBe(GraphQLDocsModule);
    const innerModule = (def.imports ?? []).find(
      (m: unknown) =>
        typeof m === 'object' && m !== null && 'controllers' in (m as object),
    ) as
      | { controllers: unknown[]; providers: Array<{ provide?: unknown }> }
      | undefined;
    expect(innerModule).toBeDefined();
    expect(innerModule!.controllers.length).toBeGreaterThanOrEqual(1);
    const hasOptionsProvider = innerModule!.providers.some(
      (p) => (p as { provide?: unknown }).provide === GRAPHQL_DOCS_OPTIONS,
    );
    expect(hasOptionsProvider).toBe(true);
  });

  it('forRoot with enabled:false returns an empty module definition', () => {
    const def = GraphQLDocsModule.forRoot({ path: '/docs', enabled: false });
    expect(def.controllers ?? []).toEqual([]);
    expect(def.providers ?? []).toEqual([]);
    expect(def.imports ?? []).toEqual([]);
  });

  it('forRootAsync with synchronous factory registers module with resolved path', () => {
    const def = GraphQLDocsModule.forRootAsync({
      useFactory: () => ({ path: '/docs' }),
    });
    expect(def.module).toBe(GraphQLDocsModule);
    expect(def.imports?.length).toBeGreaterThan(0);
  });

  it('forRootAsync throws when the factory returns a Promise', () => {
    expect(() =>
      GraphQLDocsModule.forRootAsync({
        useFactory: async () => ({ path: '/docs' }),
      }),
    ).toThrow(/synchronous useFactory/);
  });
});
