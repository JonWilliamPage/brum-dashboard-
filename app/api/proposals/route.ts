// Proposals API — the human-in-the-loop gate.
//
//   GET  /api/proposals            → list staged proposals (from /proposals)
//   POST /api/proposals  {id, action:'accept'}  → promote to public/data/, mark accepted
//   POST /api/proposals  {id, action:'reject', reason} → mark rejected + record reason
//
// This is the ONLY code that writes to public/data/. The fetch tool (scripts/*.mjs)
// only ever writes to /proposals. Nothing reaches the published dashboard without a
// human ACCEPT here — the "wall" in the agent loop.

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROOT = process.cwd();
const PROPOSALS_DIR = join(ROOT, 'proposals');
const PUBLISHED_DIR = join(ROOT, 'public', 'data');

interface Proposal {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  [k: string]: unknown;
}

function readProposals(): Proposal[] {
  if (!existsSync(PROPOSALS_DIR)) return [];
  return readdirSync(PROPOSALS_DIR)
    .filter(f => f.endsWith('.proposal.json'))
    .map(f => {
      try {
        return JSON.parse(readFileSync(join(PROPOSALS_DIR, f), 'utf8')) as Proposal;
      } catch {
        return null;
      }
    })
    .filter((p): p is Proposal => p != null);
}

function proposalPath(id: string): string {
  return join(PROPOSALS_DIR, `${id}.proposal.json`);
}

export async function GET() {
  return Response.json({ proposals: readProposals() });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { id?: string; action?: string; reason?: string };
  const { id, action, reason } = body;
  if (!id || !action) return Response.json({ error: 'id and action required' }, { status: 400 });

  const path = proposalPath(id);
  if (!existsSync(path)) return Response.json({ error: 'proposal not found' }, { status: 404 });
  const proposal = JSON.parse(readFileSync(path, 'utf8')) as Proposal & {
    wards?: unknown[];
    areas?: unknown[];                 // non-ward datasets (e.g. LA-level Housing Benefit)
    benchmarks?: Record<string, unknown>;
    geography?: string;
    months?: unknown[];                // trend-series month labels (e.g. claimant count)
    years?: unknown[];                 // annual-series labels (e.g. child poverty)
    city?: Record<string, unknown>;    // city-level rollup (uc-combined, two-child)
    lines?: unknown[];                 // benefit lines (benefits-bill)
    history?: unknown[];               // 23-year £ history (benefits-bill)
    constituencies?: unknown[];        // constituency rows (two-child)
    year?: string;
    total_m?: number;
    per_head?: number | null;
    population?: number | null;
    child_element_month?: number;
    benefit_labels?: Record<string, unknown>;
    uc_years?: unknown[];
    categories?: unknown[];            // PIP condition categories
    conditions?: unknown[];            // PIP granular conditions
    gb_total_real_latest?: number;
    gb_total_nominal_latest?: number;
    birmingham_pip_m?: number | null;
    national?: Record<string, unknown>; // wrong-payments GB rates panel
    uc_reasons?: unknown[];             // wrong-payments UC fraud reasons
    error_composition?: Record<string, unknown>;
    method_notes?: unknown[];
    as_of?: string;
    month_keys?: unknown[];
    category_mix?: Record<string, unknown>;
    gb_conditions?: Record<string, unknown>;
    uc?: Record<string, unknown>;
    pip?: Record<string, unknown>;
    presentation?: string;
    award_bands?: unknown[];           // uc-payments
    family_types?: unknown[];          // uc-payments
    rates_year?: string;               // family-model
    framing?: Record<string, unknown>;
    observed?: Record<string, unknown>;
    bill_context?: Record<string, unknown>;
    catalogue?: unknown[];
    scenarios?: unknown[];
    comparisons?: Record<string, unknown>;
    source?: Record<string, unknown>;
    sources?: unknown[];
    metric?: string;
    unit?: string;
    validation?: { total_claimants?: number; total_population?: number; city_pct?: number | null };
  };

  if (action === 'reject') {
    proposal.status = 'rejected';
    proposal.rejected_reason = reason ?? '(no reason given)';
    proposal.reviewed_at = new Date().toISOString();
    writeFileSync(path, JSON.stringify(proposal, null, 2));
    return Response.json({ ok: true, status: 'rejected' });
  }

  if (action === 'accept') {
    // Promote the proposal's data to the published store.
    mkdirSync(PUBLISHED_DIR, { recursive: true });
    // Generic promotion: carry the proposal's own validation fields through (each
    // dataset has its own — e.g. city_pct for UC counts, ward_mean_pct for the
    // in-employment share) so any dashboard's published file has what it needs.
    const published = {
      generated: new Date().toISOString(),
      metric: proposal.metric,
      unit: proposal.unit,
      source: proposal.source,
      sources: proposal.sources,
      as_of: (proposal.source as { as_of?: string })?.as_of,
      ...(proposal.validation ?? {}),
      // Ward datasets carry `wards`; coarser datasets (e.g. LA-level Housing Benefit)
      // carry `areas` + `benchmarks` + a `geography` flag instead. Pass through whatever
      // this proposal has — undefined fields drop out of the JSON.
      ...(proposal.geography ? { geography: proposal.geography } : {}),
      ...(proposal.benchmarks ? { benchmarks: proposal.benchmarks } : {}),
      ...(proposal.bench_series ? { bench_series: proposal.bench_series } : {}),
      ...(proposal.areas ? { areas: proposal.areas } : {}),
      ...(proposal.months ? { months: proposal.months } : {}),
      ...(proposal.years ? { years: proposal.years } : {}),
      ...(proposal.city ? { city: proposal.city } : {}),
      ...(proposal.lines ? { lines: proposal.lines } : {}),
      ...(proposal.history ? { history: proposal.history } : {}),
      ...(proposal.constituencies ? { constituencies: proposal.constituencies } : {}),
      ...(proposal.year ? { year: proposal.year } : {}),
      ...(proposal.total_m != null ? { total_m: proposal.total_m } : {}),
      ...(proposal.per_head != null ? { per_head: proposal.per_head } : {}),
      ...(proposal.population != null ? { population: proposal.population } : {}),
      ...(proposal.child_element_month != null ? { child_element_month: proposal.child_element_month } : {}),
      ...(proposal.benefit_labels ? { benefit_labels: proposal.benefit_labels } : {}),
      ...(proposal.uc_years ? { uc_years: proposal.uc_years } : {}),
      ...(proposal.categories ? { categories: proposal.categories } : {}),
      ...(proposal.conditions ? { conditions: proposal.conditions } : {}),
      ...(proposal.gb_total_real_latest != null ? { gb_total_real_latest: proposal.gb_total_real_latest } : {}),
      ...(proposal.gb_total_nominal_latest != null ? { gb_total_nominal_latest: proposal.gb_total_nominal_latest } : {}),
      ...(proposal.birmingham_pip_m != null ? { birmingham_pip_m: proposal.birmingham_pip_m } : {}),
      ...(proposal.national ? { national: proposal.national } : {}),
      ...(proposal.uc_reasons ? { uc_reasons: proposal.uc_reasons } : {}),
      ...(proposal.error_composition ? { error_composition: proposal.error_composition } : {}),
      ...(proposal.method_notes ? { method_notes: proposal.method_notes } : {}),
      ...(proposal.as_of ? { as_of: proposal.as_of } : {}),
      ...(proposal.month_keys ? { month_keys: proposal.month_keys } : {}),
      ...(proposal.category_mix ? { category_mix: proposal.category_mix } : {}),
      ...(proposal.gb_conditions ? { gb_conditions: proposal.gb_conditions } : {}),
      ...(proposal.uc ? { uc: proposal.uc } : {}),
      ...(proposal.pip ? { pip: proposal.pip } : {}),
      ...(proposal.presentation ? { presentation: proposal.presentation } : {}),
      ...(proposal.award_bands ? { award_bands: proposal.award_bands } : {}),
      ...(proposal.family_types ? { family_types: proposal.family_types } : {}),
      ...(proposal.rates_year ? { rates_year: proposal.rates_year } : {}),
      ...(proposal.framing ? { framing: proposal.framing } : {}),
      ...(proposal.observed ? { observed: proposal.observed } : {}),
      ...(proposal.bill_context ? { bill_context: proposal.bill_context } : {}),
      ...(proposal.catalogue ? { catalogue: proposal.catalogue } : {}),
      ...(proposal.scenarios ? { scenarios: proposal.scenarios } : {}),
      ...(proposal.comparisons ? { comparisons: proposal.comparisons } : {}),
      wards: proposal.wards,
    };
    writeFileSync(join(PUBLISHED_DIR, `${id}.json`), JSON.stringify(published, null, 2));

    proposal.status = 'accepted';
    proposal.reviewed_at = new Date().toISOString();
    writeFileSync(path, JSON.stringify(proposal, null, 2));
    return Response.json({ ok: true, status: 'accepted', published: `public/data/${id}.json` });
  }

  return Response.json({ error: `unknown action: ${action}` }, { status: 400 });
}
