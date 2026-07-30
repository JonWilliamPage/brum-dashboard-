---
name: dataviz
description: >-
  Choose and build the right visualisation for official place data in a local
  government insight agent: form-selection table (data job → chart), honest
  colour, gaps, geography banners, checksums. Use before any new dashboard,
  chart, or view. Birmingham/Ozzy components are the reference clones.
---

# Honest visualisation (insight agent)

Work like an **insight analyst**: probe the data first, pick the form from the data's job, colour last, state the truth on-face.

## 0. Probe before designing

Never design from a dataset title. Verify:

- Geography level (ward / constituency / LA / national)  
- Series span and gaps  
- Native vs derived values  
- Boundary vintage  
- Whether totals itemise fully (DWP workbooks often do not)  

What exists determines which forms are honest.

## 1. Form-selection (data's job → chart)

| The reader must… | Form | Ozzy reference to clone |
|---|---|---|
| Compare magnitude across units | Ranked bars + sortable table | Housing benefit bars, any `*Table.tsx` |
| Part-to-whole (one moment) | Stacked bars / mosaic | `UcCombinedComposition`, Benefits Bill mosaic |
| Composition over time | Stacked area; streamgraph when many categories × many points | `BillHistoryChart`, `PipStream` |
| Rank change over time | Bump chart | `PipBump` |
| Before → after per item | Dumbbell | `CpDumbbells` |
| Distribution across units | Dot strip | `CpStrip` |
| Grid of magnitudes | Heatmap (column scales independent) | `ConMoneyDashboard` |
| One entity vs context | Emphasis line | Detail panel trends |
| Many entities' trends | Small multiples, shared scale | `BillSmallMultiples` |
| Geographic pattern | Choropleth **at true geography only** | Ward / constituency / borough maps |
| One number lead | Hero figure + facts | Headline blocks |
| Inline trend | Sparkline in table | Claimant / child poverty tables |

Multi-view rule: 3–5 sub-tabs; **table first**, **map last** when both exist. Every chart should have a table twin where possible.

## 2. Colour

- Sequential magnitude: project ink ramp (see `lib/constants.ts` in Ozzy)  
- Categorical: limited, validated palette — never invent a 9th hue for a series  
- Fold long tails into "Other"  
- Text does not wear series colour  

## 3. Non-negotiables

- **No dual axes** — two scales → two charts or a ratio  
- **Gaps are labelled elements**, never silent holes or interpolation  
- **Geography banner** when data is coarser than the map people expect  
- State **nominal vs real** on-face for money  
- Growth baselines must be honest (not from a benefit's launch year at ~zero)  
- Tooltips enhance; they do not gate the story  

## 4. Tools in the Ozzy reference app

- Chart.js — time series  
- Hand-rolled SVG — strips, dumbbells, bump, streamgraph  
- Leaflet — choropleths  
- Three.js — optional stage / extrusion theatre (caseload height ≠ £)  

## 5. Integrity plumbing

Every new view joins:

fetch → `proposals/` → human Accept → live data  

plus provenance (`provenance` skill) and checksums that refuse drift against the source's own totals.
