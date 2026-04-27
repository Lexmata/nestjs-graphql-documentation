# @lexmata/nestjs-graphql-documentation

A Swagger-like documentation module for NestJS GraphQL applications. Mount it in your `AppModule`, visit the configured path, and get a browsable docs page for every query, mutation, subscription, object type, input type, interface, union, enum, scalar, and directive in your schema.

Driver-agnostic: works with `@nestjs/apollo` and `@nestjs/mercurius`.

## Install

```bash
pnpm add @lexmata/nestjs-graphql-documentation
```

Peer dependencies: `@nestjs/common`, `@nestjs/core`, `@nestjs/graphql`, `graphql`, `reflect-metadata`, `rxjs`.

## Quick start

```ts
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { MercuriusDriver, MercuriusDriverConfig } from '@nestjs/mercurius';
import { GraphQLDocsModule } from '@lexmata/nestjs-graphql-documentation';

@Module({
  imports: [
    GraphQLModule.forRoot<MercuriusDriverConfig>({
      driver: MercuriusDriver,
      autoSchemaFile: true,
    }),
    GraphQLDocsModule.forRoot({
      path: '/graphql/docs',
      title: 'My API',
    }),
  ],
})
export class AppModule {}
```

Visit `http://localhost:3000/graphql/docs`.

## Options

| Option      | Type                          | Default         | Description                                                 |
| ----------- | ----------------------------- | --------------- | ----------------------------------------------------------- |
| `path`      | `string`                      | _required_      | Mount path for the docs UI.                                 |
| `title`     | `string`                      | `'GraphQL API'` | Title shown in the page.                                    |
| `enabled`   | `boolean`                     | `true`          | When `false`, no routes are registered.                     |
| `include`   | `(EntityRef) => boolean`      | _none_          | Predicate — entity is shown only if this returns `true`.    |
| `exclude`   | `(EntityRef) => boolean`      | _none_          | Predicate — entity is hidden if this returns `true`.        |
| `customCss` | `string`                      | _none_          | CSS appended after the built-in stylesheet.                 |

`EntityRef` is `{ kind: 'Query' | 'Mutation' | 'Subscription' | 'ObjectType' | 'InputType' | 'Interface' | 'Union' | 'Enum' | 'Scalar' | 'Directive'; name: string }`.

## Async configuration

```ts
GraphQLDocsModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (cfg: ConfigService) => ({
    path: '/graphql/docs',
    enabled: cfg.get('NODE_ENV') !== 'production',
  }),
});
```

**v0.1.0 limitation:** `useFactory` must be synchronous. The mount path has to be known at module registration time (before Nest's router is built). An async factory (returning a Promise) throws `synchronous useFactory required` at boot.

## Documentation tags

The module reads each GraphQL `description` and extracts three structured tags from lines at column zero, leaving the remaining prose as the displayed description body:

- `@example` — multi-line code block (terminates at the next blank line or tag).
- `@auth <value>` — single-line auth note.
- `@since <value>` — single-line version note.

Tag-like strings inside fenced code blocks are left as literal text.

```ts
@Query(() => User, {
  description: `Fetch a user by ID.

@auth user
@example
query { user(id: 1) { id name } }
`,
})
user(@Args('id', { type: () => ID }) id: string) { /* ... */ }
```

## Styling

The served HTML loads [Pico.css v2.1.1](https://picocss.com) from jsdelivr with an SRI hash for integrity. On top of Pico's classless defaults, the module adds a small (~100-line) stylesheet for the sidebar layout, nav highlight, and mobile breakpoint. Override anything via `customCss`, which appends after the built-in rules.

## Guarding the docs route

The module does not ship authentication. Wrap the mount path with Nest's guards, middleware, or a reverse-proxy rule.

## License

MIT © Lexmata LLC
