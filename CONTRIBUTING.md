# Contributing

Thanks for the interest. This project is small, opinionated, and strict about a handful of rules that let it ship without breaking consumers. Read the rules once and the PR loop should be short.

## Branching & commits

- **`develop`** is the integration branch. Merge PRs here unless the change is a hotfix for the current release.
- **`main`** is the release branch. Only release tags live on it.
- **`feature/*`**, **`hotfix/*`**, and **`release/*`** branches follow git-flow.
- Commits use **Conventional Commits** (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`). The body is mandatory for anything non-trivial and should explain **why** the change is needed, not what the diff shows.
- Rebase cleanly before the final review. We prefer a squash merge for feature branches (one well-described commit on `develop`).

## Setup

```bash
pnpm install
pnpm build
pnpm test:cov      # unit + integration, 100% coverage gate
pnpm test:e2e      # Playwright browser suite (requires Chromium)
```

Node 22+ is required (the `package.json` `engines.node` field enforces this). pnpm 10 is pinned via `packageManager`.

## Quality gates — all must pass locally before you open a PR

- `pnpm lint` — ESLint (flat config) + eslint-plugin-unicorn, zero warnings
- `pnpm exec prettier --check .` — formatting
- `pnpm exec tsc --noEmit` — type-check against every `.ts` in `src/` and `test/`
- `pnpm build` — both the CJS and ESM trees emit under `dist/`
- `pnpm test:cov` — 100% statements, branches, functions, and lines. The vitest config enforces the floor, so this fails loud if you drop coverage.
- `pnpm test:e2e` — only needed when you touch the controller, client JS, or renderer

CI runs all of the above in parallel jobs plus CodeQL static analysis. Every job must go green before the `CI success` aggregator turns green, and the branch protection rule on `develop` / `main` requires that aggregator.

## Code rules that CLAUDE.md, ESLint, and the coverage gate enforce

- **No stub implementations.** No `TODO`, `FIXME`, `@ts-ignore`, or placeholder returns in committed code. If the work is incomplete, split it smaller.
- **No silent error swallowing.** Every `catch` either re-throws, logs with context, or has a comment explaining why the error is benign.
- **Types over strings.** Use the `EntityKind` string union, the `GRAPHQL_DOCS_OPTIONS` symbol, and the shared TypeScript interfaces rather than raw literals.
- **No new dependencies** without a good reason. The library ships with zero runtime dependencies (only peer deps). Adding one is a deliberate trade-off that belongs in the PR description.
- **Public-API changes** to `src/index.ts`, `src/options.ts`, or the docs-model types go in the `CHANGELOG.md` under **Unreleased** so the next release captures them.

## Testing philosophy

- **Unit tests** live in `test/unit/` and match one test file per source file. They don't boot Nest and don't hit the network.
- **Integration tests** live in `test/integration/` and boot a real Nest app (Apollo + Mercurius) against an in-memory schema.
- **E2E tests** live in `test/e2e/` and launch Chromium via Playwright against an ephemeral-port Nest app.
- Tests exercise behaviour, not structure. A test that just mirrors the implementation (e.g. "renderCss returns the concatenation of A and B") is a smell. Write one that would fail if the behaviour changed.

## Release process

Releases are cut from `develop` via a `release/*` branch. We do not publish from CI — a maintainer runs `pnpm publish --access public` locally after verifying the CHANGELOG and the CI green bar.

## Reporting issues

- Bugs: use the **Bug report** issue template; include a minimal reproduction.
- Features: use the **Feature request** template; a proposed API sketch is worth its weight.
- Security: see [`SECURITY.md`](./SECURITY.md) — do not file a public issue.
