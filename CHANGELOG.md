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
- **2026-09-22** — **Basemap moved from CARTO to Esri Light Gray Canvas on all 14
  Leaflet maps**, because CARTO began watermarking keyless use of
  `basemaps.cartocdn.com` ("API key required") and the watermark was appearing
  over every map. 28 tile layers across 14 files.

  *Why Light Gray Canvas rather than OpenStreetMap standard.* A canvas basemap is
  built to sit under thematic data — it is desaturated so the choropleth owns all
  the colour, whereas OSM standard's green parks and orange roads compete with
  the fill ramp and can read as data values. It also ships as a separate base
  layer and labels layer, which the Employment and Education maps depend on:
  they draw base → choropleth → labels so ward names stay legible over dark
  fills. OSM bakes labels into the tile, which would bury them.

  *Faithful swap, not a redesign.* `light_nolabels` → `World_Light_Gray_Base`,
  `light_only_labels` → `World_Light_Gray_Reference` (the `pane: 'shadowPane'`
  placement is preserved, so labels stay above the data on those two maps). The
  twelve single-layer `light_all` maps became base + labels with both below the
  choropleth, which is what `light_all` already did. Note the Esri tile scheme is
  `{z}/{y}/{x}` — y before x — not Leaflet's usual order. Attribution updated to
  "Esri, HERE, Garmin, © OpenStreetMap contributors" everywhere.

  *Open question, deliberately flagged.* Esri's free tile services are intended
  for use with Esri products and their terms are less clear-cut for third-party
  apps than OSM's ODbL. Acceptable for a demonstrator circulated for feedback;
  settle it before anything permanent and public — either a CARTO API key, a
  Stadia/Maptiler key, or accept OSM standard's busier look.
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
- **2026-09-21 (device-tested session)** — **The dashboard scrolled inside a box
  instead of scrolling as a page, on desktop.** Mobile already unwound the fixed
  100vh app shell below 900px; the same objection applies with a mouse, where a
  nested scroll region is a box the reader has to find and the wheel does
  nothing until the pointer is over it. `html`, `body`, `.site-main`,
  `.dash-shell`, `.wrap`, `.body`, `.lcol`, `.panel`, `.panel-body` and `.rcol`
  now release their `overflow` locks at **all** widths, so the whole page
  scrolls. The `<=900px` block is left in place unmerged so the mobile
  behaviour verified earlier in the session is not disturbed.
  **The 3D stage layouts are a deliberate exception** — they size a WebGL canvas
  to the viewport and need a definite height, so anything containing a
  `.stage-layout` keeps the fixed shell. Excluded via
  `:not(:has(.stage-layout))` rather than a media query, so desktop and mobile
  stay consistent and mobile stages keep the page-scrolling that was
  device-verified. Confirmed on desktop by the maintainer.
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

### Removed
- **Removed the green `●` "live" dots from the dashboard sidebar nav
  (2026-09-22).** Noticed by the maintainer as a visual inconsistency: most nav
  items carried a trailing dot but the top few did not. The inconsistency was
  real and the dots were worse than untidy — 18 of the 20 were hardcoded
  `<span className="dash-live-dot">●</span>`, rendered unconditionally and always
  green regardless of whether that dataset had actually been fetched live, so
  they asserted a live fetch the app had not verified. Only two were honest
  (`dsrc.crime === 'live' &&` and `dsrc.neet === 'live' &&`), and Employment and
  Education & Skills had none at all, which is what made the row look uneven.

  All 20 removed, plus the now-unused `.dash-live-dot` rule from
  `app/globals.css`. No provenance information is lost: live/cached state is
  still shown by the honest `LIVE`/`CACHED` badge in the ward DetailPanel, which
  is conditional on `dsrc.nomis`. `dsrc` is still threaded through to
  `DetailPanel`, so nothing became unused.

  `tsc --noEmit` clean; `/dashboard` and `/sources` 200. Not yet seen on screen.
- **Housing Affordability and Ward Net Fiscal Balance dashboards deleted
  (2026-09-22)** — both were synthesised end to end and failed CLAUDE.md's
  "no synthesised/modelled values in the UI" rule, so they were pulled rather
  than re-sourced. Decision taken deliberately: Ozzy is aimed at residents,
  journalists and councillors, so a modelled figure that reads as a real one is
  a credibility risk, and "real data or nothing" was chosen over
  honest-by-disclosure labelling.

  *Why they could not be salvaged.* Fiscal's revenue side was driven entirely by
  `w.earnings`, itself unconditionally synthesised — `incTaxNI = employed *
  w.earnings * 1000 * 0.28` — so revenue per head and every ward's net
  contributor / net recipient classification rested on a fabricated input. Its
  own banner already admitted the figures "show how the model behaves, not a
  real result". Housing's house prices and private rents were hardcoded
  per-ward-character bases plus hash noise (`CHAR_PRICE` Sutton £350k, city
  £200k; floored at £148k), and `housing_pressure_score` took 55% of its weight
  from the two earnings-derived ratios (rent-to-income 35%, price-to-income
  20%), so the affordability ranking was a ranking of invented numbers.

  *Also found and removed with them:* the house-price tooltip claimed the figure
  was "Modelled from Land Registry and Census tenure profiles" when no Land
  Registry data was involved anywhere in the code path — an active false claim
  of provenance, worse than an unlabelled estimate.

  *Deleted:* `app/housing/components/` (HousingDashboard, HousingDetailPanel,
  HousingGrid, HousingTable), `app/fiscal/components/` (FiscalDashboard,
  FiscalDetailPanel), `lib/synth-housing.ts`, `lib/synth-fiscal.ts`, and the
  `FiscalBenefits` / `FiscalWard` / `HousingWard` interfaces from `lib/types.ts`.
  `app/components/Dashboard.tsx` lost 7 imports, 2 `View` union members, 2 state
  hooks, the `isHousing`/`isFiscal` flags, 2 `useMemo` builders, both nav
  buttons, the title and subtitle strings, 2 `ScoringNote` blocks, the housing
  breadcrumb/legend, 2 mount points and 2 detail-panel branches.

  *Not touched:* the **Housing Benefit** view (`app/housing-benefit/`, view id
  `hbenefit`) is a different dashboard on real DWP data and stays.
  `UC_Plan/birmingham-fiscal-dashboard-BUILD-SPEC.md` is kept deliberately — it
  specifies the ONS reconciliation a real Fiscal dashboard would need, so it is
  the starting point if Fiscal is ever rebuilt properly.

  *Copy reworded as a consequence:* the Sources page in-migration note listed
  housing and fiscal as "being migrated" and claimed "their figures are withheld
  rather than modelled", which was false while both dashboards were shipping
  modelled figures; it now names the two removals and lists only employment and
  youth as in migration. `CLAUDE.md`'s legacy-modelled-code line no longer names
  `buildHousingWards` / `buildFiscalWards` as pending.

  *Verification:* `tsc --noEmit` clean, no residual references to any of the
  removed symbols, and `/dashboard`, `/sources`, `/about`, `/ozzy`, `/review`
  all return 200 on the dev server. **Not yet seen on screen by anyone** — the
  maintainer has not visually confirmed the dashboard renders correctly with
  both nav buttons gone.

### Withheld pending data fixes

Everything in this section is **hidden from the UI but left in the codebase**, so
that a working demonstrator could ship on 2026-09-22 without any view that
cannot be trusted. Each item records what was hidden, how to put it back, and
what must be true first. Nothing here was deleted.

**The root cause for most of it.** `lib/data.ts` builds every ward from the
legacy 68-ward `FALLBACK` array. That roster shares **33 ward codes** with the
canonical ONS 69-ward set in `lib/wards.ts`, and **all 33 refer to a different
ward** — `E05011118` is "Aston" in `FALLBACK` and "Acocks Green" officially;
`E05011120` is "Newtown" vs "Alum Rock"; `E05011126` is "Sparkbrook & Balsall
Heath East" vs "Bordesley & Highgate". Because every live dataset is joined to
this roster *by code*, 33 wards receive **another ward's real data** and the
remaining 35 match nothing and fall through to a synthesised value. Verified by
diffing the two rosters directly, 2026-09-22.

- **Ask Ozzy — the conversational layer — is switched off for the demonstrator,
  and reframed as a later phase rather than a shipped feature.** Ozzy is a civic
  intelligence prototype whose job right now is *presenting* real sourced data;
  the chat comes after. Flag: `ASK_OZZY_CHAT_ENABLED` in the new `lib/features.ts`.

  *Two independent reasons, either sufficient.* `buildDataBlock()` in
  `app/components/OzzyView.tsx` assembles the model's entire context from
  `wards` — the legacy 68-ward `FALLBACK` roster — including a
  `city_avg_gva_per_head_k` computed from synthesised GVA. The model would state
  those figures in confident prose, which is the most damaging way to be wrong:
  a chart invites scepticism, a fluent sentence does not. Separately,
  `app/ozzy/page.tsx` carries hardcoded example answers quoting specific wards
  and rates from the same legacy roster.

  *Hidden:* the `/ozzy` route (redirects to `/dashboard` while disabled), the
  `TopNav` entry, the `SiteFooter` link, and the in-dashboard "Ask Ozzy" nav
  button. The `/about` roadmap already listed "Full agentic chat" as `planned`,
  which is now accurate rather than aspirational. The `/privacy` chat section now
  opens by stating the layer is switched off and that nothing is sent anywhere
  while browsing the dashboards, then describes how it will behave when enabled.

  *To reinstate:* set `ASK_OZZY_CHAT_ENABLED` to `true`, once `FALLBACK` has been
  retired, the context is rebuilt from the canonical datasets, and the canned
  answers on `/ozzy` are re-derived from real figures.

  *Also added:* **`docs/FUTURE-DIRECTIONS.md`** — what Ozzy is now, and the
  direction it is aimed at: federated civic intelligence, where every council
  runs an instance and the data can be combined to see what is good and bad
  where, what has *worked*, and — empirically rather than by assertion — what
  good and bad governance look like. It records the four preconditions that makes
  real (canonical geography keys, identical metric definitions, provenance
  carried with the number, honest gaps), and notes that the ward-roster collision
  found today is the one-city version of exactly the failure federation would hit
  at national scale.

- **Employment & Benefits view (the former default) and Youth & NEET risk view.**
  Hidden behind `LEGACY_ROSTER_VIEWS_ENABLED` in `app/components/Dashboard.tsx`.
  The default view moved from `'employment'` to `'crime'`.
  *To reinstate:* set that constant to `true`. *First:* retire `FALLBACK` in
  favour of `lib/wards.ts` so ward codes and names agree. This also takes out the
  Employment sub-tabs (Grid, Table, Labour Scatter, Economic Matrix, Map,
  Compare), the ward `DetailPanel` and `NeetDetailPanel`, since all of them read
  `wards`.
- **All Ozzy inline visual markers except `{{stat:…}}` and `{{open:…}}`.** Hidden
  behind `LEGACY_ROSTER_MARKERS_ENABLED` in `app/components/OzzyMarkers.tsx`
  (`ward`, `crime`, `crime-bars`, `list`, `matrix`, `trend`, `neet-risk` — 7
  guards). Their instructions were removed from the system prompt in
  `app/components/OzzyView.tsx` so Ozzy cannot emit a marker that renders
  nothing. *To reinstate:* set the constant to `true` **and** restore the nine
  prompt lines from git history (`git show HEAD~1:app/components/OzzyView.tsx`).
  *First:* same roster fix.
- **`earnings`, and the Employment chip and meter bar that displayed it.** Hidden
  as a consequence of hiding the Employment view — `earnings` is still generated
  unconditionally in `lib/data.ts` and is still 100% synthesised. *To reinstate:*
  nothing to do beyond the roster fix, but it should not come back at all until
  it is sourced from real ASHE data or removed for good.
- **GVA per head and the Economic Matrix.** Hidden with the Employment view.
  Note the fetch is *fixable* — the field names are simply wrong (see the
  "IMD and GVA live fetches" entry). The live dataset was verified working on
  2026-09-22: latest year **2023**, **69/69 canonical wards matched**, per-head
  £4.1k (Hall Green South) → £13.1k median → £298.1k (Ladywood, city-centre
  workplace GVA), using `WARD_POPULATION_2024` as the denominator. Three
  aggregate rows must be excluded (`AllLaInCountry_England`,
  `CombinedAuthorities_WestMidlands`, `E08000025`). **This fix was deliberately
  not applied**: while the UI renders the `FALLBACK` roster, real GVA joined by
  code would caption Alum Rock's figure "Newtown", which is worse than a
  synthesised number. Fix the roster first, then the fetch.
- **Three roadmap entries on `/about`** moved from `live` to `soon` with honest
  detail text: "Employment & claimants", "Youth & NEET risk", "Economic matrix".
- **Three tiles removed from the `/about` dashboard grid** (`DashboardCards.tsx`):
  `employment`, `youth`, `matrix` — 10 tiles down to 7. *To reinstate:*
  `git show` this commit's parent for the three objects.

**What is still live and trustworthy**, because each carries its own canonical
69-ward roster rather than joining to `FALLBACK`: Crime (data.police.uk, verified
69 wards keyed `E05011118`+), Crime Deep Dive, Education & Skills (Census 2021,
verified canonical codes `E05011118`–`E05011186`), Universal Credit, UC in Work,
Claimant Count, Housing Benefit, Fly-tipping, Benefits Bill, Two-Child Limit,
Child Poverty, Money Map, PIP Deep Dive, Wrong Payments, UC Payments, UC Weather,
PIP Place and the three 3D stages.

### Known issues / deferred
- **Audit of the 20 still-live dashboards (2026-09-22).** Everything withheld so
  far was found by tripping over it. This was a deliberate sweep of what actually
  ships, on the principle that it is about to be read by people who will act on it.
  **Result: the live set is sound.** Details, so the work is not repeated.

  *Synthesised data is fully contained.* Only two files import from `lib/synth`:
  `app/components/detail/DetailPanel.tsx` (`extras()` — fabricates `youth_unemp`,
  `uc_pct`, `no_quals`, `vacancies` from the composite plus a hash) and
  `app/components/detail/TrendChart.tsx` (`hash01`, used by `pandemicTrend()` to
  fabricate the entire 2019→now claimant series behind the "2019–NOW" toggle).
  `TrendChart` renders only inside `DetailPanel`, and `DetailPanel` renders only
  in the Employment view. Both are therefore unreachable. Note `extras` is also a
  *prop name* on `StageWardPanel` and appears in `OzzyStageView` and
  `FamilySupportView` — those are unrelated and carry real UC/PIP figures.

  *The legacy roster is fully contained.* All nine consumers of `wards` in
  `Dashboard.tsx` sit behind `view === 'employment'` or `isYouth`, both
  unreachable. The `DetailPanel` branch is reached only when `selected` is set,
  which only the Employment sub-views do.

  *The live dashboards disclose their derived figures properly*, which is why they
  survive the "real data or nothing" rule. Wrong Payments leads with a banner —
  "ILLUSTRATIVE · NATIONAL RATES × CITY SPEND · NOT A BIRMINGHAM AUDIT". The
  Benefits Bill says "split withheld, not estimated" where DWP does not itemise.
  UC Payments labels its derived monthly outlay and marks the household series
  "raw COUNT each month (not modelled)". Housing Benefit states "No modelled ward
  values are invented". These are arithmetic on published figures with the working
  shown — a different thing from the hash-derived values that were deleted.

  *The Crime landing view checks out.* `public/data/crime-wards.json` is real
  data.police.uk, 69 wards, keyed on canonical codes with matching names
  (`E05011118` = "Acocks Green") and real ONS populations.

  *Three more dead fetches found, all feeding withheld views only:*
  - `lib/fetch-crime.ts` filters City Observatory on `lad_name` → **400 Unknown
    field**. Feeds `crime_rate_per_1000` on the legacy roster, *not* the Crime
    dashboard, which reads the JSON above.
  - `lib/fetch-nomis.ts` (claimant count) returns **200 with `"Query returned no
    data"`** — the `geography=1946157186TYPE448` ward-type code looks like a stale
    boundary vintage. Feeds `claimant_rate` on the legacy roster; the Claimant
    Count dashboard reads its own committed snapshot.
  - `lib/fetch-neet.ts` **works** (72 records) — an earlier failure was transient.

    That makes **five** of the app's live fetches broken (GVA, IMD, crime, NOMIS)
    or previously suspect, every one of them failing silently into a fallback.
    Worth treating as a class: no fetch in this codebase asserts that it got what
    it expected, so a schema change upstream is invisible until someone checks by
    hand. A shape assertion per fetch would have caught all four at the first run.

  *Freshness of what ships.* Every dataset carries a real `as_of`. Most were
  generated 2026-09-07 with as-of dates from Jan–Apr 2026, which is normal lag for
  official statistics, and each dashboard header prints its own as-of. The
  exception worth noting: **`crime-wards.json` is the oldest (generated
  2026-06-24, as of 2026-04) and it is now the landing view.** Regenerating it
  with `scripts/fetch-crime-wards.mjs` would put a fresher month in front of
  first-time readers.

  *Not a fault:* `uc-payments.json` carries `wards: []` by design — the DWP data
  is local-authority level, and the file declares `geography_level`, `la_code` and
  `wards_found` alongside 28 award bands, 5 family types, 24 months and its own
  checksum fields.
- **Verification status of the 2026-09-22 demonstrator work.** Recorded precisely,
  because most of this session's output has *not* been seen on screen.

  *Confirmed by the maintainer, by eye:* **the maps** after the CARTO → Esri Light
  Gray Canvas swap. The "API key required" watermark is gone and the maps render
  correctly. This covers the basemap change across all 14 Leaflet maps.

  *Compile- and route-verified only — nobody has looked at these:* the dashboard
  nav with the Employment and Youth & NEET buttons gone and Crime as the landing
  view; the `/about` roadmap rows moved to `soon` and the three removed tiles
  (10 → 7); the reworded `/sources` in-migration note; the `/privacy` "not enabled
  in this release" paragraph; the removal of the green nav dots; and the absence
  of the Housing Affordability and Fiscal Balance dashboards.

  *Machine checks that did pass:* `tsc --noEmit` clean after every change; a full
  `npm run build` clean (Next 16.3.3, 14 static pages, no errors or warnings); and
  `/`, `/dashboard`, `/about`, `/sources`, `/privacy`, `/review` all 200 with
  `/ozzy` returning 307 to `/dashboard` as intended.

  Per `docs/RESPONSIVE-RETROFIT-PLAYBOOK.md` and the 2026-09-21 device session:
  a clean compile is not a substitute for looking. The items above are plausible
  but unproven until someone opens them.
- **The IMD and GVA live fetches have been failing silently — verified against
  the live API 2026-09-22.** Found while scoping per-dashboard source citations:
  before citing a source, check the app can actually reach it. Neither can.

  *GVA (`lib/fetch-gva.ts`).* The request selects
  `ward_name,ward_code,gva_total_millions,year`; the dataset's real fields are
  `areaidentifier`, `arealabel`, `date`, `periodlabel`, `value`. The API returns
  **400 ODSQLError "Unknown field: ward_name"**. The per-head denominator fetch
  is worse — dataset `census-2021-age-birmingham-wards` returns **404, does not
  exist**. So `w.gva = gMap?.[code] != null ? ... : synthGva(w)` has *always*
  taken the synth branch. **GVA per head is not a silent fallback that sometimes
  fires — it is fabricated 100% of the time**, and so is every Economic Matrix
  quadrant assigned from it. The dataset itself is alive and fine (720 records,
  200) — only the field names are wrong.

  *IMD (`lib/fetch-imd.ts`).* Three separate breaks. The `where` clause filters
  `lad22cd='E08000025'` → **400 "Unknown field: lad22cd"** (the real field is
  `local_authority_code_2024`). The record parser looks for `employment_score` /
  `employment_domain_score` / `emp_score`, but the dataset publishes only
  `employment_rank` and `employment_decile` — there is **no score field at all**.
  And it looks for a ward code (`ward22cd`/`ward_code`/`wardcd`/`ward21cd`) in a
  dataset keyed on `lsoa_code_2021` with **no ward column**, so aggregating it to
  wards needs an LSOA→ward lookup the codebase does not have. Consequence:
  `imd_employment_score` always comes from the hardcoded `FALLBACK` array in
  `lib/data.ts` — i.e. the legacy 68-ward set on the wrong ONS code series.

  *Why it went unnoticed.* Both failures are caught and fall through to a
  fallback, and `defaultDataSources` already reports `imd: 'cached'` and
  `gva: 'cached'`, so the app never claimed live. But "cached" for GVA means
  "hash", not "committed real snapshot" — precisely what CLAUDE.md forbids.
  The removed nav dots made it worse by asserting live fetches unconditionally.

  *Consequence for the citation work.* Registry entries for IMD and GVA were
  **not** added: a citation naming MHCLG or City Observatory on a number the app
  has never fetched is worse than no citation, because it looks rigorous. The
  22 existing registry entries are unaffected by this finding.

  *Reproduce:* the exact failing URLs are in `lib/fetch-gva.ts:8-9` and
  `lib/fetch-imd.ts:2,8`; paste them into a browser and read the error bodies.
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
  Also confirmed: removing the expand button from the Fiscal ranked-bars list.
  **Every change made during the 2026-09-21 device session has now been seen on
  a physical phone by the maintainer.** (One-line revert for the expand removal
  — re-wrap `BalanceBars` in `FocusableChart` — should it ever be wanted back.)
- **Emulation did not substitute for a device, and the gap was not only
  two-finger gestures.** Going into this session the expectation was that
  DevTools emulation had covered everything except two-finger rotate. In the
  event, two-finger rotate passed first time and *four* other issues were found
  only on real hardware — the dead `touch-action` rule (a single-finger
  gesture), the Fiscal scroll trap, the Employment table overflow, and the
  redundant inner scroller. Budget for a device pass on future mobile work
  rather than treating it as a formality for multi-touch alone.
- **Synthesised values still render indistinguishably from sourced ones.
  Scoped 2026-09-21; attempted and reverted the same night — bigger than a
  data-layer change.** Recorded here so the next attempt starts from facts.

  *Always fabricated, with no live path at all:* `earnings`
  (`data.ts` — `w.earnings = synthEarnings(w)`, unconditional), `crime_yoy_pct`,
  `crime_categories` and `crime_trend_12m` (all three overwritten by `synth*`
  for every ward after crime rank is set, regardless of whether the real
  data.police.uk figures loaded). Earnings *is* consistently labelled `(est)`
  in the UI with a tooltip naming ASHE; the three crime fields are not labelled
  anywhere.

  *Silent fallbacks — real when the source answers, hash-derived when it does
  not, rendered identically either way:* `gva`, `population`,
  `crime_rate_per_1000`, `youth_claimant_rate`. This is the case CLAUDE.md's
  "a fallback must never be a synthesised stand-in" is aimed at, and it is
  invisible to the reader *and* to the maintainer — the Economic Matrix prints
  `GVA/head £12.4k` and assigns quadrants off it whichever it is.

  *Why the obvious fix is not a small change.* Switching the three fallbacks
  from `synthGva(w)` etc. to `null` is four lines and produces **72 type errors
  across 16 files**. Most are mechanical, but one is not: `assignQuadrants()`
  classifies every ward by GVA, so with GVA absent each unsourced ward falls
  through to `'disadvantage'` — a *fabricated classification*, which is worse
  than the fabricated number it replaced. Doing it properly needs an `'unknown'`
  quadrant (36 usages of `quadrant` across the app), a decision about what the
  Economic Matrix plots for unclassified wards, and a decision about what the
  Crime dashboard shows once categories and the 12-month trend are empty.

  *The trap to avoid.* `?? 0` satisfies the compiler and silently reintroduces
  fabrication — a zero is as invented as a hash, and it would corrupt averages
  and rankings rather than just one cell. Every one of the 72 sites needs a
  real decision: skip the ward in the aggregate, render `—`, or drop the point
  from the chart.

  *Not a regression from this fork* — all of it predates it and is Will's code,
  so the `'unknown'`-quadrant design question is worth raising upstream rather
  than deciding unilaterally.

  *Update 2026-09-22 — partly resolved by deletion.* The Fiscal and Housing
  dashboards were removed outright (see "Removed" above), which takes the whole
  Fiscal revenue model and the earnings-derived 55% of the housing pressure
  score with them. `earnings` itself still exists and is still unconditionally
  synthesised, but its only remaining consumers are the DetailPanel chip and
  meter bar, one Compare row and one line of Ozzy's disclaimer — a small
  deletion now rather than a cascade. Still open and untouched: the `gva` /
  `population` / `crime_rate_per_1000` / `youth_claimant_rate` silent fallbacks,
  the three unlabelled crime fields, and the `assignQuadrants()` /
  `'unknown'`-quadrant problem.
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
- **The `allowedDevOrigins` default hardcodes a LAN IP — decided 2026-09-21:
  keep it as a worked example for now.** A private RFC1918 address, dev-only,
  with `DEV_ORIGIN` available for anyone testing from a different machine.
  Isolated in its own commit (`d2840c5`) so it stays a one-line revert if a
  future upstream PR would rather it were `DEV_ORIGIN`-only.
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
