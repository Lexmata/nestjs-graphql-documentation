import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { walkSchema } from './walker';
import { detectFederation } from './federation';
import type { DocsModel, EntityRef } from './docs-model';
import {
  GRAPHQL_DOCS_OPTIONS,
  GraphQLDocsOptions,
  GraphQLDocsBootstrapError,
} from '../options';

@Injectable()
export class SchemaHarvesterService implements OnModuleInit {
  private readonly logger = new Logger(SchemaHarvesterService.name);
  private model: DocsModel | undefined;

  constructor(
    private readonly schemaHost: GraphQLSchemaHost,
    @Inject(GRAPHQL_DOCS_OPTIONS) private readonly options: GraphQLDocsOptions,
  ) {}

  onModuleInit(): void {
    const schema = this.schemaHost.schema;
    if (!schema) {
      throw new GraphQLDocsBootstrapError(
        '@lexmata/nestjs-graphql-documentation: GraphQLSchema is not available. ' +
          'Register @nestjs/graphql before GraphQLDocsModule.',
      );
    }
    const wrappedInclude = wrapPredicate(this.options.include, this.logger, 'include');
    const wrappedExclude = wrapPredicate(this.options.exclude, this.logger, 'exclude');
    this.model = walkSchema(schema, {
      title: this.options.title ?? 'GraphQL API',
      isFederated: detectFederation(schema),
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
    } catch (err) {
      logger.warn(`${kind} predicate threw for ${e.kind} ${e.name}: ${(err as Error).message}`);
      return kind === 'exclude';
    }
  };
}
