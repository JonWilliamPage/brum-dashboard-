'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { UcEmpData, UcEmpWard } from '@/lib/types';
import { RAMP } from '@/lib/constants';
import ScoringNote from '../../components/brand/ScoringNote';
import UcEmpTable from './UcEmpTable';
import UcEmpDetailPanel from './UcEmpDetailPanel';
import BullAscii from '../../components/BullAscii';

const UcEmpMap = dynamic(() => import('./UcEmpMap'), { ssr: false });

// THE shared dashboard body — rendered identically in /review (candidate) and the
// Dashboards shell (published). Same component + same-shaped data ⇒ no divergence.
type Sub = 'table' | 'map';

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
    <p>Select any ward to see its in-work breakdown.</p>
  </div>
);

export default function UcEmpDashboard({ data }: { data: UcEmpData }) {
  const [sub, setSub] = useState<Sub>('table');
  const [selected, setSelected] = useState<UcEmpWard | null>(null);
  const pick = (code: string) => setSelected(prev => prev?.ward_code === code ? null : (data.wards.find(w => w.ward_code === code) ?? null));

  return (
    <div className="body">
      <div className="lcol">
        <ScoringNote label="What you're seeing">
          The share of each ward&apos;s Universal Credit claimants who are also in paid work — the
          &ldquo;in-work poverty&rdquo; lens (DWP, {data.as_of}). Darker = a higher share working
          while claiming; #1 = the highest. The ward mean is {data.ward_mean_pct}%.
        </ScoringNote>

        <div className="data-view-toolbar">
          <div className="legend-row">
            <span className="llbl" style={{ marginRight: 2 }}>Lower</span>
            {RAMP.map((c, i) => <div key={i} className="lsw" style={{ background: c }} />)}
            <span className="llbl" style={{ marginLeft: 2 }}>Higher — % in work</span>
          </div>
        </div>

        <div className="sub-tab-bar">
          {([['table', 'Table'], ['map', 'Map']] as [Sub, string][]).map(([s, lbl]) => (
            <button key={s} className={`sub-tab${sub === s ? ' active' : ''}`} onClick={() => setSub(s)}>{lbl}</button>
          ))}
        </div>

        <div className="panel" style={{ flex: 1, position: 'relative' }}>
          <div className="panel-body">
            {sub === 'table'
              ? <UcEmpTable wards={data.wards} selected={selected} onSelect={pick} />
              : <UcEmpMap wards={data.wards} onSelect={pick} />}
          </div>
          <div className="bham-watermark">FORWARD · BIRMINGHAM</div>
        </div>
      </div>

      <div className="rcol">
        {selected
          ? <UcEmpDetailPanel ward={selected} wards={data.wards} sources={data.sources} onClose={() => setSelected(null)} />
          : emptyBull}
      </div>
    </div>
  );
}
