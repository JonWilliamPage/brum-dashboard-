'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { ChildPovertyData, ChildPovertyWard } from '@/lib/types';
import { RAMP } from '@/lib/constants';
import ScoringNote from '../../components/brand/ScoringNote';
import CpTable from './CpTable';
import CpStrip from './CpStrip';
import CpDumbbells from './CpDumbbells';
import CpDetailPanel from './CpDetailPanel';
import BullAscii from '../../components/BullAscii';

const CpMap = dynamic(() => import('./CpMap'), { ssr: false });

// THE shared dashboard body — rendered identically in /review and Dashboards.
type Sub = 'table' | 'strip' | 'change' | 'map';

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
    <p>Select any ward for its ten-year child-poverty path.</p>
  </div>
);

export default function ChildPovertyDashboard({ data }: { data: ChildPovertyData }) {
  const [sub, setSub] = useState<Sub>('table');
  const [selected, setSelected] = useState<ChildPovertyWard | null>(null);
  const pick = (code: string) => setSelected(prev => prev?.ward_code === code ? null : (data.wards.find(w => w.ward_code === code) ?? null));
  const hi = data.wards[0];

  return (
    <div className="body">
      <div className="lcol">
        <ScoringNote label="What you're seeing">
          The share of each ward&apos;s children (0–15) growing up in <strong>absolute low income</strong> —
          DWP/HMRC administrative data, {data.as_of}, native ward figures. City-wide the real figure is{' '}
          {data.city.city_latest ?? '—'}% against an England mean of {data.city.england_latest ?? '—'}%.
          The spread across the city runs {data.wards.at(-1)?.latest_pct}% to {hi?.latest_pct}% ({hi?.ward_name}).
          Darker = a higher share of children in low income.
        </ScoringNote>

        <div className="data-view-toolbar">
          <div className="legend-row">
            <span className="llbl" style={{ marginRight: 2 }}>Lower</span>
            {RAMP.map((c, i) => <div key={i} className="lsw" style={{ background: c }} />)}
            <span className="llbl" style={{ marginLeft: 2 }}>Higher — % of children in low income</span>
          </div>
        </div>

        <div className="sub-tab-bar">
          {([['table', 'Table'], ['strip', 'Distribution'], ['change', 'Change'], ['map', 'Map']] as [Sub, string][]).map(([s, lbl]) => (
            <button key={s} className={`sub-tab${sub === s ? ' active' : ''}`} onClick={() => setSub(s)}>{lbl}</button>
          ))}
        </div>

        <div className="panel" style={{ flex: 1, position: 'relative' }}>
          <div className="panel-body">
            {sub === 'table' && <CpTable data={data} selected={selected} onSelect={pick} />}
            {sub === 'strip' && <CpStrip data={data} selected={selected} onSelect={pick} />}
            {sub === 'change' && <CpDumbbells data={data} selected={selected} onSelect={pick} />}
            {sub === 'map' && <CpMap wards={data.wards} onSelect={pick} />}
          </div>
          <div className="bham-watermark">FORWARD · BIRMINGHAM</div>
        </div>
      </div>

      <div className="rcol">
        {selected
          ? <CpDetailPanel ward={selected} data={data} sources={data.sources} onClose={() => setSelected(null)} />
          : emptyBull}
      </div>
    </div>
  );
}
