import { describe, it, expect, vi } from 'vitest';
import { buildSchema } from 'graphql';
import { SchemaHarvesterService } from '../../src/harvest/schema-harvester.service';
import { GraphQLDocsBootstrapError } from '../../src/options';

const goodSchema = buildSchema(`type Query { hello: String }`);

const emptyModuleRef = { get: () => {} } as never;

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

  it('throws GraphQLDocsBootstrapError when ModuleRef.get throws and no mock host is attached', () => {
    // Simulate the real Nest path: ModuleRef.get raises because GraphQLSchemaHost
    // isn't available in the current module scope. tryGetSchemaHost catches and
    // returns undefined, then onModuleInit throws the bootstrap error.
    const throwingModuleRef = {
      get: () => {
        throw new Error('provider not found');
      },
    } as never;
    const svc = new SchemaHarvesterService(throwingModuleRef, { path: '/docs' } as never);
    expect(() => svc.onModuleInit()).toThrow(GraphQLDocsBootstrapError);
  });

  it('resolves GraphQLSchemaHost via ModuleRef when no mock host is attached', () => {
    const moduleRef = {
      get: () => ({ schema: goodSchema }),
    } as never;
    const svc = new SchemaHarvesterService(moduleRef, { path: '/docs' } as never);
    svc.onModuleInit();
    expect(svc.getModel().queries[0].name).toBe('hello');
  });

  it('exclude predicate that throws is treated as excluded', () => {
    const warn = vi.fn();
    const svc = makeService(goodSchema, {
      path: '/docs',
      exclude: () => {
        throw new Error('boom');
      },
    });
    (svc as unknown as { logger: { warn: typeof warn } }).logger = { warn } as never;
    svc.onModuleInit();
    expect(warn).toHaveBeenCalled();
    // Every query is excluded because the predicate always throws.
    expect(svc.getModel().queries).toHaveLength(0);
  });

  it('reharvest() re-walks the schema and replaces the model', () => {
    const svc = makeService(goodSchema, { path: '/docs', title: 'T' });
    svc.onModuleInit();
    const model1 = svc.getModel();
    svc.reharvest();
    const model2 = svc.getModel();
    expect(model2).not.toBe(model1);
    expect(model2.meta.title).toBe('T');
  });

  it('reharvest() throws GraphQLDocsBootstrapError when schema is missing', () => {
    const svc = makeService(goodSchema, { path: '/docs' });
    svc.onModuleInit();
    (svc as unknown as { schemaHost: { schema: unknown } }).schemaHost = { schema: undefined };
    expect(() => svc.reharvest()).toThrow(GraphQLDocsBootstrapError);
  });
});
