'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { PipPlaceData } from '@/lib/types';
import ScoringNote from '../../components/brand/ScoringNote';
import { RAMP } from '@/lib/constants';
import FocusableChart from '../../components/FocusableChart';

const PlayableWardMap = dynamic(() => import('../../components/maps/PlayableWardMap'), { ssr: false });

type Sub = 'play' | 'conditions' | 'mix' | 'city' | 'table';

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toLocaleString('en-GB');
}
function fmtM(m: number) {
  if (m >= 1000) return `£${(m / 1000).toFixed(2)}bn`;
  return `£${m.toFixed(m < 10 ? 1 : 0)}m`;
}

export default function PipPlaceView({ data }: { data: PipPlaceData }) {
  const [sub, setSub] = useState<Sub>('play');
  const [ti, setTi] = useState(Math.max(0, data.months.length - 1));
  const [playing, setPlaying] = useState(false);
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setTi((t) => {
        if (t >= data.months.length - 1) {
          setPlaying(false);
          return t;
        }
        return t + 1;
      });
    }, 420);
    return () => clearInterval(id);
  }, [playing, data.months.length]);

  const maxCount = useMemo(
    () => Math.max(...data.wards.flatMap((w) => w.series.filter((v): v is number => v != null)), 1),
    [data.wards]
  );

  const frameWards = data.wards.map((w) => ({
    ward_code: w.ward_code,
    ward_name: w.ward_name,
    value: w.series[ti] ?? null,
  }));

  const cityNow = data.city.series[ti] ?? null;
  const selected = data.wards.find((w) => w.ward_code === sel) ?? data.wards[0];
  const growth = [...data.wards].filter((w) => w.delta != null).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));

  const gb = data.gb_conditions;
  const gbLast = (gb?.years.length ?? 1) - 1;
  const gbCats = (gb?.categories || []).slice(0, 12);

  const mix = data.category_mix?.latest || [];
  const mixMax = Math.max(...mix.map((c) => c.count ?? 0), 1);
  const mixTotal = mix.reduce((s, c) => s + (c.count ?? 0), 0) || 1;

  const billPip = (data.city.bill_pip || []).filter((r) => r.pip_m != null && r.pip_m > 0);

  return (
    <div className="body">
      <div className="lcol">
        <div className="hb-nowward" role="note">
          <span className="hb-nowward-tag">◇ THREE LAYERS — DON&apos;T CONFUSE THEM</span>
          <p>
            <strong>1. Ward map</strong> = PIP <em>caseload</em> (people with entitlement), Stat-Xplore — not £.
            <br />
            <strong>2. City £</strong> = Birmingham PIP expenditure from DWP LA accounts (real outturn).
            <br />
            <strong>3. Condition £</strong> = Great Britain only (no LA split by diagnosis exists). Birmingham
            diagnosis mix is <em>case counts</em> by reported category — admin labels, not a fraud finding.
          </p>
        </div>

        <ScoringNote label="Reading growth honestly">
          PIP caseload and spend have risen sharply since rollout. That shows scale and composition change.
          It does <strong>not</strong> by itself prove abuse: reported conditions are statistical
          classifications, and national PIP overpayment rates are low versus UC. We show the numbers; you
          judge the story.
        </ScoringNote>

        <div className="sub-tab-bar">
          {(
            [
              ['play', 'Play map'],
              ['conditions', 'GB £ conditions'],
              ['mix', 'Bham mix'],
              ['city', 'City £'],
              ['table', 'Table'],
            ] as [Sub, string][]
          ).map(([s, lbl]) => (
            <button key={s} className={`sub-tab${sub === s ? ' active' : ''}`} onClick={() => setSub(s)}>
              {lbl}
            </button>
          ))}
        </div>

        <div className="panel" style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <div
            className="panel-body"
            style={{
              padding: sub === 'play' ? 0 : '14px 16px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {sub === 'play' && (
              <>
                <div className="wx-toolbar">
                  <button className="refresh-btn" type="button" onClick={() => setPlaying((p) => !p)}>
                    {playing ? '❚❚ Pause' : '▶ Play'}
                  </button>
                  <button
                    className="refresh-btn"
                    type="button"
                    onClick={() => {
                      setPlaying(false);
                      setTi(0);
                    }}
                  >
                    ↺ Start
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={data.months.length - 1}
                    value={ti}
                    onChange={(e) => {
                      setPlaying(false);
                      setTi(Number(e.target.value));
                    }}
                    style={{ flex: 1, accentColor: '#b01225' }}
                  />
                  <span className="wx-month">{data.months[ti]}</span>
                </div>
                <div className="wx-legend">
                  <span className="llbl">Lower</span>
                  {RAMP.map((c, i) => (
                    <div key={i} className="lsw" style={{ background: c }} />
                  ))}
                  <span className="llbl">Higher · PIP cases with entitlement</span>
                  <span className="llbl" style={{ marginLeft: 'auto' }}>
                    City: <strong>{fmt(cityNow)}</strong> cases
                  </span>
                </div>
                <FocusableChart title="PIP Place Map">
                  <div style={{ flex: 1, minHeight: 380 }}>
                    <PlayableWardMap
                      wards={frameWards}
                      max={maxCount}
                      unitLabel="PIP cases"
                      onSelect={setSel}
                      selected={sel}
                    />
                  </div>
                </FocusableChart>
              </>
            )}

            {sub === 'conditions' && gb && (
              <>
                <div className="bill-sec-ttl">
                  GB PIP expenditure by reported condition · real £ · {gb.years[0]} → {gb.years[gbLast]}
                </div>
                <p className="wp-caption">
                  Great Britain accounts only. Sorted by latest real spend. Growth from near-zero launch years
                  is shown as series, not as a single × multiplier from 2013/14.
                </p>
                <FocusableChart title="GB PIP Expenditure by Condition">
                  <GbConditionsBars cats={gbCats} gbLastIdx={gbLast} startYear={gb.years[0]} />
                </FocusableChart>
                <div className="bill-sec-ttl" style={{ marginTop: 16 }}>
                  GB total latest: {fmtM(gb.gb_total_real_latest)} real · Birmingham PIP (LA):{' '}
                  {billPip.at(-1) ? fmtM(billPip.at(-1)!.pip_m) : '—'}
                </div>
              </>
            )}

            {sub === 'mix' && (
              <>
                <div className="bill-sec-ttl">
                  Birmingham PIP caseload by disability category · {data.category_mix?.latest_month} · counts
                </div>
                <p className="wp-caption">
                  Reported main category on the claim (Stat-Xplore). Psychiatric disorders lead the city
                  caseload — same pattern visible in GB £ composition. Not evidence of intent to defraud.
                </p>
                <FocusableChart title="PIP Caseload by Category">
                  {mix.slice(0, 15).map((c) => (
                    <div key={c.name} className="hb-row" style={{ padding: '5px 0' }}>
                      <div className="hb-name" style={{ fontSize: 12.5 }}>{c.name}</div>
                      <div className="hb-track" style={{ height: 18 }}>
                        <div
                          className="hb-bar"
                          style={{
                            height: 18,
                            width: `${((c.count ?? 0) / mixMax) * 100}%`,
                            background: c.name.toLowerCase().includes('psych') ? '#4a3aa7' : '#b01225',
                          }}
                        />
                        <span className="hb-val">
                          {fmt(c.count)} · {(((c.count ?? 0) / mixTotal) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </FocusableChart>
                {data.category_mix?.early?.length > 0 && (
                  <>
                    <div className="bill-sec-ttl" style={{ marginTop: 18 }}>
                      Same mix at series start · {data.category_mix.early_month}
                    </div>
                    {[...data.category_mix.early]
                      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
                      .slice(0, 8)
                      .map((c) => (
                        <div key={c.name} className="hb-row" style={{ padding: '4px 0' }}>
                          <div className="hb-name" style={{ fontSize: 12 }}>{c.name}</div>
                          <div className="hb-track" style={{ height: 14 }}>
                            <span className="hb-val">{fmt(c.count)}</span>
                          </div>
                        </div>
                      ))}
                  </>
                )}
              </>
            )}

            {sub === 'city' && (
              <>
                <div className="bill-sec-ttl">PIP cases in Birmingham (sum of 69 wards, quarterly)</div>
                <FocusableChart title="PIP Cases in Birmingham">
                  <CityLine labels={data.months} series={data.city.series} color="#b01225" />
                </FocusableChart>
                <div className="bill-sec-ttl" style={{ marginTop: 20 }}>
                  Real PIP expenditure · Birmingham LA · £m nominal
                </div>
                <FocusableChart title="Real PIP Expenditure">
                  {billPip.map((r) => (
                    <div key={r.year} className="hb-row" style={{ padding: '5px 0' }}>
                      <div className="hb-name" style={{ fontSize: 13 }}>{r.year}</div>
                      <div className="hb-track" style={{ height: 18 }}>
                        <div
                          className="hb-bar"
                          style={{
                            height: 18,
                            width: `${(r.pip_m / Math.max(...billPip.map((x) => x.pip_m), 1)) * 100}%`,
                            background: '#b01225',
                          }}
                        />
                        <span className="hb-val">{fmtM(r.pip_m)}</span>
                      </div>
                    </div>
                  ))}
                </FocusableChart>
                <div className="bill-sec-ttl" style={{ marginTop: 18 }}>
                  Fastest ward caseload growth
                </div>
                <FocusableChart title="Fastest Ward Caseload Growth">
                  {growth.slice(0, 12).map((w, i) => (
                    <div key={w.ward_code} className="hb-row" style={{ padding: '4px 0' }}>
                      <div className="hb-name" style={{ fontSize: 12.5 }}>
                        #{i + 1} {w.ward_name}
                      </div>
                      <div className="hb-track">
                        <span className="hb-val">
                          +{fmt(w.delta)} · {fmt(w.first)} → {fmt(w.latest)}
                        </span>
                      </div>
                    </div>
                  ))}
                </FocusableChart>
              </>
            )}

            {sub === 'table' && (
              <FocusableChart title="PIP Place Table">
              <div className="tbl-wrap" style={{ maxHeight: '100%' }}>
                <table className="data-tbl">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Ward</th>
                      <th>Latest cases</th>
                      <th>First</th>
                      <th>Δ</th>
                      <th>Per 1,000</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.wards.map((w, i) => (
                      <tr
                        key={w.ward_code}
                        className={sel === w.ward_code ? 'row-selected' : ''}
                        onClick={() => setSel(w.ward_code)}
                      >
                        <td className="rank-cell">{i + 1}</td>
                        <td className="name-cell">{w.ward_name}</td>
                        <td>{fmt(w.latest)}</td>
                        <td>{fmt(w.first)}</td>
                        <td style={{ color: '#b01225' }}>{w.delta != null ? `+${fmt(w.delta)}` : '—'}</td>
                        <td>{w.per_1000 ?? '—'}</td>
                      </tr>
                    ))}
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
          <div className="hb-big" style={{ color: '#b01225' }}>{fmt(cityNow)}</div>
          <div className="hb-big-sub">
            PIP cases with entitlement · Birmingham · {data.months[ti]}
          </div>
          <div className="hb-facts">
            <div className="hb-fact">
              <span className="hb-fact-k">Caseload change</span>
              <span className="hb-fact-v">
                {fmt(data.city.first)} → {fmt(data.city.latest)}
                {data.city.delta != null ? ` · +${fmt(data.city.delta)}` : ''}
              </span>
            </div>
            {billPip.at(-1) && (
              <div className="hb-fact">
                <span className="hb-fact-k">City PIP spend (LA)</span>
                <span className="hb-fact-v">
                  {fmtM(billPip.at(-1)!.pip_m)} · {billPip.at(-1)!.year}
                </span>
              </div>
            )}
            {gb && (
              <div className="hb-fact">
                <span className="hb-fact-k">GB PIP (real)</span>
                <span className="hb-fact-v">{fmtM(gb.gb_total_real_latest)} latest</span>
              </div>
            )}
            {mix[0] && (
              <div className="hb-fact">
                <span className="hb-fact-k">Top Bham category</span>
                <span className="hb-fact-v">
                  {mix[0].name} · {fmt(mix[0].count)} (
                  {(((mix[0].count ?? 0) / mixTotal) * 100).toFixed(0)}%)
                </span>
              </div>
            )}
            {selected && (
              <div className="hb-fact">
                <span className="hb-fact-k">{selected.ward_name}</span>
                <span className="hb-fact-v">
                  {fmt(selected.series[ti])} this frame · Δ +{fmt(selected.delta)}
                </span>
              </div>
            )}
            <div className="hb-fact">
              <span className="hb-fact-k">Not shown</span>
              <span className="hb-fact-v" style={{ color: 'var(--herald-red)' }}>
                Ward £ · LA £-by-ADHD · local fraud rates
              </span>
            </div>
          </div>
          <div className="hb-sources">
            <div className="hb-sources-ttl">Sources</div>
            {(data.sources || []).map((s, i) => (
              <div key={i} className="hb-src">
                <a href={s.catalogueUrl} target="_blank" rel="noopener noreferrer">
                  {s.label}
                </a>
                <span className="hb-src-meta">
                  {s.publisher} · {s.as_of}
                </span>
              </div>
            ))}
            <a href="/sources" className="hb-sources-all">
              All sources &amp; methods →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Real Chart.js horizontal bars for GB PIP spend by condition — the hand-rolled
// div/CSS "bars" read as a plain numbers list rather than an actual chart, and
// didn't leave room to print each condition's £ value legibly. This draws the
// value directly at the end of each bar via a small canvas plugin (same
// lightweight-custom-plugin pattern used elsewhere in this codebase, e.g. the
// scrub-line plugin on BillHistoryChart) instead of pulling in a labels library.
function GbConditionsBars({ cats, gbLastIdx, startYear }: { cats: { name: string; real: (number | null)[] }[]; gbLastIdx: number; startYear: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<{ destroy: () => void } | null>(null);
  const values = cats.map(c => c.real?.[gbLastIdx] ?? 0);
  const startValues = cats.map(c => c.real?.[0] ?? null);

  useEffect(() => {
    let ch: { destroy: () => void } | null = null;

    async function init() {
      const { Chart } = await import('chart.js/auto');
      if (!canvasRef.current) return;
      if (chartRef.current) chartRef.current.destroy();

      const valueLabelPlugin = {
        id: 'gbConditionValueLabel',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        afterDatasetsDraw(chart: any) {
          const { ctx } = chart;
          const meta = chart.getDatasetMeta(0);
          ctx.save();
          ctx.font = '600 10px IBM Plex Mono, monospace';
          ctx.fillStyle = '#15181e';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          meta.data.forEach((bar: any, i: number) => {
            ctx.fillText(fmtM(values[i]), bar.x + 6, bar.y);
          });
          ctx.restore();
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ch = new Chart(canvasRef.current, {
        type: 'bar',
        data: {
          // Chart.js renders an array label as multiple lines per tick — name on
          // top, starting-point £ underneath, so the growth context sits right
          // next to the condition rather than needing a hover to find it.
          labels: cats.map((c, i) => [
            c.name,
            startValues[i] != null ? `from ${fmtM(startValues[i]!)} in ${startYear}` : `no ${startYear} baseline`,
          ]),
          datasets: [{ data: values, backgroundColor: '#b01225', borderWidth: 0, barThickness: 16 }],
        },
        plugins: [valueLabelPlugin],
        options: {
          indexAxis: 'y' as const,
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { right: 70 } },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0e0f11', titleColor: '#fff', bodyColor: '#e5e3df', borderWidth: 0, padding: 8,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              callbacks: { label: (c: any) => ` ${fmtM(c.parsed.x)}` },
            },
          },
          scales: {
            x: { display: false },
            y: { grid: { display: false }, ticks: { color: '#15181e', font: { size: 10.5, family: 'Public Sans, sans-serif' } } },
          },
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      chartRef.current = ch;
    }

    init();
    return () => { if (ch) ch.destroy(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cats, gbLastIdx, startYear]);

  const h = Math.max(280, cats.length * 38);
  return (
    <div className="chart-canvas-wrap" style={{ height: h, position: 'relative' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

function CityLine({
  labels,
  series,
  color,
}: {
  labels: string[];
  series: (number | null)[];
  color: string;
}) {
  const pts = series.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v != null);
  if (pts.length < 2) return null;
  const max = Math.max(...pts.map((p) => p.v), 1);
  const min = Math.min(...pts.map((p) => p.v));
  const W = 640;
  const H = 120;
  const path = pts
    .map((p, idx) => {
      const x = (p.i / (series.length - 1)) * (W - 8) + 4;
      const y = H - 16 - ((p.v - min) / (max - min || 1)) * (H - 28);
      return `${idx === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');
  return (
    <div className="chart-canvas-wrap" style={{ height: H }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        <path d={path} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <text x="4" y={H - 4} fontSize="10" fill="#6b6760" fontFamily="var(--mono)">
          {labels[0]} → {labels.at(-1)} · {fmt(min)}–{fmt(max)} cases
        </text>
      </svg>
    </div>
  );
}
