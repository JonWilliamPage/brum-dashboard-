'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { HousingBenefitData } from '@/lib/types';
import ScoringNote from '../../components/brand/ScoringNote';
import { RAMP } from '@/lib/constants';
import FocusableChart from '../../components/FocusableChart';

const HbMap = dynamic(() => import('./HbMap'), { ssr: false });

// THE shared view — rendered identically in /review (candidate) and the Dashboards
// shell (published). This dataset is LOCAL-AUTHORITY level only: DWP publishes Housing
// Benefit for whole boroughs, not wards. So instead of a 69-ward map we show the honest
// like-for-like comparison (Birmingham vs the other West Midlands boroughs) and label
// the missing ward breakdown loudly. No modelled ward values are invented.

const RED = '#b01225';        // Birmingham — the outlier we're highlighting
const NAVY = '#16306f';       // the other boroughs

type Sub = 'bars' | 'map';

export default function HousingBenefitView({ data }: { data: HousingBenefitData }) {
  const [sub, setSub] = useState<Sub>('bars');
  const areas = data.areas ?? [];
  const bham = data.birmingham_value ?? areas.find(a => a.is_birmingham)?.value ?? null;
  const { wmca, england } = data.benchmarks ?? { wmca: null, england: null };

  const maxVal = Math.max(...areas.map(a => a.value), wmca ?? 0, england ?? 0, 1);
  const scale = Math.ceil(maxVal / 5) * 5;                       // nice 0..15 axis
  const pct = (v: number) => `${(v / scale) * 100}%`;
  const mult = (n: number | null) => (n && bham ? (bham / n).toFixed(1) : '—');

  return (
    <div className="body">
      <div className="lcol">
        {/* The honest granularity caveat — the whole point of this view. */}
        <div className="hb-nowward" role="note">
          <span className="hb-nowward-tag">◇ LOCAL-AUTHORITY FIGURE</span>
          <p>
            DWP publishes Housing Benefit take-up for <strong>whole local authorities only</strong> —
            there is <strong>no ward-level breakdown</strong> for this dataset, so Birmingham cannot be
            split into its 69 wards here. Shown below as the honest like-for-like comparison: Birmingham
            against the other six West Midlands metropolitan boroughs, with the regional and national
            benchmarks DWP publishes alongside.
          </p>
        </div>

        <ScoringNote label="What you're seeing">
          The share of each borough&apos;s households claiming Housing Benefit ({data.as_of}, DWP).
          Longer / red = a higher share on Housing Benefit. Birmingham is the tallest bar in the region —
          {' '}#{data.birmingham_rank ?? 1} of {areas.length}. The dashed markers are the published
          West Midlands and England averages, so you can see how far above them the city sits.
        </ScoringNote>

        <div className="sub-tab-bar">
          {([['bars', 'Comparison'], ['map', 'Map']] as [Sub, string][]).map(([s, lbl]) => (
            <button key={s} className={`sub-tab${sub === s ? ' active' : ''}`} onClick={() => setSub(s)}>{lbl}</button>
          ))}
        </div>

        {sub === 'map' && (
          <div className="data-view-toolbar">
            <div className="legend-row">
              <span className="llbl" style={{ marginRight: 2 }}>Lower</span>
              {RAMP.map((c, i) => <div key={i} className="lsw" style={{ background: c }} />)}
              <span className="llbl" style={{ marginLeft: 2 }}>Higher — % on Housing Benefit</span>
              <span className="llbl" style={{ marginLeft: 12, color: 'var(--herald-red)' }}>▬ Birmingham</span>
            </div>
          </div>
        )}

        <div className="panel" style={{ flex: 1, position: 'relative' }}>
          <div className="panel-body">
            {sub === 'map' ? (
              <FocusableChart title="Housing Benefit Map">
                <HbMap areas={areas} />
              </FocusableChart>
            ) : (
            <FocusableChart title="Housing Benefit Comparison">
            <div className="hb-chart">
              {areas.map(a => (
                <div key={a.area_code} className={`hb-row${a.is_birmingham ? ' is-bham' : ''}`}>
                  <div className="hb-name">
                    {a.area_name}
                    {a.is_birmingham && <span className="hb-you"> ← highest in the region</span>}
                  </div>
                  <div className="hb-track">
                    <div
                      className="hb-bar"
                      style={{ width: pct(a.value), background: a.is_birmingham ? RED : NAVY }}
                    />
                    <span className="hb-val">{a.value.toFixed(2)}%</span>
                  </div>
                </div>
              ))}

              {/* Honest benchmarks — same scale, drawn as outlined bars so they read as reference, not peers. */}
              <div className="hb-benchdiv">Benchmarks (DWP, {data.as_of})</div>
              {[['West Midlands average', wmca], ['England average (all LAs)', england]].map(
                ([label, val]) =>
                  val != null && (
                    <div key={label as string} className="hb-row is-bench">
                      <div className="hb-name">{label as string}</div>
                      <div className="hb-track">
                        <div className="hb-bar hb-bar-bench" style={{ width: pct(val as number) }} />
                        <span className="hb-val">{(val as number).toFixed(2)}%</span>
                      </div>
                    </div>
                  ),
              )}

              <div className="hb-axis">
                <span>0%</span>
                <span>{(scale / 2).toFixed(0)}%</span>
                <span>{scale.toFixed(0)}%</span>
              </div>
            </div>
            </FocusableChart>
            )}
          </div>
          <div className="bham-watermark">FORWARD · BIRMINGHAM</div>
        </div>
      </div>

      {/* Right column — the city headline + provenance (no per-ward detail exists to show). */}
      <div className="rcol">
        <div className="hb-headline">
          <div className="hb-big">{bham != null ? `${bham.toFixed(2)}%` : '—'}</div>
          <div className="hb-big-sub">of Birmingham households on Housing Benefit · {data.as_of}</div>

          <div className="hb-facts">
            <div className="hb-fact">
              <span className="hb-fact-k">Rank in region</span>
              <span className="hb-fact-v">#{data.birmingham_rank ?? 1} of {areas.length} boroughs — the highest</span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">vs West Midlands avg</span>
              <span className="hb-fact-v">{mult(wmca)}× ({wmca != null ? `${wmca.toFixed(2)}%` : '—'})</span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">vs England avg</span>
              <span className="hb-fact-v">{mult(england)}× ({england != null ? `${england.toFixed(2)}%` : '—'})</span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">Geography</span>
              <span className="hb-fact-v" style={{ color: 'var(--herald-red)' }}>Local authority — no ward breakdown</span>
            </div>
          </div>

          <div className="hb-sources">
            <div className="hb-sources-ttl">Source</div>
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
