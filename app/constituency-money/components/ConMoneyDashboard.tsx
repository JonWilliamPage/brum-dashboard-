'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { ConMoneyData, ConMoneyConstituency } from '@/lib/types';
import { RAMP } from '@/lib/constants';
import ConMoneyDetailPanel from './ConMoneyDetailPanel';
import FocusableChart from '../../components/FocusableChart';

const ConMoneyMap = dynamic(() => import('./ConMoneyMap'), { ssr: false });

// THE shared dashboard body — rendered identically in /review and Dashboards.
// Real DWP accounting £ for the 9 constituencies (2024 boundaries). Views chosen by
// the data's job: ranked table (magnitude), stacked composition (part-to-whole),
// heatmap (constituency × benefit grid), UC small multiples (the only long series
// DWP recalculated onto the new boundaries), choropleth map.
type Sub = 'table' | 'composition' | 'heatmap' | 'uctrend' | 'map';

// Validated chart palette (docs/VIZ-EXECUTION-PLAN.md) + de-emphasis gray for Other.
const SERIES: { id: string; label: string; color: string }[] = [
  { id: 'uc', label: 'Universal Credit', color: '#2a55bf' },
  { id: 'sp', label: 'State Pension', color: '#d99a00' },
  { id: 'hb', label: 'Housing Benefit', color: '#1f7a33' },
  { id: 'pip', label: 'PIP', color: '#b01225' },
  { id: 'esa', label: 'ESA', color: '#4a3aa7' },
];
const HEAT_IDS = ['uc', 'sp', 'hb', 'pip', 'esa', 'dla', 'pc', 'ca', 'aa', 'jsa', 'is', 'wfp'];

const fmt = (m: number) => (m >= 1000 ? `£${(m / 1000).toFixed(2)}bn` : `£${m.toFixed(m < 10 ? 1 : 0)}m`);
const short = (n: string) => n.replace('Birmingham ', '');

export default function ConMoneyDashboard({ data }: { data: ConMoneyData }) {
  const [sub, setSub] = useState<Sub>('table');
  const [selected, setSelected] = useState<ConMoneyConstituency | null>(null);
  const cons = data.constituencies;
  const pick = (code: string) => setSelected(prev => prev?.code === code ? null : (cons.find(c => c.code === code) ?? null));
  const maxTotal = Math.max(...cons.map(c => c.total_m), 1);
  const otherOf = (c: ConMoneyConstituency) => Math.round((c.total_m - SERIES.reduce((s, x) => s + (c.benefits[x.id] ?? 0), 0)) * 10) / 10;

  // heatmap scale per COLUMN (benefit) so each benefit's spread reads independently
  const colMax: Record<string, number> = {};
  for (const id of HEAT_IDS) colMax[id] = Math.max(...cons.map(c => c.benefits[id] ?? 0), 0.001);
  const heat = (v: number, id: string) => RAMP[Math.max(0, Math.min(9, Math.round((v / colMax[id]) * 9)))];

  // UC small multiples: uniform y-scale across facets for honest comparison
  const ucMax = Math.max(...cons.flatMap(c => c.uc_trend ?? []), 1);

  return (
    <div className="body">
      <div className="lcol">
        <div className="hb-nowward" role="note">
          <span className="hb-nowward-tag">◇ CONSTITUENCY FIGURE — ACTUAL DWP ACCOUNTS, 2024 BOUNDARIES</span>
          <p>
            Real accounting outturn per constituency ({data.year}, £ nominal), every row validated against
            DWP&apos;s own Total. The 9 constituencies sum to {fmt(data.city.sum_m)} vs the Birmingham LA figure
            of {fmt(data.city.la_total_m)} ({data.city.drift_pct}% apart — Hodge Hill &amp; Solihull North straddles
            the border and some spend isn&apos;t allocated to constituencies). <strong>No ward-level £ exists.</strong>{' '}
            Long histories aren&apos;t shown because DWP only recalculated Universal Credit (2019/20 on) onto the
            new boundaries.
          </p>
        </div>

        <div className="sub-tab-bar">
          {([['table', 'Table'], ['composition', 'Composition'], ['heatmap', 'Heatmap'], ['uctrend', 'UC Trend'], ['map', 'Map']] as [Sub, string][]).map(([s, lbl]) => (
            <button key={s} className={`sub-tab${sub === s ? ' active' : ''}`} onClick={() => setSub(s)}>{lbl}</button>
          ))}
        </div>

        <div className="panel" style={{ flex: 1, position: 'relative' }}>
          <div className="panel-body" style={sub === 'map' ? undefined : { padding: '14px 16px' }}>

            {sub === 'table' && (
              <FocusableChart title="Money Map Table">
              <div className="crime-table-wrap" style={{ margin: '-14px -16px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Constituency</th><th>Total £/yr</th><th>UC</th><th>State Pension</th><th>PIP</th><th>Housing Benefit</th><th>Share of 9</th><th>Bar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cons.map(c => (
                      <tr key={c.code} className={selected?.code === c.code ? 'selected' : ''} onClick={() => pick(c.code)} style={{ cursor: 'pointer' }}>
                        <td className="td-ward" style={{ fontFamily: 'var(--sans)', fontWeight: 500 }}>{short(c.name)}</td>
                        <td style={{ fontWeight: 600 }}>{fmt(c.total_m)}</td>
                        <td style={{ color: '#2a55bf' }}>{fmt(c.benefits.uc ?? 0)}</td>
                        <td style={{ color: '#9c6b1e' }}>{fmt(c.benefits.sp ?? 0)}</td>
                        <td style={{ color: '#b01225' }}>{fmt(c.benefits.pip ?? 0)}</td>
                        <td style={{ color: '#1f7a33' }}>{fmt(c.benefits.hb ?? 0)}</td>
                        <td style={{ color: 'var(--muted)' }}>{((c.total_m / data.city.sum_m) * 100).toFixed(1)}%</td>
                        <td>
                          <div className="mini-bar-bg">
                            <div className="mini-bar-fill" style={{ width: `${(c.total_m / maxTotal) * 100}%`, background: 'var(--herald-navy)' }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </FocusableChart>
            )}

            {sub === 'composition' && (
              <FocusableChart title="Money Map Composition">
                <div className="comp-legend">
                  {SERIES.map(s => <span key={s.id}><i style={{ background: s.color }} /> {s.label}</span>)}
                  <span><i style={{ background: '#8a8f99' }} /> everything else</span>
                </div>
                {cons.map(c => (
                  <div key={c.code} className={`comp-row${selected?.code === c.code ? ' selected' : ''}`} onClick={() => pick(c.code)}>
                    <div className="comp-name">{short(c.name)}</div>
                    <div className="comp-track" style={{ height: 20 }}>
                      {SERIES.map(s => (
                        <div key={s.id} className="comp-seg" style={{ width: `${((c.benefits[s.id] ?? 0) / maxTotal) * 100}%`, background: s.color }} />
                      ))}
                      <div className="comp-seg" style={{ width: `${(otherOf(c) / maxTotal) * 100}%`, background: '#8a8f99' }} />
                      <span className="comp-val">{fmt(c.total_m)}</span>
                    </div>
                  </div>
                ))}
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted2)', marginTop: 8 }}>
                  Bar length = total DWP £. Ladywood&apos;s bar is blue (working-age UC); Selly Oak&apos;s is gold (pensions).
                </div>
              </FocusableChart>
            )}

            {sub === 'heatmap' && (
              <FocusableChart title="Money Map Heatmap">
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ minWidth: 720 }}>
                  <thead>
                    <tr>
                      <th>£m</th>
                      {HEAT_IDS.map(id => <th key={id} style={{ fontSize: 9 }}>{(data.benefit_labels[id] ?? id).replace('Personal Independence Payment', 'PIP').replace('Employment & Support Allowance', 'ESA').replace('Disability Living Allowance', 'DLA').replace("Jobseeker's Allowance", 'JSA')}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {cons.map(c => (
                      <tr key={c.code} onClick={() => pick(c.code)} style={{ cursor: 'pointer' }} className={selected?.code === c.code ? 'selected' : ''}>
                        <td className="td-ward" style={{ fontFamily: 'var(--sans)', fontWeight: 500, whiteSpace: 'nowrap' }}>{short(c.name)}</td>
                        {HEAT_IDS.map(id => {
                          const v = c.benefits[id];
                          return (
                            <td key={id} style={v != null ? { background: heat(v, id), color: '#f5f3ee', fontFamily: 'var(--mono)', fontSize: 10, textAlign: 'center' } : { color: 'var(--muted2)', textAlign: 'center' }}
                              title={`${short(c.name)} · ${data.benefit_labels[id] ?? id}: ${v != null ? `£${v.toFixed(1)}m` : 'not itemised'}`}>
                              {v != null ? Math.round(v) : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted2)', marginTop: 8 }}>
                  Each column shaded on its own scale (darkest = the constituency receiving most of that benefit). Values £m/yr.
                </div>
              </div>
              </FocusableChart>
            )}

            {sub === 'uctrend' && (
              <>
                <div className="bill-sec-ttl">Universal Credit £ per constituency, {data.uc_years[0]} → {data.uc_years.at(-1)} (uniform scale)</div>
                <FocusableChart title="UC Trend by Constituency">
                <div className="bill-facets" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                  {cons.map(c => {
                    const t = c.uc_trend ?? [];
                    if (t.length < 2) return null;
                    const W = 200, H = 84;
                    const x = (i: number) => 4 + (i / (t.length - 1)) * (W - 58);
                    const y = (v: number) => H - 10 - (v / ucMax) * (H - 24);
                    return (
                      <div key={c.code} className="bill-facet" onClick={() => pick(c.code)} style={{ cursor: 'pointer' }}>
                        <div className="bill-facet-ttl">{short(c.name)}</div>
                        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
                          <line x1={4} y1={H - 10} x2={W - 54} y2={H - 10} stroke="rgba(14,15,17,.12)" strokeWidth="1" />
                          <polyline points={t.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')} fill="none" stroke="#2a55bf" strokeWidth="1.8" />
                          <circle cx={x(t.length - 1)} cy={y(t.at(-1)!)} r="2.6" fill="#2a55bf" />
                          <text x={x(t.length - 1) + 5} y={y(t.at(-1)!) + 3} fontSize="9" fontFamily="IBM Plex Mono" fill="#15181e">£{Math.round(t.at(-1)!)}m</text>
                          <title>{short(c.name)} UC: £{t[0]}m ({data.uc_years[0]}) → £{t.at(-1)}m ({data.uc_years.at(-1)})</title>
                        </svg>
                        <div className="bill-facet-sub">{data.uc_years[0]}: £{Math.round(t[0])}m → ×{(t.at(-1)! / (t[0] || 1)).toFixed(1)}</div>
                      </div>
                    );
                  })}
                </div>
                </FocusableChart>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted2)', marginTop: 8 }}>
                  The only benefit DWP recalculated this far back onto 2024 boundaries. The 2020/21 step is COVID.
                </div>
              </>
            )}

            {sub === 'map' && (
              <FocusableChart title="Money Map">
                <ConMoneyMap constituencies={cons} onSelect={pick} />
              </FocusableChart>
            )}
          </div>
          <div className="bham-watermark">FORWARD · BIRMINGHAM</div>
        </div>
      </div>

      <div className="rcol">
        {selected ? (
          <ConMoneyDetailPanel constituency={selected} data={data} onClose={() => setSelected(null)} />
        ) : (
          <div className="hb-headline">
            <div className="hb-big">{fmt(data.city.sum_m)}</div>
            <div className="hb-big-sub">DWP money into the 9 constituencies, {data.year} — click any constituency for its full breakdown</div>
            <div className="hb-facts">
              <div className="hb-fact"><span className="hb-fact-k">Most money</span><span className="hb-fact-v">{short(cons[0]?.name ?? '')} — {fmt(cons[0]?.total_m ?? 0)}</span></div>
              <div className="hb-fact"><span className="hb-fact-k">Least</span><span className="hb-fact-v">{short(cons.at(-1)?.name ?? '')} — {fmt(cons.at(-1)?.total_m ?? 0)}</span></div>
              <div className="hb-fact"><span className="hb-fact-k">Geography</span><span className="hb-fact-v" style={{ color: 'var(--herald-red)' }}>Constituency — no ward £ exists</span></div>
            </div>
            <div className="hb-sources">
              <div className="hb-sources-ttl">Source</div>
              {data.sources.map((s, i) => (
                <div key={i} className="hb-src">
                  <a href={s.catalogueUrl} target="_blank" rel="noopener noreferrer">{s.label}</a>
                  <span className="hb-src-meta">{s.publisher} · {s.licence} · {s.as_of}</span>
                </div>
              ))}
              <a href="/sources" className="hb-sources-all">All sources &amp; methods →</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
