'use client';

import type { CrimeObsData, CrimeObsWard } from '@/lib/types';
import { CRIME_RAMP, crimeObsLabel, crimeObsColor } from '@/lib/constants';
import Tip from '../../components/Tip';

interface Props {
  ward: CrimeObsWard;
  data: CrimeObsData;
  onClose: () => void;
}

// Emphasis line — this ward's 36-month raw count against the city monthly total
// (city drawn on its own scale, in gray; ward in ink). No smoothing.
function TrendLine({ ward, data }: { ward: CrimeObsWard; data: CrimeObsData }) {
  const W = 252, H = 92;
  const n = data.months.length;
  const citySeries = data.months.map(m => data.city.monthly_totals[m] ?? null);
  const wMax = Math.max(...ward.trend.map(v => v ?? 0), 1);
  const cMax = Math.max(...citySeries.map(v => v ?? 0), 1);
  const x = (i: number) => (i / (n - 1)) * (W - 8);
  const wy = (v: number) => H - 6 - (v / wMax) * (H - 16);
  const cy = (v: number) => H - 6 - (v / cMax) * (H - 16);

  const wPts = ward.trend.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v != null);
  const cPts = citySeries.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v != null);

  return (
    <svg width="100%" height={H + 16} viewBox={`0 0 ${W} ${H + 16}`} style={{ display: 'block' }} role="img"
      aria-label={`${ward.ward_name} monthly offences over 36 months`}>
      {cPts.length > 1 && (
        <polyline points={cPts.map(p => `${x(p.i).toFixed(1)},${cy(p.v).toFixed(1)}`).join(' ')}
          fill="none" stroke="#c3c2b7" strokeWidth="1.2" />
      )}
      {wPts.length > 1 && (
        <polyline points={wPts.map(p => `${x(p.i).toFixed(1)},${wy(p.v).toFixed(1)}`).join(' ')}
          fill="none" stroke="#b01225" strokeWidth="2" />
      )}
      {wPts.length > 0 && (() => { const l = wPts[wPts.length - 1]; return (
        <text x={x(l.i)} y={wy(l.v) - 5} textAnchor="end" fontSize="8" fontFamily="IBM Plex Mono" fill="#b01225">{l.v}</text>
      ); })()}
      <text x={0} y={H + 12} fontSize="8.5" fontFamily="IBM Plex Mono" fill="#8a8f99">{data.months[0]}</text>
      <text x={W - 8} y={H + 12} textAnchor="end" fontSize="8.5" fontFamily="IBM Plex Mono" fill="#8a8f99">{data.as_of}</text>
    </svg>
  );
}

export default function CrimeObsDetailPanel({ ward: w, data, onClose }: Props) {
  const wards = data.wards;
  const maxRate = Math.max(...wards.map(x => x.rate_per_1000 ?? 0), 1);
  const withRate = wards.filter(x => x.rate_per_1000 != null);
  const avgRate = withRate.reduce((s, x) => s + (x.rate_per_1000 ?? 0), 0) / (withRate.length || 1);
  const rampIdx = Math.max(0, Math.min(9, Math.round(((w.rate_per_1000 ?? 0) / maxRate) * 9)));
  const rampColor = CRIME_RAMP[rampIdx];

  const cats = Object.entries(w.categories ?? {}).sort(([, a], [, b]) => b - a);
  const maxCat = cats[0]?.[1] ?? 1;

  return (
    <div>
      <div className="d-hdr">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="d-name">{w.ward_name}</div>
            <div className="d-sub">{w.ward_code}{w.population != null ? ` · Pop ${w.population.toLocaleString()}` : ''}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, padding: 2 }}>×</button>
        </div>

        <div className="d-chips">
          <Tip text="Recorded offences per 1,000 residents in the latest month (West Midlands Police, via City Observatory). Dividing the count by ONS population lets large and small wards be compared fairly. 'city avg' is the mean across wards.">
            <div className="d-chip">
              <div className="d-chip-lbl">Offences / 1000</div>
              <div className="d-chip-val" style={{ color: rampColor }}>{w.rate_per_1000 != null ? w.rate_per_1000.toFixed(1) : '—'}</div>
              <div className="d-chip-sub">city avg {avgRate.toFixed(1)}</div>
            </div>
          </Tip>
          <Tip text="The raw number of offences recorded in this ward in the latest month, before any population adjustment.">
            <div className="d-chip">
              <div className="d-chip-lbl">Offences ({data.as_of})</div>
              <div className="d-chip-val">{w.latest_count != null ? w.latest_count.toLocaleString() : '—'}</div>
              <div className="d-chip-sub">recorded</div>
            </div>
          </Tip>
          <Tip text="Where this ward sits among all Birmingham wards by offence rate. #1 = the highest recorded rate in the city.">
            <div className="d-chip">
              <div className="d-chip-lbl">City rank</div>
              <div className="d-chip-val">#{w.rank}</div>
              <div className="d-chip-sub">of {wards.length} wards</div>
            </div>
          </Tip>
          <Tip text="This ward's offence rate divided by the Birmingham ward average. 1.0× = exactly average; 2.0× = twice the city average.">
            <div className="d-chip">
              <div className="d-chip-lbl">vs city average</div>
              <div className="d-chip-val">{w.rate_per_1000 != null ? `${(w.rate_per_1000 / avgRate).toFixed(1)}×` : '—'}</div>
              <div className="d-chip-sub">{w.rate_per_1000 != null && w.rate_per_1000 >= avgRate ? 'above' : 'below'} average</div>
            </div>
          </Tip>
        </div>
      </div>

      <div className="d-sec">
        <div className="d-sec-ttl">36-month trend (raw monthly offences)</div>
        <TrendLine ward={w} data={data} />
        <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--muted2)', marginTop: 2 }}>
          Ward in red · city monthly total in gray (own scale). Counts are raw and seasonal — no smoothing.
        </div>
      </div>

      {cats.length > 0 && (
        <div className="d-sec" style={{ borderBottom: 'none' }}>
          <div className="d-sec-ttl">Category breakdown ({data.as_of})</div>
          <div className="crime-cats">
            {cats.map(([cat, count]) => (
              <div key={cat} className="crime-cat-row">
                <div className="crime-cat-lbl">{crimeObsLabel(cat)}</div>
                <div className="crime-cat-bar-wrap">
                  <div className="crime-cat-bar-fill" style={{ width: `${(count / maxCat) * 100}%`, background: crimeObsColor(cat) }} />
                </div>
                <div className="crime-cat-count">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="d-sec" style={{ borderBottom: 'none' }}>
        <div className="d-sec-ttl">Sources</div>
        {data.sources.map((s, i) => (
          <div key={i} style={{ padding: '8px 0', borderBottom: i < data.sources.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 4 }}>{s.publisher} · {s.licence} · {s.as_of}</div>
            <a href={s.catalogueUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#1a2a3a', textDecoration: 'underline' }}>View dataset ↗</a>
          </div>
        ))}
      </div>
    </div>
  );
}
