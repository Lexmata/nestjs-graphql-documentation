# nestjs-graphql-documentation — Design

**Status:** Approved for implementation planning
**Version:** v0.1.0
**Date:** 2026-04-27

## 1. Summary

A NestJS dynamic module that mounts a Swagger-like, browser-viewable documentation site for a host app's GraphQL schema. Reads the live `GraphQLSchema` at bootstrap, harvests every query / mutation / subscription / object type / input type / interface / union / enum / scalar / directive, parses Markdown + structured tags from descriptions, and serves a plain HTML / JS / CSS page from the host app's HTTP server. Driver-agnostic (works with Apollo or Mercurius).

The module is an npm-publishable library (MIT, scoped to `@lexmata`), driven by peer dependencies on `@nestjs/common`, `@nestjs/core`, `@nestjs/graphql`, and `graphql`.

## 2. Goals & Non-Goals

### Goals

- Mount at a configurable path (e.g. `/graphql/docs`) with one-line module registration.
- Render every standard GraphQL schema element with deep-linkable URLs.
- Harvest the schema once at bootstrap (no request-time overhead, no staleness during a single process lifetime).
- Support both Apollo and Mercurius drivers without driver-specific code.
- Let users enrich docs via `description` Markdown + inline tags (`@example`, `@auth`, `@since`) — no parallel decorator API.
- Ship as a standard Nest module with `forRoot` / `forRootAsync` config.

### Non-Goals (v0.1.0)

- No query execution / runner UI (users run queries from GraphiQL / Sandbox).
- No schema diffing or versioning.
- No per-request re-harvesting (restart the process to pick up schema changes).
- No baked-in auth for the docs route (host app guards are the extension point).
- No theme system beyond `customCss` + the Pico.css default theme.

## 3. Architecture

### 3.1 Layers

The module is organized into four cleanly-separated layers:

1. **Module layer** (`graphql-docs.module.ts`) — `forRoot` / `forRootAsync`, DI registration, controller binding.
2. **Harvest layer** (`harvest/`) — `OnModuleInit` hook reads `GraphQLSchema` via `GraphQLSchemaHost`, walks it, parses descriptions, builds the **docs model** (an IR in plain JS).
3. **Render layer** (`render/`) — pure functions that take the docs model and produce the shell HTML, stylesheet, client JS, and schema JSON. No Nest imports here.
4. **HTTP layer** (`graphql-docs.controller.ts`) — Nest controller with four routes; driver-agnostic via `@Get` / `@Header` / `@Res({ passthrough: true })`.

### 3.2 Data flow

**Bootstrap (once, at startup):**

```
Nest builds GraphQLSchema
        ↓
OnModuleInit fires on SchemaHarvesterService
        ↓
walker: GraphQLSchema → raw entity list
        ↓
description-parser: extract Markdown body + ParsedTags per entity
        ↓
federation: detect federation, filter internal fields (_service/_entities)
        ↓
DocsModel stored in SchemaHarvesterService
```

**Per request (stateless, synchronous):**

```
GET /<path>              → renderHtml(model, options)    → text/html
GET /<path>/app.js       → static clientAppJs            → application/javascript (cacheable)
GET /<path>/app.css      → renderCss(options.customCss)  → text/css (cacheable)
GET /<path>/schema.json  → JSON.stringify(model)         → application/json (cacheable)
```

### 3.3 Styling

The client page uses **[Pico.css v2.1.1](https://picocss.com)** loaded via CDN with an SRI hash:

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@picocss/pico@2.1.1/css/pico.min.css"
  integrity="sha384-L1dWfspMTHU/ApYnFiMz2QID/PlP1xCW9visvBdbEkOLkSSWsP6ZJWhPw6apiXxU"
  crossorigin="anonymous">
```

Pico is a classless CSS framework — semantic HTML (`<nav>`, `<article>`, `<button>`, `<details>`, form elements) is styled out of the box and includes dark-mode via `prefers-color-scheme`. Our own CSS only supplies the app-shell layout (sidebar + main pane), nav-active highlight, and small transitions — roughly 100 lines, served from `/<path>/app.css`. Users can append overrides via `options.customCss`.

### 3.4 Client-side behavior

A single ~150-line JS file (no framework, no build):

- On load, fetches `./schema.json` and caches it in a module-scoped variable.
- Renders the sidebar nav from the docs model, grouped by entity kind.
- Clicks on nav links trigger `history.pushState` and swap the main pane — no network request after the initial `schema.json` fetch.
- Deep links work: the server reads the URL on the HTML response and embeds `window.__INITIAL_ENTITY__` so the first paint lands correctly.
- A text input in the sidebar filters nav items client-side by case-insensitive substring match.
- If `schema.json` fails to load, shows an inline banner with the HTTP status.

## 4. Components & File Layout

```
src/
├── index.ts                          # Public API: module, types, option helpers
├── graphql-docs.module.ts            # Dynamic module, forRoot/forRootAsync
├── graphql-docs.controller.ts        # HTTP routes (HTML/JS/CSS/JSON)
├── options.ts                        # GraphQLDocsOptions interface + DI tokens
├── harvest/
│   ├── schema-harvester.service.ts   # OnModuleInit orchestrator
│   ├── walker.ts                     # GraphQLSchema → raw entity list
│   ├── description-parser.ts         # Markdown + @tag extraction
│   ├── federation.ts                 # detect/filter federation internals
│   └── docs-model.ts                 # TypeScript types for the IR
├── render/
│   ├── html-renderer.ts              # Shell HTML (+ nav, + JSON bootstrap)
│   ├── css.ts                        # Stylesheet as a string constant
│   └── client-app.js                 # Client-side nav/routing/search
└── util/
    ├── escape.ts                     # HTML-escape helpers
    └── markdown.ts                   # Minimal Markdown renderer

test/
├── unit/
│   ├── walker.test.ts
│   ├── description-parser.test.ts
│   ├── federation.test.ts
│   ├── html-renderer.test.ts
│   └── markdown.test.ts
└── integration/
    ├── fixtures/test-app.module.ts   # tiny Nest + GraphQL fixture
    ├── module-forroot.test.ts
    ├── module-forrootasync.test.ts
    └── controller-routes.test.ts
```

### 4.1 Component responsibilities

- **`GraphQLDocsModule`** — exposes `forRoot(options)` and `forRootAsync({ useFactory, inject, imports })`. Options are provided via an injection token. When `enabled: false`, returns a module definition with no controllers/providers.
- **`SchemaHarvesterService`** — injects `GraphQLSchemaHost` from `@nestjs/graphql`, runs walker → description-parser → federation in sequence at `onModuleInit`, stores the resulting `DocsModel` for the controller to read.
- **`GraphQLDocsController`** — four `@Get` handlers with relative sub-paths (`''`, `'app.js'`, `'app.css'`, `'schema.json'`). The controller is declared without a `@Controller(path)` prefix; instead the module uses Nest's `RouterModule.register([{ path: options.path, module: GraphQLDocsModule }])` to bind the configured mount path at runtime. This is the standard Nest pattern for dynamically-pathed modules and works identically under Express and Fastify. No business logic in the controller; delegates to renderers.
- **Render functions** — `renderHtml(model, options)`, `renderCss(customCss)`, `renderClientJs()`, `renderSchemaJson(model)`. All pure.
- **Markdown renderer** — intentionally minimal: headings (`#`–`###`), fenced code blocks, inline code, lists, links, `**bold**` / `*italic*`. HTML-escapes all user input; no raw HTML passthrough. Zero runtime deps.
- **Tag extraction** — scans descriptions for lines starting with `@example`, `@auth`, `@since`. Extracts them into structured `ParsedTags` and strips them from the body before Markdown rendering. Tag-like strings inside code fences are preserved. Note: `@deprecated` is **not** a parsed tag — GraphQL's native `deprecationReason` is the source of truth and is harvested by the walker directly.

## 5. The Docs Model (IR)

```ts
interface DocsModel {
  meta: {
    title: string;
    generatedAt: string;       // ISO timestamp
    isFederated: boolean;
  };
  queries:       FieldEntry[];  // root Query fields
  mutations:     FieldEntry[];
  subscriptions: FieldEntry[];
  objectTypes:   TypeEntry[];
  inputTypes:    TypeEntry[];
  interfaces:    TypeEntry[];
  unions:        UnionEntry[];
  enums:         EnumEntry[];
  scalars:       ScalarEntry[];
  directives:    DirectiveEntry[];
}

interface FieldEntry {
  name: string;
  description: string;          // Markdown, tags already stripped
  args: ArgEntry[];
  returnType: TypeRef;
  deprecationReason?: string;
  tags: ParsedTags;
}

interface ArgEntry {
  name: string;
  description: string;
  type: TypeRef;
  defaultValue?: string;        // serialized AST value
}

interface TypeEntry {
  name: string;
  description: string;
  fields: FieldEntry[];         // for objects/inputs/interfaces
  implements?: string[];        // interfaces implemented
  directives?: AppliedDirective[];
}

interface UnionEntry {
  name: string;
  description: string;
  members: string[];            // member type names
}

interface EnumEntry {
  name: string;
  description: string;
  values: { name: string; description: string; deprecationReason?: string }[];
}

interface ScalarEntry {
  name: string;
  description: string;
}

interface DirectiveEntry {
  name: string;
  description: string;
  locations: string[];
  args: ArgEntry[];
}

// Recursive wrapper to preserve nested list types (e.g. [[Int!]!]).
// Mirrors graphql-js introspection's ofType chain.
type TypeRef =
  | { kind: 'NAMED'; name: string; namedKind: 'OBJECT' | 'INPUT_OBJECT' | 'INTERFACE' | 'UNION' | 'ENUM' | 'SCALAR' }
  | { kind: 'NON_NULL'; ofType: TypeRef }
  | { kind: 'LIST'; ofType: TypeRef };

interface ParsedTags {
  examples: string[];           // @example code blocks (0..n)
  auth?: string;                // @auth <value>
  since?: string;               // @since <value>
}

interface AppliedDirective {
  name: string;
  args: Record<string, unknown>;
}

interface EntityRef {
  kind: 'Query' | 'Mutation' | 'Subscription'
      | 'ObjectType' | 'InputType' | 'Interface' | 'Union'
      | 'Enum' | 'Scalar' | 'Directive';
  name: string;
}
```

The IR is plain JS — serializable as-is for the `schema.json` endpoint. Types are referenced by name (named `TypeRef` leaves) so circular references resolve naturally.

## 6. Configuration API

```ts
interface GraphQLDocsOptions {
  path: string;                      // required, e.g. '/graphql/docs'
  title?: string;                    // default: 'GraphQL API'
  enabled?: boolean;                 // default: true
  include?: (entity: EntityRef) => boolean;
  exclude?: (entity: EntityRef) => boolean;
  customCss?: string;                // appended after built-in CSS
}

interface GraphQLDocsAsyncOptions {
  imports?: ModuleMetadata['imports'];
  inject?: FactoryProvider['inject'];
  useFactory: (...args: any[]) => Promise<GraphQLDocsOptions> | GraphQLDocsOptions;
}
```

**Include/exclude semantics:** an entity is shown if (`include` returns true OR `include` is unset) AND (`exclude` returns false OR `exclude` is unset).

**Example usage:**

```ts
@Module({
  imports: [
    GraphQLModule.forRoot({ driver: MercuriusDriver, autoSchemaFile: true }),
    GraphQLDocsModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        path: '/graphql/docs',
        title: 'Lexmata API',
        enabled: cfg.get('NODE_ENV') !== 'production',
        exclude: (e) => e.name.startsWith('_Internal'),
      }),
    }),
  ],
})
export class AppModule {}
```

## 7. Error Handling

Read-only developer-facing tool; errors are visible and diagnostic rather than silent.

| Situation | Behavior |
|---|---|
| `GraphQLSchemaHost.schema` undefined at bootstrap | Throw `GraphQLDocsBootstrapError` with message pointing to missing `@nestjs/graphql` registration. Boot fails loud. |
| Malformed Markdown in a description | Permissive renderer passes unrecognized syntax through as escaped text. No exceptions. |
| Unknown tag in description | Ignored by parser. |
| Missing description | Renders as `_No description._` placeholder. |
| `enabled: false` | Module definition returns empty `controllers`/`providers`. Docs route returns 404. |
| Include/exclude predicate throws | Caught; treat as `false` (excluded). Warning logged via Nest `Logger` with entity name. |
| Client fetch of `schema.json` fails | Client shows inline banner: "Failed to load schema (HTTP {status}). Check `/<path>/schema.json`." |
| Deep link to unknown entity | Client shows "Entity not found" pane. HTTP status is 200 (shell served correctly, SPA convention). |
| Circular type reference (e.g. `User.friends: [User]`) | Resolved by name-leaf `TypeRef`s. No special handling needed. |

## 8. Edge Cases

- **Very large schemas** — `schema.json` is a separate cacheable route; we never inline it. ~1000-type schemas produce <1 MB JSON, acceptable.
- **Custom scalars with no description** — render with name only, no placeholder body.
- **`@deprecated` with no reason** — show "Deprecated" badge with no reason text.
- **Interfaces with no implementers** — render normally; "Implemented by: _none_".
- **Unions with a single member** — render normally (GraphQL allows this).
- **Federation v2 schemas** — detect via `_service` / `_entities` root fields or any `@key` directive. Filter the federation-internal types (`_Service`, `_Entity`, `_Any`, `_FieldSet`) and root fields (`_service`, `_entities`) from display. `@key` applications on user types remain visible.
- **Tag-like strings inside code fences** — parser checks fence state; `@example` inside a code block is left as literal text.
- **Apollo vs Mercurius** — controller uses standard Nest decorators (`@Get`, `@Header`, `@Res({ passthrough: true })`); both adapters route identically. Integration tests parameterize driver choice to prove this.

## 9. Testing Strategy

### 9.1 Unit tests (Vitest)

Pure-function tests with fixtures, no Nest bootstrap.

- **`walker.test.ts`** — hand-built `buildSchema(sdl)` inputs cover every entity kind plus edge cases (empty schema, `@deprecated` with/without reason, interfaces with no implementers).
- **`description-parser.test.ts`** — table-driven. Covers: `@example`, `@auth`, `@since`, multiple tags, tags mixed with Markdown, empty strings, tag-like strings inside code fences (not parsed as tags).
- **`federation.test.ts`** — both a federation-augmented schema (expect `isFederated=true` + internal filtering) and a plain schema (expect pass-through).
- **`markdown.test.ts`** — every supported construct plus HTML escaping of raw text and link URLs.
- **`html-renderer.test.ts`** — snapshot tests on small fixed `DocsModel` inputs. Explicit XSS test: description `"<script>alert(1)</script>"` must appear escaped.

### 9.2 Integration tests (Vitest + `@nestjs/testing` + `supertest`)

Tiny fixture Nest app with `@nestjs/graphql` and a small resolver.

- **`module-forroot.test.ts`** — bootstrap with `forRoot`; hit all four routes; assert status / Content-Type / body contents.
- **`module-forrootasync.test.ts`** — bootstrap with `forRootAsync` + async factory; same assertions.
- **`controller-routes.test.ts`** — `enabled: false` → 404; custom `path` routing works; `include`/`exclude` filter the `schema.json` output; `customCss` appears in `/app.css`.
- **Driver coverage** — integration suite parameterized over Apollo and Mercurius drivers.

### 9.3 Skipped in v0.1.0

- Browser E2E (manual smoke on ~150-line client JS is sufficient).
- Performance benchmarks (harvest is O(types + fields), runs once).
- Mutation testing / fuzzing.

### 9.4 Coverage targets

- 100% on `walker`, `description-parser`, `federation`, `markdown`.
- ≥90% on `html-renderer`.
- Integration tests gated on "exists and passes," not branch coverage.

## 10. Distribution

- Published to npm as `@lexmata/nestjs-graphql-documentation`, MIT license.
- Peer dependencies: `@nestjs/common`, `@nestjs/core`, `@nestjs/graphql`, `graphql` — all with `^` range matching the current Lexmata backend baseline.
- No runtime dependencies (we ship with zero `dependencies` entries).
- `devDependencies` include the peers, Vitest, `@nestjs/testing`, `supertest`, both drivers for integration tests, and TypeScript tooling.
- README documents: installation, `forRoot`/`forRootAsync` examples, tag syntax (`@example`, `@auth`, `@since`), include/exclude predicates, `customCss` pattern, how to guard the docs route using Nest guards.
- GitHub Actions CI: lint + unit + integration on Node 20 + 22.

## 11. Open Questions / Deferred

- Static export CLI (a `nestjs-graphql-docs build` command that writes HTML/CSS/JS/JSON to disk for CDN deployment) — deliberately deferred until runtime mode is proven. Same renderer can be reused.
- Browser E2E tests (Playwright) — revisit if client JS grows beyond trivial.
- Richer theming — deferred until someone asks.
- Offline/vendored Pico fallback (`useCdn: false`) — deferred; CDN with SRI is the v0.1.0 default.
