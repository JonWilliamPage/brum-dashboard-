# Skills — Ozzy civic intelligence prototype

Reusable playbooks supporting **Ozzy, a civic intelligence prototype**: prepare selected official data, visualise it and investigate what it might mean. They guide people and coding agents; they are not an autonomous service inside the app. Birmingham provides the current examples, with adaptation to other places intended.

| Skill | Job | File |
|-------|-----|------|
| **dataset-dashboard** | Official data → validate → proposal → Accept → dashboard | [dataset-dashboard](./dataset-dashboard/SKILL.md) |
| **dataviz** | Right chart for the data’s job | [dataviz](./dataviz/SKILL.md) |
| **provenance** | No source → no number in the UI | [provenance](./provenance/SKILL.md) |
| **insight-analysis** | What it says · why-questions · research · evidence report | [insight-analysis](./insight-analysis/SKILL.md) |

**Typical loop:** dataset-dashboard → dataviz → provenance → (when someone asks *why*) insight-analysis.

Claude Code also has deeper Brum-tuned copies under `.claude/skills/brum-*`. Prefer **`skills/`** for other places.
