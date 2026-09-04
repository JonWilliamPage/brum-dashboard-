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

- **2026-08-28** — Fixed a false copyright/branding claim: the site-wide footer
  read `© Birmingham City Council · {year} · Built on public data`, and the
  official Birmingham coat of arms was used as decorative watermark/brand
  chrome across the About, Ask Ozzy, Sources, and Dashboard pages — together
  implying this is an official council product, which it is not.
  - Footer now reads `© Ask Ozzy contributors · {year} · Independent project
    — uses public Birmingham data. Not affiliated with Birmingham City
    Council.`
  - Added an explicit independence disclaimer on the About page (under the
    hero) and the Sources page (under the source list intro), each stating
    Ozzy is independent and not operated by, affiliated with, or endorsed by
    Birmingham City Council.
  - Deleted `public/assets/birmingham-coat-of-arms.png` and
    `birmingham-flag.png`; confirmed no remaining references before deletion.
  - Replaced the crest watermark with the project's own bull mascot
    (`public/bull-logo.svg`/`.png`, pre-existing project asset) across all 9
    usages, including the shared `CrestWatermark` component (auto-fixing its
    two callers) — small logo marks (footer brand icon, dashboard sidebar
    icon, splash icon) were left as clean SVG; only the large faded
    background watermarks were swapped.
  - Watermark was subsequently changed again to render the bull as **static
    ASCII art** (via the existing `BullAscii` canvas component, `animate=false`
    for a one-time paint, no ongoing render loop) rather than the plain SVG,
    per follow-up request — glyph colour hardcoded per panel (canvas can't
    read CSS vars) to match each background (light on navy panels, dark ink
    on the two white/light panels).
  - Verified with a clean `npm run build` (all routes, 0 warnings) and a
    manual HTTP sweep of every route (all 200), plus confirming the old
    crest URL now 404s.
- **2026-09-04** — Broader copyright/GDPR audit (beyond the crest fix above),
  ahead of showing the site to contributors, councillors, and council
  officials. Map tile attribution, OGL data-source licensing, and
  individual-level personal data in the datasets were all checked and found
  compliant (no changes needed there). Four real gaps found and fixed:
  - **No privacy/AI-disclosure notice anywhere.** Ask Ozzy sends every prompt
    to Anthropic's API with zero on-page disclosure of that, and there was no
    privacy or terms page at all. Added a new `/privacy` page (linked from
    the footer) explaining what's sent to Anthropic, what's stored locally,
    that there's no cookie/analytics tracking, and linking to the Sources
    page for data licensing. Added an inline disclosure line under the Ask
    Ozzy chat input itself, linking to `/privacy`
    (`app/components/OzzyView.tsx`).
  - **Chat history persisted forever in `localStorage` with no way to clear
    it.** `OzzyView.tsx` saves every question/answer indefinitely, client-side
    only — a real issue on a shared machine (e.g. a council kiosk), since the
    next visitor would see the previous person's conversation. Added a
    `clearConv()` function and a visible "Clear conversation" control next to
    the new disclosure line.
  - **Google Fonts loaded live from Google's CDN on every page view**
    (`@import url('https://fonts.googleapis.com/...')` in `globals.css`),
    sending every visitor's IP to Google just to render the page — the exact
    pattern a German court held unlawful without consent in 2022; UK ICO
    treats the same pattern as a live issue. Switched Baskervville, IBM Plex
    Mono, and Public Sans to `next/font/google` in `app/layout.tsx`, which
    self-hosts the font files at build time — same fonts, zero runtime
    request to Google. `globals.css`'s `--serif`/`--mono`/`--sans` variables
    now reference the `next/font`-generated CSS variables instead of hardcoded
    family names; the old `@import` line was removed. Confirmed via a direct
    HTML check that no `fonts.googleapis.com` reference remains, and that the
    self-hosted `.woff2` files are actually served.
  - **`/api/proposals` had no authentication.** Any anonymous request could
    list, accept, or reject data proposals — writing directly to the
    published dashboard data (`public/data/`). No personal data was involved,
    but it's a content-integrity hole on an endpoint that's about to be
    demoed publicly. Added a fail-closed shared-token check (`x-review-token`
    header vs. `REVIEW_ADMIN_TOKEN` env var — refuses every request if the
    var isn't set, rather than defaulting open) to both `GET` and `POST` in
    `app/api/proposals/route.ts`. The `/review` page now prompts for the
    token once per browser session (stored in `sessionStorage`, not
    `localStorage`) and sends it on every request; a rejected/missing token
    re-shows the prompt. Documented both required env vars
    (`ANTHROPIC_API_KEY`, `REVIEW_ADMIN_TOKEN`) in a new `.env.example`.
    Verified: unauthenticated and wrong-token requests both return 401,
    correct token returns 200.
  - **Repo-hygiene loose end (not a live-site risk):** old prototype files
    under `reference/` (`birmingham_dashboard_v2.html`, `_v3.html`,
    `Birmingham Employment Dashboard.html`, `HANDOFF.md`) still contain the
    original "© Birmingham City Council" text and crest references fixed
    above — confirmed not imported by the live app, so no runtime exposure,
    but visible to anyone browsing the GitHub repo, sitting right next to the
    corrected version. Added `reference/README.md` clarifying these are
    archived design prototypes that predate the branding/legal fixes, not
    the live app.
  - Verified with a clean `npm run build` (11 routes now, including the new
    `/privacy` page, 0 warnings) and a direct `tsc --noEmit` run (the build
    itself has `ignoreBuildErrors: true`, so type errors don't fail it — ran
    TypeScript separately to be sure; the only error found is pre-existing
    and unrelated, in `app/fly-tipping/components/FlyTippingView.tsx`).
- **2026-09-04** — Cosmetic pass: replaced the remaining plain-SVG bull logo
  marks with the ASCII-rendered version, for visual consistency with the
  animated hero logo and the watermarks fixed earlier.
  - Converted the footer brand icon, dashboard sidebar icon, and
    loading-splash icon (`SiteFooter.tsx`, `Dashboard.tsx`) from `<img
    src="/bull-logo.svg">` to `<BullAscii>`, statically rendered at first
    (coarser glyph grid than the hero version, tuned for legibility at
    ~36–96px, dark ink colour to match their light backgrounds) —
    following the same small-motif pattern already used in
    `DashboardHeader.tsx`.
  - Follow-up: the footer bull was then switched to **animated** (shimmer/
    wave/scan-sweep, same as the main hero logo) per explicit request, since
    static read as visually "dead" next to the animated instances elsewhere
    on the page.
  - Follow-up: all the large background **watermarks** were switched from
    static to animated too — `CrestWatermark.tsx` (covering the Fiscal
    dashboard panel and every dashboard header), and the direct watermark
    instances on the About page (hero + contribute section), Ask Ozzy page
    (hero + every chat-response panel), and Sources page (hero). Note: the
    Ask Ozzy per-message watermark means a long conversation now runs one
    small animated canvas per message — kept as requested, worth watching
    for jank on very long conversations.
  - Left the dashboard sidebar icon and loading-splash icon **static** —
    those are logo marks, not watermarks, and weren't included in the
    animate request.
  - `bull-logo.svg` is now fully unreferenced (confirmed via repo-wide
    search) — queued for deletion in a follow-up step, since every
    remaining ASCII bull instance samples from `bull-logo.png` instead
    (`BullAscii.tsx` — this file must **not** be deleted, it's the live
    source image the ASCII renderer reads, not a leftover).
  - Verified with a clean `npm run build` and a manual HTTP route sweep
    (all 200) after each of the three changes above.

### Known issues / deferred
- `eslint-config-next@16.3.3` requires `eslint@>=9`, but the project still
  pins `eslint@^8`; `npm audit fix --force` installed past this peer-dependency
  conflict. Doesn't affect `next dev`/`next build`, but `npm run lint` may
  behave unpredictably until `eslint` itself is upgraded to v9+. Not yet fixed.
- Data-source licence is shown as plain text on the Sources page, not linked
  to the actual OGL v3.0 licence text. Low priority, not yet fixed.
- `REVIEW_ADMIN_TOKEN` must be set in the deployment environment for `/review`
  and `/api/proposals` to work at all (by design — fails closed). Not yet set
  anywhere outside local `.env.local`; needs doing before `/review` is used
  on a deployed environment.
- **Next major job (queued, not started):** the ward count shown across the
  site is inconsistent — 69 wards in most places (crime, UC, child poverty,
  PIP — the correct, current official ONS ward set, codes
  `E05011118`–`E05011186`, canonical list in `lib/wards.ts`), but **68** in
  the footer, Education, Youth/NEET risk, Housing, Fiscal, and Ask Ozzy's
  data context. Root cause confirmed: those five all trace back to a
  hardcoded `FALLBACK` array in `lib/data.ts` — a legacy 68-ward dataset with
  a *different, incorrect* ONS code series (`E05011082`–`E05011150`) and
  some outdated ward names. `lib/wards.ts` already carries a comment flagging
  this exact problem ("Do NOT use the legacy 68-ward set embedded in
  lib/data.ts"), so it's known, pre-existing tech debt, not something
  introduced by this fork. Real fix requires sourcing correct IMD/claimant/
  inactivity figures for the right 69-ward geography and retiring
  `FALLBACK` — not a text relabel — so it's scoped as its own job, planned
  to start once the current cosmetic logo pass (this section, above) is
  done.
