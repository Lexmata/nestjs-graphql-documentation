# Security Policy

## Supported Versions

The project follows semver starting at v0.1.0. Only the latest minor release line receives security fixes until we hit v1.0; after that, the previous minor line gets patches for 90 days.

## Reporting a Vulnerability

**Do not file a public GitHub issue for a security report.** Instead, use one of:

- GitHub's private vulnerability reporting: the **Security** tab → _Report a vulnerability_
- Email `security@lexmata.com` — include the commit SHA or version, a clear description, and a minimal reproduction if you have one

We will acknowledge within **2 business days**, aim to have an assessment within **7 days**, and coordinate disclosure after a fix ships. Credit is offered in the release notes; request anonymity if preferred.

## Scope

In scope for this repo:

- `@lexmata/nestjs-graphql-documentation` runtime code in `src/`
- The built `dist/esm/**` and `dist/cjs/**` artifacts
- The client-side JavaScript shipped in `CLIENT_APP_JS`
- Vulnerabilities arising from how the module wires into `@nestjs/graphql` (e.g. XSS via schema descriptions, cache-poisoning, content-type confusion)

Out of scope:

- Vulnerabilities in upstream dependencies (`graphql-js`, `@nestjs/*`, `mercurius`, `@apollo/server`) — report to those projects directly
- Issues that require an attacker to already have code execution inside the host Nest app
- Brute-force or DoS findings without a clear algorithmic root cause

## Hardening Defaults

- Every user-supplied string that reaches the rendered HTML goes through `escapeHtml` / `escapeAttr`. Markdown rendering was deliberately removed in v0.1.0 to reduce the XSS surface area.
- The client-side JavaScript uses `document.createRange().createContextualFragment` with pre-escaped input rather than raw `innerHTML` assignment of untrusted strings.
- `/<path>/schema.json` is served with `Cache-Control: private, max-age=3600` so shared caches cannot retain schema responses if the docs route is placed behind authentication.
- Pico.css is loaded from jsDelivr with an SRI hash pinned to an exact version.
