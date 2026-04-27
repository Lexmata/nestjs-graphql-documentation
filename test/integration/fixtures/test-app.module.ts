import { Module, Type } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { MercuriusDriver, MercuriusDriverConfig } from '@nestjs/mercurius';
import { GraphQLDocsModule } from '../../../src/graphql-docs.module';
import { GraphQLDocsOptions, GraphQLDocsAsyncOptions } from '../../../src/options';
import { UserResolver } from './resolver';

export type DriverChoice = 'apollo' | 'mercurius';

interface BuildOptions {
  driver: DriverChoice;
  docs?: GraphQLDocsOptions;
  docsAsync?: GraphQLDocsAsyncOptions;
}

export function buildTestAppModule(opts: BuildOptions): Type<unknown> {
  const graphql =
    opts.driver === 'apollo'
      ? GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          autoSchemaFile: true,
          playground: false,
        })
      : GraphQLModule.forRoot<MercuriusDriverConfig>({
          driver: MercuriusDriver,
          autoSchemaFile: true,
          graphiql: false,
        });

  const docsImport = opts.docs
    ? GraphQLDocsModule.forRoot(opts.docs)
    : GraphQLDocsModule.forRootAsync(opts.docsAsync!);

  @Module({
    imports: [graphql, docsImport],
    providers: [UserResolver],
  })
  class TestAppModule {}

  return TestAppModule;
}
