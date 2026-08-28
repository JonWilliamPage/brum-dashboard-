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

### Known issues / deferred
- 5 high-severity `npm audit` findings remain, all requiring a breaking
  `npm audit fix --force` upgrade of Next.js 14.2.35 → 16.3.3 (which also
  brings `eslint-config-next`, `glob`, and `postcss` current):
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
  - Deferred pending a decision on the Next.js 16 upgrade, since it's a
    breaking change requiring its own testing pass.
