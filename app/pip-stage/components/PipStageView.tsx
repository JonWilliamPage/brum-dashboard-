'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { PipPlaceData } from '@/lib/types';
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
  if (m >= 1000) return `£${(m / 1000).toFixed(2)}bn`;
  return `£${m.toFixed(m < 10 ? 1 : 0)}m`;
}

export default function PipStageView({ data }: { data: PipPlaceData }) {
  const [ti, setTi] = useState(Math.max(0, data.months.length - 1));
  const [playing, setPlaying] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);

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
    }, 380);
    return () => clearInterval(id);
  }, [playing, data.months.length]);

  const maxCount = useMemo(
    () => Math.max(...data.wards.flatMap((w) => w.series.filter((v): v is number => v != null)), 1),
    [data.wards]
  );

  const frame = data.wards.map((w) => ({
    ward_code: w.ward_code,
    ward_name: w.ward_name,
    value: w.series[ti] ?? null,
  }));

  const cityNow = data.city.series[ti] ?? null;
  const selected = data.wards.find((w) => w.ward_code === sel);
  const mix = data.category_mix?.latest || [];
  const mixTotal = mix.reduce((s, c) => s + (c.count ?? 0), 0) || 1;
  const billPip = (data.city.bill_pip || []).filter((r) => r.pip_m > 0);
  const gb = data.gb_conditions;

  const rank = useMemo(() => {
    if (!selected) return null;
    const vals = data.wards
      .map((w) => ({ code: w.ward_code, v: w.series[ti] ?? null }))
      .filter((x) => x.v != null)
      .sort((a, b) => (b.v as number) - (a.v as number));
    const i = vals.findIndex((x) => x.code === selected.ward_code);
    return i >= 0 ? i + 1 : null;
  }, [selected, data.wards, ti]);

  return (
    <div className="body stage-layout">
      <div className="lcol stage-lcol">
        <StageExplainer
          title="What you’re looking at"
          body="Birmingham’s 69 wards as solid 3D blocks. Taller / darker = more people with a PIP award that quarter. Hover for name and count; click for a ward breakdown; ▶ Play (or scrub) from 2019 onward; drag to orbit · scroll to zoom."
          metricNote="Heights are Stat-Xplore case counts, not £ by ward. City PIP £ and Great Britain condition £ are on the right — condition money has no LA split."
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
            style={{ flex: 1, accentColor: '#b01225' }}
          />
          <span className="wx-month">{data.months[ti]}</span>
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
            max={maxCount}
            selected={sel}
            onSelect={setSel}
            unitLabel="PIP cases"
            autoRotate={autoRotate && !playing}
            maxHeight={3.0}
          />
        </div>
      </div>

      <div className="rcol">
        <div className="hb-headline">
          <div className="hb-big" style={{ color: '#b01225' }}>
            {fmt(cityNow)}
          </div>
          <div className="hb-big-sub">PIP cases · 3D stage · {data.months[ti]}</div>
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
                <span className="hb-fact-v">{fmtM(gb.gb_total_real_latest)}</span>
              </div>
            )}
            {mix[0] && (
              <div className="hb-fact">
                <span className="hb-fact-k">Top Bham category</span>
                <span className="hb-fact-v">
                  {mix[0].name} · {fmt(mix[0].count)} ({(((mix[0].count ?? 0) / mixTotal) * 100).toFixed(0)}%)
                </span>
              </div>
            )}
            {gb?.categories && (
              <div className="hb-fact">
                <span className="hb-fact-k">GB condition leaders (real £)</span>
                <span className="hb-fact-v" style={{ fontSize: 11, lineHeight: 1.45 }}>
                  {gb.categories.slice(0, 4).map((c) => {
                    const last = c.real?.[c.real.length - 1] ?? 0;
                    return (
                      <span key={c.name} style={{ display: 'block' }}>
                        {c.name}: {fmtM(last)}
                      </span>
                    );
                  })}
                </span>
              </div>
            )}
          </div>

          {selected && (
            <StageWardPanel
              wardName={selected.ward_name}
              wardCode={selected.ward_code}
              monthLabel={data.months[ti]}
              value={selected.series[ti]}
              unitLabel="PIP cases"
              accent="#b01225"
              population={selected.population}
              rank={rank}
              cityTotal={cityNow}
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
          </div>
        </div>
      </div>
    </div>
  );
}
