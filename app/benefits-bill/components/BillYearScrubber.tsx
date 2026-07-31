'use client';

import type { BillYear } from '@/lib/types';

interface Props {
  history: BillYear[];
  year: string;
  onChange: (year: string) => void;
}

export default function BillYearScrubber({ history, year, onChange }: Props) {
  if (history.length < 2) return null;
  const idx = Math.max(0, history.findIndex(h => h.year === year));
  const h = history[idx] ?? history[history.length - 1];

  return (
    <div className="bill-scrub">
      <div className="bill-scrub-top">
        <span className="bill-sec-ttl" style={{ margin: 0 }}>Year scrubber</span>
        <span className="bill-scrub-year">{h.year}</span>
        <span className="bill-scrub-total">
          £{h.total_m >= 1000 ? `${(h.total_m / 1000).toFixed(2)}bn` : `${h.total_m.toFixed(0)}m`} cash
        </span>
      </div>
      <input
        type="range"
        className="bill-scrub-range"
        min={0}
        max={history.length - 1}
        step={1}
        value={idx}
        onChange={e => onChange(history[Number(e.target.value)]?.year ?? year)}
        aria-label="Scrub benefits bill year"
        aria-valuetext={h.year}
      />
      <div className="bill-scrub-ends">
        <span>{history[0].year}</span>
        <span>{history[history.length - 1].year}</span>
      </div>
    </div>
  );
}
