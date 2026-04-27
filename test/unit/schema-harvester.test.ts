import { describe, it, expect, vi } from 'vitest';
import { buildSchema } from 'graphql';
import { SchemaHarvesterService } from '../../src/harvest/schema-harvester.service';
import { GraphQLDocsBootstrapError } from '../../src/options';

const goodSchema = buildSchema(`type Query { hello: String }`);

describe('SchemaHarvesterService', () => {
  it('harvests the schema on onModuleInit and exposes the model', () => {
    const host = { schema: goodSchema };
    const svc = new SchemaHarvesterService(host as never, { path: '/docs', title: 'T' });
    svc.onModuleInit();
    const model = svc.getModel();
    expect(model.meta.title).toBe('T');
    expect(model.queries.map((q) => q.name)).toEqual(['hello']);
  });

  it('uses default title when options.title is absent', () => {
    const host = { schema: goodSchema };
    const svc = new SchemaHarvesterService(host as never, { path: '/docs' });
    svc.onModuleInit();
    expect(svc.getModel().meta.title).toBe('GraphQL API');
  });

  it('throws GraphQLDocsBootstrapError when schema is missing', () => {
    const host = { schema: undefined };
    const svc = new SchemaHarvesterService(host as never, { path: '/docs' });
    expect(() => svc.onModuleInit()).toThrow(GraphQLDocsBootstrapError);
  });

  it('logs a warning when include/exclude predicate throws', () => {
    const host = { schema: goodSchema };
    const warn = vi.fn();
    const svc = new SchemaHarvesterService(host as never, {
      path: '/docs',
      include: () => { throw new Error('boom'); },
    });
    (svc as unknown as { logger: { warn: typeof warn } }).logger = { warn } as never;
    svc.onModuleInit();
    expect(warn).toHaveBeenCalled();
  });

  it('getModel throws if called before onModuleInit', () => {
    const host = { schema: goodSchema };
    const svc = new SchemaHarvesterService(host as never, { path: '/docs' });
    expect(() => svc.getModel()).toThrow();
  });
});
