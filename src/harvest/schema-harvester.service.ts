import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { walkSchema } from './walker.js';
import { detectFederation } from './federation.js';
import type { DocsModel, EntityRef } from './docs-model.js';
import { GRAPHQL_DOCS_OPTIONS, GraphQLDocsOptions, GraphQLDocsBootstrapError } from '../options.js';

interface SchemaHostLike {
  schema: unknown;
}

@Injectable()
export class SchemaHarvesterService implements OnModuleInit {
  private readonly logger = new Logger(SchemaHarvesterService.name);
  private model: DocsModel | undefined;

  constructor(
    private readonly moduleRef: ModuleRef,
    @Inject(GRAPHQL_DOCS_OPTIONS) private readonly options: GraphQLDocsOptions,
  ) {}

  onModuleInit(): void {
    // Look up GraphQLSchemaHost lazily via ModuleRef with { strict: false } so
    // we pick it up from @nestjs/graphql's own module scope. Injecting it
    // directly would require re-importing GraphQLModule, which tries to
    // instantiate a second module without its forRoot options.
    const host = this.tryGetSchemaHost();
    const schema = host?.schema;
    if (!schema) {
      throw new GraphQLDocsBootstrapError(
        '@lexmata/nestjs-graphql-documentation: GraphQLSchema is not available. ' +
          'Register @nestjs/graphql before GraphQLDocsModule.',
      );
    }
    const wrappedInclude = wrapPredicate(this.options.include, this.logger, 'include');
    const wrappedExclude = wrapPredicate(this.options.exclude, this.logger, 'exclude');
    this.model = walkSchema(schema as never, {
      title: this.options.title ?? 'GraphQL API',
      isFederated: detectFederation(schema as never),
      include: wrappedInclude,
      exclude: wrappedExclude,
    });
  }

  getModel(): DocsModel {
    if (!this.model) {
      throw new Error(
        '@lexmata/nestjs-graphql-documentation: getModel() called before onModuleInit completed.',
      );
    }
    return this.model;
  }

  private tryGetSchemaHost(): SchemaHostLike | undefined {
    // The test path injects a mock via property access on `schemaHost`. Keep
    // that contract: if a mock was attached, prefer it.
    const mock = (this as unknown as { schemaHost?: SchemaHostLike }).schemaHost;
    if (mock) return mock;
    try {
      return this.moduleRef.get(GraphQLSchemaHost, { strict: false });
    } catch {
      return undefined;
    }
  }
}

function wrapPredicate(
  pred: ((e: EntityRef) => boolean) | undefined,
  logger: Logger,
  kind: string,
): ((e: EntityRef) => boolean) | undefined {
  if (!pred) return undefined;
  return (e) => {
    try {
      return pred(e);
    } catch (error) {
      logger.warn(`${kind} predicate threw for ${e.kind} ${e.name}: ${(error as Error).message}`);
      return kind === 'exclude';
    }
  };
}
