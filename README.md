# Local government insight agent

**New to GitHub, Node.js or localhost? Start with the [For N00bs guide](docs/for-n00b.md).**

**Agent skills for official public data** — connect it, check it, visualise it, analyse it, brief the place.

**Ozzy** is Birmingham’s spin-out: a live city product built with these skills. Any council (or civic team) can use the same agent on **their** open data.

<p align="center">
  <img src="assets/diagram-mental-model.svg" alt="Insight agent powers Ozzy and other place spin-outs" width="720" />
</p>

| You are… | You use… | You get… |
|----------|----------|----------|
| Insight / intelligence team | Skills + optional app | Evidence packs, peer charts, briefings |
| Builder (incl. with AI) | Skills in this repo | A repeatable pipeline for any LA |
| Resident / journalist | [Ozzy](#ozzy) or a local spin-out | Readable truth, not raw CSV |

---

## How it works

```
Official data  →  validate  →  proposal  →  human Accept  →  live views
                      ↓
              ask why · research · evidence report
```

1. **Agent skills** teach a coding agent the jobs of a local insight analyst.  
2. **Ozzy** (or your spin-out) is the branded app that shows the results.  
3. **Hard rule:** no invented numbers. Missing stays missing. Provenance on every metric.

<p align="center">
  <img src="assets/demo-ozzy-stage.png" alt="Ozzy stage demo" width="640" />
</p>

---

## Skills

Point Claude / Codex / Grok / etc. at `skills/`. Portable across places — swap the place pack (LA codes, catalogue, brand), keep the method.

| Skill | Job |
|-------|-----|
| **[dataset-dashboard](skills/dataset-dashboard/SKILL.md)** | Discover official data → validate → proposal → human Accept → dashboard |
| **[dataviz](skills/dataviz/SKILL.md)** | Right chart for the data’s job; honest gaps & geography |
| **[provenance](skills/provenance/SKILL.md)** | Publisher, as-of, licence, script — no source → no UI |
| **[insight-analysis](skills/insight-analysis/SKILL.md)** | What the data says · why-questions · research · evidence report |

<p align="center">
  <img src="assets/placeholder-skill-dataset.svg" alt="Dataset skill" width="200" />
  <img src="assets/placeholder-skill-dataviz.svg" alt="Dataviz skill" width="200" />
  <img src="assets/placeholder-skill-provenance.svg" alt="Provenance skill" width="200" />
</p>

**Coming:** place-config · money-story · briefing/newsletter · agentic chat  

---

## Ozzy

Birmingham reference deployment — 69 wards, review wall, dashboards (benefits, crime, fly-tipping + “why” analysis, etc.).

```bash
npm install
npm run dev
```

→ http://localhost:3000 · `/dashboard` · `/review` · `/sources`

<p align="center">
  <img src="assets/demo-ward-panel.png" alt="Ward panel" width="320" />
  <img src="assets/demo-uc-stage.png" alt="UC stage" width="320" />
</p>

---

## Use for another council

1. Clone this repo / load `skills/`.  
2. Point the agent at **your** open data catalogue and geography codes.  
3. Run **dataset-dashboard** → **dataviz** → **provenance**.  
4. Use **insight-analysis** when someone asks *why* (outliers, peers, briefing).  
5. Brand your spin-out; keep the Accept wall.

Details: [docs/for-councils.md](docs/for-councils.md) · [docs/for-builders.md](docs/for-builders.md) · [docs/architecture.md](docs/architecture.md)

---

## Hard rules

- Official sources only · never fabricate · missing → `—`  
- Derived values labelled · human Accept before live data  
- No API keys in the browser  

Full agent rules: [AGENTS.md](AGENTS.md)

---

## Repo map

| Path | Role |
|------|------|
| `skills/` | **Portable agent product** |
| `app/` | Ozzy (Birmingham UI) |
| `proposals/` → `/review` | Accept wall |
| `lib/sources.ts` | Provenance registry |
| `assets/` | README demos |

---

## Contribute

Email [westmidlands@lookingforgrowth.uk](mailto:westmidlands@lookingforgrowth.uk) · [GitHub](https://github.com/willspensley/brum-dashboard-)

Repo path remains `brum-dashboard-` for now; product name: **local government insight agent** · city brand: **Ozzy**.

<p align="center"><em>Agent for the place. Ozzy for Birmingham. Your data, same skills.</em></p>
