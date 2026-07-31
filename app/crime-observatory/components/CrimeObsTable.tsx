'use client';

import { useState } from 'react';
import type { CrimeObsData, CrimeObsWard } from '@/lib/types';
import { CRIME_RAMP } from '@/lib/constants';

interface Props {
  data: CrimeObsData;
  selected: CrimeObsWard | null;
  onSelect: (code: string) => void;
}

// Tiny inline trend of raw monthly offence counts (the honest series, no smoothing).
function Spark({ trend }: { trend: (number | null)[] }) {
  const pts = trend.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v != null);
  if (pts.length < 2) return <span style={{ color: 'var(--muted2)' }}>—</span>;
  const W = 84, H = 22;
  const max = Math.max(...pts.map(p => p.v), 1);
  const min = Math.min(...pts.map(p => p.v));
  const span = Math.max(max - min, 1);
  const x = (i: number) => (i / (trend.length - 1)) * W;
  const y = (v: number) => H - 2 - ((v - min) / span) * (H - 5);
  const path = pts.map(p => `${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg width={W} height={H} style={{ display: 'block' }} aria-hidden>
      <polyline points={path} fill="none" stroke="var(--muted)" strokeWidth="1.3" />
      <circle cx={x(last.i)} cy={y(last.v)} r="2" fill="var(--ink)" />
    </svg>
  );
}

export default function CrimeObsTable({ data, selected, onSelect }: Props) {
  const [sortKey, setSortKey] = useState<'rate' | 'name' | 'count'>('rate');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const sorted = [...data.wards].sort((a, b) => {
    if (sortKey === 'name') return sortDir * a.ward_name.localeCompare(b.ward_name);
    const av = sortKey === 'rate' ? (a.rate_per_1000 ?? -1) : (a.latest_count ?? -1);
    const bv = sortKey === 'rate' ? (b.rate_per_1000 ?? -1) : (b.latest_count ?? -1);
    return sortDir * (av - bv);
  });

  const maxRate = Math.max(...data.wards.map(w => w.rate_per_1000 ?? 0), 1);
  const rampColor = (rate: number | null) =>
    CRIME_RAMP[Math.max(0, Math.min(9, Math.round(((rate ?? 0) / maxRate) * 9)))];

  const handleSort = (key: typeof sortKey) => {
    if (key === sortKey) setSortDir(d => (d === 1 ? -1 : 1));
    else { setSortKey(key); setSortDir(key === 'name' ? 1 : -1); }
  };
  const arrow = (key: typeof sortKey) => (sortKey === key ? (sortDir === -1 ? ' ↓' : ' ↑') : '');

  return (
    <div className="crime-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th className="sort-th" onClick={() => handleSort('name')}>Ward{arrow('name')}</th>
            <th className="sort-th" onClick={() => handleSort('rate')}>Rate /1000{arrow('rate')}</th>
            <th className="sort-th" onClick={() => handleSort('count')}>Offences{arrow('count')}</th>
            <th>Rank</th>
            <th>36-mo trend</th>
            <th>Bar</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(w => (
            <tr
              key={w.ward_code}
              className={selected?.ward_code === w.ward_code ? 'row-selected' : ''}
              onClick={() => onSelect(w.ward_code)}
            >
              <td className="td-ward">{w.ward_name}</td>
              <td className="td-mono" style={{ color: rampColor(w.rate_per_1000) }}>
                {w.rate_per_1000 != null ? w.rate_per_1000.toFixed(1) : '—'}
              </td>
              <td className="td-mono td-muted">{w.latest_count != null ? w.latest_count.toLocaleString() : '—'}</td>
              <td className="td-mono td-muted">#{w.rank}</td>
              <td><Spark trend={w.trend} /></td>
              <td>
                <div className="mini-bar-bg">
                  <div
                    className="mini-bar-fill"
                    style={{ width: `${((w.rate_per_1000 ?? 0) / maxRate) * 100}%`, background: rampColor(w.rate_per_1000) }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
