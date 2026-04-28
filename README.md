# @lexmata/nestjs-graphql-documentation

Swagger-like documentation for NestJS GraphQL apps. Mount the module, visit the configured path, and get a browsable page for every query, mutation, subscription, object type, input type, interface, union, enum, scalar, and directive in your schema. Zero runtime dependencies, driver-agnostic, dual ESM + CJS.

[![CI](https://github.com/lexmata/nestjs-graphql-documentation/actions/workflows/ci.yml/badge.svg)](https://github.com/lexmata/nestjs-graphql-documentation/actions/workflows/ci.yml)
[![CodeQL](https://github.com/lexmata/nestjs-graphql-documentation/actions/workflows/codeql.yml/badge.svg)](https://github.com/lexmata/nestjs-graphql-documentation/actions/workflows/codeql.yml)
[![coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](#testing)
[![npm](https://img.shields.io/npm/v/@lexmata/nestjs-graphql-documentation.svg)](https://www.npmjs.com/package/@lexmata/nestjs-graphql-documentation)
[![node](https://img.shields.io/node/v/@lexmata/nestjs-graphql-documentation)](#requirements)
[![license](https://img.shields.io/npm/l/@lexmata/nestjs-graphql-documentation.svg)](./LICENSE)

---

## Contents

- [Why](#why)
- [Install](#install)
- [Quick start](#quick-start)
- [Options](#options)
- [Documenting your schema](#documenting-your-schema)
- [Async configuration](#async-configuration)
- [Federation](#federation)
- [Styling & theming](#styling--theming)
- [Deep linking & search](#deep-linking--search)
- [Auth & caching](#auth--caching)
- [What the generated page looks like](#what-the-generated-page-looks-like)
- [Public API surface](#public-api-surface)
- [Requirements](#requirements)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [License](#license)

---

## Why

GraphiQL and Apollo Sandbox are excellent **query runners**, but they're weak at read-only **browsable reference**. Swagger UI nails that for REST — `@lexmata/nestjs-graphql-documentation` brings the same experience to GraphQL:

- One-line mount, no codegen, no build step for consumers.
- Stays in sync automatically. The module reads the live `GraphQLSchema` at Nest bootstrap, so what users see is whatever you wired up.
- Zero runtime dependencies in the published package — only peer deps that you already have (`@nestjs/*`, `graphql`, `reflect-metadata`, `rxjs`).
- Works under both `@nestjs/apollo` (Express) and `@nestjs/mercurius` (Fastify) unchanged.
- 100% line and branch coverage, gated in CI. Driver parity gated by Playwright end-to-end tests.

## Install

```bash
pnpm add @lexmata/nestjs-graphql-documentation
# or npm install @lexmata/nestjs-graphql-documentation
# or yarn add @lexmata/nestjs-graphql-documentation
```

The package ships both ESM and CJS. The correct entry is selected automatically by Node and bundlers via the `exports` map — `import` consumers get ESM, `require` consumers get CJS.

## Quick start

Add `GraphQLDocsModule.forRoot(...)` after `GraphQLModule.forRoot(...)` in your `AppModule`:

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

Start the app and visit `http://localhost:3000/graphql/docs`. The Apollo setup is identical — swap `MercuriusDriver` for `ApolloDriver`.

> **Tip:** Keep `GraphQLDocsModule.forRoot` **after** `GraphQLModule.forRoot` in the `imports` array. The docs module looks up the built `GraphQLSchema` from `@nestjs/graphql`'s own module scope; if your GraphQL module isn't registered yet at the moment the docs module initializes, the lookup fails loudly.

## Options

```ts
interface GraphQLDocsOptions {
  path: string; // required
  title?: string; // default 'GraphQL API'
  enabled?: boolean; // default true
  include?: (entity: EntityRef) => boolean; // allow-list predicate
  exclude?: (entity: EntityRef) => boolean; // deny-list predicate
  customCss?: string; // appended after the built-in stylesheet
}

type EntityRef = {
  kind:
    | 'Query'
    | 'Mutation'
    | 'Subscription'
    | 'ObjectType'
    | 'InputType'
    | 'Interface'
    | 'Union'
    | 'Enum'
    | 'Scalar'
    | 'Directive';
  name: string;
};
```

| Option      | Purpose                                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| `path`      | Mount path for the docs UI. The page and its assets (`app.js`, `app.css`, `schema.json`) hang off this prefix. |
| `title`     | Page `<title>` and the label rendered at the top of the sidebar.                                               |
| `enabled`   | When `false`, the module registers **no** routes. Use this to gate docs on environment.                        |
| `include`   | Entity is shown only if the predicate returns `true`. Omit for "show everything".                              |
| `exclude`   | Entity is hidden if the predicate returns `true`. Evaluated **after** `include`.                               |
| `customCss` | CSS appended after the built-in stylesheet — override anything via normal specificity, no `!important` needed. |

Both predicates are **exception-safe**: if your predicate throws, the entity is treated as excluded and a warning is logged via Nest's `Logger`. Your docs won't 500 because of a buggy filter.

### Hiding internal types

```ts
GraphQLDocsModule.forRoot({
  path: '/graphql/docs',
  exclude: (e) => e.name.startsWith('_Internal'),
});
```

### Only showing queries and mutations

```ts
GraphQLDocsModule.forRoot({
  path: '/graphql/docs',
  include: (e) => e.kind === 'Query' || e.kind === 'Mutation',
});
```

## Documenting your schema

The module extracts three structured tags from each GraphQL `description`. Tag lines must begin at column zero; anything else in the description is kept as prose and displayed as the entity's body text.

| Tag              | Shape                                                                  | Example                                                |
| ---------------- | ---------------------------------------------------------------------- | ------------------------------------------------------ |
| `@example`       | Multi-line — everything after the tag up to the next blank line or tag | `@example\nmutation { createUser(name: "Jo") { id } }` |
| `@auth <value>`  | Single-line auth note                                                  | `@auth admin`                                          |
| `@since <value>` | Single-line version note                                               | `@since 1.2.0`                                         |

Tag-like strings **inside fenced code blocks** are left as literal text — you can document the tag syntax in an example without it being swallowed by the parser.

### Example

```ts
import { Args, ID, Mutation, ObjectType, Field, Query, Resolver } from '@nestjs/graphql';

@ObjectType({ description: 'A user record.\n@since 1.0' })
export class User {
  @Field(() => ID) id!: string;
  @Field({ nullable: true, description: 'Display name.' }) name?: string;
}

@Resolver(() => User)
export class UserResolver {
  @Query(() => User, {
    description: `Fetch a user by ID.

@auth user
@example
query { user(id: 1) { id name } }
`,
  })
  user(@Args('id', { type: () => ID }) id: string): User {
    return { id, name: 'Jo' };
  }

  @Mutation(() => User, {
    description: `Creates a new user.

@auth admin
@example
mutation { createUser(name: "Jo") { id } }
`,
  })
  createUser(@Args('name') name: string): User {
    return { id: '1', name };
  }
}
```

The rendered page groups these by kind in the sidebar (_Queries_, _Mutations_, _Object Types_, ...) and shows description, arguments with defaults, return type, auth note, since tag, and example snippets in the main pane.

## Async configuration

Use `forRootAsync` when you want `ConfigService` (or any DI provider) to influence the options:

```ts
GraphQLDocsModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (cfg: ConfigService) => ({
    path: '/graphql/docs',
    title: cfg.get('API_TITLE'),
    enabled: cfg.get('NODE_ENV') !== 'production',
    exclude: (e) => cfg.get<string[]>('DOCS_EXCLUDE', []).includes(e.name),
  }),
});
```

> **v0.1.0 limitation:** `useFactory` must be **synchronous**. The mount path has to bind to Nest's router at module-registration time (before Nest finishes building the app), so an async factory returning a `Promise` throws `synchronous useFactory required` at boot. Read config from synchronously-initialized services (`ConfigService` after `ConfigModule.forRoot({ isGlobal: true })`), or pass a pre-resolved object to `forRoot`.

## Federation

Apollo Federation v2 schemas include internal types (`_Service`, `_Entity`, `_Any`, `_FieldSet`) and root fields (`_service`, `_entities`) that shouldn't show up in user-facing docs. The module detects these automatically by probing the schema and hides them from the rendered page while keeping user-applied `@key` directives visible on types. No configuration required.

## Styling & theming

The served HTML loads [**Pico.css v2.1.1**](https://picocss.com) from jsDelivr with an SRI integrity hash pinned to that exact version. Pico gives us a classless base theme that respects `prefers-color-scheme`, so the docs look right in both light and dark mode without any extra work.

On top of Pico, the module ships a ~100-line stylesheet (`app.css`) covering the sidebar layout, nav highlight states, deprecation and tag badges, and a mobile breakpoint that collapses the sidebar to a top bar below 800 px wide.

Override anything via `customCss`:

```ts
GraphQLDocsModule.forRoot({
  path: '/graphql/docs',
  title: 'Acme API',
  customCss: `
    .ngd-sidebar h1 { font-weight: 700; color: #c026d3; }
    .ngd-deprecated { background: #f97316; }
  `,
});
```

`customCss` is appended **after** the built-in styles, so normal CSS specificity lets you override anything without `!important`.

## Deep linking & search

- **URLs are shareable.** Every entity has a stable path: `/graphql/docs/queries/user`, `/graphql/docs/mutations/createUser`, `/graphql/docs/types/User`, etc. Paste the URL into Slack, a commit message, or a bug report and recipients land on the same entity you were looking at.
- **First paint is correct.** The server embeds the initial entity into the HTML so deep links render without a flash or a client-side re-navigation.
- **SPA navigation.** Clicking a sidebar entry uses `history.pushState` — no page reload, no re-fetch. Back and forward buttons work.
- **Client-side filtering.** A search input at the top of the sidebar filters entries by case-insensitive substring match as you type.
- **Resilient.** If `schema.json` fails to load (auth redirect, proxy outage, etc.) the page shows a visible banner with the HTTP status instead of silently appearing empty.

## Auth & caching

The module intentionally doesn't ship its own authentication. Wrap the mount path with Nest's existing primitives:

```ts
// Global interceptor — simplest for a single-tenant deployment
app.use('/graphql/docs', authMiddleware);

// Or per-controller via Nest guards
@UseGuards(AdminGuard)
@Controller('/graphql/docs')
```

Three cache-control defaults are set for you:

| Endpoint               | `Cache-Control`                                                |
| ---------------------- | -------------------------------------------------------------- |
| `/<path>` (shell HTML) | none — the shell is free to render, so clients always re-fetch |
| `/<path>/app.js`       | `public, max-age=3600`                                         |
| `/<path>/app.css`      | `public, max-age=3600`                                         |
| `/<path>/schema.json`  | `private, max-age=3600`                                        |

`schema.json` uses `private` on purpose: once a host app places the docs route behind auth, the schema response may legitimately differ per tenant. A shared cache (CDN, corporate proxy) storing it as `public` for an hour would leak one tenant's schema to another. `app.js` and `app.css` are identical for every caller, so shared caching is safe. Override via a Nest interceptor if your deployment needs different TTLs.

## What the generated page looks like

```
┌──────────────────────┬──────────────────────────────────────────────────────┐
│  My API              │  user                                        [auth]  │
│  [ filter... ]       │                                                       │
│                      │  Fetch a user by ID.                                  │
│  QUERIES             │                                                       │
│  • me                │  Returns:  User                                       │
│  • user              │                                                       │
│                      │  Arguments                                            │
│  MUTATIONS           │  ┌──────┬──────┬─────────┬──────────────────────────┐│
│  • createUser        │  │ Name │ Type │ Default │ Description              ││
│  • deleteUser        │  ├──────┼──────┼─────────┼──────────────────────────┤│
│                      │  │ id   │ ID!  │         │ The user's primary key.  ││
│  OBJECT TYPES        │  └──────┴──────┴─────────┴──────────────────────────┘│
│  • User              │                                                       │
│  • Post              │  Examples                                             │
│                      │  ┌───────────────────────────────────────────────────┐│
│  ENUMS               │  │ query { user(id: 1) { id name } }                 ││
│  • Role              │  └───────────────────────────────────────────────────┘│
└──────────────────────┴──────────────────────────────────────────────────────┘
```

## Public API surface

Everything exported from the package's entry point:

```ts
import {
  // The dynamic module itself
  GraphQLDocsModule,

  // Configuration
  GraphQLDocsOptions,
  GraphQLDocsAsyncOptions,
  GraphQLDocsBootstrapError,
  GRAPHQL_DOCS_OPTIONS,

  // Docs-model IR types — exported so advanced consumers can
  // render their own UI against schema.json.
  DocsModel,
  FieldEntry,
  ArgEntry,
  TypeEntry,
  UnionEntry,
  EnumEntry,
  EnumValueEntry,
  ScalarEntry,
  DirectiveEntry,
  TypeRef,
  NamedTypeKind,
  ParsedTags,
  EntityKind,
  EntityRef,
} from '@lexmata/nestjs-graphql-documentation';
```

Anything not listed here is internal and may change without a major version bump.

## Requirements

- **Node.js 22+** (enforced via `engines.node` in `package.json`).
- **NestJS 10 or 11** — peer dependency `^10.0.0 || ^11.0.0` on `@nestjs/common` and `@nestjs/core`.
- **@nestjs/graphql 12 or 13** — peer dependency `^12.0.0 || ^13.0.0`.
- **graphql 16** — peer dependency `^16.0.0`.
- **reflect-metadata** — peer dependency `^0.1.13 || ^0.2.0`.
- **rxjs 7+** — peer dependency `^7.0.0`.

Both Apollo (Express-based) and Mercurius (Fastify-based) drivers are supported. No additional setup needed beyond whatever your host app already does for GraphQL.

## Troubleshooting

**`GraphQLDocsBootstrapError: GraphQLSchema is not available`**
Your `GraphQLModule.forRoot(...)` runs after `GraphQLDocsModule.forRoot(...)` in the imports array, or you forgot `GraphQLModule` entirely. Put `GraphQLModule.forRoot` first.

**`forRootAsync requires a synchronous useFactory`**
Your `useFactory` returns a `Promise`. See [Async configuration](#async-configuration) — v0.1.0 requires the factory to resolve synchronously. Pull config from an already-initialized `ConfigService` instead of awaiting.

**404s on `/graphql/docs/mutations/createUser`**
The entity name is case-sensitive and URL-encoded. Confirm the resolver actually registered. The plain `/graphql/docs` page should show it in the sidebar — if it doesn't, your `include`/`exclude` predicate is filtering it out, or `@nestjs/graphql` isn't picking up the resolver.

**"Failed to load schema" banner in the browser**
Some request in the chain between browser and Nest is blocking the JSON route. Open devtools → Network, find the `schema.json` request, check its status. Common culprits: an auth middleware that redirects unauthenticated requests, a reverse proxy that strips subpaths, a global `ValidationPipe` with `transform: true` that chokes on the content-type.

**Styles look wrong or unstyled**
jsDelivr might be blocked on your network. Pico.css is loaded from `https://cdn.jsdelivr.net/npm/@picocss/pico@2.1.1/css/pico.min.css` with an SRI hash. Either unblock jsDelivr or vendor Pico via `customCss` (paste the minified CSS directly).

**Types aren't updating after a schema change**
The schema is harvested once at bootstrap via `OnModuleInit`. Restart your Nest process — in dev, `pnpm start:dev` (nodemon/ts-node) handles this automatically.

## Development

```bash
pnpm install         # installs deps + wires up husky pre-commit/commit-msg hooks
pnpm build           # dual ESM + CJS under dist/
pnpm test:cov        # unit + integration, 100% coverage gate
pnpm test:e2e        # Playwright browser tests (requires `pnpm test:e2e:install` first)
pnpm test:all        # test + test:e2e back to back
pnpm lint            # ESLint (flat config) + typescript-eslint + unicorn
pnpm format          # prettier --write .
```

CI runs lint, format check, type-check, build (both trees), unit + integration (with the 100% coverage gate), and the Playwright E2E suite — all in parallel — plus weekly CodeQL security analysis. A single meta-job (`CI success`) gates merges so the branch protection rule can require it and get all-or-nothing behaviour.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the commit convention, branching model, and testing rules, and [`SECURITY.md`](./SECURITY.md) for vulnerability reporting.

## License

[MIT](./LICENSE) © Lexmata LLC
