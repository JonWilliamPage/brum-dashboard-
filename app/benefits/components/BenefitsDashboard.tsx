'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { BenefitsData, UcWard } from '@/lib/types';
import { RAMP } from '@/lib/constants';
import ScoringNote from '../../components/brand/ScoringNote';
import BenefitsTable from './BenefitsTable';
import BenefitsDetailPanel from './BenefitsDetailPanel';
import BullAscii from '../../components/BullAscii';

const BenefitsMap = dynamic(() => import('./BenefitsMap'), { ssr: false });

// THE shared dashboard body. Rendered byte-for-byte identically in:
//   • the Review page (candidate data from a proposal), and
//   • the Dashboards shell (published data from public/data/uc-wards.json).
// Same component + same-shaped BenefitsData → the two pages cannot diverge.
type Sub = 'map' | 'table';

const emptyBull = (
  <div className="r-empty">
    <BullAscii
      textColor="#15181e"
      cols={40}
      rows={26}
      minAlpha={0.5}
      displayWidth={110}
      style={{ margin: 0 }}
    />
    <p>Select any ward to see its Universal Credit breakdown.</p>
  </div>
);

export default function BenefitsDashboard({ data }: { data: BenefitsData }) {
  const [sub, setSub] = useState<Sub>('table');
  const [selected, setSelected] = useState<UcWard | null>(null);
  const pick = (code: string) => setSelected(prev => prev?.ward_code === code ? null : (data.wards.find(w => w.ward_code === code) ?? null));

  return (
    <div className="body">
      <div className="lcol">
        <ScoringNote label="What you're seeing">
          Wards are shaded by the percentage of residents on Universal Credit — claimants (DWP,
          {' '}{data.as_of}) divided by ONS mid-2024 population. Darker = a higher share on UC; #1 = the
          highest in the city. Population-adjusted so large and small wards compare fairly.
        </ScoringNote>

        <div className="data-view-toolbar">
          <div className="legend-row">
            <span className="llbl" style={{ marginRight: 2 }}>Lower</span>
            {RAMP.map((c, i) => <div key={i} className="lsw" style={{ background: c }} />)}
            <span className="llbl" style={{ marginLeft: 2 }}>Higher — % on UC</span>
          </div>
        </div>

        <div className="sub-tab-bar">
          {([['table', 'Table'], ['map', 'Map']] as [Sub, string][]).map(([s, lbl]) => (
            <button key={s} className={`sub-tab${sub === s ? ' active' : ''}`} onClick={() => setSub(s)}>{lbl}</button>
          ))}
        </div>

        <div className="panel" style={{ flex: 1, position: 'relative' }}>
          <div className="panel-body">
            {sub === 'map'
              ? <BenefitsMap wards={data.wards} onSelect={pick} />
              : <BenefitsTable wards={data.wards} selected={selected} onSelect={pick} />}
          </div>
          <div className="bham-watermark">FORWARD · BIRMINGHAM</div>
        </div>
      </div>

      <div className="rcol">
        {selected
          ? <BenefitsDetailPanel ward={selected} wards={data.wards} sources={data.sources} onClose={() => setSelected(null)} />
          : emptyBull}
      </div>
    </div>
  );
}
