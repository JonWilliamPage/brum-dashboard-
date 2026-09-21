# Changelog

All notable changes to this fork are documented here, in order, so they can be
reviewed or ported back to the upstream project
([willspensley/brum-dashboard-](https://github.com/willspensley/brum-dashboard-)).

Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **2026-09-21 (device-tested session)** — **`allowedDevOrigins` in
  `next.config.mjs`**, so the dev server can be reached from a phone on the same
  WiFi for real-device testing. Next 16 blocks cross-origin requests to
  `/_next/*` dev resources by default: a phone hitting `http://<lan-ip>:3000`
  receives the server-rendered HTML and **none** of the JS, CSS, fonts or HMR
  socket, rendering as a bare unstyled title that looks like a catastrophic app
  failure and is purely a dev-server default. Dev-only — no effect on a
  production build or on Vercel. Reads `DEV_ORIGIN` if set, defaulting to the
  machine used for this session's testing.
- **2026-09-21** — **`docs/RESPONSIVE-RETROFIT-PLAYBOOK.md`** — the method behind
  the mobile work below, written up so it can be repeated or automated rather
  than rediscovered. Records the prove-one-then-batch protocol, a table of the
  seven failure classes hit (six of which `tsc` and the dev-server compile could
  not see) each paired with a grep that *would* catch it statically, the cases
  where a chart needed re-*forming* rather than resizing, and what to automate
  first. Also notes where the initial inventory undercounted — searching by
  markup (`<canvas>`/`<svg>`) misses charts built from styled `div`s.
- **2026-09-21** — **Expand-to-full-screen on every data view.** New shared
  `FocusableChart` wrapper (`app/components/FocusableChart.tsx`) puts an
  "⤢ Expand full screen" button on every chart, map, table, grid, heatmap and
  detail-panel sparkline across the site — 92 instances across 30 files. The
  point is mobile: on a phone a 69-ward table or a choropleth is unreadable
  inline, so any visual can be blown up to fill the screen and dismissed with
  a "× Close" button. Works identically on desktop (no pop-up window needed —
  it re-styles in place, so Chart.js/Leaflet instances keep their state and
  simply resize).
  - Leaflet maps (14) each also gained a `ResizeObserver`. Leaflet only
    measures its container once at init and never notices later resizes, so
    without this a focused map rendered squashed at its old size. Side
    benefit: it also fixes sizing on sidebar toggle and device rotation,
    neither of which was handled before.
  - Charts whose wrapper height is set inline (a prop, e.g. `height={200}`)
    got a shared `chart-canvas-wrap` class, since inline styles beat ordinary
    CSS and the focus-mode override could not otherwise reach them.
- **2026-09-21** — Added a "Focus view" pop-out to the three 3D stage
  dashboards (UC Stage 3D, PIP Stage 3D, Ozzy Stage). A prominent gold
  button next to the "What you're looking at" explainer opens the same
  stage in a real, separate browser window (`window.open` with explicit
  size/position, centred on screen) at a dedicated route — `/uc-stage/focus`,
  `/pip-stage/focus`, `/ozzy-stage/focus`. Each focus route fetches its own
  data independently (same `/data/*.json` files the main dashboard uses), so
  it works standalone even if the main dashboard tab is closed. The
  pop-out shows only the explainer, the play/scrub/metric toolbar and the
  3D viewport — no dashboard sidebar, no site nav, no right-hand
  stats/ward panel. Implemented via a new `focusMode` prop on
  `UcStageView`/`PipStageView`/`OzzyStageView` (skips rendering `.rcol`,
  switches the layout grid to one column via a new `.stage-focus-solo`
  modifier) and a new `focusHref` prop on `StageExplainer` that renders the
  button and owns the `window.open` call. New CSS (`globals.css`) hides
  `TopNav` and gives the pop-out page full-viewport height via `:has()`,
  mirroring the existing `.dash-shell` pattern. Desktop-only for now —
  mobile behaviour (where a "separate window" isn't meaningful) is a
  deliberately deferred follow-up.
- **2026-09-21** — Changed the `/about` intro video from a plain
  muted-and-looping autoplay into a two-stage playback: it still autoplays
  muted on first load (browsers block unmuted autoplay outright, so this
  can't change), but now plays through only **once** rather than looping
  immediately. When it ends, a centred "▶ Watch again — with sound"
  overlay appears; clicking it replays from the start unmuted (allowed
  because the click is a genuine user gesture) and from that point on the
  video loops normally. Implemented with a `videoEnded` state flag driven
  by the video's `onEnded` event (which only fires while `loop` is unset)
  and a `watchAgain()` handler that sets `loop = true`, unmutes and
  restarts playback.
- **2026-09-07** — Added an intro video to the `/about` page, in a new
  section between the hero and "What is Ozzy?". Autoplays muted and loops
  (`public/ozzy-intro.mp4`), framed with the site's editorial gold top
  border. Two overlay controls: a small pause/play toggle (bottom-right)
  and a large, high-contrast mute/unmute button (bottom-left) that reads
  "Muted — tap for sound" while muted so it's obvious there's audio
  waiting, switching to a quieter "Sound on" style once unmuted.

### Changed
- **2026-09-21** — **Mobile responsiveness pass on the dashboard shell.**
  - The fixed 252px sidebar is now an off-canvas drawer under 900px: it slides
    in over the content with a dark backdrop instead of squeezing the layout,
    closes on nav-item tap or backdrop tap, and defaults to closed for
    first-time phone visitors (a saved preference still wins). Its z-index sits
    above Leaflet's internal panes, which reach 1000 and were floating the map
    over the open drawer.
  - The sub-tab strips (21 views) now wrap into centred rows on a phone rather
    than scrolling horizontally, so tabs past the third are no longer
    off-screen with no cue they exist. UC Payments' five tabs land 3-over-2.
  - Touch targets raised to the ~44px guideline on the drawer toggle, sub-tabs,
    the ward-compare checklist and the focus/close buttons.
- **2026-09-21** — **Charts re-formed for legibility, not just resized.**
  - Education "Distribution", Crime Deep Dive "Mix" and "Outcomes", and the
    Benefits Bill mosaic became pie charts (shared `PieChart` component) — the
    part-to-whole read a stacked bar could not carry on a narrow screen. Each
    slice's value *and* percentage print as plain text in the legend rather
    than hiding behind a hover, which does not exist on touch.
  - PIP Place "Conditions" became a real Chart.js bar chart with the £ value
    drawn on each bar and the 2013/14 starting figure under each condition
    name, replacing a div/CSS list that read as a column of numbers.
  - UC Weather "Growth" dropped its bar entirely and leads with percentage
    change. Deltas there span 41 → 8,978, so a linear bar rendered the smallest
    wards as an invisible sliver next to the largest — the percentage is the
    honest comparison.
  - UC Payments award bands shortened from "£0.01 to £100.00" to "£0–100" /
    "£2,500+". The .01/.00 boundaries exist only so bands do not overlap and
    carry nothing a reader needs; the shorter label fits far more of the 28
    bands on screen. No underlying value changed.
  - Composition bar rows (Money Map, Benefits UC) stack the name above a
    full-width bar on a phone instead of a fixed name column, roughly doubling
    the bar's width. A stray inline `gridTemplateColumns` on Money Map was
    overriding the existing responsive rule and is removed.
- **2026-09-07** — Standardised current project descriptions as “Ozzy — civic intelligence prototype” across the README, contributor and AI guidance, playbooks, overview diagram, About page and site metadata. Clarified selected-data coverage, the role of visualisation and supporting analysis, and future database, reuse and agentic ambitions. Removed comprehensive-data claims from the commentary introduction.
- **2026-09-07** — Replaced the crude hand-drawn ASCII-art cow face (a
  literal text-character cow face, not an image file) shown in every
  dashboard's "no ward selected" detail-panel placeholder, and dropped the
  "THE BULL OF BIRMINGHAM" caption underneath it. Flagged by the user as a
  design hangover. Swapped in the proper `BullAscii` component (the same
  density-mapped ASCII rendering used everywhere else on the site) across
  all 9 occurrences — `Dashboard.tsx` (×2, the shared Employment/Benefits
  panel and the Education tab), `CrimeObsView.tsx`, `EducationDashboard.tsx`,
  `BenefitsDashboard.tsx`, `ClaimantDashboard.tsx`,
  `ChildPovertyDashboard.tsx`, `UcEmpDashboard.tsx`,
  `UcCombinedDashboard.tsx`. Kept the "Select any ward..." instruction text
  in every case, only removed the cow face and caption. Also removed the
  now-dead `.r-empty .ascii-ward` CSS rule (globals.css) that styled the old
  text art and no longer matches anything.
  Verified with a clean build/tsc and, since this is a purely visual
  change, a real browser check (via claude-in-chrome) confirming the new
  ASCII bull renders correctly in the empty-state panel.
- **2026-09-07** — Accepted all 18 pending data proposals through `/review`,
  so the dashboard suite shows its full dataset instead of sitting behind
  the review wall (the goal: show off the full Ozzy dataset without the
  security gap `/review` used to have). Checked each proposal's validation
  summary first — `wards_found`/`wards_expected` matched exactly, all
  checksums clean, `complete: true` across the board, no anomalies. Accepted
  via the real `/api/proposals` endpoint (same path as clicking Accept in
  the UI), publishing 18 new files to `public/data/`. `uc-employment` and
  `uc-wards` were already accepted from a prior session. `/review` now
  lists all 20 as accepted (read-only) rather than empty — it stays live
  and will show a new item as pending whenever a future fetch script adds
  one.

### Fixed
- **2026-09-21 (device-tested session)** — **The 3D stage scroll fix below was
  half-dead in practice; one-finger swipe did nothing at all.** Confirmed on a
  real phone, and now confirmed fixed on the same phone. The `touches.ONE`
  half was correct, but the `touch-action:pan-y` half never applied: three-stdlib
  writes `domElement.style.touchAction = "none"` **inline** in `connect()`, and
  an inline declaration beats a normal stylesheet rule. So the canvas stopped
  claiming the gesture *and* the browser was still forbidden to scroll — the
  swipe moved nothing, which presents as "no fix" rather than as a cascade
  problem. Two changes were needed: `!important` on the rule, and widening the
  selector to R3F's wrapper `div`. The element drei hands to `controls.connect()`
  is `events.connected` — R3F's outer wrapper — **not** the `<canvas>` the
  original selector targeted, so the `!important` initially landed on an element
  that never had the inline style. `touch-action` resolves as the intersection
  down the ancestor chain, so one node at `none` blocks the pan regardless of
  its parent or child.
- **2026-09-21 (device-tested session)** — **Two-finger orbit ran out of screen
  before the city turned far.** Raised `rotateSpeed` to `1.8` on coarse pointers
  only (new `useCoarsePointer` hook in `WardExtrusionStage.tsx`, matching the
  `(hover:none) and (pointer:coarse)` query already used for the HUD hint, and
  starting `false` so SSR and first client render agree). Two-finger rotation
  tracks the *midpoint* of the pair, which travels less than either finger, so
  the stock speed of `1` is meaningfully worse on touch than on a mouse. Desktop
  orbit feel is unchanged — confirmed on device.
- **2026-09-21 (device-tested session)** — **The Employment ward table overflowed
  its card on a phone.** `.ward-row` was a desktop-only grid
  (`24px 1fr 60px 60px 60px 70px`, `gap:8px`) with no narrow-screen treatment —
  274px of fixed tracks plus 40px of gaps before the ward name got a pixel.
  Three separate causes, all needed: the numeric tracks were simply too wide;
  `.wnm` sits in a `1fr` track, which floors at `min-content` unless
  `min-width:0` lets it shrink; and `.dbar-cell` was a 70px column holding a bar
  drawn at an inline width of up to 61px *beside* its label, ~87px of content.
  Condensed to `14px 1fr 44px 44px 44px 88px` under 640px. **No column is
  dropped and the decile colour bar is kept** — capping the bar's width instead
  would have squashed long bars toward short ones and misstated the data.
  Confirmed on device.
- **2026-09-21 (device-tested session)** — **Six nested scroll boxes trapped the
  thumb, so you had to scroll *around* a panel rather than over it.** Reported on
  Fiscal Balance and found to be a class, not a one-off. A scroll box inside the
  page is fine with a mouse and a trap on touch: the gesture scrolls the box, and
  the page only moves if the swipe happens to start outside it. Two new
  narrow-screen classes in `globals.css`, both `!important` because every one of
  these elements sets its height/overflow inline from JSX:
  - `.scroll-release` — gives up the box's own scrolling entirely. Applied to
    Housing Affordability, Youth & NEET, and the Fly-tipping outlier view
    (conditionally — the map branch sets `height:100%` deliberately and would
    collapse).
  - **The Fiscal "All wards · ranked" list lost its inner scroller outright**,
    on desktop as well as mobile, rather than being released only under 640px.
    It was `maxHeight:760` + `overflowY:auto`, a second scroller inside an
    already-scrolling page for a single 69-row list. All 69 wards now render at
    natural height and the page does the scrolling.
  - **…and lost its expand-full-screen button too.** Removing the inner scroller
    was not enough: focus mode is a `position:fixed` overlay, so 69 rows still
    had to scroll *inside* it, which is the same complaint one level up. Unlike
    a chart or a map, a bar list gains no legibility from being blown up — the
    rows are identical either way — so the only thing "expand" bought here was a
    second scroll context inside a page that already scrolls. `BalanceBars` now
    renders unwrapped. The other 91 `FocusableChart` wraps are untouched; the
    Fiscal provenance table keeps its own.
  - `.scroll-release-x` — for wide tables that must still scroll sideways.
    `overflow-x:auto` cannot be paired with `overflow-y:visible` (per spec a
    non-`visible` value on one axis computes the other from `visible` to `auto`),
    so this releases the **height** instead: at natural height there is nothing
    to scroll vertically and the gesture falls through to the page. Applied to
    the Education quals table and the Fly-tipping data table.
  - The Fiscal panel itself needed no new rule at all — `globals.css` already
    had `.panel,.panel-body{overflow:visible}` in its mobile block, sitting dead
    because `FiscalDashboard.tsx` re-set `overflowY:'auto'` inline. Removing that
    inline is the whole fix, and it was redundant on desktop anyway since
    `.panel-body` already sets `overflow-y:auto`.
  - Deliberately **not** changed: `ConMoneyDashboard.tsx:130` and the Fiscal
    provenance wrapper are `overflowX` only, and a horizontal box does not
    capture vertical gestures.
- **2026-09-21** — **The 3D stages trapped page scroll on touch devices.**
  *(Superseded — see the device-tested correction above: the `touch-action` half
  of this fix never applied.)*
  OrbitControls claims one-finger drag for rotation by default. The stage canvas
  fills most of a phone screen, so a thumb swipe spun the city and the page never
  moved — there was no way to scroll past a stage on mobile. One finger is now
  left to the browser and two fingers rotate / pinch-zoom (verified against
  three-stdlib's source: an undefined `touches.ONE` falls to
  `default: state = STATE.NONE`, disabling the gesture rather than throwing).
  Added `touch-action:pan-y` on the viewport and canvas, without which the
  browser still hands the whole gesture to the canvas. The HUD hint now swaps by
  input type — "drag to orbit" is wrong advice on a phone — and all three stage
  explainers note the two-finger gesture. Mouse input is a separate code path, so
  desktop drag-to-orbit is unchanged. **Not yet verified on a real device:**
  DevTools touch emulation is single-touch and cannot reproduce the two-finger
  path.
- **2026-09-21** — **Three detail-panel charts would have rendered ~80px tall in
  a full-screen box.** Found by a static audit of all 92 expand-view wraps
  against the failure patterns seen during testing, rather than by looking:
  - Crime Deep Dive, Child Poverty and Money Map each wrapped a bare `<svg>`
    with a fixed pixel height. The focus-mode CSS targets `div` elements, so it
    could not reach them. Same fix already applied to `CityLine`/`CitySpark`: a
    `chart-canvas-wrap` container the CSS can size.
  - The lone composition bar in the Benefits UC detail panel is a horizontal
    flex row, but the generic only-child rule flipped it to a column, stacking
    its two segments vertically instead of side by side. Now scoped to a direct
    child so the many-row composition lists keep their own bar heights.
- **2026-09-21** — Fixed a pre-existing type error in `FlyTippingView`:
  `onlyWolvFell` was `boolean | null` because `wolv` is nullable, while
  `OutlierCallout` requires `boolean`. The same file already coerced it
  correctly at its other call site. `tsc` now passes with zero errors.
- **2026-09-21** — **The dashboard could not scroll at all on a phone.** Two
  separate layout bugs, both invisible to a type-check:
  - Every flex/grid item in the chain `.site-main → .dash-shell → .wrap →
    .body → .lcol/.rcol` defaults to `min-width:auto`, so none would shrink
    below its widest child (a chart, an SVG, a table). The whole dashboard
    ballooned past the screen instead of reflowing to it. Fixed with
    `min-width:0` down the chain.
  - Desktop runs a fixed 100vh app shell — `html`/`body` locked with
    `overflow:hidden`, individual panels scrolling internally. That lock is
    written with `:has()`, whose specificity beat the mobile overrides trying
    to undo it, so nothing on the page scrolled anywhere. The mobile rules now
    repeat the `:has()` selectors to win, and the page scrolls normally
    top-to-bottom rather than relying on small nested scroll regions (a swipe
    landing outside the one scrollable div did nothing).
- **2026-09-21** — Fixed three focus-mode layout bugs found while testing:
  - **Every bar rendered the same length** in a focused ranked list. The rule
    stretching a focused chart into a flex column matched *every* row of a
    `.map()`-rendered list, not just a single chart root, overriding each
    row's own `display:grid` so all bar tracks stretched equally regardless of
    value. Now scoped to `:only-child`.
  - **First character of every row clipped** in three focused tables (Money
    Map, PIP Deep Dive Conditions, Two-Child). Those wrappers use a negative
    margin to bleed past `.panel-body`'s padding; focus mode has no such
    padding, so the margin simply dragged content off the left edge.
  - **Header text spilling into the gold dancetty banner** on phones. `.hdr`
    had a fixed 52px height sized for one short subtitle line; longer ones
    ("68 wards · net fiscal balance per head · modelled") wrap to two or three
    and overflowed. Now `min-height` with padding. A sweep for the same
    pattern — fixed `height` on a container holding wrapping text — found two
    more (`.wp-stack`, `.bill-mosaic` on Wrong Payments) where labels were
    being silently clipped by `overflow:hidden`; both now grow on mobile.
- **2026-09-21** — Employment → Compare was a dead end: it asked you to pin
  wards "from the detail panel" with no way to do so from that tab. It now
  opens a searchable ward checklist with an explicit Compare button, and
  supports any number of wards rather than exactly two (best/worst per metric
  are highlighted across the whole selection instead of pairwise).
- **2026-09-21** — UC Payments showed a redundant "£1,500+" award band
  mid-list, between £1,400–1,500 and £1,500–1,600. It is the open-ended
  Stat-Xplore aggregate the fetch script is meant to drop once finer £100
  bands cover the same range. Now filtered at display time by the general rule
  (drop an aggregate a finer band already covers), keeping the genuine
  "£2,500+" top band. It carried 0 households, so Σ bands and the checksum are
  unchanged at 210,693 — and removing it also puts the list back in numerical
  order.
- **2026-09-07** — Fixed the 3D "stage" dashboards (Ozzy Stage, UC Stage 3D,
  PIP Stage 3D) — all three crashed on load with `TypeError: Cannot read
  properties of undefined (reading 'ReactCurrentOwner')` the moment
  `WardExtrusionStage.tsx` imported `@react-three/fiber`. Confirmed via
  research (Next.js's own team, `vercel/next.js#71836`) this is a known
  upstream incompatibility: Next.js 15+ (so also our Next 16) bundles its
  own React runtime internals, which `@react-three/fiber` v8 accesses
  through a secret API path that no longer resolves the same way. Not
  fixable via Turbopack/Webpack toggle or config — the only real fix is
  upgrading `@react-three/fiber` to v9, which in turn requires React 19
  (`@react-three/fiber@9` hard-requires `react@^19`, confirmed by checking
  its published peer dependencies directly rather than assuming).
  - Upgraded `react`/`react-dom` 18 → 19, `@types/react`/`@types/react-dom`
    to match, `@react-three/fiber` 8 → 9, `@react-three/drei` 9 → 10 (drei's
    major version tracks fiber's). `chart.js` and `leaflet` are used
    directly (not through React wrapper packages), so they were unaffected
    and needed no changes.
  - `npm install` needed `--legacy-peer-deps` — an expected, safe resolution
    aid during a multi-package major-version transition like this, not a
    workaround for anything broken. Two new transitive vulnerabilities
    appeared as a side effect (`fflate` DoS via malformed ZIP64 parsing,
    `postcss-selector-parser` DoS via AST recursion) — both had non-breaking
    fixes via `npm audit fix --legacy-peer-deps`; back to 0 vulnerabilities.
  - No application code needed changing — `git diff` after the dependency
    bump touched only `package.json`/`package-lock.json`.
  - Verified with a clean build, `tsc --noEmit` (same pre-existing,
    unrelated `FlyTippingView.tsx` error only), a full HTTP route sweep, and
    — critically, since this bug is a **client-side** crash that no HTTP
    status check would ever catch — an actual browser session (via the
    claude-in-chrome tool) navigating into all three stage views. All three
    render their real 3D extrusion scenes with live data (e.g. UC Stage
    showing 247,176 caseload, PIP Stage showing 91,674), zero console
    errors on a fresh page load.
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
- **2026-09-04** — Fixed the ward-count inconsistency the user spotted
  between the site footer (68) and the live dashboards (69) — investigated,
  found the root cause is bigger than a footer typo (see "known issues"
  below), and applied the safe, no-data-risk fix: replaced every hardcoded
  `"68 wards"` / `"69 wards"` text string with a value read from the actual
  dataset it describes, so a number can never contradict the data next to it
  again.
  - `SiteFooter.tsx` now imports `WARD_COUNT` from `lib/wards.ts` (the
    canonical, correct 69-ward source of truth) instead of hardcoding `68`.
  - `Dashboard.tsx`'s per-view header label — previously several hardcoded
    `69`s *and* the wrong `68`s — now reads `.wards.length` /
    `eduWards.length` / `housingWards.length` / `fiscalWards.length` /
    `wards.length` from whichever dataset that specific view is actually
    showing (falls back to `—` rather than guessing a number, matching the
    site's own stated principle on the Sources page: never show an
    estimate where a real figure isn't available).
  - `OzzyView.tsx`'s data-context header and briefing-loading label now read
    `wards.length` instead of a hardcoded `68`.
  - `DashboardCards.tsx` (the About page's static "what's live" teaser
    cards) and the About page's roadmap list both incorrectly claimed `69`
    for the Employment and Youth/NEET features, which are genuinely on the
    68-ward legacy dataset — corrected the text to `68` (no live-data
    plumbing exists for these static marketing cards, so this was a
    fact-correction, not a dynamic-derivation change).
  - Verified: footer now renders `69 wards`, the legacy claimant-rate
    dashboard view now renders `68 wards` — each honestly describing its
    own data — plus a clean `npm run build`/`tsc --noEmit` and a full route
    sweep (all 200).
- **2026-09-04** — Deleted `public/bull-logo.svg`, now that nothing
  references it (every remaining plain-SVG usage was converted to the
  ASCII-rendered `BullAscii` component in the two entries above). Confirmed
  by a repo-wide search before deleting; the only remaining mentions are in
  this changelog's own history and an old design-handoff doc
  (`BULL_LOGO_TRANSFER.md`), neither of which is live app code. Left
  `public/bull-logo.png` untouched — it's the live source image
  `BullAscii.tsx` samples pixel-by-pixel to generate every ASCII bull on
  the site, not a leftover file. Verified: `bull-logo.png` still serves
  (200), `bull-logo.svg` now correctly 404s, clean `npm run build`, full
  route sweep (all 200).
- **2026-09-04** — Removed a stray hardcoded block-letter "OZZY" wordmark
  (Unicode box-drawing characters, `app/ozzy/page.tsx`) that sat faintly
  below "Select a question to begin" in the Ask Ozzy page's empty chat
  state, alongside a "BIRMINGHAM · FORWARD" tagline next to it — flagged by
  the user as an odd leftover logo. Both removed outright per request; the
  "Select a question to begin" text itself is untouched. Verified with a
  clean `npm run build` and a full route sweep (all 200).
- **2026-09-04** — Unified the project's self-description. The site
  described itself three different ways in different places — "AI agent,"
  "AI Intelligence," "civic intelligence" — and one repo doc
  (`CLAUDE.md`) still said Ozzy was **"for Birmingham City Council,"** the
  same false-affiliation issue already fixed on the live site earlier this
  session. Standardised everything on one descriptor, adapted per context
  (page `<title>`/meta description, nav aria-label and visible subtitle,
  About page hero eyebrow and headline, footer subtitle and blurb,
  `CLAUDE.md`'s "What this is" line):
  **"Ozzy — an open-source civic intelligence prototype for Birmingham."**
  Left the Ask Ozzy page's hero subtitle ("Birmingham's data voice. Direct,
  opinionated...") unchanged, at the user's direction — that line describes
  how the *chat feature* talks, not what the *project* is, so it isn't the
  same kind of "non-aligned" text as the rest.
  Verified with a clean `npm run build`/`tsc --noEmit` (same pre-existing,
  unrelated `FlyTippingView.tsx` error only), a full route sweep (all 200),
  and confirmed the new page `<title>` and copy render, with no leftover
  "AI agent" text on the About page.

### Known issues / deferred
- **The 2026-09-21 mobile work is compile-verified, not fully device-verified.**
  `tsc` passes clean and every route compiles and returns 200, but the session
  that wrote it had no working browser connection, so visual confirmation came
  from the maintainer spot-checking in DevTools emulation. Confirmed by eye:
  the maps, Labour Scatter, Economic Matrix, the pie conversions, Benefits Bill
  and UC Payments charts, the composition bars and the Fiscal provenance table.
  **Not yet seen by anyone:** most of the ~14 table wraps, the six detail-panel
  wraps, and the four Family Model wraps under `/review`. A static audit of all
  92 wraps was run in place of a visual pass and found three real bugs (logged
  above), so the remaining unviewed ones are plausible but unproven.
- **~~The 3D stage touch fix needs a real device.~~ Done — tested on a phone
  2026-09-21.** Confirmed working by the maintainer, on device: one-finger swipe
  over a stage scrolls the page (only after the correction logged under "Fixed"
  — it did nothing on first test), two fingers orbit, tap still selects a ward,
  two-finger orbit sensitivity at `rotateSpeed:1.8`, the detail-panel
  expand-full-screen buttons, and the Employment ward table.
- **Verification status of the 2026-09-21 device session.** Confirmed by the
  maintainer on a physical phone: one-finger scroll over a 3D stage, two-finger
  orbit, orbit sensitivity at `rotateSpeed:1.8`, tap-to-select, the
  detail-panel expand buttons, the condensed Employment ward table, the Fiscal
  Balance panel, the Fiscal ranked-bars inner scroller, Housing Affordability,
  Youth & NEET, Fly-tipping "Why Wolverhampton?", and both `.scroll-release-x`
  tables (Education quals, Fly-tipping data) including sideways scrolling.
  **Not seen by anyone:** removing the expand button from the Fiscal ranked-bars
  list — the change was made in response to the maintainer reporting a scroll
  still present in the expanded view, and it removes the expanded view rather
  than altering it, but the result has not been looked at. One-line revert
  (re-wrap `BalanceBars` in `FocusableChart`) if it is not wanted.
- **Emulation did not substitute for a device, and the gap was not only
  two-finger gestures.** Going into this session the expectation was that
  DevTools emulation had covered everything except two-finger rotate. In the
  event, two-finger rotate passed first time and *four* other issues were found
  only on real hardware — the dead `touch-action` rule (a single-finger
  gesture), the Fiscal scroll trap, the Employment table overflow, and the
  redundant inner scroller. Budget for a device pass on future mobile work
  rather than treating it as a formality for multi-touch alone.
- **All 14 Leaflet maps claim one-finger drag on touch — accepted, not fixed.**
  Noticed on device (UC Claimants in Work map, 2026-09-21): a swipe starting on
  a map pans the map, so the page only scrolls if the swipe starts beside it.
  This is *not* the nested-scroll-box class fixed above — an `overflow:auto` div
  has no reason to claim a gesture, whereas drag-to-pan is a map working as
  intended. Deliberately left alone because the cheap fix is not cheap in
  effect: Leaflet has no native two-finger-pan mode, so
  `dragging: !L.Browser.mobile` would remove map panning on phones entirely
  rather than reproducing the 3D stage's one-finger/two-finger split, and that
  split needs a plugin dependency. The maps are small enough in practice to
  scroll around. Revisit only if a larger map lands on a mobile-heavy view.
- **The `allowedDevOrigins` default hardcodes a LAN IP.** Fine for this fork;
  wants deciding before any upstream PR — either drop the default so it is
  `DEV_ORIGIN`-only, or leave it documented as an example.
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
- **FYI / future fix — the underlying 68-ward legacy dataset itself is still
  wrong,** even though the *displayed counts* are now honest (see the
  2026-09-04 "Fixed" entry above). Root cause confirmed: Education, Youth/
  NEET risk, Housing, Fiscal, and Ask Ozzy's data context all trace back to
  a hardcoded `FALLBACK` array in `lib/data.ts` — a legacy 68-ward dataset
  with a *different, incorrect* ONS ward-code series
  (`E05011082`–`E05011150`) and some outdated ward names, versus the
  correct, current official 69-ward set (codes `E05011118`–`E05011186`,
  canonical list in `lib/wards.ts` — used by crime, UC, child poverty, PIP,
  and most newer live-data dashboards). `lib/wards.ts` already carries a
  comment flagging this exact problem ("Do NOT use the legacy 68-ward set
  embedded in lib/data.ts"), so it's known, pre-existing tech debt, not
  something introduced by this fork.
  - Scoped this properly by diffing the two ward-name lists directly: only
    ~8 of the ~21 differing entries are pure spelling/naming differences
    that can be safely auto-mapped (e.g. `Aston` ↔ `Aston (Birmingham)`,
    `Kings Norton North` ↔ `King's Norton North`, `Walmley & Minworth` ↔
    `Sutton Walmley & Minworth`). The remaining ~13 wards on *each* side
    don't match anything at all — e.g. `FALLBACK` has `Fox Hollies`,
    `Tyburn`, `Washwood Heath`, `Hodge Hill` with no equivalent in the
    correct list; the correct list has `Alum Rock`, `Ward End`,
    `Bartley Green`, `Holyhead`, `Frankley Great Park` with no equivalent in
    `FALLBACK`. This isn't typos — `FALLBACK` looks like it was built from
    an earlier draft of Birmingham's ward boundaries, not the final adopted
    ones.
  - Real fix requires verifying the true current ward roster against an
    authoritative source and sourcing seed values for the ~13 genuinely-new
    wards, then retiring `FALLBACK` in favour of the canonical 69-ward list
    — not a text relabel, and not something to hack together from the two
    already-conflicting files alone. Scoped as its own dedicated future job;
    deliberately not started as part of this cosmetic/consistency pass.
