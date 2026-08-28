# Changelog

All notable changes to this fork are documented here, in order, so they can be
reviewed or ported back to the upstream project
([willspensley/brum-dashboard-](https://github.com/willspensley/brum-dashboard-)).

Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Fixed
- **2026-08-28** — Resolved 3 of 8 high-severity `npm audit` vulnerabilities via
  `npm audit fix` (non-breaking, transitive dependency bumps only):
  - `brace-expansion` — DoS via exponential/unbounded expansion of `{}` patterns
    ([GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp),
    [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg),
    [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895))
  - `js-yaml` — Quadratic-complexity DoS via YAML merge-key/`!!omap` handling
    ([GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68),
    [GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m),
    [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj))
  - `nanoid` — Non-secure/custom generators can loop indefinitely on size 0 or
    negative ([GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv),
    [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8))
  - Only `package-lock.json` changed; no application code touched.
- **2026-08-28** — Fixed a `Server Error: Cannot find module './948.js'` on
  `/about` (and any route) surfaced immediately after the dependency bump above.
  Root cause: a stale `.next` build cache left over from running `next build`
  against the previous dependency tree. Fix: delete the `.next` directory and
  restart `next dev` / `next build`. Not caused by the dependency versions
  themselves — verified by re-running a clean `npm run build` (all 9 routes
  compiled) and hitting every route with a clean `next dev` server (all
  returned HTTP 200).
- **2026-08-28** — Resolved the remaining 5 high-severity `npm audit`
  vulnerabilities via `npm audit fix --force`, upgrading **Next.js
  14.2.35 → 16.3.3** (also brings `eslint-config-next`, `glob`, and `postcss`
  current). `npm audit` now reports **0 vulnerabilities**.
  - `glob` — command injection via CLI `-c/--cmd` in eslint tooling
    ([GHSA-5j98-mcp5-4vw2](https://github.com/advisories/GHSA-5j98-mcp5-4vw2))
  - `next` — multiple DoS, request smuggling, cache poisoning, XSS via CSP
    nonces, SSRF in Server Actions/rewrites, and unauthenticated disclosure of
    internal Server Function endpoints (21 advisories, see `npm audit` output)
  - `postcss` (pulled in via `next`) — XSS in stringified CSS output, arbitrary
    `.map` file disclosure via `sourceMappingURL`
    ([GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93),
    [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q),
    [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp),
    [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849))
  - `package.json`/`package-lock.json` updated (`next` and `eslint-config-next`
    to `^16.3.3`). `tsconfig.json` was auto-migrated by Next.js itself
    (`jsx: react-jsx`, `target: ES2017`, added `.next/dev/types` to `include`).
    Removed the now-obsolete `eslint.ignoreDuringBuilds` key from
    `next.config.mjs` — Next 16 no longer runs ESLint during `next build`, so
    it was a no-op producing a build warning.
  - Verified with a clean `npm run build` (all 9 routes compiled, 0 warnings)
    and a clean `next dev` run (Turbopack now default; ready in ~350–750ms vs
    ~5s previously), plus a manual HTTP sweep of every route (all 200).
  - The first upgrade attempt failed mid-install (`ECONNRESET` from a network
    change, compounded by an `EPERM` file-lock error while the dev server was
    still running) and left `node_modules` partially corrupted.
    `package.json`/`package-lock.json` were untouched by the failure, so
    recovery was: delete `node_modules`, reinstall from the existing lockfile
    to confirm the pre-upgrade baseline still worked, then retry
    `npm audit fix --force` (with the dev server stopped) successfully.
  - `next dev`/`next build` now auto-appends an `<!-- BEGIN:nextjs-agent-rules -->`
    block to `AGENTS.md` — a genuine Next.js 16 feature (see
    `node_modules/next/dist/server/lib/generate-agent-files.js`) that tells AI
    coding agents to consult the framework's bundled docs before making
    Next-specific changes, since v16 differs from most training data. It's
    regenerated on every run, so it's committed to keep the tree clean, per
    its own instructions.

### Known issues / deferred
- `eslint-config-next@16.3.3` requires `eslint@>=9`, but the project still
  pins `eslint@^8`; `npm audit fix --force` installed past this peer-dependency
  conflict. Doesn't affect `next dev`/`next build`, but `npm run lint` may
  behave unpredictably until `eslint` itself is upgraded to v9+. Not yet fixed.
