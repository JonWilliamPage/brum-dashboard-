'use client';

import { useState } from 'react';
import type { CrimeObsData, CrimeObsWard } from '@/lib/types';
import { crimeObsLabel, crimeObsColor } from '@/lib/constants';

// The River, applied to crime: a silhouette streamgraph of the city's recorded
// offences by category across 36 months (story-over-precision: 8 named bands +
// "Other"), with the selected ward's raw monthly total overlaid as an emphasis
// line on its own scale annotation. Counts are raw recorded offences — no smoothing.
interface Props {
  data: CrimeObsData;
  selected: CrimeObsWard | null;
}

const OTHER = '#8a8f99';
const W = 900, H = 400, PAD_L = 16, PAD_R = 150, PAD_T = 20, PAD_B = 40;

// Catmull-Rom → cubic bezier for a smooth stream edge.
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export default function CrimeObsTrend({ data, selected }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const months = data.months;
  const last = months.length - 1;
  const latest = data.as_of;

  const seriesOf = (name: string) => months.map(m => data.city.category_by_month[m]?.[name] ?? 0);

  const top = data.categories.slice(0, 8).map(c => c.name);
  const rest = data.categories.slice(8).map(c => c.name);
  const bands = [
    ...top.map(name => ({ name, vals: seriesOf(name), color: crimeObsColor(name) })),
    { name: 'All other categories', vals: months.map((_, t) => rest.reduce((s, n) => s + (seriesOf(n)[t] ?? 0), 0)), color: OTHER },
  ];

  const totals = months.map((_, t) => bands.reduce((s, b) => s + b.vals[t], 0));
  const maxTotal = Math.max(...totals, 1);
  const x = (t: number) => PAD_L + (t / last) * (W - PAD_L - PAD_R);
  const yScale = (H - PAD_T - PAD_B) / maxTotal;
  const midY = PAD_T + (H - PAD_T - PAD_B) / 2;

  // silhouette offset: baseline(t) = −total(t)/2, stack the bands upward from it.
  const edges: { name: string; color: string; top: [number, number][]; bottom: [number, number][]; thick: number[] }[] = [];
  const cum = months.map((_, t) => -totals[t] / 2);
  for (const b of bands) {
    const bottom: [number, number][] = [], topE: [number, number][] = [], thick: number[] = [];
    for (let t = 0; t <= last; t++) {
      const y0 = cum[t], y1 = cum[t] + b.vals[t];
      bottom.push([x(t), midY + y0 * yScale]);
      topE.push([x(t), midY + y1 * yScale]);
      thick.push(b.vals[t] * yScale);
      cum[t] = y1;
    }
    const inv = (p: [number, number]): [number, number] => [p[0], 2 * midY - p[1]];
    edges.push({ name: b.name, color: b.color, top: topE.map(inv), bottom: bottom.map(inv), thick });
  }

  // Selected-ward emphasis line (raw monthly totals, own scale noted in caption).
  const wardPts: [number, number][] = [];
  if (selected) {
    const wmax = Math.max(...selected.trend.map(v => v ?? 0), 1);
    selected.trend.forEach((v, t) => {
      if (v != null) wardPts.push([x(t), PAD_T + (H - PAD_T - PAD_B) - (v / wmax) * (H - PAD_T - PAD_B) * 0.92]);
    });
  }

  // Sparse x labels: first, every 6th, latest.
  const labelIdx = months.map((_, i) => i).filter(i => i % 6 === 0 || i === last);

  return (
    <div>
      <div className="bill-sec-ttl">
        Recorded offences by category, {months[0]} → {latest} — raw monthly counts
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} role="img"
        aria-label="Streamgraph of recorded offences by category over 36 months">
        {labelIdx.map(t => (
          <text key={months[t]} x={x(t)} y={H - 14} textAnchor="middle" fontSize="9.5" fontFamily="IBM Plex Mono" fill="#8a8f99">{months[t]}</text>
        ))}
        {edges.map(e => {
          const pathD = `${smoothPath(e.top)} L${e.bottom[last][0].toFixed(1)},${e.bottom[last][1].toFixed(1)} ${smoothPath([...e.bottom].reverse()).replace(/^M/, 'L')} Z`;
          const dim = hover != null && hover !== e.name;
          return (
            <path key={e.name} d={pathD} fill={e.color} fillOpacity={dim ? 0.22 : 0.88}
              stroke="#f5f3ee" strokeWidth="1"
              onMouseEnter={() => setHover(e.name)} onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer', transition: 'fill-opacity .15s' }}>
              <title>{crimeObsLabel(e.name)}: {Math.round(e.thick[last] / yScale).toLocaleString()} in {latest}</title>
            </path>
          );
        })}
        {edges.map(e => {
          const yMid = (e.top[last][1] + e.bottom[last][1]) / 2;
          if (Math.abs(e.bottom[last][1] - e.top[last][1]) < 12 && e.name !== 'All other categories') return null;
          return (
            <text key={`lbl-${e.name}`} x={W - PAD_R + 6} y={yMid + 3} fontSize="9" fontFamily="IBM Plex Mono"
              fill={hover === e.name ? '#0e0f11' : '#52514e'}>
              {crimeObsLabel(e.name).length > 22 ? `${crimeObsLabel(e.name).slice(0, 21)}…` : crimeObsLabel(e.name)} {Math.round(e.thick[last] / yScale).toLocaleString()}
            </text>
          );
        })}
        {selected && wardPts.length > 1 && (
          <g>
            <polyline points={wardPts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}
              fill="none" stroke="#0e0f11" strokeWidth="2" strokeDasharray="1 0" opacity="0.9" />
            <text x={wardPts[wardPts.length - 1][0] - 4} y={wardPts[wardPts.length - 1][1] - 6}
              textAnchor="end" fontSize="9" fontFamily="IBM Plex Mono" fill="#0e0f11">{selected.ward_name}</text>
          </g>
        )}
      </svg>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted2)', marginTop: 4, lineHeight: 1.6 }}>
        Band thickness = offences that month (city total {totals[last].toLocaleString()} in {latest}). Top 8 categories named; the
        rest fold into gray. Hover a band to isolate it.{selected ? ` The dark line is ${selected.ward_name}'s monthly total, drawn on its own scale for shape only.` : ' Select a ward to overlay its monthly trend.'}
        {' '}Counts are raw recorded offences — seasonal and unsmoothed.
      </div>
    </div>
  );
}
