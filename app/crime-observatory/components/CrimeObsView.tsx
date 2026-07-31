'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { CrimeObsData, CrimeObsWard } from '@/lib/types';
import { CRIME_RAMP } from '@/lib/constants';
import ScoringNote from '../../components/brand/ScoringNote';
import CrimeObsTable from './CrimeObsTable';
import CrimeObsTrend from './CrimeObsTrend';
import CrimeObsMix from './CrimeObsMix';
import CrimeObsOutcomes from './CrimeObsOutcomes';
import CrimeObsDetailPanel from './CrimeObsDetailPanel';

const CrimeObsMap = dynamic(() => import('./CrimeObsMap'), { ssr: false });

// THE shared dashboard body. Rendered byte-for-byte identically in:
//   • the Review page (candidate data from a proposal), and
//   • the Dashboards shell (published data from public/data/crime-observatory.json).
// Same component + same-shaped CrimeObsData → the two pages cannot diverge.
type Sub = 'table' | 'trend' | 'mix' | 'outcomes' | 'map';

const emptyBull = (
  <div className="r-empty">
    <div className="ascii-ward">{`┌─────────────────────┐
 │  (\\/)  (\\/)         │
 │   \\  \\/  /          │
 │ .--\\----/--.        │
 │/  ( o)(o)  \\        │
 │|    (---)   |       │
 │ \\___________/       │
 └─────────────────────┘`}</div>
    <p>Select any ward to see its crime breakdown, 36-month trend and outcomes.</p>
    <p style={{ fontFamily: 'var(--mono)', fontSize: 9, fontStyle: 'normal', color: 'rgba(14,15,17,.18)', letterSpacing: '.18em' }}>THE BULL OF BIRMINGHAM</p>
  </div>
);

export default function CrimeObsView({ data }: { data: CrimeObsData }) {
  const [sub, setSub] = useState<Sub>('table');
  const [selected, setSelected] = useState<CrimeObsWard | null>(null);
  const pick = (code: string) =>
    setSelected(prev => (prev?.ward_code === code ? null : data.wards.find(w => w.ward_code === code) ?? null));

  return (
    <div className="body">
      <div className="lcol">
        <ScoringNote label="What you're seeing">
          Wards are shaded by recorded offences per 1,000 residents ({data.as_of}) — the count
          (West Midlands Police, via City Observatory) divided by ONS mid-2024 population.
          Darker = a higher rate; #1 = the highest in the city. The Trend tab shows 36 months of
          raw recorded offences by category; Outcomes shows how the latest month's cases were
          disposed. Nothing is modelled or smoothed.
        </ScoringNote>

        <div className="data-view-toolbar">
          <div className="legend-row">
            <span className="llbl" style={{ marginRight: 2 }}>Lower</span>
            {CRIME_RAMP.map((c, i) => <div key={i} className="lsw" style={{ background: c }} />)}
            <span className="llbl" style={{ marginLeft: 2 }}>Higher — offences / 1,000</span>
          </div>
        </div>

        <div className="sub-tab-bar">
          {([['table', 'Table'], ['trend', 'Trend'], ['mix', 'Category mix'], ['outcomes', 'Outcomes'], ['map', 'Map']] as [Sub, string][]).map(([s, lbl]) => (
            <button key={s} className={`sub-tab${sub === s ? ' active' : ''}`} onClick={() => setSub(s)}>{lbl}</button>
          ))}
        </div>

        <div className="panel" style={{ flex: 1, position: 'relative' }}>
          <div className="panel-body">
            {sub === 'table' && <CrimeObsTable data={data} selected={selected} onSelect={pick} />}
            {sub === 'trend' && <CrimeObsTrend data={data} selected={selected} />}
            {sub === 'mix' && <CrimeObsMix data={data} onSelect={pick} />}
            {sub === 'outcomes' && <CrimeObsOutcomes data={data} />}
            {sub === 'map' && <CrimeObsMap wards={data.wards} onSelect={pick} />}
          </div>
          <div className="bham-watermark">FORWARD · BIRMINGHAM</div>
        </div>
      </div>

      <div className="rcol">
        {selected
          ? <CrimeObsDetailPanel ward={selected} data={data} onClose={() => setSelected(null)} />
          : emptyBull}
      </div>
    </div>
  );
}
