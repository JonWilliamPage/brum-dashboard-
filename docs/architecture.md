# Architecture & mental model

## One sentence

**Skills** teach an AI agent to do insight-analyst work on official data; **Ozzy** is Birmingham’s product built with those skills; **other places** reuse the skills for their own spin-outs.

## Diagram

See also the SVG in the README:

![Mental model](../assets/diagram-mental-model.svg)

```
                    ┌─────────────────────────────────┐
                    │  Coding agent (Claude / Grok /  │
                    │  Codex / …)                     │
                    └───────────────┬─────────────────┘
                                    │ loads
                                    ▼
                    ┌─────────────────────────────────┐
                    │  skills/                        │
                    │  dataset-dashboard · dataviz    │
                    │  provenance · (place-config…)   │
                    └───────────────┬─────────────────┘
                                    │ produces
                    ┌───────────────┴─────────────────┐
                    ▼                                 ▼
         proposals/*.json                    lib/sources.ts
                    │                                 │
                    ▼                                 │
              /review Accept ─────────────────────────┘
                    │
                    ▼
            public/data/*.json
                    │
                    ▼
         ┌──────────────────────┐
         │  Spin-out UI (Ozzy)  │
         │  dashboards · stage  │
         │  about · sources     │
         └──────────────────────┘
```

## Trust boundary (the wall)

| Zone | Writable by agent? | User-visible as fact? |
|------|--------------------|------------------------|
| `scripts/` fetch output → `proposals/` | Yes | No (candidate only) |
| `/review` UI | Displays candidate | Labelled as review |
| Accept API | Human-triggered | Promotes to live |
| `public/data/` | Only via Accept | Yes |
| `lib/sources.ts` | PR / deliberate edit | Powers source tags |

Agents must not “helpfully” write live JSON under `public/data/` to skip review.

## Place pack vs portable core

| Portable (agent) | Place pack (spin-out) |
|------------------|------------------------|
| Validate counts vs expected geography | List of ONS ward codes |
| Proposal schema + Accept flow | Catalogue base URL (e.g. City Observatory) |
| Chart honesty rules | Brand, voice name (Ozzy), colours exceptions |
| Provenance fields | Local dataset IDs and licences as published |

Birmingham’s pack is fully implemented today. Multi-place automation is the **place-config** skill (roadmap).

## Money story (special case)

Central benefits expenditure (DWP AME paid *in* a place) and **council tax / service budget** are different pots. Skills and views must keep them **hard-labelled and separate**. See project memory / Benefits Bill work — never imply ward-level accounting £ where only LA or constituency outturn exists.

## Stack (Ozzy reference)

- Next.js 14 (App Router) + React 18  
- Chart.js, Leaflet, Three.js (stage views)  
- TypeScript throughout  
- Fetch scripts: Node `.mjs` against official APIs / ODS files  

Other spin-outs may keep the skills and change the UI shell.
