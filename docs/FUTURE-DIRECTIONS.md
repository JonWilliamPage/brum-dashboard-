# Future directions

Where Ozzy is going, and what has to be true first. Written 2026-09-22, at the
point the first shareable demonstrator went out.

## What Ozzy is right now

**A civic intelligence prototype whose job is presenting real, sourced data well.**
Not a chatbot. The value on offer today is that a resident, journalist or
councillor can see Birmingham's published data arranged so it means something —
ward by ward, with the source named.

That framing matters because it sets the bar: every figure on screen either
traces to a named official source or it does not ship. The 2026-09-22 release
withheld two whole dashboards, two views and the conversational layer rather
than show numbers that could not meet that bar. See the CHANGELOG sections
"Removed" and "Withheld pending data fixes".

## The bigger idea: federated civic intelligence

The real power of a prototype like this is not one city's dashboard. It is what
becomes possible **when every council has one.**

Once the same civic data is published in the same shape for every authority, you
can combine it and reason across the whole picture rather than one place at a
time:

- **See what is good and bad, where.** Not "Birmingham's claimant rate is 7%",
  but how that sits against comparable authorities — and which wards are
  outliers against places that look like them.
- **See what has *worked*.** The interesting signal is change over time in one
  area against change in its peers. A ward that improved while its comparators
  did not is evidence that something local worked, and an invitation to ask what.
- **Build a picture of what good and bad governance actually look like** —
  empirically, from outcomes, rather than from assertion. That is the end goal:
  a means of telling the difference.

This is the direction the project is aimed at. Birmingham is the first instance,
not the product.

## What federation actually requires

Worth writing down plainly, because the hard part is not the dashboards.

1. **Shared, canonical geography keys.** Every dataset keyed on official codes,
   never on names, and never on a locally-invented roster. This project has
   already been bitten by the small-scale version: the legacy 68-ward `FALLBACK`
   array shares 33 ward codes with the official ONS 69-ward set, and *all 33
   refer to a different ward*, so live data joined by code lands on the wrong
   place. At one-city scale that is a bug. Across 300-odd authorities it is the
   whole problem, and it silently produces confident, wrong comparisons.
2. **Identical metric definitions.** "Claimant rate" has to mean the same
   numerator over the same denominator in every instance, or league tables are
   noise. Comparability is a definition problem long before it is a data problem.
3. **Provenance carried with the number, not bolted on after.** `lib/sources.ts`
   is the seed of this — a registry where a metric may render only if it has a
   named source, an as-of date and a committed fetch script. Federation needs
   that per metric per authority, so a cross-council chart can state exactly
   which vintage of which dataset each point came from.
4. **Honest gaps.** A federated view must be able to say "not published here"
   without filling the hole, or the first synthesised cell poisons every
   aggregate built on top of it.

The discipline the project already applies — real data or nothing — is not
fussiness. It is the precondition for the idea above being worth anything.

## Nearer-term phases

- **Source citations on every dashboard.** An Oxford-style numbered reference on
  each dashboard title, linking to the matching entry on `/sources`. The
  machinery already exists (`lib/sources.ts`, `SourceTag`, anchors on
  `/sources`) and is deployed in exactly one place; this is placement work plus
  filling registry gaps. Blocked on nothing except the fetches below.
- **Retire the legacy `FALLBACK` roster** in favour of `lib/wards.ts`. This is
  the gate on the Employment and Youth & NEET views, on real GVA, and on the
  chat. It is the single highest-value fix in the project.
- **Repair the IMD and GVA feeds.** GVA is a field-rename plus a denominator
  decision and has been verified working against the live API. IMD needs an
  LSOA→ward lookup the repo does not yet have. See the CHANGELOG entry "the IMD
  and GVA live fetches have never worked".
- **Ask Ozzy — the conversational layer.** Deliberately a later phase. It is
  switched off via `ASK_OZZY_CHAT_ENABLED` in `lib/features.ts`, because a model
  handed a contaminated data context will state wrong figures in fluent prose,
  which is the most damaging way to be wrong. It comes back once the data
  underneath it is trustworthy — chat is a presentation layer on a sound
  evidence base, never a substitute for one.
- **Real ward-level sources for the withheld dashboards.** Housing
  affordability and ward fiscal balance were deleted rather than shipped
  modelled. `UC_Plan/birmingham-fiscal-dashboard-BUILD-SPEC.md` is kept as the
  spec for rebuilding Fiscal properly, including the ONS reconciliation it needs.
