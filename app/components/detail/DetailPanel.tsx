import type { Ward, DataSources } from '@/lib/types';
import { dc, Q_COLORS, rankOf, quadrantSummary } from '@/lib/constants';
import { extras } from '@/lib/synth';
import TrendChart from './TrendChart';
import Tip from '../Tip';
import FocusableChart from '../FocusableChart';

interface Props {
  ward: Ward;
  wards: Ward[];
  dsrc: DataSources;
  isPinned: boolean;
  onPin: () => void;
  onClose: () => void;
  trendMode: '12m' | 'pandemic';
  onTrendMode: (m: '12m' | 'pandemic') => void;
}

export default function DetailPanel({ ward: w, wards, dsrc, isPinned, onPin, onClose, trendMode, onTrendMode }: Props) {
  const c = dc(w.composite_decile);
  const avgCC = (wards.reduce((s, x) => s + x.claimant_rate, 0) / wards.length).toFixed(1);
  const avgEarn = Math.round(wards.reduce((s, x) => s + x.earnings, 0) / wards.length);
  const ex = extras(w);
  const qCol = Q_COLORS[w.quadrant];
  const gvaRank = rankOf(wards, w, 'gva', true);
  const depRank = rankOf(wards, w, 'imd_employment_score', true);
  const gvaMax = Math.max(...wards.map(x => x.gva));
  const gvaAvg = wards.reduce((s, x) => s + x.gva, 0) / wards.length;
  const earnPos = Math.min(100, (w.earnings / 55) * 100);
  const earnRefPos = Math.min(100, (avgEarn / 55) * 100);
  const gvaPos = Math.min(100, (w.gva / gvaMax) * 100);
  const gvaRefPos = Math.min(100, (gvaAvg / gvaMax) * 100);

  return (
    <div>
      <div className="d-hdr">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="d-name">{w.ward_name}</div>
            <div className="d-sub">{w.ward_code} · Decile {w.composite_decile}/10 · Pop {w.population.toLocaleString()}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, padding: 2 }}>×</button>
        </div>

        <div className="q-banner" style={{ borderColor: qCol, background: qCol + '0d' }}>
          <div className="q-banner-txt">{quadrantSummary(wards, w)}</div>
        </div>

        <div className="d-chips">
          <Tip text="GVA (Gross Value Added) per head is the value of all goods and services produced in the ward each year, divided by its population — a measure of workplace economic output. Higher means more productive. Rank is out of 68 Birmingham wards.">
            <div className="d-chip">
              <div className="d-chip-lbl">GVA per head</div>
              <div className="d-chip-val">£{w.gva.toFixed(1)}k</div>
              <div className="d-chip-sub">rank {gvaRank}/68</div>
            </div>
          </Tip>
          <Tip text="The IMD 2025 Employment domain measures the share of working-age residents involuntarily out of work (claiming benefits, incapacity or caring). Higher % = more employment deprivation. Rank 1 = the most deprived ward in the city.">
            <div className="d-chip">
              <div className="d-chip-lbl">IMD employment</div>
              <div className="d-chip-val">{(w.imd_employment_score * 100).toFixed(1)}%</div>
              <div className="d-chip-sub">rank {depRank} most deprived</div>
            </div>
          </Tip>
          <Tip text="Claimant count — the % of working-age residents claiming unemployment-related benefits (Universal Credit / JSA), from NOMIS. LIVE = fetched this load; CACHED = embedded snapshot. 'avg' is the Birmingham mean.">
            <div className="d-chip">
              <div className="d-chip-lbl">
                Claimant{' '}
                <span style={{ fontSize: 8, background: dsrc.nomis === 'live' ? '#1a3a2a14' : '#7d4e3614', color: dsrc.nomis === 'live' ? 'var(--q-prosp)' : '#7d4e36', border: `1px solid ${dsrc.nomis === 'live' ? '#1a3a2a44' : '#7d4e3644'}`, padding: '1px 5px', fontFamily: 'var(--mono)', marginLeft: 5 }}>
                  {dsrc.nomis === 'live' ? 'LIVE' : 'CACHED'}
                </span>
              </div>
              <div className="d-chip-val">{w.claimant_rate}%</div>
              <div className="d-chip-sub">avg {avgCC}%</div>
            </div>
          </Tip>
          <Tip text="Estimated median resident earnings (£, thousands per year), modelled from the ward's deprivation profile — an estimate, not official ASHE earnings data (hence 'est'). 'avg' is the Birmingham mean.">
            <div className="d-chip">
              <div className="d-chip-lbl">Median earnings</div>
              <div className="d-chip-val">£{w.earnings}k</div>
              <div className="d-chip-sub">est · avg £{avgEarn}k</div>
            </div>
          </Tip>
        </div>

        <button className={`pin-btn${isPinned ? ' pinned' : ''}`} onClick={onPin}>
          {isPinned ? '▣ Pinned for Compare — click to unpin' : '□ Pin for Compare'}
        </button>
      </div>

      <div className="d-sec">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div className="d-sec-ttl" style={{ marginBottom: 0 }}>Claimant count trend</div>
          <div className="trend-toggle">
            <button className={`tt-btn${trendMode === '12m' ? ' active' : ''}`} onClick={() => onTrendMode('12m')}>12M</button>
            <button className={`tt-btn${trendMode === 'pandemic' ? ' active' : ''}`} onClick={() => onTrendMode('pandemic')}>2019–NOW</button>
          </div>
        </div>
        <FocusableChart title={`${w.ward_name} — Claimant count trend`}>
          <div className="d-chart-wrap">
            <TrendChart ward={w} wards={wards} trendMode={trendMode} />
          </div>
        </FocusableChart>
      </div>

      <div className="d-sec">
        <div className="d-sec-ttl">Position vs Birmingham average</div>
        <div className="meter-row">
          {[
            { lbl: 'GVA per head', pos: gvaPos, refPos: gvaRefPos, fill: qCol, val: `£${w.gva.toFixed(0)}k` },
            { lbl: 'IMD employment', pos: w.imd_norm * 100, refPos: null, fill: '#1a2a3a', val: `${(w.imd_employment_score * 100).toFixed(0)}%` },
            { lbl: 'Claimant rate', pos: w.cc_norm * 100, refPos: null, fill: '#7d4e36', val: `${w.claimant_rate}%` },
            { lbl: 'Inactivity (sick)', pos: w.ia_norm * 100, refPos: null, fill: '#2a1a3a', val: `${w.inactivity_sick_pct}%` },
            { lbl: 'Median earnings', pos: earnPos, refPos: earnRefPos, fill: qCol, val: `£${w.earnings}k` },
          ].map(m => (
            <div key={m.lbl} className="meter-item">
              <span className="meter-lbl">{m.lbl}</span>
              <div className="meter-track">
                <div className="meter-fill" style={{ width: `${m.pos}%`, background: m.fill }} />
                {m.refPos != null && <div className="meter-ref" style={{ left: `${m.refPos}%` }} />}
              </div>
              <span className="meter-val">{m.val}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 8, lineHeight: 1.4 }}>
          Earnings estimated from ward deprivation profile. Vertical line = Birmingham average.
        </div>
      </div>

      <div className="d-sec">
        <div className="d-sec-ttl">Additional indicators <span style={{ color: 'var(--muted2)', fontSize: 8 }}>(modelled)</span></div>
        <div className="extra-metrics">
          {[
            { lbl: 'Youth unemp 16–24', val: `${ex.youth_unemp}%`, sub: 'est NOMIS NM_162_1' },
            { lbl: 'UC claimants', val: `${ex.uc_pct}%`, sub: 'est DWP Stat-Xplore' },
            { lbl: 'No qualifications', val: `${ex.no_quals}%`, sub: 'est Census 2021 TS067' },
            { lbl: 'Vacancies / 1000', val: String(ex.vacancies), sub: 'est ONS' },
          ].map(m => (
            <div key={m.lbl} className="em-card">
              <div className="em-lbl">{m.lbl}</div>
              <div className="em-val">{m.val}</div>
              <div className="em-sub">{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="d-sec" style={{ borderBottom: 'none' }}>
        <div className="d-sec-ttl">Composite weights</div>
        <div style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 2, fontFamily: 'var(--mono)' }}>
          IMD empl × 0.40 = {(w.imd_norm * 0.4).toFixed(3)}<br />
          Claimant × 0.35 = {(w.cc_norm * 0.35).toFixed(3)}<br />
          Inactive × 0.25 = {(w.ia_norm * 0.25).toFixed(3)}<br />
          <span style={{ borderTop: '1px solid var(--border)', display: 'block', paddingTop: 4, marginTop: 2 }}>
            Score = <b style={{ color: 'var(--ink)' }}>{w.composite.toFixed(3)}</b> → decile <b style={{ color: c }}>{w.composite_decile}</b>
          </span>
        </div>
      </div>
    </div>
  );
}
