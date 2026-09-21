import { useMemo, useState } from 'react';
import type { Ward } from '@/lib/types';
import { Q_LABELS, dc } from '@/lib/constants';

interface Props {
  wards: Ward[];
  pinnedWards: string[];
  onTogglePin: (code: string) => void;
}

function WardPicker({ wards, pinnedWards, onTogglePin, onCompare }: Props & { onCompare: () => void }) {
  const [filter, setFilter] = useState('');

  const sorted = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const list = f ? wards.filter(w => w.ward_name.toLowerCase().includes(f)) : wards;
    return [...list].sort((a, b) => b.composite - a.composite);
  }, [wards, filter]);

  return (
    <div className="compare-picker">
      <div className="compare-picker-bar">
        <input
          type="text"
          className="compare-picker-search"
          placeholder="Search wards…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <button
          type="button"
          className="compare-go-btn"
          disabled={pinnedWards.length < 2}
          onClick={onCompare}
        >
          Compare {pinnedWards.length > 0 ? `(${pinnedWards.length})` : ''}
        </button>
      </div>
      <div className="compare-pick-list">
        {sorted.map(w => {
          const checked = pinnedWards.includes(w.ward_code);
          return (
            <label key={w.ward_code} className={`compare-pick-row${checked ? ' checked' : ''}`}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onTogglePin(w.ward_code)}
              />
              <span className="compare-pick-name">{w.ward_name}</span>
              <span className="compare-pick-score" style={{ color: dc(w.composite_decile) }}>
                {(w.composite * 100).toFixed(0)}
              </span>
            </label>
          );
        })}
        {sorted.length === 0 && (
          <div className="compare-pick-empty">No wards match &ldquo;{filter}&rdquo;.</div>
        )}
      </div>
    </div>
  );
}

export default function Compare({ wards, pinnedWards, onTogglePin }: Props) {
  const [mode, setMode] = useState<'idle' | 'picking' | 'comparing'>(pinnedWards.length >= 2 ? 'comparing' : 'idle');

  const ws = pinnedWards.map(c => wards.find(w => w.ward_code === c)).filter(Boolean) as Ward[];

  if (mode !== 'comparing' || ws.length < 2) {
    if (mode !== 'picking') {
      return (
        <div className="compare-setup">
          <div className="compare-empty">
            <span style={{ fontSize: 22, opacity: 0.3 }}>⊕</span>
            <span>Compare any number of wards side by side.</span>
            <button type="button" className="compare-select-btn" onClick={() => setMode('picking')}>
              Select wards to compare
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="compare-setup">
        <WardPicker wards={wards} pinnedWards={pinnedWards} onTogglePin={onTogglePin} onCompare={() => setMode('comparing')} />
      </div>
    );
  }

  const rows: { l: string; get: (w: Ward) => number | string; fmt: (w: Ward) => string; lower: boolean | null }[] = [
    { l: 'Composite score', get: w => w.composite * 100, fmt: w => (w.composite * 100).toFixed(0), lower: true },
    { l: 'Composite decile', get: w => w.composite_decile, fmt: w => `${w.composite_decile}/10`, lower: true },
    { l: 'Claimant rate', get: w => w.claimant_rate, fmt: w => `${w.claimant_rate}%`, lower: true },
    { l: 'IMD employment', get: w => w.imd_employment_score, fmt: w => `${(w.imd_employment_score * 100).toFixed(1)}%`, lower: true },
    { l: 'Inactivity (sick)', get: w => w.inactivity_sick_pct, fmt: w => `${w.inactivity_sick_pct}%`, lower: true },
    { l: 'GVA per head', get: w => w.gva, fmt: w => `£${w.gva.toFixed(1)}k`, lower: false },
    { l: 'Median earnings (est)', get: w => w.earnings, fmt: w => `£${w.earnings}k`, lower: false },
    { l: 'Quadrant', get: w => Q_LABELS[w.quadrant], fmt: w => Q_LABELS[w.quadrant], lower: null },
  ];

  const cls = (row: (typeof rows)[number], w: Ward) => {
    if (row.lower === null) return 'diff-neutral';
    const vals = ws.map(row.get) as number[];
    const best = row.lower ? Math.min(...vals) : Math.max(...vals);
    const worst = row.lower ? Math.max(...vals) : Math.min(...vals);
    const v = row.get(w) as number;
    if (best === worst) return 'diff-neutral';
    if (v === best) return 'diff-better';
    if (v === worst) return 'diff-worse';
    return 'diff-neutral';
  };

  return (
    <div className="compare-setup">
      <div className="compare-toolbar">
        <span className="compare-toolbar-lbl">Comparing {ws.length} wards</span>
        <button type="button" className="compare-edit-btn" onClick={() => setMode('picking')}>Edit selection</button>
      </div>
      <div className="compare-grid">
        {ws.map(w => (
          <div key={w.ward_code} className="compare-card">
            <div className="compare-hdr">
              <span className="compare-ward-name">{w.ward_name}</span>
              <button className="unpin-btn" onClick={() => onTogglePin(w.ward_code)}>× unpin</button>
            </div>
            {rows.map(r => (
              <div key={r.l} className="compare-row">
                <span className="compare-lbl">{r.l}</span>
                <span className={`compare-val ${cls(r, w)}`}>{r.fmt(w)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
