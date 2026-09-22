'use client';

import React from 'react';
import type { Ward } from '@/lib/types';
import { CRIME_CATS, CRIME_RAMP, dc, Q_COLORS, Q_LABELS } from '@/lib/constants';
import { MONTHS } from '@/lib/constants';

// WITHHELD FOR THE DEMONSTRATOR (2026-09-22) — the list / matrix / trend / neet-risk
// markers below all render `wards`, which is built from the legacy 68-ward FALLBACK
// roster in lib/data.ts. See Dashboard.tsx LEGACY_ROSTER_VIEWS_ENABLED and the CHANGELOG
// entry "Withheld pending data fixes". Set to true only once FALLBACK has been retired.
const LEGACY_ROSTER_MARKERS_ENABLED = false;

// Fuzzy ward match: exact → prefix → substring
function findWard(wards: Ward[], name: string): Ward | undefined {
  const n = name.toLowerCase().trim();
  return (
    wards.find(w => w.ward_name.toLowerCase() === n) ||
    wards.find(w => w.ward_name.toLowerCase().startsWith(n)) ||
    wards.find(w => w.ward_name.toLowerCase().includes(n))
  );
}

// ── Ward card
function WardCard({ ward: w, wards }: { ward: Ward; wards: Ward[] }) {
  const avg = (wards.reduce((s, x) => s + x.claimant_rate, 0) / wards.length).toFixed(1);
  const qCol = Q_COLORS[w.quadrant];
  return (
    <div className="oz-card oz-ward-card" style={{ borderLeftColor: qCol }}>
      <div className="oz-card-ttl">{w.ward_name}</div>
      <div className="oz-card-chips">
        <span className="oz-chip">Claimants: <b>{w.claimant_rate}%</b> <span className="oz-chip-ref">city {avg}%</span></span>
        <span className="oz-chip">IMD: <b>{(w.imd_employment_score * 100).toFixed(1)}%</b></span>
        <span className="oz-chip">GVA: <b>£{w.gva.toFixed(1)}k</b>/head</span>
        <span className="oz-chip">Decile: <b>{w.composite_decile}/10</b></span>
      </div>
      <div className="oz-card-quad" style={{ color: qCol }}>{Q_LABELS[w.quadrant]}</div>
    </div>
  );
}

// ── Crime card
function CrimeCard({ ward: w, wards }: { ward: Ward; wards: Ward[] }) {
  const maxRate = Math.max(...wards.map(x => x.crime_rate_per_1000));
  const rampIdx = Math.round((w.crime_rate_per_1000 / maxRate) * 9);
  const rampColor = CRIME_RAMP[Math.max(0, Math.min(9, rampIdx))];
  return (
    <div className="oz-card oz-crime-card" style={{ borderLeftColor: rampColor }}>
      <div className="oz-card-ttl">{w.ward_name} — Crime</div>
      <div className="oz-card-chips">
        <span className="oz-chip">Rate: <b style={{ color: rampColor }}>{w.crime_rate_per_1000.toFixed(1)}</b>/1000</span>
        <span className="oz-chip">Rank: <b>#{w.crime_rank}</b> / {wards.length}</span>
        <span className="oz-chip">YoY: <b style={{ color: w.crime_yoy_pct > 0 ? 'var(--q-disad)' : 'var(--q-prosp)' }}>
          {w.crime_yoy_pct > 0 ? '+' : ''}{w.crime_yoy_pct.toFixed(1)}%
        </b> <span className="oz-chip-ref">(modelled)</span></span>
      </div>
    </div>
  );
}

// ── Crime bars
function CrimeBars({ ward: w }: { ward: Ward }) {
  const cats = Object.entries(w.crime_categories ?? {}).sort(([, a], [, b]) => b - a).slice(0, 8);
  const maxCat = cats[0]?.[1] ?? 1;
  return (
    <div className="oz-card oz-crime-bars">
      <div className="oz-card-ttl">{w.ward_name} — Category breakdown <span className="d-modelled">(modelled)</span></div>
      <div className="crime-cats">
        {cats.map(([cat, count]) => (
          <div key={cat} className="crime-cat-row">
            <div className="crime-cat-lbl">{CRIME_CATS[cat] ?? cat}</div>
            <div className="crime-cat-bar-wrap">
              <div className="crime-cat-bar-fill" style={{ width: `${(count / maxCat) * 100}%` }} />
            </div>
            <div className="crime-cat-count">{count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stat callout
function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="oz-stat-callout">
      <div className="oz-stat-val">{value}</div>
      <div className="oz-stat-lbl">{label}</div>
    </div>
  );
}

// ── Ranked list
function RankedList({ wards, n, byCrime }: { wards: Ward[]; n: number; byCrime: boolean }) {
  const sorted = byCrime
    ? [...wards].sort((a, b) => b.crime_rate_per_1000 - a.crime_rate_per_1000).slice(0, n)
    : [...wards].sort((a, b) => b.composite - a.composite).slice(0, n);
  return (
    <div className="oz-card oz-list-card">
      <div className="oz-card-ttl">Top {n} — {byCrime ? 'highest crime rate' : 'most disadvantaged'}</div>
      <ol className="oz-ranked-list">
        {sorted.map((w, i) => (
          <li key={w.ward_code}>
            <span className="oz-rank-num">{i + 1}</span>
            <span className="oz-rank-name">{w.ward_name}</span>
            <span className="oz-rank-val">
              {byCrime ? `${w.crime_rate_per_1000.toFixed(1)}/1k` : `decile ${w.composite_decile}`}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ── Trend sparkline
function TrendMarker({ ward: w }: { ward: Ward }) {
  const vals = w.trend_12m ?? [];
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const range = max - min || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * 230 + 5},${55 - ((v - min) / range) * 50}`).join(' ');
  const color = dc(w.composite_decile);
  return (
    <div className="oz-card">
      <div className="oz-card-ttl">{w.ward_name} — 12-month claimant trend</div>
      <svg viewBox="0 0 240 60" className="sparkline-svg">
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
      </svg>
      <div className="spark-months">
        {(w.trend_months ?? MONTHS.slice(0, 12)).filter((_, i) => i % 3 === 0).map((m, i) => (
          <span key={i} className="spark-month">{m}</span>
        ))}
      </div>
    </div>
  );
}

// ── Matrix inline (simple SVG)
function MatrixMarker({ ward: w, wards }: { ward: Ward; wards: Ward[] }) {
  const gvaMax = Math.max(...wards.map(x => x.gva));
  const imdMax = Math.max(...wards.map(x => x.imd_employment_score));
  const W = 200, H = 150;
  const Q_COLS = Q_COLORS;

  return (
    <div className="oz-card">
      <div className="oz-card-ttl">{w.ward_name} — Economic Matrix</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="matrix-svg">
        {/* Quadrant backgrounds */}
        <rect x={0} y={0} width={W / 2} height={H / 2} fill={Q_COLS.commuter + '22'} />
        <rect x={W / 2} y={0} width={W / 2} height={H / 2} fill={Q_COLS.prosperous + '22'} />
        <rect x={0} y={H / 2} width={W / 2} height={H / 2} fill={Q_COLS.disadvantage + '22'} />
        <rect x={W / 2} y={H / 2} width={W / 2} height={H / 2} fill={Q_COLS.workhorse + '22'} />
        {/* Axes */}
        <line x1={W / 2} y1={0} x2={W / 2} y2={H} stroke="var(--border)" strokeWidth="0.5" />
        <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="var(--border)" strokeWidth="0.5" />
        {/* All wards */}
        {wards.map(x => {
          const cx = (x.gva / gvaMax) * (W - 16) + 8;
          const cy = (x.imd_employment_score / imdMax) * (H - 16) + 8;
          return (
            <circle key={x.ward_code} cx={cx} cy={cy} r={2}
              fill={Q_COLS[x.quadrant]} opacity={x.ward_code === w.ward_code ? 1 : 0.3} />
          );
        })}
        {/* Selected ward larger */}
        {(() => {
          const cx = (w.gva / gvaMax) * (W - 16) + 8;
          const cy = (w.imd_employment_score / imdMax) * (H - 16) + 8;
          return <circle cx={cx} cy={cy} r={5} fill={Q_COLS[w.quadrant]} stroke="white" strokeWidth="1" />;
        })()}
        {/* Labels */}
        <text x={4} y={12} fontSize={7} fill="var(--muted)">Commuter</text>
        <text x={W / 2 + 4} y={12} fontSize={7} fill="var(--muted)">Prosperous</text>
        <text x={4} y={H - 4} fontSize={7} fill="var(--muted)">Disadvantage</text>
        <text x={W / 2 + 4} y={H - 4} fontSize={7} fill="var(--muted)">Workhorse</text>
      </svg>
      <div className="oz-card-quad" style={{ color: Q_COLS[w.quadrant] }}>{Q_LABELS[w.quadrant]}</div>
    </div>
  );
}

// ── NEET risk card
function NeetRiskCard({ ward: w, wards }: { ward: Ward; wards: Ward[] }) {
  const cityAvgYouth = (wards.reduce((s, x) => s + x.youth_claimant_rate, 0) / wards.length).toFixed(1);
  const riskColor = w.neet_risk_decile >= 8 ? 'var(--q-disad)' : w.neet_risk_decile >= 5 ? '#7d4e36' : 'var(--q-prosp)';
  return (
    <div className="oz-card oz-ward-card" style={{ borderLeftColor: riskColor }}>
      <div className="oz-card-ttl">{w.ward_name} — NEET Risk Index <span className="d-modelled">(modelled)</span></div>
      <div className="oz-card-chips">
        <span className="oz-chip">Risk decile: <b style={{ color: riskColor }}>{w.neet_risk_decile}/10</b></span>
        <span className="oz-chip">Youth UC claimants: <b>{w.youth_claimant_rate}%</b> <span className="oz-chip-ref">city {cityAvgYouth}%</span></span>
        <span className="oz-chip">Health inactivity: <b>{w.inactivity_sick_pct}%</b></span>
        <span className="oz-chip">IMD employment: <b>{(w.imd_employment_score * 100).toFixed(1)}%</b></span>
      </div>
      <div className="oz-card-quad" style={{ color: riskColor }}>
        {w.neet_risk_decile >= 8 ? 'High NEET risk' : w.neet_risk_decile >= 5 ? 'Moderate NEET risk' : 'Lower NEET risk'}
      </div>
    </div>
  );
}

// ── Open CTA button
function OpenCTA({ view, onOpenView }: { view: string; onOpenView?: (v: string) => void }) {
  return (
    <div className="oz-open-cta">
      <button className="oz-open-btn" onClick={() => onOpenView?.(view)}>
        Open {view} dashboard →
      </button>
    </div>
  );
}

// ── Main parser & renderer
const MAX_VISUALS = 4;
const MARKER_RE = /\{\{([^}]+)\}\}/g;

export interface MarkerCallbacks {
  onOpenView?: (view: string) => void;
}

export function renderOzzyContent(
  text: string,
  wards: Ward[],
  callbacks: MarkerCallbacks = {},
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let visualCount = 0;
  let match: RegExpExecArray | null;

  MARKER_RE.lastIndex = 0;
  while ((match = MARKER_RE.exec(text)) !== null) {
    // Text before marker
    if (match.index > last) {
      const chunk = text.slice(last, match.index).trim();
      if (chunk) {
        chunk.split(/\n\n+/).forEach((p, pi) => {
          if (p.trim()) nodes.push(<p key={`p-${last}-${pi}`}>{p.trim()}</p>);
        });
      }
    }
    last = match.index + match[0].length;

    if (visualCount >= MAX_VISUALS) continue;

    const raw = match[1].trim();
    const [type, ...args] = raw.split(':');

    try {
      if (LEGACY_ROSTER_MARKERS_ENABLED && type === 'ward') {
        const w = findWard(wards, args.join(':'));
        if (w) { nodes.push(<WardCard key={`ward-${match.index}`} ward={w} wards={wards} />); visualCount++; }
      } else if (LEGACY_ROSTER_MARKERS_ENABLED && type === 'crime') {
        const w = findWard(wards, args.join(':'));
        if (w) { nodes.push(<CrimeCard key={`crime-${match.index}`} ward={w} wards={wards} />); visualCount++; }
      } else if (LEGACY_ROSTER_MARKERS_ENABLED && type === 'crime-bars') {
        const w = findWard(wards, args.join(':'));
        if (w) { nodes.push(<CrimeBars key={`cbars-${match.index}`} ward={w} />); visualCount++; }
      } else if (type === 'stat') {
        const [val, lbl] = args.join(':').split('|');
        if (val && lbl) { nodes.push(<StatCard key={`stat-${match.index}`} value={val} label={lbl} />); visualCount++; }
      } else if (LEGACY_ROSTER_MARKERS_ENABLED && type === 'list') {
        const [dir, nStr, mode] = args;
        const n = parseInt(nStr ?? '5');
        const byCrime = mode === 'crime';
        const topOrBot = dir === 'top';
        const base = byCrime
          ? [...wards].sort((a, b) => (topOrBot ? b : a).crime_rate_per_1000 - (topOrBot ? a : b).crime_rate_per_1000)
          : [...wards].sort((a, b) => (topOrBot ? b : a).composite - (topOrBot ? a : b).composite);
        nodes.push(<RankedList key={`list-${match.index}`} wards={base.slice(0, n)} n={n} byCrime={byCrime} />);
        visualCount++;
      } else if (LEGACY_ROSTER_MARKERS_ENABLED && type === 'matrix') {
        const w = findWard(wards, args.join(':'));
        if (w) { nodes.push(<MatrixMarker key={`matrix-${match.index}`} ward={w} wards={wards} />); visualCount++; }
      } else if (LEGACY_ROSTER_MARKERS_ENABLED && type === 'trend') {
        const w = findWard(wards, args.join(':'));
        if (w) { nodes.push(<TrendMarker key={`trend-${match.index}`} ward={w} />); visualCount++; }
      } else if (LEGACY_ROSTER_MARKERS_ENABLED && type === 'neet-risk') {
        const w = findWard(wards, args.join(':'));
        if (w) { nodes.push(<NeetRiskCard key={`neet-${match.index}`} ward={w} wards={wards} />); visualCount++; }
      } else if (type === 'open') {
        const view = args[0] ?? 'crime';
        nodes.push(<OpenCTA key={`open-${match.index}`} view={view} onOpenView={callbacks.onOpenView} />);
        visualCount++;
      }
    } catch {
      // silently skip malformed markers
    }
  }

  // Remaining text
  if (last < text.length) {
    const chunk = text.slice(last).trim();
    if (chunk) {
      chunk.split(/\n\n+/).forEach((p, pi) => {
        if (p.trim()) nodes.push(<p key={`p-tail-${pi}`}>{p.trim()}</p>);
      });
    }
  }

  return nodes;
}

// ── Auto-inject markers when Ozzy omits them
export function autoInjectMarkers(question: string, response: string): string {
  if (response.includes('{{')) return response;
  const q = question.toLowerCase();
  const wantsList = /\b(top|most|least|worst|best|rank|ranking|deprived)\b/.test(q);
  const wantsCrime = /\b(crime|safe|safer|safety|burglary|violent|theft|drugs|asb|anti.social|stop.and.search|offence|offences)\b/.test(q);
  const wantsMatrix = /\b(matrix|quadrant|position|workhorse|prosperous|commuter)\b/.test(q);
  const wantsTrend = /\b(trend|over time|getting better|getting worse|change|trajectory)\b/.test(q);
  const wantsNeet = /\b(neet|young people|youth|16.24|16-24|not in education|inactivity|milburn|school.leaver|school leaver)\b/.test(q);

  const wardMentions = /\b([A-Z][a-z]+(?: [A-Z][a-z]+)*)\b/g;
  const match = response.match(wardMentions);
  const firstWard = match?.find(n => n.length > 3 && n !== 'Birmingham' && n !== 'Ozzy') ?? '';

  const injections: string[] = [];

  if (wantsList && wantsCrime) injections.push('{{list:top|5|crime}}');
  else if (wantsList) injections.push('{{list:top|5}}');
  if (wantsNeet && firstWard) injections.push(`{{neet-risk:${firstWard}}}`);
  else if (wantsCrime && firstWard) injections.push(`{{crime:${firstWard}}}`);
  else if (wantsMatrix && firstWard) injections.push(`{{matrix:${firstWard}}}`);
  else if (wantsTrend && firstWard) injections.push(`{{trend:${firstWard}}}`);
  else if (firstWard && !wantsList) injections.push(`{{ward:${firstWard}}}`);
  if (wantsCrime) injections.push('{{open:crime}}');

  return injections.length > 0 ? response + '\n\n' + injections.join('\n') : response;
}
