'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { OzzyStageData } from '@/lib/types';
import { RAMP } from '@/lib/constants';
import StageExplainer from '../../components/stage/StageExplainer';
import StageWardPanel from '../../components/stage/StageWardPanel';

const WardExtrusionStage = dynamic(() => import('../../components/stage/WardExtrusionStage'), {
  ssr: false,
});

type Layer = 'uc' | 'pip';

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toLocaleString('en-GB');
}
function fmtM(m: number) {
  if (m >= 1000) return `£${(m / 1000).toFixed(2)}bn`;
  return `£${m.toFixed(0)}m`;
}

export default function OzzyStageView({ data }: { data: OzzyStageData }) {
  const [layer, setLayer] = useState<Layer>('uc');
  const months = layer === 'uc' ? data.uc.months : data.pip.months;
  const [ti, setTi] = useState(Math.max(0, months.length - 1));
  const [playing, setPlaying] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);

  useEffect(() => {
    setPlaying(false);
    setTi(Math.max(0, months.length - 1));
  }, [layer, months.length]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setTi((t) => {
        if (t >= months.length - 1) {
          setPlaying(false);
          return t;
        }
        return t + 1;
      });
    }, layer === 'uc' ? 200 : 360);
    return () => clearInterval(id);
  }, [playing, months.length, layer]);

  const max = useMemo(() => {
    let m = 1;
    for (const w of data.wards) {
      const series = layer === 'uc' ? w.uc_series : w.pip_series;
      if (!series) continue;
      for (const v of series) if (v != null) m = Math.max(m, v);
    }
    return m;
  }, [data.wards, layer]);

  const frame = data.wards.map((w) => {
    const series = layer === 'uc' ? w.uc_series : w.pip_series;
    return {
      ward_code: w.ward_code,
      ward_name: w.ward_name,
      value: series?.[ti] ?? null,
    };
  });

  const citySeries = layer === 'uc' ? data.uc.city.series : data.pip.city.series;
  const cityNow = citySeries[ti] ?? null;
  const selected = data.wards.find((w) => w.ward_code === sel);
  const accent = layer === 'uc' ? '#2a55bf' : '#b01225';

  const bill =
    layer === 'uc'
      ? data.uc.city.bill_uc?.at(-1)
      : data.pip.city.bill_pip?.filter((b) => b.pip_m > 0).at(-1);

  const rank = useMemo(() => {
    if (!selected) return null;
    const vals = data.wards
      .map((w) => {
        const series = layer === 'uc' ? w.uc_series : w.pip_series;
        return { code: w.ward_code, v: series?.[ti] ?? null };
      })
      .filter((x) => x.v != null)
      .sort((a, b) => (b.v as number) - (a.v as number));
    const i = vals.findIndex((x) => x.code === selected.ward_code);
    return i >= 0 ? i + 1 : null;
  }, [selected, data.wards, layer, ti]);

  const selSeries = selected
    ? layer === 'uc'
      ? selected.uc_series
      : selected.pip_series
    : null;
  const selValue = selSeries?.[ti] ?? null;
  const selFirst = useMemo(() => {
    if (!selSeries) return { v: null as number | null, m: null as string | null };
    const idx = selSeries.findIndex((v) => v != null);
    return { v: idx >= 0 ? selSeries[idx] : null, m: idx >= 0 ? months[idx] ?? null : null };
  }, [selSeries, months]);

  const ucNow =
    selected?.uc_series?.[Math.min(ti, (selected.uc_series?.length ?? 1) - 1)] ?? selected?.uc_latest;
  const pipNow =
    selected?.pip_series?.[Math.min(ti, (selected.pip_series?.length ?? 1) - 1)] ?? selected?.pip_latest;

  return (
    <div className="body stage-layout ozzy-stage-body">
      <div className="lcol stage-lcol">
        <StageExplainer
          title="What you’re looking at"
          body="Birmingham’s 69 wards as solid 3D blocks. Taller and darker = more people on Universal Credit or with a PIP award that month (switch tabs). Hover a ward for its name and count; click for a full breakdown; ▶ Play walks through time; drag to orbit · scroll to zoom."
          metricNote="Heights are Stat-Xplore caseload counts — not £ per ward (that isn’t published). Official city UC/PIP spend sits on the right from DWP local-authority accounts."
        />

        <div className="wx-toolbar stage-toolbar">
          <button
            className={`sub-tab${layer === 'uc' ? ' active' : ''}`}
            type="button"
            onClick={() => setLayer('uc')}
            style={layer === 'uc' ? { background: '#2a55bf', color: '#f5f3ee' } : undefined}
          >
            Universal Credit
          </button>
          <button
            className={`sub-tab${layer === 'pip' ? ' active' : ''}`}
            type="button"
            onClick={() => setLayer('pip')}
            style={layer === 'pip' ? { background: '#b01225', color: '#f5f3ee' } : undefined}
          >
            PIP
          </button>
          <button className="refresh-btn" type="button" onClick={() => setPlaying((p) => !p)}>
            {playing ? '❚❚' : '▶'}
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
            max={Math.max(0, months.length - 1)}
            value={ti}
            onChange={(e) => {
              setPlaying(false);
              setTi(Number(e.target.value));
            }}
            style={{ flex: 1, accentColor: accent }}
          />
          <span className="wx-month">{months[ti] ?? '—'}</span>
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
            key={layer}
            wards={frame}
            max={max}
            selected={sel}
            onSelect={setSel}
            unitLabel={layer === 'uc' ? 'on UC' : 'PIP cases'}
            autoRotate={autoRotate && !playing}
            maxHeight={layer === 'uc' ? 2.9 : 3.1}
          />
        </div>
      </div>

      <div className="rcol">
        <div className="hb-headline">
          {/* City caseload stays at the top */}
          <div className="hb-big" style={{ color: accent }}>
            {fmt(cityNow)}
          </div>
          <div className="hb-big-sub">
            {layer === 'uc' ? 'People on Universal Credit' : 'PIP cases with entitlement'} ·{' '}
            {months[ti]}
          </div>

          <div className="stage-layer-strip">
            <button type="button" className={layer === 'uc' ? 'on' : ''} onClick={() => setLayer('uc')}>
              UC · {fmt(data.uc.city.latest)}
            </button>
            <button type="button" className={layer === 'pip' ? 'on' : ''} onClick={() => setLayer('pip')}>
              PIP · {fmt(data.pip.city.latest)}
            </button>
          </div>

          {layer === 'uc' && (
            <p className="stage-honesty">
              <strong>UC only — not all benefits.</strong> Early totals (e.g. May 2015 ·{' '}
              {fmt(data.uc.city.first)}) are small because Universal Credit was still rolling out;
              most people were still on legacy benefits (JSA, ESA, tax credits, Housing Benefit). The
              climb to {fmt(data.uc.city.latest)} is rollout + migration onto UC, not Birmingham
              “creating” claimants. Source: DWP Stat-Xplore ward counts (summed).
            </p>
          )}

          <div className="hb-facts">
            <div className="hb-fact">
              <span className="hb-fact-k">City change ({layer.toUpperCase()})</span>
              <span className="hb-fact-v">
                {layer === 'uc'
                  ? `${fmt(data.uc.city.first)} → ${fmt(data.uc.city.latest)}`
                  : `${fmt(data.pip.city.first)} → ${fmt(data.pip.city.latest)}`}
              </span>
            </div>
            {bill && (
              <div className="hb-fact">
                <span className="hb-fact-k">{layer === 'uc' ? 'UC spend (LA)' : 'PIP spend (LA)'}</span>
                <span className="hb-fact-v">
                  {layer === 'uc'
                    ? `${fmtM((bill as { uc_m: number }).uc_m)} · ${(bill as { year: string }).year}`
                    : `${fmtM((bill as { pip_m: number }).pip_m)} · ${(bill as { year: string }).year}`}
                </span>
              </div>
            )}
            {layer === 'pip' && data.pip.category_mix?.latest?.[0] && (
              <div className="hb-fact">
                <span className="hb-fact-k">Top Bham PIP category</span>
                <span className="hb-fact-v">
                  {data.pip.category_mix.latest[0].name} · {fmt(data.pip.category_mix.latest[0].count)}
                </span>
              </div>
            )}
            <div className="hb-fact">
              <span className="hb-fact-k">Ink ramp</span>
              <span className="hb-fact-v" style={{ display: 'flex', gap: 2 }}>
                {RAMP.map((c, i) => (
                  <i key={i} style={{ width: 11, height: 11, background: c }} />
                ))}
              </span>
            </div>
          </div>

          {selected && (
            <StageWardPanel
              wardName={selected.ward_name}
              wardCode={selected.ward_code}
              monthLabel={months[ti] ?? '—'}
              value={selValue}
              unitLabel={layer === 'uc' ? 'on UC' : 'PIP cases'}
              accent={accent}
              population={selected.population}
              rank={rank}
              rankOf={69}
              cityTotal={cityNow}
              series={selSeries}
              first={selFirst.v}
              firstMonth={selFirst.m}
              latest={layer === 'uc' ? selected.uc_latest : selected.pip_latest}
              extras={[
                { k: 'UC (this month)', v: `${fmt(ucNow)} on UC` },
                { k: 'PIP (this month)', v: `${fmt(pipNow)} cases` },
                {
                  k: 'UC change (full series)',
                  v:
                    selected.uc_delta != null
                      ? `${selected.uc_delta >= 0 ? '+' : ''}${fmt(selected.uc_delta)}`
                      : '—',
                },
                {
                  k: 'PIP change (full series)',
                  v:
                    selected.pip_delta != null
                      ? `${selected.pip_delta >= 0 ? '+' : ''}${fmt(selected.pip_delta)}`
                      : '—',
                },
              ]}
              onClear={() => setSel(null)}
            />
          )}

          {!selected && (
            <p className="stage-honesty" style={{ borderLeftColor: 'var(--border2)' }}>
              Click a ward on the stage for a tile breakdown (rank, share, per 1,000, trend).
            </p>
          )}

          <div className="hb-sources">
            <div className="hb-sources-ttl">Sources</div>
            {(data.sources || []).slice(0, 5).map((s, i) => (
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
