# Changelog

All notable changes to `@lexmata/nestjs-graphql-documentation` are recorded here.

## [Unreleased]

### Added

- First public release of the module. Mounts a Swagger-like HTML/JS/CSS documentation UI for a host app's GraphQL schema at a configurable path. Driver-agnostic across `@nestjs/apollo` and `@nestjs/mercurius`.
- `@example`, `@auth`, `@since` tag extraction from GraphQL description text.
- Federation v2 detection with automatic filtering of internal entities (`_service`, `_entities`, `_Service`, etc.).
- `include` / `exclude` predicates on `GraphQLDocsOptions` for custom entity filtering. Predicates that throw are caught and treated as excluding (with a warning log).
- `customCss` option for overriding styling on top of the bundled Pico.css + app-shell rules.
- `forRoot` and `forRootAsync` module registration. `forRootAsync` accepts a synchronous factory only in this release (see Notes).

### Testing

- Unit and integration suites run via `pnpm test` (Vitest, ~1 s). 107 tests cover every source line and every branch in `src/` — the vitest config enforces a 100% / 100% / 100% / 100% coverage floor so regressions trip CI rather than slipping through.
- Browser E2E suite runs via `pnpm test:e2e` (Playwright + Chromium). Tests boot a real Nest app, bind an ephemeral port, load the docs page in a headless browser, and exercise nav clicks, deep-link rendering, search, back/forward, and the schema-fetch failure banner. E2E is excluded from the default suite and opt-in via the separate script so local dev stays fast.
- `pnpm test:all` runs both suites sequentially. CI runs `pnpm test:cov` (which surfaces any coverage regression) plus the E2E pass, and caches the Playwright browser by exact Playwright version.

### Notes

- **Node.js 22+** is required. The `package.json` `engines.node` field enforces this at install time; the TypeScript target is ES2023 and the CI matrix runs on 22 only.
- **Dual ESM + CJS** distribution. The package publishes both entry points via `exports`: `import ...` consumers hit `dist/esm/index.js`, `require(...)` consumers hit `dist/cjs/index.js`. A shared `dist/cjs/index.d.ts` serves type information to both. Relative imports in `src/` use `.js` extensions so the ESM output resolves correctly under Node's native module loader.
- `forRootAsync`'s `useFactory` must be synchronous because the mount path must bind to `RouterModule.register` at module-registration time. Returning a `Promise` from the factory throws a clear error at boot.
- `schema.json` is served with `Cache-Control: private, max-age=3600` so shared caches (CDNs, proxies) do not store it. `app.js` and `app.css` use `public, max-age=3600`.
- `cachedCss` and `cachedSchemaJson` are populated lazily on first request. A misconfigured `customCss` or an unserializable schema therefore fails the docs route only, not the host app's Nest bootstrap.

### Project infrastructure

- **GitHub config**: parallel-job CI workflow (`lint`, `typecheck`, `build`, `unit-test`, `e2e-test`) feeding an aggregator `CI success` job so branch protection can require one check. Weekly CodeQL scan with the `security-and-quality` query pack. Dependabot weekly for npm + GitHub Actions with grouped bumps for the linting / testing / NestJS / Apollo-Mercurius clusters. Issue templates (bug, feature), PR template, `CODEOWNERS`, `SECURITY.md`, `CONTRIBUTING.md`, and a PR-title conventional-commit linter.
- **Husky + commitlint + lint-staged**: `pnpm install` wires up `pre-commit` (runs ESLint + Prettier on staged files), `commit-msg` (commitlint with the shared config, enforcing Conventional Commits and no trailing period on the subject), and `pre-push` (type-check + coverage gate) git hooks. The config pulls from `commitlint.config.mjs` — no separate `@commitlint/cli` invocation needed at the call site.
- **`.npmignore`** provides defense-in-depth alongside `package.json`'s `files` allowlist. The published tarball contains only `dist/`, `LICENSE`, `README.md`, and `CHANGELOG.md`.
- **`publishConfig`** on `package.json` pins the scoped package to `access: "public"` so `pnpm publish` doesn't refuse the upload, hard-codes `registry: https://registry.npmjs.org/` so a local `.npmrc` redirect can't send the release to the wrong registry, and sets `provenance: true` so npm records a supply-chain attestation tying the tarball to the git commit that built it (free for public scoped packages published from GitHub Actions). `prepublishOnly` runs the full lint → format → typecheck → build → coverage gate, and `release:dry` / `release:pack` preview what gets uploaded.
- **`.gitignore`** excludes the planning artefacts under `docs/superpowers/` (kept local, never committed).

### Internal IR shape

The exported `DocsModel`, `FieldEntry`, `TypeEntry`, and related interfaces from `src/harvest/docs-model.ts` are part of the public API via `export * from`. Deliberate omissions vs. earlier internal drafts:

- `AppliedDirective` and `TypeEntry.directives?: AppliedDirective[]` are **not** shipped. An earlier draft defined them but the walker never populated them and the renderer never read them, so they were removed before publish. If you need user-applied directive inspection, it is tracked as a follow-up.
