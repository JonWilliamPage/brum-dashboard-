import type { ConMoneyConstituency, ConMoneyData } from '@/lib/types';
import FocusableChart from '../../components/FocusableChart';

// Constituency detail — every benefit's real £, ranked; UC mini-trend; rank/share chips.
interface Props {
  constituency: ConMoneyConstituency;
  data: ConMoneyData;
  onClose: () => void;
}

const fmt = (m: number) => (m >= 1000 ? `£${(m / 1000).toFixed(2)}bn` : `£${m.toFixed(m < 10 ? 1 : 0)}m`);

export default function ConMoneyDetailPanel({ constituency: c, data, onClose }: Props) {
  const rank = data.constituencies.findIndex(x => x.code === c.code) + 1;
  const entries = Object.entries(c.benefits)
    .map(([id, v]) => ({ id, label: data.benefit_labels[id] ?? id, v }))
    .sort((a, b) => b.v - a.v);
  const maxV = Math.max(...entries.map(e => e.v), 1);
  const t = c.uc_trend ?? [];

  return (
    <div>
      <div className="d-hdr">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="d-name">{c.name.replace('Birmingham ', '')}</div>
            <div className="d-sub">{c.code} · {data.year}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, padding: 2 }}>×</button>
        </div>
        <div className="d-chips">
          <div className="d-chip">
            <div className="d-chip-lbl">DWP money</div>
            <div className="d-chip-val" style={{ color: 'var(--herald-navy)' }}>{fmt(c.total_m)}</div>
            <div className="d-chip-sub">per year, {data.year}</div>
          </div>
          <div className="d-chip">
            <div className="d-chip-lbl">Rank</div>
            <div className="d-chip-val">#{rank}</div>
            <div className="d-chip-sub">of 9 constituencies</div>
          </div>
          <div className="d-chip">
            <div className="d-chip-lbl">Share of 9</div>
            <div className="d-chip-val">{((c.total_m / data.city.sum_m) * 100).toFixed(1)}%</div>
            <div className="d-chip-sub">of {fmt(data.city.sum_m)}</div>
          </div>
        </div>
      </div>

      <div className="d-sec">
        <div className="d-sec-ttl">Every benefit (real £, checksum-validated)</div>
        {entries.map(e => (
          <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 58px', alignItems: 'center', gap: 8, padding: '3px 0' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={e.label}>{e.label}</span>
            <div className="mini-bar-bg">
              <div className="mini-bar-fill" style={{ width: `${(e.v / maxV) * 100}%`, background: 'var(--herald-navy)' }} />
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, textAlign: 'right' }}>{fmt(e.v)}</span>
          </div>
        ))}
      </div>

      {t.length >= 2 && (
        <div className="d-sec">
          <div className="d-sec-ttl">Universal Credit, {data.uc_years[0]} → {data.uc_years.at(-1)}</div>
          <FocusableChart title={`${c.name} — Universal Credit trend`}>
          <svg width="100%" height="74" viewBox="0 0 252 74" style={{ display: 'block' }}>
            {(() => {
              const max = Math.max(...t, 1);
              const x = (i: number) => 2 + (i / (t.length - 1)) * 200;
              const y = (v: number) => 66 - (v / max) * 54;
              return (
                <>
                  <polyline points={t.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')} fill="none" stroke="#2a55bf" strokeWidth="2" />
                  <circle cx={x(t.length - 1)} cy={y(t.at(-1)!)} r="2.6" fill="#b01225" />
                  <text x={x(t.length - 1) + 5} y={y(t.at(-1)!) + 3} fontSize="9" fontFamily="IBM Plex Mono" fill="#15181e">£{Math.round(t.at(-1)!)}m</text>
                </>
              );
            })()}
          </svg>
          </FocusableChart>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--muted2)' }}>
            <span>{data.uc_years[0]} £{Math.round(t[0])}m</span>
            <span>×{(t.at(-1)! / (t[0] || 1)).toFixed(1)} in {t.length} years</span>
          </div>
        </div>
      )}

      <div className="d-sec" style={{ borderBottom: 'none' }}>
        <div className="d-sec-ttl">Sources</div>
        {data.sources.map((s, i) => (
          <div key={i} style={{ padding: '8px 0', borderBottom: i < data.sources.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 4 }}>{s.publisher} · {s.licence} · {s.as_of}</div>
            <a href={s.catalogueUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#1a2a3a', textDecoration: 'underline' }}>Download the exact workbook ↗</a>
          </div>
        ))}
      </div>
    </div>
  );
}
