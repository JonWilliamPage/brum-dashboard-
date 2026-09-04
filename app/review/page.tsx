'use client';

import { useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import BenefitsDashboard from '../benefits/components/BenefitsDashboard';
import UcEmpDashboard from '../uc-employment/components/UcEmpDashboard';
import HousingBenefitView from '../housing-benefit/components/HousingBenefitView';
import FlyTippingView from '../fly-tipping/components/FlyTippingView';
import ClaimantDashboard from '../claimant-count/components/ClaimantDashboard';
import UcCombinedDashboard from '../uc-combined/components/UcCombinedDashboard';
import BenefitsBillView from '../benefits-bill/components/BenefitsBillView';
import TwoChildView from '../two-child/components/TwoChildView';
import ChildPovertyDashboard from '../child-poverty/components/ChildPovertyDashboard';
import ConMoneyDashboard from '../constituency-money/components/ConMoneyDashboard';
import PipDashboard from '../pip/components/PipDashboard';
import WrongPaymentsView from '../wrong-payments/components/WrongPaymentsView';
import UcWeatherView from '../uc-weather/components/UcWeatherView';
import PipPlaceView from '../pip-place/components/PipPlaceView';
import UcStageView from '../uc-stage/components/UcStageView';
import PipStageView from '../pip-stage/components/PipStageView';
import OzzyStageView from '../ozzy-stage/components/OzzyStageView';
import UcPaymentsView from '../uc-payments/components/UcPaymentsView';
import FamilySupportView from '../family-model/components/FamilySupportView';
import CrimeObsView from '../crime-observatory/components/CrimeObsView';

// ── Review ────────────────────────────────────────────────────────────────────
// Renders the SAME dashboard component the Dashboards tab uses, fed the candidate
// data from each proposal — so what you sign off here is byte-for-byte what lands
// in Dashboards. Accept promotes it (writes public/data/<id>.json); no rebuild.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Proposal = { id: string; status: 'pending' | 'accepted' | 'rejected'; title: string; rejected_reason?: string; source: { as_of: string }; sources?: any[]; validation: any; wards: any[]; areas?: any[]; benchmarks?: any; geography?: string; metric?: string; months?: string[]; years?: string[]; city?: any; lines?: any[]; constituencies?: any[]; year?: string; total_m?: number; per_head?: number | null; population?: number | null; child_element_month?: number; history?: any[]; benefit_labels?: any; uc_years?: string[]; categories?: any[]; conditions?: any[]; gb_total_real_latest?: number; gb_total_nominal_latest?: number; birmingham_pip_m?: number | null; national?: any; uc_reasons?: any[]; method_notes?: string[]; as_of?: string; month_keys?: string[]; category_mix?: any; gb_conditions?: any; uc?: any; pip?: any; presentation?: string; award_bands?: any[]; family_types?: any[]; rates_year?: string; framing?: any; observed?: any; bill_context?: any; catalogue?: any[]; scenarios?: any[]; comparisons?: any; bench_series?: any };

// One entry per dataset — maps a proposal to its dashboard component + a summary line.
const REGISTRY: Record<string, { label: string; summary: (p: Proposal) => string; render: (p: Proposal) => ReactNode }> = {
  'crime-observatory': {
    label: 'Crime — Deep Dive',
    summary: p => `${p.validation.wards_found}/69 wards · ${p.validation.months_in_series}-mo series · ${p.validation.latest_total?.toLocaleString()} offences ${p.validation.series_to} · ${p.validation.category_checksum_ok && p.validation.ward_checksum_latest_ok ? 'checksums OK' : 'CHECKSUM DRIFT'}`,
    render: p => <CrimeObsView data={{
      as_of: p.as_of ?? p.source.as_of, months: p.months ?? [],
      categories: p.categories ?? [],
      city: p.city ?? { monthly_totals: {}, category_by_month: {}, outcomes_by_month: {}, latest_total: 0 },
      sources: p.sources ?? [], wards: p.wards,
    }} />,
  },
  'uc-wards': {
    label: 'Universal Credit',
    summary: p => `${p.validation.wards_found}/69 wards · ${p.validation.city_pct}% city-wide · ${p.validation.total_claimants?.toLocaleString()} claimants`,
    render: p => <BenefitsDashboard data={{ as_of: p.source.as_of, city_pct: p.validation.city_pct, total_claimants: p.validation.total_claimants, total_population: p.validation.total_population, sources: p.sources ?? [], wards: p.wards }} />,
  },
  'uc-employment': {
    label: 'UC Claimants in Work',
    summary: p => `${p.validation.wards_found}/69 wards · ward mean ${p.validation.ward_mean_pct}% in work`,
    render: p => <UcEmpDashboard data={{ as_of: p.source.as_of, ward_mean_pct: p.validation.ward_mean_pct, sources: p.sources ?? [], wards: p.wards }} />,
  },
  'pip-conditions': {
    label: 'PIP Deep Dive',
    summary: p => `GB-level · ${p.validation.categories_found} categories × ${p.validation.years_span} yrs · £${((p.gb_total_real_latest ?? 0) / 1000).toFixed(1)}bn real · anchor drift ${p.validation.anchor_drift_pct}%`,
    render: p => <PipDashboard data={{
      years: p.years ?? [], categories: p.categories ?? [], conditions: p.conditions ?? [],
      gb_total_real_latest: p.gb_total_real_latest ?? 0, gb_total_nominal_latest: p.gb_total_nominal_latest ?? 0,
      birmingham_pip_m: p.birmingham_pip_m ?? null, sources: p.sources ?? [],
    }} />,
  },
  'constituency-money': {
    label: 'Money Map (£)',
    summary: p => `9 constituencies · £${((p.city?.sum_m ?? 0) / 1000).toFixed(2)}bn real DWP £ · ${p.year} · per-row checksums`,
    render: p => <ConMoneyDashboard data={{
      year: p.year ?? '', benefit_labels: p.benefit_labels ?? {}, uc_years: p.uc_years ?? [],
      city: p.city ?? { sum_m: 0, la_total_m: 0, drift_pct: 0 },
      sources: p.sources ?? [], constituencies: p.constituencies ?? [],
    }} />,
  },
  'child-poverty': {
    label: 'Child Poverty',
    summary: p => `${p.validation.wards_found}/69 wards · ${p.validation.years_span}-yr series · ${p.validation.highest?.ward} ${p.validation.highest?.pct}% → ${p.validation.lowest?.ward} ${p.validation.lowest?.pct}%`,
    render: p => <ChildPovertyDashboard data={{
      as_of: p.source.as_of, years: p.years ?? [],
      city: p.city ?? { city_series: null, england_series: null, city_latest: null, england_latest: null },
      sources: p.sources ?? [], wards: p.wards,
    }} />,
  },
  'uc-combined': {
    label: 'UC — Full Picture',
    summary: p => `${p.validation.wards_found}/69 wards · ${p.validation.total_claimants?.toLocaleString()} on UC · ${p.validation.total_not_in_work?.toLocaleString()} not in work`,
    render: p => <UcCombinedDashboard data={{
      as_of: p.source.as_of, city: p.city, sources: p.sources ?? [], wards: p.wards,
    }} />,
  },
  'benefits-bill': {
    label: 'Benefits Bill (£)',
    summary: p => {
      const h = p.history ?? [];
      const first = h[0];
      const last = h[h.length - 1];
      const mult = first?.total_m && last?.total_m ? (last.total_m / first.total_m).toFixed(1) : null;
      return `Story · LA-level · £${((p.total_m ?? 0) / 1000).toFixed(2)}bn ${p.year}${mult ? ` · ${mult}× since ${first.year}` : ''} · £${p.per_head?.toLocaleString()}/resident`;
    },
    render: p => <BenefitsBillView data={{
      year: p.year ?? '', total_m: p.total_m ?? 0, per_head: p.per_head ?? null,
      population: p.population ?? null, sources: p.sources ?? [], lines: p.lines ?? [],
      history: p.history ?? [],
    }} />,
  },
  'uc-payments': {
    label: 'UC Payments',
    summary: p => {
      const hh = p.city?.latest_households ?? p.validation?.latest_households;
      const mean = p.city?.latest_mean_payment_gbp ?? p.validation?.latest_mean_payment_gbp;
      const pct = p.city?.households_pct_change;
      return `Story · LA · ${hh?.toLocaleString?.() ?? '—'} households · mean £${mean ?? '—'} · ${p.validation?.months_span ?? '—'} mo${pct != null ? ` · ${pct > 0 ? '+' : ''}${pct}%` : ''}`;
    },
    render: p => <UcPaymentsView data={{
      as_of: p.as_of ?? p.source?.as_of ?? '',
      sources: p.sources ?? [],
      months: p.months ?? [],
      month_keys: p.month_keys,
      city: p.city ?? {
        series: [],
        latest_households: 0,
        latest_mean_payment_gbp: 0,
        first_month: '',
        first_households: 0,
        first_mean_payment_gbp: null,
        households_delta: 0,
        households_pct_change: null,
        bill_uc_context: null,
      },
      award_bands: p.award_bands ?? [],
      family_types: p.family_types ?? [],
      method_notes: p.method_notes,
    }} />,
  },
  'family-model': {
    label: 'Family Model',
    summary: p => {
      const obs = p.observed?.couple_with_children_mean_gbp;
      const high = p.comparisons?.high_total ?? p.validation?.high_total;
      return `Illustrative · rates ${p.rates_year ?? '—'} · observed couple+kids £${obs ?? '—'} · high stack £${high ?? '—'}/mo`;
    },
    render: p => <FamilySupportView data={{
      as_of: p.as_of ?? p.source?.as_of ?? '',
      rates_year: p.rates_year ?? '2026/27',
      rates_explainer: (p as { rates_explainer?: import('../family-model/components/FamilySupportView').FamilyModelData['rates_explainer'] }).rates_explainer,
      sources: p.sources ?? [],
      framing: p.framing ?? {
        what_this_is: 'Illustrative entitlement model.',
        what_this_is_not: 'Not a real household.',
        key_rule: 'One UC claim per couple.',
      },
      observed: p.observed ?? {
        as_of: '',
        city_mean_payment_gbp: 0,
        city_households: 0,
        by_family_type: [],
        couple_with_children_mean_gbp: null,
        couple_with_children_households: null,
        source: '',
      },
      bill_context: p.bill_context ?? null,
      catalogue: p.catalogue ?? [],
      scenarios: p.scenarios ?? [],
      comparisons: p.comparisons ?? {
        observed_vs_core_uc: {
          formula: '',
          observed_mean: null,
          statutory_uc_only: 0,
          difference: null,
          note: '',
        },
        high_total: 0,
        high_with_naive_ca: 0,
        naive_ca_warning: '',
      },
      method_notes: p.method_notes,
    }} />,
  },
  'two-child': {
    label: 'Two-Child Limit',
    summary: p => `Constituency-level · ${p.validation.households_affected?.toLocaleString()} households · derived +£${p.validation.derived_annual_gain_m}m/yr`,
    render: p => <TwoChildView data={{
      as_of: p.source.as_of, child_element_month: p.child_element_month ?? 292.81,
      city: p.city, sources: p.sources ?? [], constituencies: p.constituencies ?? [],
    }} />,
  },
  'claimant-count': {
    label: 'Claimant Count',
    summary: p => `${p.validation.wards_found}/69 wards · ward mean ${p.validation.ward_mean_pct}% of 16–64 · ${p.validation.total_claimants?.toLocaleString()} claimants · ${p.validation.months_span}-month series`,
    render: p => <ClaimantDashboard data={{
      as_of: p.source.as_of,
      months: p.months ?? [],
      ward_mean_pct: p.validation.ward_mean_pct ?? null,
      total_claimants: p.validation.total_claimants ?? 0,
      sources: p.sources ?? [],
      wards: p.wards,
    }} />,
  },
  'housing-benefit': {
    label: 'Housing Benefit',
    summary: p => `LA-level · Birmingham ${p.validation.birmingham_value}% (#${p.validation.birmingham_rank} of ${p.validation.areas_found}) · no ward breakdown`,
    render: p => <HousingBenefitView data={{
      as_of: p.source.as_of,
      metric: p.metric ?? 'Housing Benefit',
      geography: p.geography ?? 'local-authority',
      areas: p.areas ?? [],
      benchmarks: p.benchmarks ?? { wmca: null, england: null },
      birmingham_value: p.validation.birmingham_value ?? null,
      birmingham_rank: p.validation.birmingham_rank ?? null,
      sources: p.sources ?? [],
    }} />,
  },
  'fly-tipping': {
    label: 'Fly-tipping',
    summary: p => `LA-level · ${p.validation.birmingham_value} / 1,000 (#${p.validation.birmingham_rank} of ${p.validation.areas_found}) · ${p.validation.series_from}→${p.validation.series_to} · no ward breakdown`,
    render: p => <FlyTippingView data={{
      as_of: p.as_of ?? p.source?.as_of ?? '',
      metric: p.metric ?? 'Fly-tipping incidents per 1,000 people',
      geography: p.geography ?? 'local-authority',
      years: p.years ?? [],
      areas: p.areas ?? [],
      benchmarks: p.benchmarks ?? { wmca: null, england: null },
      bench_series: p.bench_series ?? { wmca: [], england: [] },
      city: p.city ?? {
        series: [], latest: null, first: null, change: null, peak: null, peak_year: null, rank: null,
      },
      birmingham_value: p.validation?.birmingham_value ?? p.city?.latest ?? null,
      birmingham_rank: p.validation?.birmingham_rank ?? p.city?.rank ?? null,
      sources: p.sources ?? [],
    }} />,
  },
  'wrong-payments': {
    label: 'Wrong Payments',
    summary: p => `Illustrative · £${(p.validation.overpaid_m ?? p.city?.overpaid_m ?? 0).toFixed(0)}m overpaid · 1 in ${p.validation.one_in ?? p.city?.one_in ?? '—'} · national rates × city spend`,
    render: p => <WrongPaymentsView data={{
      year: p.year ?? '',
      as_of: p.as_of ?? p.source?.as_of ?? '',
      sources: p.sources ?? [],
      national: p.national,
      city: p.city,
      uc_reasons: p.uc_reasons ?? [],
      lines: p.lines ?? [],
      method_notes: p.method_notes,
    }} />,
  },
  'uc-weather': {
    label: 'UC Money Weather',
    summary: p => `69 wards · ${p.validation.months_span} months · city ${p.validation.city_latest?.toLocaleString?.() ?? p.city?.latest} on UC · ${p.validation.series_from}→${p.validation.series_to}`,
    render: p => <UcWeatherView data={{
      as_of: p.as_of ?? p.source?.as_of ?? '',
      sources: p.sources ?? [],
      months: p.months ?? [],
      month_keys: p.month_keys,
      city: p.city,
      wards: p.wards ?? [],
    }} />,
  },
  'pip-place': {
    label: 'PIP Place',
    summary: p => `69 wards · ${p.validation.months_span} snapshots · ${p.validation.city_latest_caseload?.toLocaleString?.() ?? p.city?.latest} cases · GB conditions + Bham mix`,
    render: p => <PipPlaceView data={{
      as_of: p.as_of ?? p.source?.as_of ?? '',
      sources: p.sources ?? [],
      months: p.months ?? [],
      month_keys: p.month_keys,
      city: p.city,
      wards: p.wards ?? [],
      category_mix: p.category_mix ?? { early_month: null, latest_month: null, early: [], latest: [] },
      gb_conditions: p.gb_conditions ?? null,
    }} />,
  },
  'uc-stage': {
    label: 'UC Stage (3D)',
    summary: p => `Three.js · 69 extruded wards · ${p.months?.length ?? p.validation?.months_span} months · city ${p.city?.latest?.toLocaleString?.() ?? '—'} on UC`,
    render: p => <UcStageView data={{
      as_of: p.as_of ?? p.source?.as_of ?? '',
      sources: p.sources ?? [],
      months: p.months ?? [],
      month_keys: p.month_keys,
      city: p.city,
      wards: p.wards ?? [],
    }} />,
  },
  'pip-stage': {
    label: 'PIP Stage (3D)',
    summary: p => `Three.js · 69 extruded wards · ${p.months?.length ?? p.validation?.months_span} frames · ${p.city?.latest?.toLocaleString?.() ?? p.validation?.city_latest_caseload} cases`,
    render: p => <PipStageView data={{
      as_of: p.as_of ?? p.source?.as_of ?? '',
      sources: p.sources ?? [],
      months: p.months ?? [],
      month_keys: p.month_keys,
      city: p.city,
      wards: p.wards ?? [],
      category_mix: p.category_mix ?? { early_month: null, latest_month: null, early: [], latest: [] },
      gb_conditions: p.gb_conditions ?? null,
    }} />,
  },
  'ozzy-stage': {
    label: 'Ozzy Stage',
    summary: p => `Theatre · UC ${p.validation?.uc_months ?? '—'} mo + PIP ${p.validation?.pip_months ?? '—'} frames · dual extrusion`,
    render: p => <OzzyStageView data={{
      as_of: p.as_of ?? p.source?.as_of ?? '',
      sources: p.sources ?? [],
      uc: p.uc,
      pip: p.pip,
      wards: p.wards ?? [],
    }} />,
  },
};

const TOKEN_KEY = 'ozzy_review_token';

export default function ReviewPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'unauthorised'>('loading');
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');

  useEffect(() => {
    setToken(sessionStorage.getItem(TOKEN_KEY));
  }, []);

  const load = useCallback(async (tok: string) => {
    const r = await fetch('/api/proposals', { cache: 'no-store', headers: { 'x-review-token': tok } });
    if (r.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setState('unauthorised');
      return;
    }
    const j = await r.json();
    const ps: Proposal[] = (j.proposals ?? []).filter((p: Proposal) => REGISTRY[p.id]);
    if (!ps.length) { setState('empty'); return; }
    setProposals(ps);
    setSelId(prev => prev && ps.some(p => p.id === prev) ? prev : (ps.find(p => p.status === 'pending') ?? ps[0]).id);
    setState('ready');
  }, []);

  useEffect(() => { if (token) load(token); }, [token, load]);

  const proposal = proposals.find(p => p.id === selId) ?? null;

  const act = async (action: 'accept' | 'reject') => {
    if (!proposal || !token) return;
    setBusy(true);
    await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-review-token': token },
      body: JSON.stringify({ id: proposal.id, action, reason }),
    });
    await load(token);
    setBusy(false); setRejecting(false); setReason('');
  };

  const submitToken = () => {
    const t = tokenInput.trim();
    if (!t) return;
    sessionStorage.setItem(TOKEN_KEY, t);
    setState('loading');
    setToken(t);
  };

  if (!token) {
    return (
      <Frame sub="review token required">
        <div style={{ padding: 40, maxWidth: 360 }}>
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--muted)', marginBottom: 14 }}>
            {state === 'unauthorised' ? 'That token was rejected. ' : ''}
            This is an internal review tool — enter the review token to continue.
          </p>
          <input
            type="password"
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitToken(); }}
            placeholder="Review token"
            autoComplete="off"
            style={{ width: '100%', padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 13, border: '1px solid var(--border-solid)', marginBottom: 10 }}
          />
          <button className="refresh-btn" onClick={submitToken}>Continue →</button>
        </div>
      </Frame>
    );
  }

  if (state === 'loading') return <Frame sub="loading…"><div style={{ padding: 40, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>⠋ loading proposals…</div></Frame>;
  if (state === 'empty' || !proposal) return <Frame sub="no proposals"><div style={{ padding: 40, fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--muted)' }}>No proposals staged. Run a <code style={{ fontFamily: 'var(--mono)' }}>scripts/fetch-*.mjs</code> tool.</div></Frame>;

  const reg = REGISTRY[proposal.id];

  return (
    <div className="dash-shell" style={{ gridTemplateColumns: '1fr' }}>
      <div className="wrap">
        <div className="hdr">
          <div className="hdr-brand">
            <div>
              <div className="hdr-title">Review · {reg.label}</div>
              <div className="hdr-sub">
                {reg.summary(proposal)} · {proposal.source.as_of} ·{' '}
                <span style={{ color: proposal.status === 'accepted' ? 'var(--q-prosp)' : proposal.status === 'rejected' ? 'var(--q-disad)' : 'var(--herald-navy)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{proposal.status}</span>
              </div>
            </div>
          </div>
          <div className="hdr-right">
            {proposal.status === 'pending' && !rejecting && (
              <>
                <button className="refresh-btn" onClick={() => act('accept')} disabled={busy} style={{ background: 'var(--herald-navy)', color: '#f5f3ee', borderColor: 'var(--herald-navy)', fontWeight: 600 }}>
                  {busy ? '⠋ publishing…' : '✓ Accept & publish'}
                </button>
                <button className="refresh-btn" onClick={() => setRejecting(true)} disabled={busy}>✗ Reject</button>
              </>
            )}
            {proposal.status === 'accepted' && <a href="/dashboard" className="refresh-btn" style={{ background: 'var(--q-prosp)', color: '#f5f3ee', borderColor: 'var(--q-prosp)' }}>✓ Published — view in Dashboards →</a>}
            {proposal.status === 'rejected' && <span className="dsbadge" style={{ color: 'var(--q-disad)' }}>✗ rejected</span>}
          </div>
        </div>
        <div className="hdr-dancetty" aria-hidden="true" />

        {/* Proposal selector — wrapping chips so the whole queue is always visible */}
        {proposals.length > 1 && (
          <div className="review-picker">
            {proposals.map(p => (
              <button key={p.id} className={`review-chip${p.id === selId ? ' active' : ''}`} onClick={() => { setSelId(p.id); setRejecting(false); }}>
                <span className={`review-dot ${p.status}`} aria-hidden="true" />
                {REGISTRY[p.id].label}
              </button>
            ))}
          </div>
        )}

        {rejecting && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--paper2)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Why reject? e.g. 'wrong vintage' — the agent sees this and retries." style={{ flex: 1, padding: '8px 10px', fontFamily: 'var(--sans)', fontSize: 12, border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--ink)' }} />
            <button className="refresh-btn" onClick={() => act('reject')} disabled={busy} style={{ borderColor: 'var(--q-disad)', color: 'var(--q-disad)' }}>Confirm reject</button>
            <button className="refresh-btn" onClick={() => { setRejecting(false); setReason(''); }}>Cancel</button>
          </div>
        )}

        {/* The candidate dashboard — identical component to the Dashboards tab */}
        {reg.render(proposal)}
      </div>
    </div>
  );
}

function Frame({ children, sub }: { children: ReactNode; sub: string }) {
  return (
    <div className="dash-shell" style={{ gridTemplateColumns: '1fr' }}>
      <div className="wrap">
        <div className="hdr">
          <div className="hdr-brand"><div>
            <div className="hdr-title">Review</div>
            <div className="hdr-sub">{sub}</div>
          </div></div>
        </div>
        <div className="hdr-dancetty" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}
