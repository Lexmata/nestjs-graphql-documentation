import { DynamicModule, Module, Provider } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { SchemaHarvesterService } from './harvest/schema-harvester.service';
import { GraphQLDocsController } from './graphql-docs.controller';
import {
  GRAPHQL_DOCS_OPTIONS,
  GraphQLDocsOptions,
  GraphQLDocsAsyncOptions,
} from './options';

@Module({})
export class GraphQLDocsModule {
  static forRoot(options: GraphQLDocsOptions): DynamicModule {
    if (options.enabled === false) {
      return { module: GraphQLDocsModule, controllers: [], providers: [], imports: [] };
    }
    return buildModule(options.path, [
      { provide: GRAPHQL_DOCS_OPTIONS, useValue: options },
    ]);
  }

  static forRootAsync(async: GraphQLDocsAsyncOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: GRAPHQL_DOCS_OPTIONS,
      useFactory: async.useFactory,
      inject: async.inject ?? [],
    };
    // v0.1.0: mount path must resolve synchronously because RouterModule.register
    // binds routes at module registration time. Call the factory once with
    // placeholder inject args to read the path; fail loudly if it's async.
    const injected = (async.inject ?? []).map(() => undefined as unknown);
    const maybe = async.useFactory(...injected);
    if (maybe instanceof Promise) {
      throw new Error(
        '@lexmata/nestjs-graphql-documentation: forRootAsync requires a synchronous useFactory in v0.1.0 (path must be known at module registration).',
      );
    }
    const resolvedPath = (maybe as GraphQLDocsOptions).path;
    if (!resolvedPath) {
      throw new Error(
        '@lexmata/nestjs-graphql-documentation: forRootAsync factory did not return a path.',
      );
    }
    return buildModule(resolvedPath, [optionsProvider], async.imports ?? []);
  }
}

function buildModule(
  path: string,
  providers: Provider[],
  imports: NonNullable<DynamicModule['imports']> = [],
): DynamicModule {
  class GraphQLDocsInnerModule {}
  const innerModule: DynamicModule = {
    module: GraphQLDocsInnerModule,
    controllers: [GraphQLDocsController],
    providers: [...providers, SchemaHarvesterService],
    exports: [SchemaHarvesterService, GRAPHQL_DOCS_OPTIONS],
    imports: [GraphQLModule, ...imports],
  };

  return {
    module: GraphQLDocsModule,
    imports: [
      innerModule,
      RouterModule.register([{ path, module: GraphQLDocsInnerModule }]),
    ],
  };
}
