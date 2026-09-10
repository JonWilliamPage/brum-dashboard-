---
name: dataset-dashboard
description: >-
  Add an official open dataset as a reviewable place dashboard for a civic
  intelligence prototype. Discover the source, fetch and validate to the
  place's geography, derive honest rates, stage a proposal, require human
  Accept, then publish. Use when adding a new metric, ward/LA dashboard, or
  "put this open data on the prototype". Birmingham/Ozzy is the reference spin-out.
---

# Dataset → reviewable dashboard

Portable playbook for the **civic intelligence prototype**.
**Reference implementation:** Birmingham (Ozzy) — City Observatory / DWP / ONS patterns in this repo.

## Goal

One official dataset becomes a dashboard that is **reviewed and accepted by a human before it goes live**.

## When NOT to use

- Data that cannot be traced to a named official source  
- Geography the portal does not actually publish (do not invent wards)  
- Anything you would have to model or guess to fill the map  

If the true geography is coarser than wards (LA only, constituency only), **build at that level** and label it on-face.

## Hard rules

From `AGENTS.md` / project integrity:

- Official sources only  
- Never fabricate numbers  
- Missing → `—`  
- Derived only from official inputs, labelled  
- Fetch writes to **`proposals/` only**  
- Live data only after **Accept** in `/review`  
- Provenance mandatory  

## Pipeline

### 1. Discover

Find the dataset in the place's open catalogue (or national publisher). Confirm:

- Exact dataset id / file URL  
- Geography field (ONS codes preferred)  
- Time field and currency  
- Licence  

**Birmingham reference:** City Observatory catalog API; filter to LA `E08000025` / wards `E05011118`–`E05011186` when the feed is WMCA-wide.

### 2. Inspect record shape

Pull a few real records. Note field names, rounding, and filter gotchas. Do not design the UI from the dataset title alone.

### 3. Fetch + validate → proposal

Write `scripts/fetch-<topic>.mjs` (or equivalent) that:

- Filters to the place geography  
- Takes the latest period (or full series if the skill consumer needs history)  
- If value is a **count**, join official population (or other denominator) and derive a **rate**, labelled derived  
- If value is already a **%**, state the denominator and show headcount when possible  
- Validates: real number + real geography + period, else skip / `—`  
- Writes **`proposals/<topic>.proposal.json` only** — never live public data  

### 4. Choose views

Use the **dataviz** skill. Default for one metric × many areas: **Table + Map** (table first). Add trends, composition, or scatter only when the data supports them.

### 5. Build from shared components (WYSIWYG)

One dashboard component renders in **both** Review and live Dashboards with the **same data shape**. Do not fork two UIs.

**Birmingham reference clones:** `app/benefits/components/*`, crime table/map patterns, `app/review/page.tsx` registry entry.

### 6. Register provenance

Add entries via the **provenance** skill (`lib/sources.ts` in this repo). User-facing links go to the human catalogue page, not raw JSON APIs.

### 7. Wire shell + Accept path

- Live nav entry appears only when accepted data exists  
- Accept promotes `proposals/<id>.proposal.json` → `public/data/<id>.json`  
- No rebuild required for data promotion when following the Ozzy pattern  

### 8. Verify

- Geography count matches expectation  
- Review shows candidate; live suite does not until Accept  
- After Accept, views match  
- Every metric has a working source tag  

## Place pack (swap for another council)

| Setting | Birmingham example | Your place |
|---------|-------------------|------------|
| LA code | `E08000025` | Your ONS LA |
| Small areas | 69 wards `E05011118`–`E05011186` | Your wards / MSOAs as published |
| Catalogue | cityobservatory.birmingham.gov.uk | Your portal / data.gov.uk |
| Brand | Ozzy | Your prototype name |

## Canonical templates in this repo

- `scripts/fetch-uc.mjs` — fetch / validate / stage  
- `app/benefits/components/*` — shared dashboard set  
- `app/api/proposals/route.ts` — Accept / Reject  
- `app/review/page.tsx` — review gate  
- `lib/sources.ts`, `lib/population.ts`, `lib/wards.ts`  
