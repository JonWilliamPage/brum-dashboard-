# Playbook — retrofitting a desktop-first dashboard for mobile

*2026-09-21. Written from the session that added expand-to-full-screen to all 92
data views and fixed the layout bugs that made `/dashboard` unusable on a phone.
Recorded so the method can be repeated — or automated — rather than rediscovered.*

---

## Why this doc exists

The work was highly repetitive (one wrapper applied 92 times) but **six of the
seven bugs we hit were invisible to `tsc` and to the dev-server compile**. Every
one showed up only on a real screen. Any harness that automates this kind of
retrofit needs to know which failures type-checking cannot see, and which of
those *can* still be caught statically if you know the pattern.

---

## The work, in order

| Phase | What | Why this order |
|---|---|---|
| 1 | Make the page scroll at all | Nothing else is testable until it does |
| 2 | Sidebar → off-canvas drawer | Biggest single blocker; it covered the screen |
| 3 | Expand-to-full-screen on one chart | Prove the pattern before repeating it |
| 4 | Batch by *identical* type (14 maps, then charts, then tables) | Cheap once proven; see protocol below |
| 5 | Re-form charts that were unreadable small | Resizing ≠ legibility (below) |
| 6 | Static audit against known failure patterns | Substitute for browser access |

---

## Protocol: prove one, then batch identical

Agreed with the project owner and worth keeping:

1. Implement **one** example. Name it precisely ("Employment → Map").
2. Owner eyeballs it on a real device.
3. On confirmation, apply to **everything of that same type** in one pass.
4. Anything structurally different starts again at step 1.

"Same type" means same mechanism, not same appearance. The 14 Leaflet maps were
one batch. A Chart.js canvas and a hand-rolled `<div>` bar chart look similar and
are *not* the same type — they failed differently.

**Do not** report work as verified because it compiles. State "compile-verified
only" until someone has looked at it.

---

## Failure classes a type-check cannot see

Each of these shipped clean through `tsc` and rendered wrong.

| Symptom | Root cause | Static test that catches it |
|---|---|---|
| Page won't scroll; layout wider than screen | Flex/grid items default to `min-width:auto`, so nothing shrinks below its widest child | Grep the flex chain for a `min-width:0` on every link |
| Page won't scroll *anywhere*, even after the above | A desktop `height:100vh` + `overflow:hidden` app-shell lock written with `:has()`, whose specificity beats plain mobile overrides | Grep for `:has(` in rules that set `overflow` or `height` |
| Every bar in a list renders the same length | A focus-mode rule meant for one chart root matched **every row** of a `.map()`-rendered list and overrode `display:grid` | Selector audit: does any `> div` rule assume a single child? |
| First character of each row clipped | Wrapper uses a negative margin to bleed past parent padding; the new full-screen container has no such padding | Grep wrapped children for `margin: '-` |
| Header text spills into the banner below | Fixed `height` on a container holding text that wraps at narrow widths | Grep `height:\d+px` and check if the element holds text |
| Chart renders ~80px tall in a full-screen box | The sizing CSS targets `div`; the chart is a bare `<svg>` with a fixed height | Grep wrapped children for a direct `<svg>` |
| Map renders squashed after resize | Leaflet measures its container once at init and never notices later resizes | Grep for `L.map(` without a `ResizeObserver` in the same file |
| A correct mobile rule has no effect at all | The property is also written **inline** — by JSX `style={{…}}`, or by a library assigning `el.style.x` at runtime. An inline declaration beats any normal stylesheet rule, so the media query is silently dead | Grep `style={{` for the property being overridden, and grep `node_modules` for `.style.<prop> =` in any library that touches the element |
| The right fix on the wrong element | The element a library actually binds to is not the one you assume. R3F connects events to its **wrapper div**, not the `<canvas>`, so drei/OrbitControls writes `touch-action:none` one level up from where you're looking | Read the library's `connect()`/event-target resolution before writing the selector; don't infer the node from the JSX |
| A panel scrolls instead of the page | A nested scroll box (`overflow:auto` + a bounded height). Fine with a mouse, a trap under a thumb: the gesture scrolls the box, so the page only moves if the swipe starts outside it | Grep for inline `overflow`/`overflowY`/`maxHeight` and for `.panel-body`-style classes with no `@media` release |
| Releasing `overflow-y` re-traps a sideways-scrolling table | Per spec a non-`visible` value on one axis computes the other from `visible` to `auto`, so `overflow-x:auto` + `overflow-y:visible` is impossible | Release the **height** instead (`max-height:none`, `flex:none`): at natural height there is nothing to scroll vertically and the gesture falls through |

**Rule of thumb that prevents most of these:** a fixed pixel `height` is only safe
when the content cannot reflow — an image, a canvas, a decorative band. Anything
containing text wants `min-height`.

---

## Resizing is not legibility

Making a chart bigger does not make it readable. Where the *form* was wrong for a
small screen we changed the form, not the dimensions:

| Problem | Change | Why |
|---|---|---|
| Stacked bar of 7 qualification levels, unreadable narrow | → pie, values + % as plain text in the legend | Part-to-whole reads better as angle; **hover does not exist on touch**, so numbers must be visible |
| Growth list spanning 41 → 8,978 | → drop the bar, lead with % change | A linear bar renders the smallest entries as an invisible sliver next to the largest |
| `"£0.01 to £100.00"` × 28 rows | → `"£0–100"` | The `.01/.00` boundaries exist only so bands don't overlap; they carry nothing a reader needs |
| Name column eating 60% of a composition row | → name above a full-width bar | A fixed label column costs proportionally far more on a phone |
| 4-column provenance table at `min-width:600px` | → stack to labelled lines under 760px | Four columns at ~90px each cannot hold a source name |

Also: a stacked two-line label makes the *column* narrower but the *row* taller.
If the goal is "more rows on screen", shorten the label instead.

---

## Touch, specifically

- **Target size** ~44px. Mouse-era UIs are routinely 28–34px.
- **Hover is not available.** Anything revealed on hover must have a visible form.
- **3D/canvas views trap scroll.** OrbitControls claims one-finger drag for
  rotation by default; on a phone the canvas fills the screen, so a thumb swipe
  spins the model and the page never moves. Fix: leave one finger to the browser
  (`touches.ONE` undefined → `STATE.NONE`), two fingers rotate/zoom, plus
  `touch-action:pan-y` on the container. Mouse input is a separate code path, so
  desktop is unaffected.
  - **`touch-action:pan-y` as a plain rule is not enough, and the failure is
    silent.** OrbitControls writes `domElement.style.touchAction = "none"`
    inline in `connect()`, which beats the stylesheet — so the gesture is freed
    from the canvas but the browser is still forbidden to scroll, and *nothing
    moves at all*. That reads as "the fix didn't work" rather than pointing at
    the cause. Needs `!important`, **and** the selector has to cover R3F's
    wrapper `div` (the element drei actually connects to) rather than the
    `<canvas>`. `touch-action` resolves as the intersection down the ancestor
    chain, so a single node pinned at `none` blocks the pan however permissive
    its parent and child are.
- **Two-finger rotation is less responsive than it looks.** It tracks the
  *midpoint* of the pair, which travels less than either finger, on top of a
  smaller screen. The stock `rotateSpeed: 1` runs out of screen before the model
  turns far; `1.8` on coarse pointers only, leaving desktop feel untouched.
- **DevTools emulation is single-touch.** Two-finger gestures cannot be verified
  there — they need a real device. Plan for that before promising a deadline.
- **Budget for the device test being blocked by tooling, not by code.** Next 16
  blocks cross-origin requests to `/_next/*` dev resources by default, so a phone
  hitting `http://<lan-ip>:3000` gets the server-rendered HTML and none of the
  JS, CSS, fonts or HMR — a bare unstyled title that looks like a catastrophic
  app failure and is actually a dev-server default. Fix is `allowedDevOrigins`
  in `next.config.mjs` plus a restart. Check this *before* concluding anything
  about the build; nothing observed in that state means anything.

---

## What to automate first

Highest value, in order:

1. **The static audit table above.** Every row is a grep. Running it after any
   layout change would have caught six of our seven bugs before a human looked.
2. **A wrapper-safety check** — for each wrapped component, assert the child is
   reachable by the sizing CSS (it's a `div`, or carries a known class).
3. **A fixed-height lint** — flag `height:\d+px` on any element whose subtree
   contains text, unless a `@media` override exists for it.

Not worth automating: the judgement calls (which chart form suits which data
job — see `VIZ-EXECUTION-PLAN.md`), and the visual confirmation itself.

---

## Expected vs actual

- **Expected:** the repetitive part would be the risk. **Actual:** the repetition
  was safe once proven; every bug came from a *context* change — the same markup
  behaving differently inside a new container.
- **Expected:** `tsc` would catch little. **Actual:** it caught exactly one issue,
  and that one pre-dated the work.
- **Expected:** an inventory pass would enumerate the work. **Actual:** the first
  inventory undercounted — it missed hand-rolled `div` bar charts entirely, because
  they contain no `<canvas>` or `<svg>`. Searching by *markup* misses charts built
  from styled divs; search by containing view as well.
- **Expected:** compile-verified touch fixes would mostly hold up on a device.
  **Actual:** of the items tested on a real phone, the headline one was wholly
  non-functional while reading as "done" — correct mechanism, correct property,
  wrong element. Two fingers, tap-to-select and the detail-panel wraps all passed
  first time, which is the trap: a mostly-passing list makes the failing item look
  like an outlier rather than a reason to doubt the method.
- **The cascade is the recurring theme, not 3D.** Three separate bugs in this
  session reduced to the same sentence — *an inline style beat the rule meant to
  fix it*. Once on the stage canvas, once on the Fiscal panel (where a correct
  `@media` rule had been sitting dead in `globals.css` all along), and once in
  the chart-wrapper work logged earlier. When a mobile rule appears to do
  nothing, check for an inline declaration before rewriting the rule.
- **A device test needs its own written script.** "Test it on your phone" spread
  across a working session produced partial, ambiguous answers ("looks good")
  that were easy to over-read as a full pass. A numbered list of gestures, each
  with the expected outcome, is worth more than the fix that prompted it.
