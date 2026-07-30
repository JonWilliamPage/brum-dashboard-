# For builders

## Goal

Stand up a **place spin-out** (or extend Ozzy) using the **local government insight agent** skills — without inventing numbers or skipping the review wall.

## Quick start

```bash
git clone https://github.com/willspensley/brum-dashboard-.git
cd brum-dashboard-
npm install
npm run dev
```

Point your coding agent at:

- `AGENTS.md`  
- `skills/*/SKILL.md`  
- `CLAUDE.md` (Birmingham / Ozzy specifics)

## Use the skills

| Task | Skill |
|------|--------|
| Add a new official dataset as a dashboard | `skills/dataset-dashboard` |
| Pick charts / maps / honesty conventions | `skills/dataviz` |
| Register sources correctly | `skills/provenance` |

Claude Code also discovers copies under `.claude/skills/`.

## Another council (checklist)

- [ ] LA ONS code and ward (or other) code list  
- [ ] Boundary GeoJSON for maps  
- [ ] Open data catalogue / APIs (no scrape of closed systems)  
- [ ] Brand strings and product name (your “Ozzy”)  
- [ ] First metric through **proposal → Accept**  
- [ ] Every metric in a sources registry  

Until `place-config` exists as a dedicated skill, treat Birmingham files as **examples to copy**, not globals to hardcode for two places in one deploy.

## Do not

- Write straight to `public/data/` to “save time”  
- Present modelled values as administrative counts  
- Mix DWP benefits £ with council tax without huge labels  
- Ship API keys to the client  

## Stack notes

Ozzy is Next.js 14 + TypeScript + Chart.js + Leaflet (+ Three.js for stages). Skills are **method**, not framework lock-in — you can re-home the pipeline in another app if the wall and provenance stay intact.
