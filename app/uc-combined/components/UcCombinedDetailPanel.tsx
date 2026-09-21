import type { UcCombinedWard, UcSource } from '@/lib/types';
import { RAMP } from '@/lib/constants';
import Tip from '../../components/Tip';
import FocusableChart from '../../components/FocusableChart';

// Ward detail: the full UC composition, rank, and provenance.
interface Props {
  ward: UcCombinedWard;
  wards: UcCombinedWard[];
  sources: UcSource[];
  onClose: () => void;
}

export default function UcCombinedDetailPanel({ ward: w, wards, sources, onClose }: Props) {
  const pct = w.pct_on_uc ?? 0;
  const maxPct = Math.max(...wards.map(x => x.pct_on_uc ?? 0), 1);
  const mean = (wards.reduce((s, x) => s + (x.pct_on_uc ?? 0), 0) / wards.length).toFixed(1);
  const rampColor = RAMP[Math.max(0, Math.min(9, Math.round((pct / maxPct) * 9)))];
  const rank = [...wards].sort((a, b) => (b.pct_on_uc ?? 0) - (a.pct_on_uc ?? 0))
    .findIndex(x => x.ward_code === w.ward_code) + 1;
  const inW = w.in_work_count ?? 0;
  const notW = w.not_in_work_count ?? 0;
  const notPct = w.uc_claimants ? Math.round((notW / w.uc_claimants) * 100) : null;

  return (
    <div>
      <div className="d-hdr">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="d-name">{w.ward_name}</div>
            <div className="d-sub">{w.ward_code} · Pop {w.population?.toLocaleString() ?? '—'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, padding: 2 }}>×</button>
        </div>

        <div className="d-chips">
          <Tip text="Everyone on Universal Credit for any reason — in work, unemployed, sick, or caring. Derived %: claimants ÷ all residents (ONS mid-2024).">
            <div className="d-chip">
              <div className="d-chip-lbl">On UC</div>
              <div className="d-chip-val" style={{ color: rampColor }}>{w.uc_claimants.toLocaleString()}</div>
              <div className="d-chip-sub">{w.pct_on_uc != null ? `${w.pct_on_uc}% of residents · mean ${mean}%` : '—'}</div>
            </div>
          </Tip>
          <Tip text="Claimants also in paid work — UC tops up their wages. Derived: claimants × DWP's in-employment % ÷ 100.">
            <div className="d-chip">
              <div className="d-chip-lbl">In work</div>
              <div className="d-chip-val" style={{ color: '#16306f' }}>{w.in_work_count?.toLocaleString() ?? '—'}</div>
              <div className="d-chip-sub">{w.pct_in_employment != null ? `${w.pct_in_employment}% of claimants` : '—'}</div>
            </div>
          </Tip>
          <Tip text="Claimants NOT in employment — unemployed job-seekers plus those with no work requirements (sickness, disability, caring). Derived: claimants − in-work.">
            <div className="d-chip">
              <div className="d-chip-lbl">Not in work</div>
              <div className="d-chip-val" style={{ color: 'var(--herald-red)' }}>{w.not_in_work_count?.toLocaleString() ?? '—'}</div>
              <div className="d-chip-sub">{notPct != null ? `${notPct}% of claimants` : '—'}</div>
            </div>
          </Tip>
          <Tip text="Rank among the 69 wards by % of residents on UC. #1 = highest share.">
            <div className="d-chip">
              <div className="d-chip-lbl">City rank</div>
              <div className="d-chip-val">#{rank}</div>
              <div className="d-chip-sub">of {wards.length} wards</div>
            </div>
          </Tip>
        </div>
      </div>

      <div className="d-sec">
        <div className="d-sec-ttl">Claimant composition</div>
        <FocusableChart title={`${w.ward_name} — Claimant composition`}>
          <div className="comp-track" style={{ height: 26 }}>
            <div className="comp-seg" style={{ width: `${w.uc_claimants ? (inW / w.uc_claimants) * 100 : 0}%`, background: '#16306f' }} />
            <div className="comp-seg" style={{ width: `${w.uc_claimants ? (notW / w.uc_claimants) * 100 : 0}%`, background: '#b01225' }} />
          </div>
        </FocusableChart>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', marginTop: 4 }}>
          <span>in work {inW.toLocaleString()}</span>
          <span>not in work {notW.toLocaleString()}</span>
        </div>
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
