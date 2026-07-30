---
name: provenance
description: >-
  Register and surface provenance for every metric in a local government
  insight agent. Publisher, as-of date, licence, source URL, fetch script.
  No source → no number in the UI. Use when adding datasets, source tags, or
  a /sources page.
---

# Provenance wall

## Principle

**No source → no number on screen.**

A metric may render only if it has a registry entry with:

| Field | Meaning |
|-------|---------|
| `id` | Stable key used by UI |
| `label` | Human name of the metric |
| `short` | Compact tag (e.g. `DWP · monthly`) |
| `source` | Official dataset name |
| `publisher` | Who publishes it |
| `datasetId` | Machine / file id |
| `asOf` | Period the numbers refer to |
| `licence` | Usually OGL v3.0 |
| `sourceUrl` | **Human** catalogue or publication page (not raw API JSON) |
| `scriptUrl` | Fetch script that reproduces the snapshot |
| `note` | Geography, derivation, caveats |

## Ozzy implementation

Single registry: `lib/sources.ts` → `SOURCES`.

- `/sources` page and inline `<SourceTag />` read from here only  
- Do not maintain a second copy of provenance in components  
- User-facing links prefer the publisher's normal webpage  

## Agent checklist when adding data

1. Identify the **exact** file or API resource (not “ONS website”).  
2. Record **as-of** from the data, not “today”.  
3. If derived (e.g. rate = count ÷ population), list **both** inputs as sources.  
4. If illustrative / scaled (e.g. national fraud rate × LA spend), label **ILLUSTRATIVE** in `note` and on-face.  
5. Archive bulky official workbooks under `archive/` when used for money stories.  
6. Prefer checksums: component sums vs the source's own total; fail closed on drift.  

## Review wall coupling

Provenance without Accept is incomplete:

- Proposal carries `sources[]`  
- Accept promotes data only  
- Live UI must still resolve tags from the registry  

## Other places

Copy the registry pattern even if you change the UI framework. The field set above is the portable contract.
