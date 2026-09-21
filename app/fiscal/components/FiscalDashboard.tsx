'use client';
import { useMemo } from 'react';
import type { FiscalWard } from '@/lib/types';
import DashboardHeader from '@/app/components/brand/DashboardHeader';
import SectionHeader from '@/app/components/brand/SectionHeader';
import DancettyDivider from '@/app/components/brand/DancettyDivider';
import CrestWatermark from '@/app/components/brand/CrestWatermark';
import FocusableChart from '@/app/components/FocusableChart';

const COL = {
  surplus:   '#1a3a2a',
  deficit:   '#3a1a1a',
  gold:      '#efb700',
  line:      'rgba(14,15,17,0.10)',
};

const PROVENANCE: { layer: string; what: string; source: string; status: 'real' | 'modelled' | 'login' }[] = [
  { layer: 'Population',          what: 'Ward resident population, age split estimated by ward character', source: 'ONS mid-year estimates (real) · age split modelled', status: 'modelled' },
  { layer: 'Benefit caseloads',    what: 'UC, PIP/DLA/AA, State Pension, Pension Credit counts per ward', source: 'DWP Stat-Xplore (requires free API key)', status: 'login' },
  { layer: 'Benefit £ value',      what: 'Award amounts applied to caseloads; calibrated to DWP LA total', source: 'DWP Benefit Expenditure & Caseload Tables + Stat-Xplore', status: 'modelled' },
  { layer: 'Child Benefit',        what: 'Recipients and children covered', source: 'HMRC Child Benefit statistics', status: 'modelled' },
  { layer: 'Council Tax',          what: 'Properties by band × band charge', source: 'VOA band counts + BCC council-tax base', status: 'modelled' },
  { layer: 'Income Tax & NI',      what: 'Allocated to wards via ward earnings proxy', source: 'HMRC subnational statistics + Census / ASHE', status: 'modelled' },
  { layer: 'VAT & duties',         what: 'Allocated via consumption proxy', source: 'ONS regional indirect tax + modelled split', status: 'modelled' },
  { layer: 'Health & care',        what: "Allocated via ward age profile + deprivation", source: 'NHS ICB allocations + HM Treasury CRA', status: 'modelled' },
  { layer: 'Education',            what: 'Allocated via number of school-age children', source: 'DfE school census', status: 'modelled' },
  { layer: 'Regional reconciliation', what: "Sum of all ward balances tied to West Midlands total", source: 'ONS Country & Regional Public Sector Finances', status: 'modelled' },
];

const STATUS_META: Record<'real' | 'modelled' | 'login', { label: string; color: string }> = {
  real:     { label: 'Live source',             color: '#1a3a2a' },
  modelled: { label: 'Modelled estimate',       color: '#8a6a2e' },
  login:    { label: 'Behind login — awaiting', color: '#3a1a1a' },
};

function gbp(n: number): string {
  return (n < 0 ? '−' : '') + '£' + Math.abs(Math.round(n)).toLocaleString('en-GB');
}
function gbpK(n: number): string {
  return (n < 0 ? '−' : '') + '£' + (Math.abs(n) / 1000).toFixed(1) + 'k';
}

function StatusDot({ status }: { status: 'real' | 'modelled' | 'login' }) {
  const m = STATUS_META[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: m.color, fontWeight: 600, fontFamily: 'var(--mono)' }}>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: m.color, display: 'inline-block', flexShrink: 0 }} />
      {m.label}
    </span>
  );
}

function BalanceBars({ data, selected, onSelect }: { data: FiscalWard[]; selected: string | null; onSelect: (code: string) => void }) {
  const nets = data.map(w => w.net);
  const gMin = Math.min(0, ...nets);
  const gMax = Math.max(0, ...nets);
  const range = gMax - gMin || 1;
  const pct = (x: number) => ((x - gMin) / range) * 100;
  const zero = pct(0);

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {data.map(w => {
          const isSel = w.ward_code === selected;
          const pos = w.net >= 0;
          const left = pos ? zero : pct(w.net);
          const width = Math.max(0.4, pos ? pct(w.net) - zero : zero - pct(w.net));
          return (
            <button
              key={w.ward_code}
              onClick={() => onSelect(w.ward_code)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '3px 4px',
                background: isSel ? 'rgba(28,63,148,0.08)' : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                boxShadow: isSel ? 'inset 3px 0 0 var(--herald-gold)' : 'none',
              }}
            >
              <span
                title={w.ward_name}
                style={{
                  width: 142, flexShrink: 0, fontSize: 11, lineHeight: 1.15,
                  color: isSel ? 'var(--ink)' : 'var(--muted)',
                  fontWeight: isSel ? 700 : 500,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  fontFamily: 'var(--mono)',
                }}
              >
                {w.ward_name}
              </span>
              <span style={{ position: 'relative', flex: 1, height: 14 }}>
                <span style={{ position: 'absolute', left: `${zero}%`, top: -2, bottom: -2, width: 1.5, background: COL.gold, opacity: 0.65 }} />
                <span
                  className="bw-bar"
                  style={{
                    position: 'absolute', top: 2, bottom: 2,
                    left: `${left}%`, width: `${width}%`,
                    background: pos ? COL.surplus : COL.deficit,
                    opacity: isSel ? 1 : 0.8, borderRadius: 1,
                  }}
                />
              </span>
              <span style={{ width: 58, flexShrink: 0, textAlign: 'right', fontSize: 11.5, fontFamily: 'var(--mono)', fontWeight: 600, color: pos ? COL.surplus : COL.deficit }}>
                {gbpK(w.net)}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingLeft: 150, paddingRight: 66, fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
        <span>{gbpK(gMin)}</span>
        <span style={{ color: COL.gold }}>£0</span>
        <span>{gbpK(gMax)}</span>
      </div>
    </div>
  );
}

interface Props {
  wards: FiscalWard[];
  selected: string | null;
  onSelect: (code: string) => void;
}

export default function FiscalDashboard({ wards: fiscalWards, selected, onSelect }: Props) {
  const sorted = useMemo(() => [...fiscalWards].sort((a, b) => a.net - b.net), [fiscalWards]);

  const totalPop = fiscalWards.reduce((s, w) => s + w.population, 0);
  const avgNet   = totalPop > 0 ? fiscalWards.reduce((s, w) => s + w.net * w.population, 0) / totalPop : 0;

  // No inline overflowY on the wrapper below: .panel-body already sets
  // overflow-y:auto for desktop, and globals.css drops it to overflow:visible on
  // narrow screens so the panel rides the page scroll instead of trapping a
  // thumb in its own scroll box. An inline style beats that media query, which
  // is what made this the one view you had to scroll around rather than over.
  return (
    <div className="panel-body bw-fiscal" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <style>{`
        .bw-fiscal .bw-bar { transition: width 480ms cubic-bezier(.22,.61,.36,1), left 480ms cubic-bezier(.22,.61,.36,1); }
        @media (prefers-reduced-motion: reduce) { .bw-fiscal .bw-bar { transition: none !important; } }
        @media (min-width: 900px) {
          .bw-fiscal-stats { grid-template-columns: repeat(4, 1fr) !important; }
        }
      `}</style>

      {/* Brand header */}
      <DashboardHeader
        eyebrow="Birmingham · Fiscal Balance"
        title="Who pays in, who draws down"
        motif="none"
        subtitle={`A ward-by-ward estimate of revenue raised against benefits and public services, showing the net fiscal position per head across all ${fiscalWards.length} Birmingham wards.`}
      />

      <div style={{ padding: '18px 18px' }}>

        {/* DEMO banner */}
        <div style={{ margin: '14px 0 12px', padding: '10px 14px', background: 'rgba(239,183,0,0.08)', border: '1px solid rgba(239,183,0,0.4)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: '#9a7a00', fontSize: 11, flexShrink: 0, paddingTop: 1, letterSpacing: '.08em' }}>DEMO</span>
          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--ink)' }}>All £ figures are modelled estimates</strong> — synthesised from ward earnings, deprivation scores and demographic profiles, not official statistics. They show how the model behaves, not a real result. Wiring DWP Stat-Xplore, HMRC and ONS sources (see provenance table below) would replace these with real ward-level figures.
          </p>
        </div>

        {/* Ward selector */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <label htmlFor="fiscal-wardpick" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>Ward</label>
          <select
            id="fiscal-wardpick"
            value={selected ?? ''}
            onChange={e => onSelect(e.target.value)}
            style={{ fontSize: 12.5, padding: '6px 10px', border: '1px solid var(--border-solid)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--ink)', minWidth: 230, fontFamily: 'var(--mono)', fontWeight: 600 }}
          >
            <option value="">Select a ward…</option>
            {[...fiscalWards].sort((a, b) => a.ward_name.localeCompare(b.ward_name)).map(w => (
              <option key={w.ward_code} value={w.ward_code}>{w.ward_name}</option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>or click any bar to open its breakdown →</span>
        </div>

        {/* All wards — ranked balance bars (detail opens in the right panel) */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-solid)', borderRadius: 'var(--radius)', padding: 14 }}>
          <SectionHeader eyebrow="All wards · ranked" title="Net fiscal balance per head" style={{ marginBottom: 8 }} />
          <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 12px', lineHeight: 1.4 }}>
            <span style={{ color: COL.deficit, fontWeight: 700 }}>● In the red</span> = net recipient ·{' '}
            <span style={{ color: COL.surplus, fontWeight: 700 }}>● In the black</span> = net contributor · click a ward for its full breakdown
          </p>
          <FocusableChart title="Ward Net Fiscal Balance">
            <div className="scroll-release" style={{ maxHeight: 760, overflowY: 'auto' }}>
              <BalanceBars data={sorted} selected={selected} onSelect={onSelect} />
            </div>
          </FocusableChart>
          <p style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 12, lineHeight: 1.5, paddingTop: 10, borderTop: `1px solid ${COL.line}` }}>
            Population-weighted city average: <strong style={{ color: avgNet >= 0 ? COL.surplus : COL.deficit, fontFamily: 'var(--mono)' }}>{gbp(avgNet)}</strong>/head.
            In the full model this ties to the published ONS West Midlands figure. Figures are modelled estimates.
          </p>
        </div>

        {/* Interpretation callout */}
        <DancettyDivider style={{ marginTop: 22, marginBottom: 16 }} />
        <div style={{ position: 'relative', overflow: 'hidden', padding: '18px 20px', background: 'var(--herald-navy)', color: '#e7eaef' }}>
          <CrestWatermark width={220} opacity={0.07} style={{ bottom: -28, right: -24 }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <SectionHeader tone="dark" eyebrow="How to read this" title="Before drawing conclusions" size={16} />
            <p style={{ fontSize: 12.5, lineHeight: 1.65, margin: 0, color: '#c5ccd6' }}>
              A &ldquo;net recipient&rdquo; ward is usually telling you about its <strong style={{ color: '#fff' }}>age structure and economic base, not the character of its residents</strong>. In the official ONS data, about{' '}
              <strong style={{ color: '#fff' }}>89% of retired people</strong> live in net-recipient households versus around{' '}
              <strong style={{ color: '#fff' }}>46% of non-retired people</strong> — almost everyone is a net recipient as a child and in retirement, and a net contributor during working life. The State Pension, the single largest transfer, goes to people who paid in across a full career — it should never be read as a &ldquo;loss.&rdquo; Because Income Tax, NI and VAT can only be split to ward level by modelling, the revenue figures here are estimates, not official statistics.
            </p>
          </div>
        </div>

        {/* Provenance table */}
        <div style={{ marginTop: 16, background: 'var(--surface)', border: '1px solid var(--border-solid)', borderRadius: 'var(--radius)', padding: 14, overflowX: 'auto' }}>
          <SectionHeader
            eyebrow="Data lineage"
            title="Data sources & provenance"
            subtitle="Every layer of the calculation, and whether each input is a live source, a modelled estimate, or still behind a login."
          />
          <FocusableChart title="Data sources &amp; provenance">
            <div className="prov-table">
              <div className="prov-row prov-head">
                <span className="prov-layer">Layer</span>
                <span className="prov-what">What it provides</span>
                <span className="prov-source">Source</span>
                <span className="prov-status">Status</span>
              </div>
              {PROVENANCE.map((p, i) => (
                <div key={i} className="prov-row">
                  <span className="prov-layer" data-k="Layer">{p.layer}</span>
                  <span className="prov-what" data-k="What it provides">{p.what}</span>
                  <span className="prov-source" data-k="Source">{p.source}</span>
                  <span className="prov-status" data-k="Status"><StatusDot status={p.status} /></span>
                </div>
              ))}
            </div>
          </FocusableChart>
        </div>

        {/* Footer */}
        <p style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 14, lineHeight: 1.6, fontFamily: 'var(--mono)' }}>
          Prototype · All figures illustrative · Real sources: DWP Stat-Xplore · DWP Benefit Expenditure &amp; Caseload Tables · HMRC Child Benefit &amp; subnational tax statistics · ONS small-area population estimates · ONS Country &amp; Regional Public Sector Finances · VOA · Birmingham City Council
        </p>
      </div>
    </div>
  );
}
