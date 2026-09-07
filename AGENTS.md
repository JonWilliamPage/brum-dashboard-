# AGENTS.md — Ask Ozzy civic intelligence prototype

This repository contains **Ask Ozzy**, an independent, open-source civic intelligence prototype for Birmingham, and supporting development and analysis playbooks. It visualises selected public data and helps people explore patterns, context and “so what?” questions.

Describe the project consistently as a **civic intelligence prototype**. Treat **`skills/` as reusable playbooks** and **`app/` as the Birmingham prototype**. Distinguish coding agents that use the playbooks from planned AI capabilities inside the app. Broader data coverage, database integration and autonomous investigation are ambitions, not established current capabilities.

## Repository structure

| Layer | Path | Rule |
|-------|------|------|
| Portable skills | `skills/` | Write playbooks any place can follow |
| Claude discovery | `.claude/skills/` | Keep in sync with `skills/` when you change playbooks |
| Integrity | this file + `CLAUDE.md` | Hard rules override convenience |
| Provenance | `lib/sources.ts` | One registry; UI reads from here |
| Proposal wall | `proposals/` → `/review` → `public/data/` | Never skip Accept for place data |
| Prototype UI | `app/` | Birmingham brand and routes |

## Hard rules (non-negotiable)

1. **Official sources only.** A value may render only if it is traceable to a named source for that exact geography and period.
2. **Never fabricate, model-as-fact, synthesise, or hash-generate** a number presented as fact.
3. **Missing data stays missing** (`—` / explicit empty state). No silent fill.
4. **Derived values** only from official inputs, labelled as derived, with every input cited.
5. **Fetch scripts write to `proposals/` only.** Live paths under `public/data/` require human **Accept** in `/review`.
6. **Provenance is mandatory** — publisher, dataset id, as-of, licence, source URL, script URL.
7. **No API keys in browser-shipped code.** Keyed APIs (Stat-Xplore, etc.) stay server-side.
8. **Join geography on official codes** (for Birmingham wards: `E05011118`–`E05011186`). Never invent codes.

When place work conflicts with a pretty chart, **integrity wins**.

## Skills first

Before inventing a new pipeline, open the matching skill:

- `skills/dataset-dashboard/SKILL.md` — new dataset → reviewable dashboard  
- `skills/dataviz/SKILL.md` — chart form, colour, honesty conventions  
- `skills/provenance/SKILL.md` — sources registry and source tags  
- `skills/insight-analysis/SKILL.md` — what the data says · why-questions · research · evidence report  


If a task is Birmingham-specific (City Observatory slug, Ozzy chrome), say so in the change. Prefer extracting portable steps into `skills/` over baking LA names into generic docs.

## Repo map for agents

- `skills/` — reusable playbooks intended to support adaptation to other councils
- `app/` — Ozzy Next.js UI
- `lib/` — types, sources, population, boundaries helpers
- `scripts/` — fetch/validate generators (durable commands only)
- `proposals/` — candidate JSON awaiting Accept
- `public/data/` — accepted snapshots only
- `docs/` — human explainers
- `assets/` — README / demo media

Do **not** dump one-off probes into `scripts/` permanently; use a temp path or name with `_` and clean up.

## Birmingham prototype notes

Ozzy-specific context (brand, visual system, legacy cleanup) lives in `CLAUDE.md`.  
When generalising for another LA:

- Swap place pack: LA code, ward list, boundaries, catalogue base URL, brand strings  
- Keep the proposal wall and provenance pattern identical  
- Do not claim ward-level £ where only LA/constituency accounts exist  

## Checks before handoff

- Fetch summary: expected geography count, min/max sensible, gaps explicit  
- `/review` shows candidate; Dashboards does **not** until Accept  
- After Accept, live view matches review (same component, same data shape)  
- Every metric has a working source link  
- No new secret in client bundles  

## Voice

Copy and UI for Ozzy may be blunt and civic. Skills docs should stay **clear and portable** — other places will read them without Birmingham context.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
