import type { ChildPovertyWard, ChildPovertyData, UcSource } from '@/lib/types';
import { RAMP } from '@/lib/constants';
import Tip from '../../components/Tip';
import FocusableChart from '../../components/FocusableChart';

// Ward detail — the emphasis form: this ward's 10-year path in herald red against
// the REAL Birmingham-LA series in gray and the England mean in light gray.
interface Props {
  ward: ChildPovertyWard;
  data: ChildPovertyData;
  sources: UcSource[];
  onClose: () => void;
}

function EmphasisLine({ ward, data }: { ward: ChildPovertyWard; data: ChildPovertyData }) {
  const seriesList: { s: (number | null)[]; color: string; w: number; label: string }[] = [];
  if (data.city.england_series) seriesList.push({ s: data.city.england_series, color: '#c3c2b7', w: 1.4, label: 'England' });
  if (data.city.city_series) seriesList.push({ s: data.city.city_series, color: '#8a8f99', w: 1.4, label: 'Birmingham' });
  seriesList.push({ s: ward.series, color: '#b01225', w: 2.2, label: ward.ward_name });

  const all = seriesList.flatMap(x => x.s).filter((v): v is number => v != null);
  const maxV = Math.max(...all, 1) * 1.08;
  const W = 252, H = 96;
  const x = (i: number) => (i / (data.years.length - 1)) * (W - 46);
  const y = (v: number) => H - 6 - (v / maxV) * (H - 14);

  return (
    <div>
      <svg className="chart-canvas-wrap" width="100%" height={H + 16} viewBox={`0 0 ${W} ${H + 16}`} style={{ display: 'block' }}>
        {seriesList.map(({ s, color, w: sw, label }) => {
          const pts = s.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v != null);
          if (pts.length < 2) return null;
          const path = pts.map(p => `${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
          const last = pts.at(-1)!;
          return (
            <g key={label}>
              <polyline points={path} fill="none" stroke={color} strokeWidth={sw} />
              <text x={x(last.i) + 4} y={y(last.v) + 3} fontSize="8" fontFamily="IBM Plex Mono" fill={color}>{label === ward.ward_name ? `${last.v}%` : label}</text>
            </g>
          );
        })}
        <text x={0} y={H + 12} fontSize="8.5" fontFamily="IBM Plex Mono" fill="#8a8f99">{data.years[0]}</text>
        <text x={W - 46} y={H + 12} textAnchor="end" fontSize="8.5" fontFamily="IBM Plex Mono" fill="#8a8f99">{data.as_of}</text>
      </svg>
    </div>
  );
}

export default function CpDetailPanel({ ward: w, data, sources, onClose }: Props) {
  const wards = data.wards;
  const maxPct = Math.max(...wards.map(x => x.latest_pct), 1);
  const rampColor = RAMP[Math.max(0, Math.min(9, Math.round((w.latest_pct / maxPct) * 9)))];
  const rank = [...wards].sort((a, b) => b.latest_pct - a.latest_pct).findIndex(x => x.ward_code === w.ward_code) + 1;
  const gap = data.city.city_latest != null ? Math.round((w.latest_pct - data.city.city_latest) * 10) / 10 : null;

  return (
    <div>
      <div className="d-hdr">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="d-name">{w.ward_name}</div>
            <div className="d-sub">{w.ward_code}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, padding: 2 }}>×</button>
        </div>

        <div className="d-chips">
          <Tip text="DWP/HMRC administrative measure: children aged 0-15 in families whose income is below 60% of the 2010/11 median, inflation-adjusted. Native ward figure, not derived.">
            <div className="d-chip">
              <div className="d-chip-lbl">Latest ({data.as_of})</div>
              <div className="d-chip-val" style={{ color: rampColor }}>{w.latest_pct}%</div>
              <div className="d-chip-sub">of children 0–15</div>
            </div>
          </Tip>
          <Tip text="Rank among the 69 wards. #1 = highest child poverty.">
            <div className="d-chip">
              <div className="d-chip-lbl">City rank</div>
              <div className="d-chip-val">#{rank}</div>
              <div className="d-chip-sub">of {wards.length} wards</div>
            </div>
          </Tip>
          <Tip text={`Change since ${data.years[0]}, in percentage points — derived from the two real endpoints of the series.`}>
            <div className="d-chip">
              <div className="d-chip-lbl">Δ since {data.years[0]}</div>
              <div className="d-chip-val" style={{ color: w.delta_pp != null && w.delta_pp > 0 ? 'var(--herald-red)' : 'var(--q-prosp)' }}>
                {w.delta_pp != null ? `${w.delta_pp > 0 ? '+' : ''}${w.delta_pp}pp` : '—'}
              </div>
              <div className="d-chip-sub">from {w.first_pct ?? '—'}%</div>
            </div>
          </Tip>
          <Tip text="Gap vs the real Birmingham local-authority figure (same DWP/HMRC dataset), percentage points.">
            <div className="d-chip">
              <div className="d-chip-lbl">vs city</div>
              <div className="d-chip-val" style={{ color: gap != null && gap > 0 ? 'var(--herald-red)' : 'var(--ink)' }}>{gap != null ? `${gap > 0 ? '+' : ''}${gap}pp` : '—'}</div>
              <div className="d-chip-sub">city {data.city.city_latest ?? '—'}% · England {data.city.england_latest ?? '—'}%</div>
            </div>
          </Tip>
        </div>
      </div>

      <div className="d-sec">
        <div className="d-sec-ttl">Ten-year path vs city &amp; England</div>
        <FocusableChart title={`${w.ward_name} — Ten-year path`}>
          <EmphasisLine ward={w} data={data} />
        </FocusableChart>
      </div>

      <div className="d-sec" style={{ borderBottom: 'none' }}>
        <div className="d-sec-ttl">Sources</div>
        {sources.map((s, i) => (
          <div key={i} style={{ padding: '8px 0', borderBottom: i < sources.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 4 }}>{s.publisher} · {s.licence} · {s.as_of}</div>
            <a href={s.catalogueUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#1a2a3a', textDecoration: 'underline' }}>View dataset on City Observatory ↗</a>
          </div>
        ))}
      </div>
    </div>
  );
}
