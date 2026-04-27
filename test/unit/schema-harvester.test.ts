import { describe, it, expect, vi } from 'vitest';
import { buildSchema } from 'graphql';
import { SchemaHarvesterService } from '../../src/harvest/schema-harvester.service';
import { GraphQLDocsBootstrapError } from '../../src/options';

const goodSchema = buildSchema(`type Query { hello: String }`);

const emptyModuleRef = { get: () => undefined } as never;

function makeService(schema: unknown, options: Record<string, unknown>): SchemaHarvesterService {
  const svc = new SchemaHarvesterService(emptyModuleRef, options as never);
  // Attach the mock schema host directly; the service's tryGetSchemaHost prefers
  // an attached `schemaHost` over ModuleRef so unit tests stay decoupled from Nest.
  (svc as unknown as { schemaHost: { schema: unknown } }).schemaHost = { schema };
  return svc;
}

describe('SchemaHarvesterService', () => {
  it('harvests the schema on onModuleInit and exposes the model', () => {
    const svc = makeService(goodSchema, { path: '/docs', title: 'T' });
    svc.onModuleInit();
    const model = svc.getModel();
    expect(model.meta.title).toBe('T');
    expect(model.queries.map((q) => q.name)).toEqual(['hello']);
  });

  it('uses default title when options.title is absent', () => {
    const svc = makeService(goodSchema, { path: '/docs' });
    svc.onModuleInit();
    expect(svc.getModel().meta.title).toBe('GraphQL API');
  });

  it('throws GraphQLDocsBootstrapError when schema is missing', () => {
    const svc = makeService(undefined, { path: '/docs' });
    expect(() => svc.onModuleInit()).toThrow(GraphQLDocsBootstrapError);
  });

  it('logs a warning when include/exclude predicate throws', () => {
    const warn = vi.fn();
    const svc = makeService(goodSchema, {
      path: '/docs',
      include: () => {
        throw new Error('boom');
      },
    });
    (svc as unknown as { logger: { warn: typeof warn } }).logger = { warn } as never;
    svc.onModuleInit();
    expect(warn).toHaveBeenCalled();
  });

  it('getModel throws if called before onModuleInit', () => {
    const svc = makeService(goodSchema, { path: '/docs' });
    expect(() => svc.getModel()).toThrow();
  });
});
