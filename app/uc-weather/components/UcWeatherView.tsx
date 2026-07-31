'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { UcWeatherData } from '@/lib/types';
import ScoringNote from '../../components/brand/ScoringNote';
import { RAMP } from '@/lib/constants';

const PlayableWardMap = dynamic(() => import('../../components/maps/PlayableWardMap'), { ssr: false });

type Sub = 'play' | 'growth' | 'city' | 'table';

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toLocaleString('en-GB');
}
function fmtM(m: number) {
  return m >= 1000 ? `£${(m / 1000).toFixed(2)}bn` : `£${m.toFixed(0)}m`;
}

export default function UcWeatherView({ data }: { data: UcWeatherData }) {
  const [sub, setSub] = useState<Sub>('play');
  const [ti, setTi] = useState(Math.max(0, data.months.length - 1));
  const [playing, setPlaying] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [metric, setMetric] = useState<'count' | 'per1000'>('count');

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
    }, 280);
    return () => clearInterval(id);
  }, [playing, data.months.length]);

  const maxCount = useMemo(
    () => Math.max(...data.wards.flatMap((w) => w.series.filter((v): v is number => v != null)), 1),
    [data.wards]
  );
  const maxPer = useMemo(() => {
    return Math.max(
      ...data.wards.map((w) => {
        if (!w.population) return 0;
        return Math.max(
          ...w.series.map((v) => (v != null ? (v / w.population!) * 1000 : 0))
        );
      }),
      1
    );
  }, [data.wards]);

  const frameWards = data.wards.map((w) => {
    const count = w.series[ti] ?? null;
    const per =
      count != null && w.population ? Math.round((count / w.population) * 1000 * 10) / 10 : null;
    return {
      ward_code: w.ward_code,
      ward_name: w.ward_name,
      value: metric === 'count' ? count : per,
    };
  });

  const cityNow = data.city.series[ti] ?? null;
  const selected = data.wards.find((w) => w.ward_code === sel) ?? data.wards[0];
  const growth = [...data.wards]
    .filter((w) => w.delta != null)
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));

  return (
    <div className="body">
      <div className="lcol">
        <div className="hb-nowward" role="note">
          <span className="hb-nowward-tag">◇ WARD CASELOAD (STAT-XPLORE) · CITY £ FROM LA ACCOUNTS</span>
          <p>
            Map shows <strong>people on Universal Credit</strong> by the 69 official wards over time
            (administrative counts from DWP Stat-Xplore). <strong>No ward-level £ outturn exists</strong> —
            Birmingham&apos;s real UC spend is the local-authority line in the DWP expenditure tables
            (shown under City £). Per-1,000 uses ONS mid-2024 population (derived, labelled).
          </p>
        </div>

        <ScoringNote label="What the play head is doing">
          Scrub or press play to walk every month from {data.months[0]} → {data.months.at(-1)}. Colour is
          the signed-off ink ramp by intensity. Growth ranks use first non-null month → latest — not
          fraud, just caseload change.
        </ScoringNote>

        <div className="sub-tab-bar">
          {(
            [
              ['play', 'Play map'],
              ['growth', 'Growth'],
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
          <div className="panel-body" style={{ padding: sub === 'play' ? 0 : '14px 16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {sub === 'play' && (
              <>
                <div className="wx-toolbar">
                  <button className="refresh-btn" onClick={() => setPlaying((p) => !p)} type="button">
                    {playing ? '❚❚ Pause' : '▶ Play'}
                  </button>
                  <button className="refresh-btn" type="button" onClick={() => { setPlaying(false); setTi(0); }}>
                    ↺ Start
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={data.months.length - 1}
                    value={ti}
                    onChange={(e) => { setPlaying(false); setTi(Number(e.target.value)); }}
                    style={{ flex: 1, accentColor: 'var(--herald-navy)' }}
                  />
                  <span className="wx-month">{data.months[ti]}</span>
                  <button
                    className={`sub-tab${metric === 'count' ? ' active' : ''}`}
                    type="button"
                    onClick={() => setMetric('count')}
                  >
                    count
                  </button>
                  <button
                    className={`sub-tab${metric === 'per1000' ? ' active' : ''}`}
                    type="button"
                    onClick={() => setMetric('per1000')}
                  >
                    /1,000
                  </button>
                </div>
                <div className="wx-legend">
                  <span className="llbl">Lower</span>
                  {RAMP.map((c, i) => (
                    <div key={i} className="lsw" style={{ background: c }} />
                  ))}
                  <span className="llbl">Higher · {metric === 'count' ? 'claimants' : 'per 1,000 residents'}</span>
                  <span className="llbl" style={{ marginLeft: 'auto' }}>
                    City this month: <strong>{fmt(cityNow)}</strong>
                  </span>
                </div>
                <div style={{ flex: 1, minHeight: 380 }}>
                  <PlayableWardMap
                    wards={frameWards}
                    max={metric === 'count' ? maxCount : maxPer}
                    unitLabel={metric === 'count' ? 'on UC' : 'per 1,000'}
                    onSelect={setSel}
                    selected={sel}
                  />
                </div>
              </>
            )}

            {sub === 'growth' && (
              <>
                <div className="bill-sec-ttl">
                  Biggest caseload increases · {data.months[0]} → {data.months.at(-1)}
                </div>
                {growth.slice(0, 20).map((w, i) => (
                  <button
                    key={w.ward_code}
                    type="button"
                    className={`wp-row${sel === w.ward_code ? ' is-sel' : ''}`}
                    onClick={() => setSel(w.ward_code)}
                  >
                    <div className="wp-row-name">
                      <span style={{ color: 'var(--muted)', marginRight: 6 }}>#{i + 1}</span>
                      {w.ward_name}
                    </div>
                    <div className="wp-row-track">
                      <div
                        className="wp-row-bar"
                        style={{
                          width: `${((w.delta ?? 0) / (growth[0]?.delta || 1)) * 100}%`,
                          background: '#b01225',
                        }}
                      />
                      <span className="wp-row-val">
                        +{fmt(w.delta)} · {fmt(w.first)} → {fmt(w.latest)}
                      </span>
                    </div>
                  </button>
                ))}
              </>
            )}

            {sub === 'city' && (
              <>
                <div className="bill-sec-ttl">People on UC in Birmingham (sum of 69 wards)</div>
                <CitySpark labels={data.months} series={data.city.series} />
                <div className="bill-sec-ttl" style={{ marginTop: 22 }}>
                  Real UC expenditure in Birmingham (LA accounts, £m nominal)
                </div>
                <p className="wp-caption">
                  These £ figures are official DWP local-authority outturn — not derived from the ward map.
                  UC begins mid-series in the accounts.
                </p>
                {(data.city.bill_uc || []).map((r) => (
                  <div key={r.year} className="hb-row" style={{ padding: '5px 0' }}>
                    <div className="hb-name" style={{ fontSize: 13 }}>{r.year}</div>
                    <div className="hb-track" style={{ height: 18 }}>
                      <div
                        className="hb-bar"
                        style={{
                          height: 18,
                          width: `${(r.uc_m / Math.max(...data.city.bill_uc.map((x) => x.uc_m), 1)) * 100}%`,
                          background: '#2a55bf',
                        }}
                      />
                      <span className="hb-val">{fmtM(r.uc_m)}</span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {sub === 'table' && (
              <div className="tbl-wrap" style={{ maxHeight: '100%' }}>
                <table className="data-tbl">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Ward</th>
                      <th>Latest</th>
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
                        <td style={{ color: (w.delta ?? 0) > 0 ? '#b01225' : undefined }}>
                          {w.delta != null ? (w.delta > 0 ? '+' : '') + fmt(w.delta) : '—'}
                        </td>
                        <td>{w.per_1000 ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="bham-watermark">FORWARD · BIRMINGHAM</div>
        </div>
      </div>

      <div className="rcol">
        <div className="hb-headline">
          <div className="hb-big" style={{ color: '#2a55bf' }}>{fmt(cityNow)}</div>
          <div className="hb-big-sub">
            People on Universal Credit · Birmingham wards · {data.months[ti]}
          </div>
          <div className="hb-facts">
            <div className="hb-fact">
              <span className="hb-fact-k">Series</span>
              <span className="hb-fact-v">
                {data.months[0]} → {data.months.at(-1)} · {data.months.length} months
              </span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">City change</span>
              <span className="hb-fact-v">
                {fmt(data.city.first)} → {fmt(data.city.latest)}
                {data.city.delta != null ? ` · +${fmt(data.city.delta)}` : ''}
              </span>
            </div>
            {data.city.bill_uc?.length > 0 && (
              <div className="hb-fact">
                <span className="hb-fact-k">UC spend (LA, latest year)</span>
                <span className="hb-fact-v">
                  {fmtM(data.city.bill_uc.at(-1)!.uc_m)} · {data.city.bill_uc.at(-1)!.year}
                </span>
              </div>
            )}
            {selected && (
              <div className="hb-fact">
                <span className="hb-fact-k">{selected.ward_name}</span>
                <span className="hb-fact-v">
                  {fmt(selected.series[ti])} this frame · latest {fmt(selected.latest)} · Δ{' '}
                  {selected.delta != null ? `+${fmt(selected.delta)}` : '—'}
                </span>
                <WardMini series={selected.series} />
              </div>
            )}
            <div className="hb-fact">
              <span className="hb-fact-k">Geography</span>
              <span className="hb-fact-v" style={{ color: 'var(--herald-red)' }}>
                Ward caseload · city £ is LA-only
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

function CitySpark({ labels, series }: { labels: string[]; series: (number | null)[] }) {
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
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }}>
      <path d={path} fill="none" stroke="#2a55bf" strokeWidth="2" />
      <text x="4" y="12" fontSize="10" fill="#6b6760" fontFamily="var(--mono)">
        {fmt(max)}
      </text>
      <text x="4" y={H - 4} fontSize="10" fill="#6b6760" fontFamily="var(--mono)">
        {labels[0]} → {labels.at(-1)} · {fmt(min)}–{fmt(max)}
      </text>
    </svg>
  );
}

function WardMini({ series }: { series: (number | null)[] }) {
  const pts = series.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v != null);
  if (pts.length < 2) return null;
  const max = Math.max(...pts.map((p) => p.v), 1);
  const W = 200;
  const H = 36;
  const path = pts
    .map((p) => `${(p.i / (series.length - 1)) * W},${H - 2 - (p.v / max) * (H - 4)}`)
    .join(' ');
  return (
    <svg width={W} height={H} style={{ display: 'block', marginTop: 6 }} aria-hidden>
      <polyline points={path} fill="none" stroke="#2a55bf" strokeWidth="1.5" />
    </svg>
  );
}
