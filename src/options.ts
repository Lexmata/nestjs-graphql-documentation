import type { ModuleMetadata, FactoryProvider } from '@nestjs/common';
import type { EntityRef } from './harvest/docs-model';

export const GRAPHQL_DOCS_OPTIONS = Symbol('GRAPHQL_DOCS_OPTIONS');

export interface GraphQLDocsOptions {
  path: string;
  title?: string;
  enabled?: boolean;
  include?: (entity: EntityRef) => boolean;
  exclude?: (entity: EntityRef) => boolean;
  customCss?: string;
}

export interface GraphQLDocsAsyncOptions {
  imports?: ModuleMetadata['imports'];
  inject?: FactoryProvider['inject'];
  useFactory: (...args: unknown[]) => Promise<GraphQLDocsOptions> | GraphQLDocsOptions;
}

export class GraphQLDocsBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GraphQLDocsBootstrapError';
  }
}
