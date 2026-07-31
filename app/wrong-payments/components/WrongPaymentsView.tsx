'use client';

import { useMemo, useState } from 'react';
import type { WrongPaymentsData, WrongPaymentLine } from '@/lib/types';
import ScoringNote from '../../components/brand/ScoringNote';

// Wrong Payments — national fraud & error rates × Birmingham's real DWP bill.
// Every £ overpaid figure is DERIVED and labelled. Same component in /review and Dashboards.

const FRAUD = '#b01225';       // herald red — intentional wrongdoing
const CLAIMANT = '#d99a00';    // gold — claimant error (no fraud intent)
const OFFICIAL = '#4a3aa7';    // purple — DWP / LA / HMRC mistakes
const CORRECT = '#5a6358';     // muted ink — correctly paid
const UC_BLUE = '#2a55bf';
const LEAK = '#b01225';
const MUTED = '#8a8f99';

type Sub = 'shock' | 'leakage' | 'who' | 'uc' | 'table';

function fmtM(m: number, digits = 1) {
  if (m >= 1000) return `£${(m / 1000).toFixed(2)}bn`;
  if (m >= 100) return `£${m.toFixed(0)}m`;
  if (m >= 10) return `£${m.toFixed(1)}m`;
  return `£${m.toFixed(digits)}m`;
}

function fmtGbp(n: number) {
  return `£${n.toLocaleString('en-GB')}`;
}

export default function WrongPaymentsView({ data }: { data: WrongPaymentsData }) {
  const [sub, setSub] = useState<Sub>('shock');
  const [selId, setSelId] = useState<string | null>(data.city.top_leak_id);
  const city = data.city;
  const nat = data.national;
  const lines = useMemo(() => data.lines ?? [], [data.lines]);
  const selected = lines.find(l => l.id === selId) ?? lines[0] ?? null;

  const maxOver = useMemo(() => Math.max(...lines.map(l => l.overpaid_m), 1), [lines]);
  const maxSpend = useMemo(() => Math.max(...lines.map(l => l.spend_m), 1), [lines]);
  const maxRate = useMemo(() => Math.max(...lines.map(l => l.rate_pct), 1), [lines]);

  const typeTotal = city.fraud_m + city.claimant_error_m + city.official_error_m + (city.untyped_m || 0);

  return (
    <div className="body">
      <div className="lcol">
        <div className="hb-nowward" role="note">
          <span className="hb-nowward-tag">◇ ILLUSTRATIVE · NATIONAL RATES × CITY SPEND · NOT A BIRMINGHAM AUDIT</span>
          <p>
            DWP measures fraud and error as a <strong>percentage of Great Britain expenditure</strong> by
            benefit — it does <strong>not</strong> publish local-authority monetary losses. Every
            Birmingham £ figure below is <strong>derived</strong>: real city spend from the{' '}
            {data.year} LA accounts × the matching national overpayment rate (Fraud &amp; Error FYE 2025).
            Order-of-magnitude leakage, not a forensic audit. Underpayments (people paid too little)
            are shown as context — they are not &ldquo;waste.&rdquo;
          </p>
        </div>

        <ScoringNote label="What this is measuring">
          <strong>Overpayment</strong> = benefit paid that should not have been (fraud + claimant error +
          official error). Nationally that was <strong>{nat.overpaid_rate_pct}%</strong> of the bill
          ({fmtM(nat.overpaid_bn * 1000)}). Birmingham&apos;s mix is UC-heavy, so applying each
          benefit&apos;s own rate implies about <strong>1 in {city.one_in ?? '—'}</strong> pounds of the
          city bill — higher than the national average because Universal Credit alone overpays at{' '}
          <strong>{nat.uc_overpaid_rate_pct}%</strong>.
        </ScoringNote>

        <div className="sub-tab-bar">
          {([
            ['shock', 'The Shock'],
            ['leakage', 'By Benefit'],
            ['who', 'Who Leaked It'],
            ['uc', 'UC Deep Dive'],
            ['table', 'Table'],
          ] as [Sub, string][]).map(([s, lbl]) => (
            <button key={s} className={`sub-tab${sub === s ? ' active' : ''}`} onClick={() => setSub(s)}>{lbl}</button>
          ))}
        </div>

        <div className="panel" style={{ flex: 1, position: 'relative' }}>
          <div className="panel-body" style={{ padding: '16px 18px' }}>
            {sub === 'shock' && (
              <ShockTab data={data} city={city} nat={nat} />
            )}
            {sub === 'leakage' && (
              <LeakageTab
                lines={lines}
                maxOver={maxOver}
                maxSpend={maxSpend}
                maxRate={maxRate}
                selId={selId}
                onSelect={setSelId}
              />
            )}
            {sub === 'who' && (
              <WhoTab city={city} typeTotal={typeTotal} nat={nat} />
            )}
            {sub === 'uc' && (
              <UcTab data={data} city={city} nat={nat} />
            )}
            {sub === 'table' && (
              <TableTab lines={lines} selId={selId} onSelect={setSelId} bill_m={city.bill_m} overpaid_m={city.overpaid_m} />
            )}
          </div>
          <div className="bham-watermark">FORWARD · BIRMINGHAM</div>
        </div>
      </div>

      <div className="rcol">
        <div className="hb-headline">
          <div className="hb-big" style={{ color: LEAK }}>{fmtM(city.overpaid_m)}</div>
          <div className="hb-big-sub">
            Illustrative overpayments on Birmingham&apos;s {fmtM(city.bill_m)} DWP bill · {data.year} spend × FYE 2025 rates
          </div>

          <div className="hb-facts">
            <div className="hb-fact">
              <span className="hb-fact-k">One pound in…</span>
              <span className="hb-fact-v" style={{ fontFamily: 'var(--serif)', fontSize: 28, color: LEAK, lineHeight: 1.1 }}>
                {city.one_in ?? '—'}
              </span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">Implied city rate</span>
              <span className="hb-fact-v">{city.implied_rate_pct}% of the local bill (national average {nat.overpaid_rate_pct}%)</span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">Burn rate</span>
              <span className="hb-fact-v">{fmtM(city.per_day_m)}/day · ~{fmtGbp(city.per_minute)}/minute</span>
            </div>
            {city.per_resident != null && (
              <div className="hb-fact">
                <span className="hb-fact-k">Per resident</span>
                <span className="hb-fact-v">{fmtGbp(city.per_resident)} illustrative overpay · {data.year}</span>
              </div>
            )}
            <div className="hb-fact">
              <span className="hb-fact-k">Biggest leak</span>
              <span className="hb-fact-v">
                {city.top_leak_label} — {fmtM(city.top_leak_m ?? 0)}
                {lines[0] ? ` · ${lines[0].rate_pct}% rate · ${lines[0].share_of_leak_pct}% of leak` : ''}
              </span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">Of the leak</span>
              <span className="hb-fact-v">
                Fraud {fmtM(city.fraud_m)} · Claimant error {fmtM(city.claimant_error_m)} · Official error {fmtM(city.official_error_m)}
              </span>
            </div>
            {selected && (
              <div className="hb-fact">
                <span className="hb-fact-k">Selected · {selected.label}</span>
                <span className="hb-fact-v">
                  Spend {fmtM(selected.spend_m)} × {selected.rate_pct}% → {fmtM(selected.overpaid_m)}
                  {selected.rate_method === 'all-benefit-rate' ? ' · all-benefit rate' : ` · measured ${selected.last_measured ?? ''}`}
                </span>
              </div>
            )}
            <div className="hb-fact">
              <span className="hb-fact-k">Geography</span>
              <span className="hb-fact-v" style={{ color: 'var(--herald-red)' }}>
                LA spend · GB rates · no ward fraud figures exist
              </span>
            </div>
          </div>

          <div className="hb-sources">
            <div className="hb-sources-ttl">Sources</div>
            {(data.sources ?? []).map((s, i) => (
              <div key={i} className="hb-src">
                <a href={s.catalogueUrl} target="_blank" rel="noopener noreferrer">{s.label}</a>
                <span className="hb-src-meta">{s.publisher} · {s.licence} · {s.as_of}</span>
              </div>
            ))}
            <a href="/sources" className="hb-sources-all">All sources &amp; methods →</a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── The Shock ─────────────────────────────────────────────────────────────── */

function ShockTab({ data, city, nat }: { data: WrongPaymentsData; city: WrongPaymentsData['city']; nat: WrongPaymentsData['national'] }) {
  const correctPct = (city.correctly_paid_m / city.bill_m) * 100;
  const leakPct = (city.overpaid_m / city.bill_m) * 100;

  // National prior → current dumbbell for rate
  const prior = nat.prior;

  return (
    <>
      <div className="bill-sec-ttl">The city bill, split — correctly paid vs illustrative overpay</div>
      <div className="wp-stack" aria-label="Bill composition">
        <div className="wp-stack-seg" style={{ flexGrow: city.correctly_paid_m, background: CORRECT }} title={`Correctly paid ${fmtM(city.correctly_paid_m)}`}>
          {correctPct > 12 && (
            <span className="wp-stack-lbl">Correctly paid<em>{fmtM(city.correctly_paid_m)}</em><small>{correctPct.toFixed(1)}%</small></span>
          )}
        </div>
        <div className="wp-stack-seg" style={{ flexGrow: Math.max(city.overpaid_m, city.bill_m * 0.04), background: LEAK, minWidth: 48 }} title={`Illustrative overpay ${fmtM(city.overpaid_m)}`}>
          <span className="wp-stack-lbl">Overpaid<em>{fmtM(city.overpaid_m)}</em><small>{leakPct.toFixed(1)}%</small></span>
        </div>
      </div>
      <div className="comp-legend" style={{ marginTop: 8 }}>
        <span><i style={{ background: CORRECT }} /> Correctly paid (illustrative)</span>
        <span><i style={{ background: LEAK }} /> Overpaid — fraud + error (derived)</span>
      </div>

      <div className="wp-hero-grid">
        <div className="wp-hero-card">
          <div className="wp-hero-k">Britain overpaid</div>
          <div className="wp-hero-v" style={{ color: LEAK }}>{fmtM(nat.overpaid_bn * 1000)}</div>
          <div className="wp-hero-s">{nat.overpaid_rate_pct}% of {fmtM(nat.expenditure_bn * 1000)} · {nat.year}</div>
        </div>
        <div className="wp-hero-card">
          <div className="wp-hero-k">Birmingham (derived)</div>
          <div className="wp-hero-v" style={{ color: LEAK }}>{fmtM(city.overpaid_m)}</div>
          <div className="wp-hero-s">{city.implied_rate_pct}% of local bill · 1 in {city.one_in}</div>
        </div>
        <div className="wp-hero-card">
          <div className="wp-hero-k">Net national loss</div>
          <div className="wp-hero-v">{fmtM(nat.net_loss_bn * 1000)}</div>
          <div className="wp-hero-s">After £{nat.recovered_bn}bn recoveries · {nat.net_loss_rate_pct}%</div>
        </div>
        <div className="wp-hero-card">
          <div className="wp-hero-k">People underpaid</div>
          <div className="wp-hero-v" style={{ color: UC_BLUE }}>{fmtM(nat.underpaid_bn * 1000)}</div>
          <div className="wp-hero-s">{nat.underpaid_rate_pct}% — official error only · not waste</div>
        </div>
      </div>

      <div className="bill-sec-ttl" style={{ marginTop: 22 }}>Is the national leak shrinking? (rate, not £ — £ can rise while rate falls)</div>
      <div className="wp-dumbbell-row">
        <span className="wp-db-lbl">All benefits overpayment rate</span>
        <div className="wp-db-track">
          <span className="wp-db-end" style={{ left: `${(prior.overpaid_rate_pct / 5) * 100}%` }} title={`${prior.year}: ${prior.overpaid_rate_pct}%`}>
            <i className="wp-db-dot light" />
            <em>{prior.overpaid_rate_pct}%</em>
          </span>
          <span className="wp-db-end" style={{ left: `${(nat.overpaid_rate_pct / 5) * 100}%` }} title={`${nat.year}: ${nat.overpaid_rate_pct}%`}>
            <i className="wp-db-dot dark" />
            <em style={{ color: LEAK }}>{nat.overpaid_rate_pct}%</em>
          </span>
          <span className="wp-db-line" style={{
            left: `${(Math.min(prior.overpaid_rate_pct, nat.overpaid_rate_pct) / 5) * 100}%`,
            width: `${(Math.abs(prior.overpaid_rate_pct - nat.overpaid_rate_pct) / 5) * 100}%`,
          }} />
        </div>
        <span className="wp-db-delta" style={{ color: 'var(--q-prosp)' }}>↓ {(prior.overpaid_rate_pct - nat.overpaid_rate_pct).toFixed(1)}pp</span>
      </div>
      <div className="wp-dumbbell-row">
        <span className="wp-db-lbl">Universal Credit overpayment rate</span>
        <div className="wp-db-track">
          <span className="wp-db-end" style={{ left: `${(prior.uc_overpaid_rate_pct / 15) * 100}%` }}>
            <i className="wp-db-dot light" />
            <em>{prior.uc_overpaid_rate_pct}%</em>
          </span>
          <span className="wp-db-end" style={{ left: `${(nat.uc_overpaid_rate_pct / 15) * 100}%` }}>
            <i className="wp-db-dot dark" />
            <em style={{ color: UC_BLUE }}>{nat.uc_overpaid_rate_pct}%</em>
          </span>
          <span className="wp-db-line" style={{
            left: `${(Math.min(prior.uc_overpaid_rate_pct, nat.uc_overpaid_rate_pct) / 15) * 100}%`,
            width: `${(Math.abs(prior.uc_overpaid_rate_pct - nat.uc_overpaid_rate_pct) / 15) * 100}%`,
          }} />
        </div>
        <span className="wp-db-delta" style={{ color: 'var(--q-prosp)' }}>↓ {(prior.uc_overpaid_rate_pct - nat.uc_overpaid_rate_pct).toFixed(1)}pp</span>
      </div>
      <p className="wp-caption">
        Rates fell year-on-year, but the cash overpaid barely budged (£{nat.prior.overpaid_bn}bn → £{nat.overpaid_bn}bn)
        because the overall bill grew. Prefer rates for time comparison — DWP&apos;s own guidance.
      </p>

      <div className="bill-sec-ttl" style={{ marginTop: 20 }}>Where the city leak comes from (mosaic — area = illustrative £ overpaid)</div>
      <div className="bill-mosaic" style={{ height: 100 }}>
        {data.lines.filter(l => l.overpaid_m / city.overpaid_m > 0.008).map(l => (
          <div
            key={l.id}
            className="bill-block"
            style={{ flexGrow: l.overpaid_m, background: l.id === 'uc' ? UC_BLUE : l.id === 'hb' ? '#1f7a33' : l.id === 'pc' ? '#d99a00' : MUTED }}
            title={`${l.label}: ${fmtM(l.overpaid_m)} (${l.share_of_leak_pct}%)`}
          >
            {l.share_of_leak_pct > 6 && (
              <span className="bill-block-lbl">{l.label}<em>{l.share_of_leak_pct.toFixed(0)}%</em></span>
            )}
          </div>
        ))}
      </div>
      <div className="comp-legend" style={{ marginTop: 8 }}>
        <span><i style={{ background: UC_BLUE }} /> Universal Credit ({fmtM(city.uc_overpaid_m ?? 0)})</span>
        <span><i style={{ background: '#1f7a33' }} /> Housing Benefit</span>
        <span><i style={{ background: '#d99a00' }} /> Pension Credit</span>
        <span><i style={{ background: MUTED }} /> Other</span>
      </div>
    </>
  );
}

/* ── By Benefit ────────────────────────────────────────────────────────────── */

function LeakageTab({
  lines, maxOver, maxSpend, maxRate, selId, onSelect,
}: {
  lines: WrongPaymentLine[];
  maxOver: number;
  maxSpend: number;
  maxRate: number;
  selId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <div className="bill-sec-ttl">Ranked by illustrative overpayment £ — click a row for detail</div>
      <p className="wp-caption" style={{ marginTop: -4 }}>
        Bar length = derived £ overpaid. Rate badge is the national overpayment rate for that benefit.
        Grey badge = all-benefit 3.3% used (no benefit-specific measurement).
      </p>
      {lines.map(l => (
        <button
          key={l.id}
          type="button"
          className={`wp-row${selId === l.id ? ' is-sel' : ''}`}
          onClick={() => onSelect(l.id)}
        >
          <div className="wp-row-name">
            {l.label}
            {l.rate_method === 'all-benefit-rate' && <span className="wp-badge muted">all-benefit rate</span>}
            {l.rate_method === 'benefit-specific' && <span className="wp-badge rate">{l.rate_pct}%</span>}
          </div>
          <div className="wp-row-track">
            <div className="wp-row-bar" style={{ width: `${(l.overpaid_m / maxOver) * 100}%`, background: l.id === 'uc' ? UC_BLUE : LEAK }} />
            <span className="wp-row-val">{fmtM(l.overpaid_m)}</span>
          </div>
        </button>
      ))}

      <div className="bill-sec-ttl" style={{ marginTop: 24 }}>Two honest charts — spend size vs leakiness (no dual axis)</div>
      <div className="wp-twin">
        <div>
          <div className="bill-sec-ttl" style={{ marginBottom: 8 }}>A · Spend in Birmingham (£m)</div>
          {[...lines].sort((a, b) => b.spend_m - a.spend_m).slice(0, 8).map(l => (
            <div key={l.id} className="wp-mini-row">
              <span className="wp-mini-name">{l.label}</span>
              <div className="wp-mini-track">
                <div style={{ width: `${(l.spend_m / maxSpend) * 100}%`, background: CORRECT, height: 12 }} />
              </div>
              <span className="wp-mini-val">{fmtM(l.spend_m)}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="bill-sec-ttl" style={{ marginBottom: 8 }}>B · National overpayment rate (%)</div>
          {[...lines].sort((a, b) => b.rate_pct - a.rate_pct).slice(0, 8).map(l => (
            <div key={l.id} className="wp-mini-row">
              <span className="wp-mini-name">{l.label}</span>
              <div className="wp-mini-track">
                <div style={{ width: `${(l.rate_pct / maxRate) * 100}%`, background: LEAK, height: 12 }} />
              </div>
              <span className="wp-mini-val">{l.rate_pct}%</span>
            </div>
          ))}
        </div>
      </div>
      <p className="wp-caption">
        Read A and B together: Universal Credit is both large (A) and leaky (B) — that is why it
        dominates the city&apos;s derived overpayment. State Pension is huge in spend but almost dry
        at 0.1% overpaid.
      </p>
    </>
  );
}

/* ── Who leaked it ─────────────────────────────────────────────────────────── */

function WhoTab({ city, typeTotal, nat }: {
  city: WrongPaymentsData['city'];
  typeTotal: number;
  nat: WrongPaymentsData['national'];
}) {
  const segs = [
    { id: 'fraud', label: 'Fraud', m: city.fraud_m, color: FRAUD, note: 'Claimant can reasonably be expected to know · benefit stops/reduces after review', nat: `${nat.fraud_rate_pct}% · £${nat.fraud_bn}bn GB` },
    { id: 'ce', label: 'Claimant error', m: city.claimant_error_m, color: CLAIMANT, note: 'Inaccurate or incomplete info, no evidence of fraudulent intent', nat: `${nat.claimant_error_rate_pct}% · £${nat.claimant_error_bn}bn GB` },
    { id: 'oe', label: 'Official error', m: city.official_error_m, color: OFFICIAL, note: 'DWP, local authority or HMRC delay, mistake or failure to act', nat: `${nat.official_error_rate_pct}% · £${nat.official_error_bn}bn GB` },
    { id: 'un', label: 'Untyped (small lines)', m: city.untyped_m, color: MUTED, note: 'Benefits without a fraud/error type split — all-benefit rate only', nat: '—' },
  ].filter(s => s.m > 0.05);

  return (
    <>
      <div className="bill-sec-ttl">How the illustrative leak splits — fraud vs mistakes</div>
      <div className="wp-stack" style={{ height: 72 }}>
        {segs.map(s => (
          <div key={s.id} className="wp-stack-seg" style={{ flexGrow: s.m, background: s.color }} title={`${s.label}: ${fmtM(s.m)}`}>
            {(s.m / typeTotal) > 0.12 && (
              <span className="wp-stack-lbl">{s.label}<em>{fmtM(s.m)}</em><small>{((s.m / typeTotal) * 100).toFixed(0)}%</small></span>
            )}
          </div>
        ))}
      </div>
      <div className="comp-legend" style={{ marginTop: 8 }}>
        {segs.map(s => (
          <span key={s.id}><i style={{ background: s.color }} /> {s.label}</span>
        ))}
      </div>

      <div className="wp-type-list">
        {segs.map(s => (
          <div key={s.id} className="wp-type-card">
            <div className="wp-type-head">
              <span className="wp-type-swatch" style={{ background: s.color }} />
              <span className="wp-type-name">{s.label}</span>
              <span className="wp-type-m">{fmtM(s.m)}</span>
            </div>
            <p className="wp-type-note">{s.note}</p>
            <div className="wp-type-nat">National: {s.nat}</div>
            <div className="wp-type-bar">
              <div style={{ width: `${(s.m / typeTotal) * 100}%`, background: s.color, height: 6 }} />
            </div>
          </div>
        ))}
      </div>

      <div className="bill-sec-ttl" style={{ marginTop: 18 }}>The uncomfortable truth about official error</div>
      <p className="wp-caption" style={{ maxWidth: 640 }}>
        Official error is money paid wrong because of government systems — not claimants.
        Nationally that is still £{nat.official_error_bn}bn overpaid (and £{nat.underpaid_bn}bn underpaid).
        On Birmingham&apos;s derived split, official error is about {fmtM(city.official_error_m)} —
        real pounds, still waste, different villain.
      </p>
    </>
  );
}

/* ── UC deep dive ──────────────────────────────────────────────────────────── */

function UcTab({ data, city, nat }: { data: WrongPaymentsData; city: WrongPaymentsData['city']; nat: WrongPaymentsData['national'] }) {
  const reasons = data.uc_reasons ?? [];
  const maxR = Math.max(...reasons.map(r => r.bham_illustrative_m ?? 0), 1);
  const ucSpend = city.uc_spend_m ?? 0;
  const ucOver = city.uc_overpaid_m ?? 0;

  return (
    <>
      <div className="wp-uc-banner">
        <div>
          <div className="wp-hero-k">Universal Credit in Birmingham</div>
          <div className="wp-hero-v" style={{ fontSize: 36, color: UC_BLUE }}>{fmtM(ucSpend)}</div>
          <div className="wp-hero-s">{data.year} spend · {city.uc_rate_pct}% national overpayment rate</div>
        </div>
        <div>
          <div className="wp-hero-k">Illustrative overpay</div>
          <div className="wp-hero-v" style={{ fontSize: 36, color: LEAK }}>{fmtM(ucOver)}</div>
          <div className="wp-hero-s">
            {city.overpaid_m > 0 ? ((ucOver / city.overpaid_m) * 100).toFixed(0) : '—'}% of the whole city leak
          </div>
        </div>
        <div>
          <div className="wp-hero-k">GB UC overpay rate</div>
          <div className="wp-hero-v" style={{ fontSize: 36 }}>{nat.uc_overpaid_rate_pct}%</div>
          <div className="wp-hero-s">down from {nat.prior.uc_overpaid_rate_pct}% last year · still ~1 in 10</div>
        </div>
      </div>

      <div className="bill-sec-ttl" style={{ marginTop: 8 }}>Why UC is overpaid — national fraud reasons × Birmingham UC spend</div>
      <p className="wp-caption">
        Rates are % of Universal Credit expenditure (FYE 2025). £ figures apply those rates to
        Birmingham&apos;s UC line — labelled derived. These are the main fraud reasons DWP found
        in sample reviews; they do not sum to the full 9.7% (other reasons + claimant/official error fill the rest).
      </p>
      {reasons.map(r => (
        <div key={r.id} className="wp-reason-row">
          <div className="wp-reason-name">
            {r.label}
            {r.note && <span className="wp-you">{r.note}</span>}
          </div>
          <div className="wp-reason-meta">{r.rate_pct}% of UC</div>
          <div className="wp-row-track">
            <div className="wp-row-bar" style={{ width: `${((r.bham_illustrative_m ?? 0) / maxR) * 100}%`, background: FRAUD }} />
            <span className="wp-row-val">{fmtM(r.bham_illustrative_m ?? 0)}</span>
          </div>
        </div>
      ))}

      <div className="bill-sec-ttl" style={{ marginTop: 22 }}>Put UC next to State Pension — same city, opposite leakiness</div>
      <div className="wp-compare">
        <div className="wp-compare-card">
          <div className="wp-hero-k">Universal Credit</div>
          <div className="wp-compare-rate" style={{ color: UC_BLUE }}>{city.uc_rate_pct}%</div>
          <div className="wp-hero-s">overpayment rate · spend {fmtM(ucSpend)} → leak {fmtM(ucOver)}</div>
        </div>
        <div className="wp-compare-vs">vs</div>
        <div className="wp-compare-card">
          <div className="wp-hero-k">State Pension</div>
          <div className="wp-compare-rate" style={{ color: CORRECT }}>0.1%</div>
          <div className="wp-hero-s">
            overpayment rate · spend {fmtM(data.lines.find(l => l.id === 'sp')?.spend_m ?? 0)} → leak{' '}
            {fmtM(data.lines.find(l => l.id === 'sp')?.overpaid_m ?? 0)}
          </div>
        </div>
      </div>
      <p className="wp-caption">
        Pension is nearly half of GB welfare but almost dry of overpayments. The working-age
        means-tested system is where the taxpayer leakage concentrates — and that is exactly
        the system Birmingham leans on.
      </p>
    </>
  );
}

/* ── Table twin ────────────────────────────────────────────────────────────── */

function TableTab({
  lines, selId, onSelect, bill_m, overpaid_m,
}: {
  lines: WrongPaymentLine[];
  selId: string | null;
  onSelect: (id: string) => void;
  bill_m: number;
  overpaid_m: number;
}) {
  return (
    <div className="tbl-wrap" style={{ maxHeight: '100%' }}>
      <table className="data-tbl">
        <thead>
          <tr>
            <th>#</th>
            <th>Benefit</th>
            <th>Spend £m</th>
            <th>Rate %</th>
            <th>Overpaid £m</th>
            <th>Fraud £m</th>
            <th>Claimant err £m</th>
            <th>Official err £m</th>
            <th>Share of leak</th>
            <th>Rate source</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={l.id} className={selId === l.id ? 'row-selected' : ''} onClick={() => onSelect(l.id)}>
              <td className="rank-cell">{i + 1}</td>
              <td className="name-cell">{l.label}</td>
              <td>{l.spend_m.toFixed(1)}</td>
              <td>{l.rate_pct.toFixed(1)}</td>
              <td style={{ color: LEAK, fontWeight: 600 }}>{l.overpaid_m.toFixed(2)}</td>
              <td>{l.fraud_m != null ? l.fraud_m.toFixed(2) : '—'}</td>
              <td>{l.claimant_error_m != null ? l.claimant_error_m.toFixed(2) : '—'}</td>
              <td>{l.official_error_m != null ? l.official_error_m.toFixed(2) : '—'}</td>
              <td>{l.share_of_leak_pct.toFixed(1)}%</td>
              <td style={{ fontSize: 9, color: 'var(--muted)' }}>
                {l.rate_method === 'benefit-specific' ? (l.last_measured ?? 'measured') : 'all-benefit 3.3%'}
              </td>
            </tr>
          ))}
          <tr style={{ fontWeight: 600, background: 'var(--paper2)' }}>
            <td />
            <td>TOTAL</td>
            <td>{bill_m.toFixed(1)}</td>
            <td />
            <td style={{ color: LEAK }}>{overpaid_m.toFixed(2)}</td>
            <td colSpan={5} style={{ fontSize: 9, color: 'var(--muted)' }}>Derived · national rates × city spend</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
