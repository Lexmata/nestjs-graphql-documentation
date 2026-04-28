import { Controller, DynamicModule, Module, Provider } from '@nestjs/common';
import { SchemaHarvesterService } from './harvest/schema-harvester.service.js';
import { GraphQLDocsController } from './graphql-docs.controller.js';
import { GRAPHQL_DOCS_OPTIONS, GraphQLDocsOptions, GraphQLDocsAsyncOptions } from './options.js';

@Module({})
export class GraphQLDocsModule {
  static forRoot(options: GraphQLDocsOptions): DynamicModule {
    if (options.enabled === false) {
      return { module: GraphQLDocsModule, controllers: [], providers: [], imports: [] };
    }
    return buildModule(options.path, [{ provide: GRAPHQL_DOCS_OPTIONS, useValue: options }]);
  }

  static forRootAsync(async: GraphQLDocsAsyncOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: GRAPHQL_DOCS_OPTIONS,
      useFactory: async.useFactory,
      inject: async.inject ?? [],
    };
    // v0.1.0: the mount path must resolve synchronously because Nest binds the
    // controller path at module-registration time. Call the factory once with
    // placeholder inject args to read the path; fail loudly if it is async.
    const injected = (async.inject ?? []).map(() => undefined as unknown);
    const maybe = async.useFactory(...injected);
    if (maybe instanceof Promise) {
      throw new TypeError(
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
  const PathBound = createPathBoundController(path);
  return {
    module: GraphQLDocsModule,
    imports,
    controllers: [PathBound],
    providers: [...providers, SchemaHarvesterService],
    exports: [SchemaHarvesterService, GRAPHQL_DOCS_OPTIONS],
  };
}

// Nest scans routes by iterating Object.getOwnPropertyNames(Controller.prototype).
// A bare `class X extends Parent {}` subclass has no own methods, so Nest sees
// zero routes — even though the method decorator metadata on the parent still
// attaches the @Get paths. Copy the parent's own properties onto the subclass
// prototype so Nest's scanner finds them. The copied descriptors keep the same
// function objects, so the decorator metadata stays reachable.
function createPathBoundController(path: string): typeof GraphQLDocsController {
  class PathBoundDocsController extends GraphQLDocsController {}
  const parentProto = GraphQLDocsController.prototype;
  for (const name of Object.getOwnPropertyNames(parentProto)) {
    if (name === 'constructor') continue;
    const desc = Object.getOwnPropertyDescriptor(parentProto, name);
    if (desc) Object.defineProperty(PathBoundDocsController.prototype, name, desc);
  }
  Controller(path)(PathBoundDocsController);
  return PathBoundDocsController;
}
