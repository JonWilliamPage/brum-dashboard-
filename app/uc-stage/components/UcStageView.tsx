'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { UcWeatherData } from '@/lib/types';
import { RAMP } from '@/lib/constants';
import StageExplainer from '../../components/stage/StageExplainer';
import StageWardPanel from '../../components/stage/StageWardPanel';

const WardExtrusionStage = dynamic(() => import('../../components/stage/WardExtrusionStage'), {
  ssr: false,
});

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toLocaleString('en-GB');
}
function fmtM(m: number) {
  return m >= 1000 ? `£${(m / 1000).toFixed(2)}bn` : `£${m.toFixed(0)}m`;
}

export default function UcStageView({ data }: { data: UcWeatherData }) {
  const [ti, setTi] = useState(Math.max(0, data.months.length - 1));
  const [playing, setPlaying] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
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
    }, 220);
    return () => clearInterval(id);
  }, [playing, data.months.length]);

  const maxCount = useMemo(
    () => Math.max(...data.wards.flatMap((w) => w.series.filter((v): v is number => v != null)), 1),
    [data.wards]
  );
  const maxPer = useMemo(() => {
    let m = 1;
    for (const w of data.wards) {
      if (!w.population) continue;
      for (const v of w.series) {
        if (v != null) m = Math.max(m, (v / w.population) * 1000);
      }
    }
    return m;
  }, [data.wards]);

  const frame = data.wards.map((w) => {
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
  const selected = data.wards.find((w) => w.ward_code === sel);

  const rank = useMemo(() => {
    if (!selected) return null;
    const vals = data.wards
      .map((w) => ({
        code: w.ward_code,
        v:
          metric === 'count'
            ? w.series[ti]
            : w.series[ti] != null && w.population
              ? (w.series[ti]! / w.population) * 1000
              : null,
      }))
      .filter((x) => x.v != null)
      .sort((a, b) => (b.v as number) - (a.v as number));
    const i = vals.findIndex((x) => x.code === selected.ward_code);
    return i >= 0 ? i + 1 : null;
  }, [selected, data.wards, ti, metric]);

  return (
    <div className="body stage-layout">
      <div className="lcol stage-lcol">
        <StageExplainer
          title="What you’re looking at"
          body="Birmingham’s 69 wards as solid 3D blocks. Taller / darker = more people on Universal Credit that month. Hover for name and count; click for a ward breakdown; ▶ Play (or scrub) walks through time; drag to orbit · scroll to zoom."
          metricNote="Block height = Stat-Xplore caseload, not £ spent in the ward. City UC spend on the right is the official LA figure."
        />

        <div className="wx-toolbar stage-toolbar">
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
            ↺
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
            style={{ flex: 1, accentColor: '#2a55bf' }}
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
            /1k
          </button>
          <button
            className={`sub-tab${autoRotate ? ' active' : ''}`}
            type="button"
            onClick={() => setAutoRotate((a) => !a)}
          >
            spin
          </button>
        </div>

        <div className="stage-viewport">
          <WardExtrusionStage
            wards={frame}
            max={metric === 'count' ? maxCount : maxPer}
            selected={sel}
            onSelect={setSel}
            unitLabel={metric === 'count' ? 'on UC' : 'per 1,000'}
            autoRotate={autoRotate && !playing}
            maxHeight={metric === 'count' ? 2.9 : 3.0}
          />
        </div>
      </div>

      <div className="rcol">
        <div className="hb-headline">
          <div className="hb-big" style={{ color: '#2a55bf' }}>
            {fmt(cityNow)}
          </div>
          <div className="hb-big-sub">UC caseload · 3D stage · {data.months[ti]}</div>

          <p className="stage-honesty">
            <strong>UC only — not all benefits.</strong> Early totals (e.g. {data.months[0]} ·{' '}
            {fmt(data.city.first)}) are small because Universal Credit was still rolling out; most
            people were on legacy benefits. Growth to {fmt(data.city.latest)} is rollout + migration
            onto UC (Stat-Xplore ward sum).
          </p>

          <div className="hb-facts">
            <div className="hb-fact">
              <span className="hb-fact-k">Series</span>
              <span className="hb-fact-v">
                {data.months[0]} → {data.months.at(-1)} · {data.months.length} frames
              </span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">City change</span>
              <span className="hb-fact-v">
                {fmt(data.city.first)} → {fmt(data.city.latest)}
                {data.city.delta != null ? ` · +${fmt(data.city.delta)}` : ''}
              </span>
            </div>
            {data.city.bill_uc?.at(-1) && (
              <div className="hb-fact">
                <span className="hb-fact-k">UC spend (LA accounts)</span>
                <span className="hb-fact-v">
                  {fmtM(data.city.bill_uc.at(-1)!.uc_m)} · {data.city.bill_uc.at(-1)!.year}
                </span>
              </div>
            )}
            <div className="hb-fact">
              <span className="hb-fact-k">Ramp</span>
              <span className="hb-fact-v" style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                {RAMP.map((c, i) => (
                  <i key={i} style={{ width: 10, height: 10, background: c, display: 'inline-block' }} />
                ))}
              </span>
            </div>
          </div>

          {selected && (
            <StageWardPanel
              wardName={selected.ward_name}
              wardCode={selected.ward_code}
              monthLabel={data.months[ti]}
              value={
                metric === 'count'
                  ? selected.series[ti]
                  : selected.series[ti] != null && selected.population
                    ? Math.round((selected.series[ti]! / selected.population) * 1000 * 10) / 10
                    : null
              }
              unitLabel={metric === 'count' ? 'on UC' : 'per 1,000'}
              accent="#2a55bf"
              population={selected.population}
              rank={rank}
              cityTotal={metric === 'count' ? cityNow : null}
              series={selected.series}
              first={selected.first}
              firstMonth={selected.first_month}
              latest={selected.latest}
              onClear={() => setSel(null)}
            />
          )}
          {!selected && (
            <p className="stage-honesty" style={{ borderLeftColor: 'var(--border2)' }}>
              Click a ward on the stage for a tile breakdown.
            </p>
          )}

          <div className="hb-sources">
            <div className="hb-sources-ttl">Sources</div>
            {(data.sources || []).slice(0, 4).map((s, i) => (
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
              All sources →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
