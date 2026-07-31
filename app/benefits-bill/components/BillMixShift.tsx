'use client';

import type { BillYear } from '@/lib/types';

// Share-of-total dumbbells: what fraction of the city bill each major line took
// at a mature baseline vs latest. Prefer shares over raw £ growth when the whole
// pot grew (see brum-dataviz). UC measured from 2019/20 (first full itemised UC
// year in this workbook) — not from launch zero.

const SERIES: { id: string; label: string; color: string }[] = [
  { id: 'uc', label: 'Universal Credit', color: '#2a55bf' },
  { id: 'sp', label: 'State Pension', color: '#d99a00' },
  { id: 'hb', label: 'Housing Benefit', color: '#1f7a33' },
  { id: 'pip', label: 'PIP', color: '#b01225' },
  { id: 'esa', label: 'ESA', color: '#4a3aa7' },
  { id: 'dla', label: 'DLA', color: '#52514e' },
  { id: 'pc', label: 'Pension Credit', color: '#7d4e36' },
];

/** Prefer 2019/20 (UC fully itemised); fall back to first non-partial year with ≥3 components. */
export function pickMixBaseline(history: BillYear[]): BillYear | null {
  const preferred = history.find(h => h.year === '2019/20' && h.components && !h.partial);
  if (preferred) return preferred;
  return history.find(h => h.components && !h.partial && Object.keys(h.components).length >= 3) ?? null;
}

interface Props {
  history: BillYear[];
}

export default function BillMixShift({ history }: Props) {
  const last = [...history].reverse().find(h => h.components && !h.partial) ?? null;
  const base = pickMixBaseline(history);
  if (!last?.components || !base?.components || base.year === last.year) return null;

  const rows = SERIES.map(s => {
    const v0 = base.components![s.id];
    const v1 = last.components![s.id];
    // Only show lines present in at least one endpoint with a real £ figure
    if (v0 == null && v1 == null) return null;
    const s0 = v0 != null && base.total_m > 0 ? (v0 / base.total_m) * 100 : null;
    const s1 = v1 != null && last.total_m > 0 ? (v1 / last.total_m) * 100 : null;
    if (s0 == null && s1 == null) return null;
    return {
      ...s,
      s0: s0 ?? 0,
      s1: s1 ?? 0,
      missingBase: s0 == null,
      missingLast: s1 == null,
      v0: v0 ?? null,
      v1: v1 ?? null,
    };
  }).filter((r): r is NonNullable<typeof r> => r != null)
    .sort((a, b) => b.s1 - a.s1);

  if (!rows.length) return null;
  const maxShare = Math.max(...rows.flatMap(r => [r.s0, r.s1]), 1) * 1.12;

  const fmtM = (m: number) => (m >= 1000 ? `£${(m / 1000).toFixed(1)}bn` : `£${Math.round(m)}m`);

  return (
    <div className="bill-mix" style={{ marginTop: 22 }}>
      <div className="bill-sec-ttl">
        Mix shift — each line&apos;s share of the city bill · {base.year} ○ → ● {last.year}
      </div>
      <div className="bill-mix-note">
        Shares control for the pot growing. Baseline is {base.year} (first full year with UC
        itemised in this workbook), not a near-zero launch year. Open circles = {base.year};
        filled = {last.year}. Red connector = share rose; green = fell.
      </div>
      {rows.map(r => {
        const rose = r.s1 > r.s0 + 0.05;
        const fell = r.s1 < r.s0 - 0.05;
        const conn = rose ? '#b01225' : fell ? '#1a3a2a' : '#8a8f99';
        const x0 = (r.s0 / maxShare) * 100;
        const x1 = (r.s1 / maxShare) * 100;
        return (
          <div key={r.id} className="bill-mix-row">
            <div className="bill-mix-lbl">
              <span style={{ color: r.color }}>●</span> {r.label}
            </div>
            <div className="bill-mix-track">
              <svg width="100%" height="22" style={{ display: 'block' }} aria-hidden="true">
                <line
                  x1={`${Math.min(x0, x1)}%`} y1="11"
                  x2={`${Math.max(x0, x1)}%`} y2="11"
                  stroke={conn} strokeWidth="2" opacity="0.55"
                />
                <circle cx={`${x0}%`} cy="11" r="4.2" fill="#f5f3ee" stroke={conn} strokeWidth="1.6" />
                <circle cx={`${x1}%`} cy="11" r="4.8" fill={conn} stroke="#f5f3ee" strokeWidth="1.4" />
              </svg>
              <span className="bill-mix-vals">
                {r.missingBase ? '—' : `${r.s0.toFixed(1)}%`}
                <span className="bill-mix-arr">→</span>
                {r.missingLast ? '—' : `${r.s1.toFixed(1)}%`}
              </span>
            </div>
            <div className="bill-mix-cash">
              {r.v0 != null ? fmtM(r.v0) : '—'} → {r.v1 != null ? fmtM(r.v1) : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
