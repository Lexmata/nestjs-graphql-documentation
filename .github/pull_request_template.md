<!--
Thanks for contributing! Please fill in the sections below. Delete anything
that doesn't apply. PRs merge into `develop` unless they are hotfixes.
-->

## Summary

<!-- What does this change do, and why? Focus on intent, not a changelog. -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation / tooling only
- [ ] Refactor / cleanup (no behaviour change)

## Related

<!-- Link the Jira ticket (e.g. LEX-123) or issue. Hotfixes: explain urgency. -->

## Verification

- [ ] `pnpm test:cov` — 100% coverage floor holds
- [ ] `pnpm test:e2e` — Playwright suite (if UI or controller changed)
- [ ] `pnpm lint`
- [ ] `pnpm build` — dual ESM + CJS output inspected
- [ ] Manual check in a consuming NestJS app (describe below if relevant)

## Notes for reviewers

<!-- Anything subtle, tricky, or non-obvious. Trade-offs you rejected. -->
