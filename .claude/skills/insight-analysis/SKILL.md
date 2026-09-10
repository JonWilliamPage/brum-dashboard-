---
name: insight-analysis
description: >-
  Turn official place data into an honest insight report: what the numbers say,
  which "why" questions to ask, how to research policy/context without inventing
  causes, and how to present evidence next to the charts. Use after a dashboard
  or dataset is loaded when the user asks why, what it means, outliers, peers,
  or wants a briefing/report. Portable across local authorities — not Birmingham-only.
---

# Insight analysis & evidence reports

Use this skill when the data is **already sourced** (or being sourced with the other skills) and the job is to **interpret, question, and brief** — not just chart.

This is the **analysis** layer of the civic intelligence prototype:

| Layer | Skill |
|-------|--------|
| Get & validate data | `dataset-dashboard` |
| Choose honest charts | `dataviz` |
| Register sources | `provenance` |
| **Ask why · research · report** | **`insight-analysis` (this skill)** |

Works for **any place** with official open data (council, combined authority, national stats). Ozzy / Birmingham is only the reference spin-out.

---

## Hard rules (project integrity)

1. **No invented causes.** Policy X “explains” rate Y only if a **named public source** links them — and even then phrase as *evidence / claimed outcome*, not proof.
2. **Separate three layers** in every report:
   - **Observed data** (official series, rates, ranks)  
   - **Context research** (strategies, FPNs, cabinet minutes, news)  
   - **Interpretation** (what a careful reader may conclude; what remains unknown)
3. **Cite everything.** Link to catalogue pages, PDFs, press releases, Defra/ONS notes.
4. **Flag comparison caveats** when publishers do (e.g. Defra on fly-tipping league tables).
5. **Missing stays missing.** Do not fill narrative gaps with guesses.
6. Prefer **rates and peers** over raw counts when geographies differ in size.

---

## When to use

- “Why is X the outlier?”  
- “What is this data actually telling us?”  
- “Write a briefing / report for members”  
- “What questions should we ask next?”  
- After building a dashboard — add a **story / evidence** panel (e.g. Why Wolverhampton?)

---

## Pipeline

### 1. State the observation (data only)

From the official series (or accepted proposal / live JSON):

- Metric, unit, as-of period, geography level  
- Rank / peers / benchmarks if available  
- Change over the full honest series (first → latest; peak if useful)  
- Who is the **outlier** (high, low, only improver, only decliner, structural gap)

Write 2–4 bullet **facts** that could go on a slide with no spin.

### 2. Generate “why” questions (analysis menu)

Do **not** answer them yet. List questions the data forces:

| Pattern | Example questions |
|---------|-------------------|
| **Outlier level** | Why is A much higher/lower than peers at the same date? |
| **Outlier change** | Why did only A fall while peers rose? |
| **Break / spike** | What happened around year T (policy, pandemic, reporting change)? |
| **Composition** | Is it volume, rate, or population that moved? |
| **Geography** | Is the metric LA-only? Could ward patterns hide under the average? |
| **Recording** | Could enforcement intensity change *reported* incidents without changing behaviour? |
| **Money / service** | Did spend, collection, or HWRC access change in the same window? |
| **Policy** | Which strategies, FPNs, cameras, prosecutions, cabinet members are documented? |

Cap the list at **5–8** sharp questions. Drop ones the data cannot ever answer.

### 3. Research with sources (evidence hunt)

For each priority question, search **public** sources in this order:

1. Publisher methodology notes (Defra, ONS, DWP, council open data)  
2. Council / combined authority strategies, scrutiny papers, cabinet reports  
3. Named cabinet member / officer statements (date them)  
4. National programme docs / awards / best-practice write-ups  
5. Quality press only as a pointer — prefer primary docs  

Capture for each claim:

- Who said it · when · URL · what they claim (outcome vs process)  
- Whether it is **administrative count**, **survey**, or **self-reported campaign success**

If nothing solid is found: write **“No public source found”** and stop — do not invent.

### 4. Structure the report

Use this shape (UI panel, markdown brief, or member pack):

```markdown
# [Title] — evidence brief (not a causal claim)

## 1. What the numbers say
- Fact bullets from official series only
- Peer / rank / change table if useful
- Source link + as-of

## 2. Questions the data forces
- Numbered why-questions

## 3. What public sources say was done
- Policy / programme packages (named)
- Enforcement or service intensity (if published)
- Political ownership (cabinet role, dates)

## 4. Honest limits
- Comparison caveats
- What would prove causality (and that we do not have it)
- Geography gaps (e.g. no ward series)

## 5. What to do next
- Data to fetch next
- Questions for officers / members
- Optional dashboard add-ons (story tab, peer callout)
```

Tone: blunt, civic, short sentences. No “PowerPoint fluff.”

### 5. Put it next to the viz (product)

When the user wants this **in the app** (Ozzy pattern):

1. Add a **story / outlier** tab or panel on the **same** dashboard component used in Review + Dashboards (WYSIWYG).  
2. Highlight the outlier on existing charts (colour + callout) using **only** derived flags from official series (e.g. only negative full-series change).  
3. Keep research text **sourced** with outbound links.  
4. Right-rail facts stay data; story tab holds narrative.  
5. Do **not** promote research numbers into `lib/sources.ts` as if they were metrics unless they are official series.

Reference implementation: fly-tipping **Why Wolverhampton?** tab (`app/fly-tipping/components/FlyTippingView.tsx`).

### 6. Handoff checklist

- [ ] Observation bullets match the accepted data file  
- [ ] Every causal-sounding sentence is hedged and cited  
- [ ] Outlier definition is mechanical (rank / change rule), not vibe  
- [ ] Defra/ONS caveats included when the publisher has them  
- [ ] Clear “what we still don’t know”  
- [ ] If UI: same component in `/review` and Dashboards  

---

## Portable use (any place)

Swap only the **place pack**:

- LA / ward codes and peer set  
- Open-data catalogue base URL  
- Local brand name for the spin-out  

The **analysis method** stays the same: observe → question → source → brief → optional story UI.

---

## Anti-patterns

| Don’t | Do instead |
|-------|------------|
| “They reduced fly-tipping because they care more” | Cite FPN counts, strategy, dates |
| Invent ward reasons for LA-only data | Banner: no ward series |
| League-table shame without methodology | Show rates + Defra caveat |
| One-off news article as fact | Prefer scrutiny/cabinet/primary stats |
| Silent merge of DWP £ and council tax | Keep money pots hard-labelled |

---

## Related skills

- `dataset-dashboard` — bring the series in behind the Accept wall  
- `dataviz` — form that matches the job (peers, history, dumbbell, table)  
- `provenance` — registry for every **metric** shown as fact  
