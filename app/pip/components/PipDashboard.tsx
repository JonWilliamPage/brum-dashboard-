'use client';

import { useState } from 'react';
import type { PipData } from '@/lib/types';
import PipStream from './PipStream';
import PipBump from './PipBump';
import FocusableChart from '../../components/FocusableChart';

// THE shared dashboard body — rendered identically in /review and Dashboards.
// GB-level deep dive into what PIP pays for, by diagnosis. Views per the research:
// River (streamgraph), League Table (bump), Mix Shift (share dumbbells), Who (WA/PA
// paired bars), Conditions (granular drill-down table).
type Sub = 'river' | 'league' | 'mix' | 'who' | 'conditions';

const fmt = (m: number) => (m >= 1000 ? `£${(m / 1000).toFixed(2)}bn` : `£${Math.round(m)}m`);

function Spark({ series }: { series: (number | null)[] }) {
  const pts = series.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v != null);
  if (pts.length < 2) return null;
  const max = Math.max(...pts.map(p => p.v), 1);
  const W = 64, H = 18;
  const path = pts.map(p => `${(p.i / (series.length - 1)) * W},${H - 2 - (p.v / max) * (H - 4)}`).join(' ');
  return <svg width={W} height={H} style={{ display: 'block' }} aria-hidden="true"><polyline points={path} fill="none" stroke="#b01225" strokeWidth="1.4" /></svg>;
}

export default function PipDashboard({ data }: { data: PipData }) {
  const [sub, setSub] = useState<Sub>('river');
  const [mode, setMode] = useState<'real' | 'nominal'>('real');
  const years = data.years;
  const last = years.length - 1;
  const BASE = 3;   // 2016/17 — after the launch ramp; growth vs 2013/14 is meaningless (near-zero base)
  const cats = data.categories;
  const total = data.gb_total_real_latest;

  // Mix shift: each category's SHARE of PIP, base year vs latest (controls for growth)
  const totalAt = (t: number) => cats.reduce((s, c) => s + (c.real[t] ?? 0), 0);
  const baseTotal = totalAt(BASE);
  const mixRows = cats.slice(0, 12).map(c => ({
    name: c.name,
    s0: baseTotal ? ((c.real[BASE] ?? 0) / baseTotal) * 100 : 0,
    s1: total ? ((c.real[last] ?? 0) / total) * 100 : 0,
  })).sort((a, b) => b.s1 - a.s1);
  const mixMax = Math.max(...mixRows.flatMap(r => [r.s0, r.s1]), 1) * 1.1;

  const whoRows = cats.slice(0, 10).map(c => ({
    name: c.name,
    wa: c.wa_real?.[last] ?? null,
    pa: c.pa_real?.[last] ?? null,
  }));
  const whoMax = Math.max(...whoRows.flatMap(r => [r.wa ?? 0, r.pa ?? 0]), 1);

  return (
    <div className="body">
      <div className="lcol">
        <div className="hb-nowward" role="note">
          <span className="hb-nowward-tag">◇ GREAT BRITAIN FIGURE — ACTUAL DWP ACCOUNTS BY DIAGNOSIS</span>
          <p>
            PIP expenditure by the claimant&apos;s main medical condition, {years[0]} → {years[last]} (PIP&apos;s
            whole lifetime). <strong>No sub-national £-by-condition exists</strong> — DWP publishes this for
            Great Britain only; Birmingham&apos;s real total ({data.birmingham_pip_m != null ? `£${data.birmingham_pip_m.toFixed(0)}m/yr` : '—'})
            is shown as context, never split locally. Real terms = 2025/26 prices. Validated: category sum
            matches the by-LA workbook&apos;s GB PIP row to 0.0%.
          </p>
        </div>

        <div className="sub-tab-bar">
          {([['river', 'The River'], ['league', 'League Table'], ['mix', 'Mix Shift'], ['who', 'Who'], ['conditions', 'Conditions']] as [Sub, string][]).map(([s, lbl]) => (
            <button key={s} className={`sub-tab${sub === s ? ' active' : ''}`} onClick={() => setSub(s)}>{lbl}</button>
          ))}
          {sub === 'river' && (
            <button className="sub-tab" style={{ marginLeft: 'auto', color: 'var(--herald-navy)' }}
              onClick={() => setMode(m => (m === 'real' ? 'nominal' : 'real'))}>
              ⇄ {mode === 'real' ? 'real (25/26 £)' : 'nominal £'}
            </button>
          )}
        </div>

        <div className="panel" style={{ flex: 1, position: 'relative' }}>
          <div className="panel-body" style={{ padding: '14px 16px' }}>

            {sub === 'river' && (
              <FocusableChart title="PIP Spend River">
                <PipStream data={data} mode={mode} />
              </FocusableChart>
            )}
            {sub === 'league' && (
              <FocusableChart title="PIP League Table">
                <PipBump data={data} />
              </FocusableChart>
            )}

            {sub === 'mix' && (
              <>
                <div className="bill-sec-ttl">Each category&apos;s share of all PIP money — {years[BASE]} ○ → ● {years[last]} (real terms)</div>
                <FocusableChart title="PIP Mix Shift">
                {mixRows.map(r => {
                  const rose = r.s1 > r.s0;
                  const conn = rose ? '#b01225' : '#1a3a2a';
                  return (
                    <div key={r.name} className="hb-row" style={{ padding: '5px 0' }}>
                      <div className="hb-name" style={{ fontSize: 12.5 }}>{r.name}</div>
                      <div className="hb-track" style={{ height: 18, position: 'relative' }}>
                        <svg width="100%" height="18" style={{ position: 'absolute', inset: 0 }}>
                          <line x1={`${(r.s0 / mixMax) * 100}%`} y1="9" x2={`${(r.s1 / mixMax) * 100}%`} y2="9" stroke={conn} strokeWidth="2" opacity="0.55" />
                          <circle cx={`${(r.s0 / mixMax) * 100}%`} cy="9" r="4" fill="#f5f3ee" stroke={conn} strokeWidth="1.6" />
                          <circle cx={`${(r.s1 / mixMax) * 100}%`} cy="9" r="4.5" fill={conn} stroke="#f5f3ee" strokeWidth="1.5" />
                          <title>{r.name}: {r.s0.toFixed(1)}% of PIP in {years[BASE]} → {r.s1.toFixed(1)}% in {years[last]}</title>
                        </svg>
                        <span className="hb-val" style={{ position: 'absolute', right: 0 }}>
                          {r.s0.toFixed(1)}% → {r.s1.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
                </FocusableChart>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted2)', marginTop: 8, lineHeight: 1.6 }}>
                  Share controls for PIP&apos;s overall growth — red = a rising slice of the pot, green = shrinking.
                  Base year {years[BASE]} (after the 2013–16 launch ramp, when every category grew from near zero).
                </div>
              </>
            )}

            {sub === 'who' && (
              <>
                <div className="bill-sec-ttl">Working age vs pension age, {years[last]} (real £)</div>
                <div className="comp-legend">
                  <span><i style={{ background: '#16306f' }} /> working age</span>
                  <span><i style={{ background: '#7d4e36' }} /> pension age</span>
                </div>
                <FocusableChart title="PIP by Age Group">
                {whoRows.map(r => (
                  <div key={r.name} className="hb-row" style={{ padding: '5px 0' }}>
                    <div className="hb-name" style={{ fontSize: 12.5 }}>{r.name}</div>
                    <div>
                      <div className="hb-track" style={{ height: 12 }}>
                        <div className="hb-bar" style={{ height: 12, width: `${((r.wa ?? 0) / whoMax) * 100}%`, background: '#16306f' }} />
                        <span className="hb-val" style={{ fontSize: 10 }}>{r.wa != null ? fmt(r.wa) : '—'}</span>
                      </div>
                      <div className="hb-track" style={{ height: 12, marginTop: 2 }}>
                        <div className="hb-bar" style={{ height: 12, width: `${((r.pa ?? 0) / whoMax) * 100}%`, background: '#7d4e36' }} />
                        <span className="hb-val" style={{ fontSize: 10 }}>{r.pa != null ? fmt(r.pa) : '—'}</span>
                      </div>
                    </div>
                  </div>
                ))}
                </FocusableChart>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted2)', marginTop: 8 }}>
                  Pension-age PIP is claimants who reached pension age while on the benefit (new claims are working-age).
                </div>
              </>
            )}

            {sub === 'conditions' && (
              <FocusableChart title="PIP Conditions Table">
              <div className="crime-table-wrap" style={{ margin: '-14px -16px' }}>
                <table className="data-table">
                  <thead>
                    <tr><th>#</th><th>Condition (granular)</th><th>{years[last]} £ (real)</th><th>Share of PIP</th><th>× since {years[BASE]}</th><th>Path</th></tr>
                  </thead>
                  <tbody>
                    {data.conditions.map((c, i) => {
                      const v = c.real[last] ?? 0;
                      const b = c.real[BASE] ?? 0;
                      return (
                        <tr key={c.name}>
                          <td style={{ color: 'var(--muted2)' }}>{i + 1}</td>
                          <td className="td-ward" style={{ fontFamily: 'var(--sans)', fontWeight: 500 }}>{c.name}</td>
                          <td style={{ fontWeight: 600 }}>{fmt(v)}</td>
                          <td style={{ color: 'var(--muted)' }}>{((v / total) * 100).toFixed(1)}%</td>
                          <td style={{ color: b > 0 && v / b > 4 ? 'var(--herald-red)' : 'var(--ink)' }}>{b > 0 ? `×${(v / b).toFixed(1)}` : '—'}</td>
                          <td><Spark series={c.real} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </FocusableChart>
            )}
          </div>
          <div className="bham-watermark">FORWARD · BIRMINGHAM</div>
        </div>
      </div>

      <div className="rcol">
        <div className="hb-headline">
          <div className="hb-big">{fmt(total)}</div>
          <div className="hb-big-sub">Great Britain PIP spend, {years[last]} (real terms) — up from {fmt(totalAt(BASE))} in {years[BASE]}</div>
          <div className="hb-facts">
            <div className="hb-fact">
              <span className="hb-fact-k">Biggest diagnosis</span>
              <span className="hb-fact-v">{cats[0]?.name} — {fmt(cats[0]?.real[last] ?? 0)} ({(((cats[0]?.real[last] ?? 0) / total) * 100).toFixed(0)}%)</span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">Fastest-growing major</span>
              <span className="hb-fact-v">
                {(() => {
                  const g = cats.filter(c => (c.real[BASE] ?? 0) > 50)
                    .map(c => ({ n: c.name, x: (c.real[last] ?? 0) / (c.real[BASE] ?? 1) }))
                    .sort((a, b) => b.x - a.x)[0];
                  return g ? `${g.n} — ×${g.x.toFixed(1)} since ${years[BASE]}` : '—';
                })()}
              </span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">Birmingham (real anchor)</span>
              <span className="hb-fact-v">{data.birmingham_pip_m != null ? `£${data.birmingham_pip_m.toFixed(0)}m/yr total PIP` : '—'} — no local split by condition exists</span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">Geography</span>
              <span className="hb-fact-v" style={{ color: 'var(--herald-red)' }}>Great Britain — DWP publishes no local £-by-condition</span>
            </div>
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
      </div>
    </div>
  );
}
