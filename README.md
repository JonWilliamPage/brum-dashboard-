# Local government insight agent

**Agent skills for official public data — find it, check it, visualise it honestly, brief the place.**

Ozzy (Birmingham) is the first full **spin-out**: a city product built on this agent.

[Skills](#-skills) · [How it works](#-how-it-works) · [Ozzy](#-ozzy--birmingham-spin-out) · [Use for your council](#-use-it-for-your-council) · [Hard rules](#-hard-rules) · [Name ideas](#-project-name-ideas-repo-name-unchanged-for-now)

<p align="center">
  <img src="assets/diagram-mental-model.svg" alt="Mental model: insight agent powers Ozzy and other council spin-outs" width="900" />
</p>

| Who you are | What you use | What you get |
|-------------|--------------|--------------|
| **Insight / intelligence team** (council or central) | Agent skills + optional app shell | Ward packs, money stories, evidence for members |
| **Civic tech / AI builder** | Skills + playbooks in this repo | Ship another place without starting from zero |
| **Resident / journalist** | [Ozzy](#-ozzy--birmingham-spin-out) (or a local spin-out) | Readable truth, not a raw CSV dump |
| **Member / politician** | Briefings and dashboards *produced by* the agent | Clear evidence — you don’t run the agent yourself |

This is the **AI counterpart of a local government insight analyst**: the people who turn public numbers into something decision-makers and residents can actually use.

---

## What this is

A **local government insight agent** — a library of agent skills (and a reference city app) that:

1. **Connects** to official open data (not scraped rumours)
2. **Validates** geography, periods, and checksums
3. **Proposes** views behind a **human Accept wall**
4. **Visualises** only what is sourced — gaps stay gaps
5. **Briefs** the place: maps, tables, money stories, ward panels

**Ozzy** is Birmingham’s fruit of that agent: brand, voice, 69 wards, and a live Next.js suite. Other councils (and community groups) can use the **same agent skills** for their own open data.

> Repo folder name is still `brum-dashboard` / GitHub `brum-dashboard-` for now. The **product story** is the insight agent + Ozzy spin-out. Name options are listed [below](#-project-name-ideas-repo-name-unchanged-for-now).

---

## How it works

### Mental model

```
┌──────────────────────────────────────────────────────────────┐
│  LOCAL GOVERNMENT INSIGHT AGENT                              │
│  Skills + hard rules + provenance patterns                    │
│  Portable across places with open public data                │
└────────────────────────────┬─────────────────────────────────┘
                             │ powers
              ┌──────────────┴──────────────┐
              ▼                             ▼
┌─────────────────────────┐   ┌─────────────────────────────┐
│  OZZY (reference)       │   │  YOUR SPIN-OUT              │
│  Birmingham AI agent    │   │  Your council / place       │
│  Voice · brand · app    │   │  Same skills · your data    │
│  69 wards · DWP · WMP   │   │  Your wards · your brand    │
└─────────────────────────┘   └─────────────────────────────┘
```

### Pipeline (every dataset)

```
Official source  →  fetch + validate  →  proposals/  →  human Accept in /review
                                                              ↓
                                                    public data + live view
                                                              ↓
                                              dashboards · stage · (chat/newsletter)
```

Nothing that looks like a fact reaches the public UI without a **named source**, an **as-of date**, and (for new place data) a pass through the **review wall**.

### Architecture sketch

| Layer | Role | In this repo |
|-------|------|--------------|
| **Agent skills** | Teach any coding agent how to do insight work | `skills/` (and `.claude/skills/` for Claude) |
| **Hard rules** | Integrity that overrides convenience | `AGENTS.md`, `CLAUDE.md` |
| **Provenance registry** | One source of truth per metric | `lib/sources.ts` |
| **Proposal wall** | Human Accept before publish | `proposals/` → `/review` → `public/data/` |
| **Spin-out app** | Place brand + UI | Next.js app (Ozzy = Birmingham) |
| **Evidence views** | Tables, maps, money stories, 3D stages | `app/**`, dashboards |

---

## Skills

Install or clone this repo and point your coding agent (Claude Code, Codex, Grok Build, etc.) at the skill files. Each skill is a focused playbook.

| Skill | Job | Source |
|-------|-----|--------|
| **dataset-dashboard** | Discover official open data → validate geography → derive honest rates → stage a proposal → human Accept → live dashboard | [`skills/dataset-dashboard`](skills/dataset-dashboard/SKILL.md) |
| **dataviz** | Choose the right chart for the data’s job; palettes; gaps; geography banners; clone proven components | [`skills/dataviz`](skills/dataviz/SKILL.md) |
| **provenance** | Every metric has publisher, as-of, licence, script; no source → no UI | [`skills/provenance`](skills/provenance/SKILL.md) |

<p align="center">
  <img src="assets/placeholder-skill-dataset.svg" alt="Dataset dashboard skill" width="280" />
  &nbsp;
  <img src="assets/placeholder-skill-dataviz.svg" alt="Dataviz skill" width="280" />
  &nbsp;
  <img src="assets/placeholder-skill-provenance.svg" alt="Provenance skill" width="280" />
</p>

### Coming next (roadmap skills)

| Skill | Job |
|-------|-----|
| **place-config** | Swap ONS LA / ward codes, boundaries, brand for another council |
| **money-story** | DWP / benefits expenditure narrative — hard-separated from council tax/budget |
| **briefing** | Daily/weekly insight pack from accepted data |
| **agentic-chat** | Q&A grounded only in accepted evidence |

---

## Ozzy — Birmingham spin-out

**Ozzy** is Birmingham’s AI agent: open-source voice + evidence locker for the city.

<p align="center">
  <img src="assets/demo-ozzy-stage.png" alt="Ozzy stage — Birmingham ward caseload theatre" width="720" />
</p>

<p align="center">
  <img src="assets/demo-ward-panel.png" alt="Ward detail panel" width="360" />
  &nbsp;
  <img src="assets/demo-uc-stage.png" alt="Universal Credit stage" width="360" />
</p>

| | |
|--|--|
| **What it is** | Live Next.js product: dashboards, review wall, 3D stages, sources registry |
| **Who for** | Brummies, officers, analysts, anyone who wants the public numbers plain |
| **Geography** | 69 official Birmingham wards (`E05011118`–`E05011186`) |
| **Data** | City Observatory, DWP (Stat-Xplore + expenditure tables), ONS, West Midlands Police, and more — see `/sources` in the app |
| **Integrity** | Official sources only. No fabricated numbers. Human Accept before publish. |

Run the spin-out locally:

```bash
cd brum-dashboard   # or your clone path
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) (About / Ozzy home), [http://localhost:3000/dashboard](http://localhost:3000/dashboard), [http://localhost:3000/review](http://localhost:3000/review).

> **Ozzy is the fruit of the agent**, not the whole agent. The skills are what you take to another place.

---

## Use it for your council

You do **not** need to be Birmingham to benefit.

### Path A — Run Ozzy as a pattern (fastest learning)

1. Clone this repo and run the app (see above).
2. Read `AGENTS.md` and the three skills under `skills/`.
3. Walk one accepted proposal (`proposals/`) and one live view to see the wall end-to-end.

### Path B — Build a spin-out for *your* place

1. **Point the agent at the skills** in this repo (or copy `skills/` into your project).
2. **Configure place** (today: follow the skill notes and swap):
   - Local authority ONS code  
   - Ward (or other) geography + boundary GeoJSON  
   - Your open-data catalogue (City Observatory equivalent, data.gov.uk, local portal)  
   - Brand / voice name (your “Ozzy”)
3. **Use `dataset-dashboard`** to land the first metric behind `/review`.
4. **Use `dataviz`** so charts match the data’s job, not a default template.
5. **Register provenance** for every metric (`provenance` skill + a sources registry).
6. **Ship** only after a human Accept.

Place-specific wiring in the Birmingham app (ward lists, City Observatory IDs, Ozzy brand) is the **reference pack**. A dedicated **place-config** skill is on the roadmap to make multi-council setup mechanical.

### Path C — Insight team workflow (no full fork)

Use the skills inside your existing stack: the agent fetches and validates; you keep your own BI tool. The hard rules and provenance pattern still apply.

---

## Hard rules

These override convenience. Full detail: [`AGENTS.md`](AGENTS.md) · [`CLAUDE.md`](CLAUDE.md).

1. **Official sources only** — a value may render only if traceable to a named source for that place and period.
2. **Never fabricate** — no invented, modelled-as-fact, or hash-generated numbers in the UI.
3. **Missing stays missing** — show `—` / “no data”, never a silent estimate.
4. **Derived must be labelled** — e.g. rate = count ÷ population, with both inputs cited.
5. **Human Accept wall** — fetch scripts write to `proposals/`; live `public/data/` only after Accept.
6. **Provenance is mandatory** — publisher, as-of, licence, script path for every metric.
7. **No API keys in the browser** — keyed APIs stay server-side.

---

## Repo map

| Path | Purpose |
|------|---------|
| `skills/` | **Portable agent skills** (the product surface for other places) |
| `.claude/skills/` | Same playbooks for Claude Code discovery |
| `AGENTS.md` | Rules for any coding agent working in this repo |
| `CLAUDE.md` | Project context + integrity (Ozzy / Birmingham) |
| `app/` | Ozzy Next.js spin-out (UI) |
| `lib/sources.ts` | Provenance registry |
| `proposals/` | Candidate datasets awaiting Accept |
| `public/data/` | Accepted, shippable snapshots |
| `scripts/` | Fetch / validate generators |
| `docs/` | Extra explainers for councils and builders |
| `assets/` | README diagrams and demo stills |

---

## Docs

- [For councils & insight teams](docs/for-councils.md)
- [For builders](docs/for-builders.md)
- [Architecture & mental model](docs/architecture.md)

---

## Contributing

We need people who care about public truth — officers, researchers, residents, and people who **build with AI**.

- **Know a dataset?** Open an issue or email with the official link.
- **Help us build?** Fork, use the skills, open a PR — traditional coding optional if you can ship with AI.
- **Shape the questions?** Tell us what members and communities need to see.

**Contact:** [westmidlands@lookingforgrowth.uk](mailto:westmidlands@lookingforgrowth.uk)  
**GitHub:** [willspensley/brum-dashboard-](https://github.com/willspensley/brum-dashboard-)

---

## Project name ideas (repo name unchanged for now)

The GitHub path can stay `brum-dashboard-` until a rename is deliberate. Public-facing name options:

| Name | Why it works | Caveat |
|------|----------------|--------|
| **Local Government Insight Agent** | Exact job title energy; clear for officers | Long |
| **Gov Insight Agent** | Short, scannable | Slightly vague |
| **Civic Insight Agent** | Residents + councils | Less “gov” |
| **Place Insight Agent** | Any geography (LA, combined authority) | Less familiar |
| **Open Insight Agent** | Open data + open source | Soft on “government” |
| **Council Insight Skills** | Skills-library framing (like “CAD Skills”) | Underplays agent |
| **Ozzy Agent** (skills) + **Ozzy** (cities) | Brand-led | Birmingham-coded |
| **Forward Agent** | Birmingham motto; civic | Local reference |

**Working recommendation:** call the product **Local Government Insight Agent** (or **Gov Insight Agent** for short); keep **Ozzy** as the Birmingham spin-out name only.

---

## Licence & data

- Code: see repository licence / GitHub defaults for this fork path.
- Data: almost always **Open Government Licence** (or as stated on each source). Metrics must retain publisher attribution via the provenance registry.

---

<p align="center">
  <img src="assets/ozzy-mark.png" alt="Ozzy mark" width="72" />
</p>

<p align="center"><em>Agent for the place. Ozzy for Birmingham. Your spin-out next.</em></p>
