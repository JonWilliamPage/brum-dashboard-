# Project context — Birmingham Ozzy

## What this is
**Ozzy** — an independent, open-source civic intelligence prototype for Birmingham. It visualises selected public datasets, demonstrates patterns and comparisons, and helps people explore “so what?” — what is happening, why it might matter and what evidence could explain it.

Keep this descriptor consistent in public copy and contributor guidance. Data coverage is limited. Reusable playbooks support people building and analysing with AI; broader database integration and an agentic investigation loop are future ambitions. Do not describe the prototype as chat-first or claim it reads all council data.

Named after Ozzy Osbourne — working class, blunt, globally Brummie, not what the establishment expected.

Audience: residents, councillors, council staff and potential contributors. Use plain language and distinguish observations, interpretations and hypotheses.

## Visual direction (signed off — preserve)
- **Editorial paper aesthetic.** Warm paper background (`#f5f3ee`), serif headlines (Instrument Serif), monospace data (IBM Plex Mono), no rounded corners anywhere.
- **ASCII flourishes** as Birmingham brand nods: ASCII bull in empty states, ASCII banner on loader, "FORWARD" (Birmingham motto) watermark, ASCII spinners (`⠋⠙⠹⠸`) during loading.
- **Quadrant colours** (used only on the Economic Matrix): green `#1a3a2a` / purple `#2a1a3a` / blue `#1a2a3a` / red `#3a1a1a`.
- **10-step ink ramp** for disadvantage intensity on grid/map: `#7a8270 → #3a1a1a`.

## Data integrity (hard rule — overrides everything)
- **Official sources only.** A value may render in the UI only if it is traceable to a named source for that exact ward/period. No exceptions for "it looks plausible."
- **Never fabricate, model, synthesise, extrapolate, or hash-generate** a data value that is presented as fact. Do not invent figures to fill gaps, smooth trends, or make a chart look complete.
- **Missing data stays missing.** If a real value can't be sourced, render an explicit "no data" / "—" state and keep the ward/field blank. Never substitute an estimate.
- **Derived values are allowed only if** they are computed transparently from official inputs (e.g. a rank or composite of real figures), are labelled as derived/calculated, and add no new external information. A composite of modelled inputs is itself modelled — not allowed.
- **Provenance is mandatory.** Every rendered metric must carry its source and as-of date in the status drawer / detail panel.

### How that works in practice
- **Live where possible** — NOMIS, IMD 2025 / GVA / Census via City Observatory, ONS ward boundaries are public, keyed by official ONS ward code (`E05011118–E05011186`). Never join on the legacy `FALLBACK` codes in `lib/data.ts` — they are a wrong vintage.
- **Fallbacks must themselves be real.** A live fetch may fall back to a committed snapshot **only if that snapshot is real sourced data** (e.g. `lib/education-data.ts` Census 2021, `public/data/crime-wards.json` from data.police.uk). A fallback must never be a synthesised stand-in.
- **Status drawer** in the header shows live/cached state + as-of date per source — must stay visible the whole session.
- **Legacy modelled code is being removed.** `lib/synth*.ts`, `extras()`, `buildHousingWards`, `buildFiscalWards`, and `computeNeetRisk` all produce modelled values — they must be re-sourced from real data or pulled from the UI, not shipped.

## Hard rules
- Never put API keys in browser-shipped code. Keyed APIs (DWP Stat-Xplore, ONS API+) must go through server-side API routes / edge functions.
- No synthesised/modelled values in the UI — see **Data integrity** above. Missing data renders as "—", never as an estimate.
- Mobile: full responsive, but desktop is the primary target.
- Print: landscape A4, ranked table view only (currently).

## Brand
- Ozzy is independent of Birmingham City Council. Credit council data as a source without implying ownership, affiliation or endorsement.
- Preserve the sanitised Ozzy identity. Do not reintroduce council badges, coat of arms or ownership claims.

## Stack hints
If porting to a framework, recommendation is Next.js 14 (App Router) + Tailwind. Chart.js and Leaflet should stay — they're tuned. See `README.md` in `design_handoff_birmingham_dashboard/` for the full porting plan.
