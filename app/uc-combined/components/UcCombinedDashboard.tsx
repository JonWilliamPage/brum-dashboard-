'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { UcCombinedData, UcCombinedWard } from '@/lib/types';
import { RAMP } from '@/lib/constants';
import ScoringNote from '../../components/brand/ScoringNote';
import UcCombinedTable from './UcCombinedTable';
import UcCombinedComposition from './UcCombinedComposition';
import UcCombinedDetailPanel from './UcCombinedDetailPanel';
import BullAscii from '../../components/BullAscii';

const UcCombinedMap = dynamic(() => import('./UcCombinedMap'), { ssr: false });

// THE shared dashboard body — rendered identically in /review and Dashboards.
type Sub = 'table' | 'composition' | 'map';

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
    <p>Select any ward for its full UC composition.</p>
  </div>
);

export default function UcCombinedDashboard({ data }: { data: UcCombinedData }) {
  const [sub, setSub] = useState<Sub>('table');
  const [selected, setSelected] = useState<UcCombinedWard | null>(null);
  const pick = (code: string) => setSelected(prev => prev?.ward_code === code ? null : (data.wards.find(w => w.ward_code === code) ?? null));

  return (
    <div className="body">
      <div className="lcol">
        <ScoringNote label="What you're seeing">
          The full Universal Credit picture ({data.as_of}, DWP): {data.city.total.toLocaleString()} people
          on UC city-wide ({data.city.pct_pop}% of all residents) — {data.city.in_work.toLocaleString()} of
          them in paid work, <strong>{data.city.not_in_work.toLocaleString()} not in work
          ({data.city.pct_not_in_work}% of claimants)</strong>. In-work and not-in-work figures are derived
          from DWP&apos;s claimant count × its in-employment share, same month. Not the same as the
          Claimant Count dashboard — that counts only claimants required to seek work.
        </ScoringNote>

        <div className="data-view-toolbar">
          <div className="legend-row">
            <span className="llbl" style={{ marginRight: 2 }}>Lower</span>
            {RAMP.map((c, i) => <div key={i} className="lsw" style={{ background: c }} />)}
            <span className="llbl" style={{ marginLeft: 2 }}>Higher — % of residents on UC</span>
          </div>
        </div>

        <div className="sub-tab-bar">
          {([['table', 'Table'], ['composition', 'Composition'], ['map', 'Map']] as [Sub, string][]).map(([s, lbl]) => (
            <button key={s} className={`sub-tab${sub === s ? ' active' : ''}`} onClick={() => setSub(s)}>{lbl}</button>
          ))}
        </div>

        <div className="panel" style={{ flex: 1, position: 'relative' }}>
          <div className="panel-body">
            {sub === 'table' && <UcCombinedTable wards={data.wards} selected={selected} onSelect={pick} />}
            {sub === 'composition' && <UcCombinedComposition wards={data.wards} selected={selected} onSelect={pick} />}
            {sub === 'map' && <UcCombinedMap wards={data.wards} onSelect={pick} />}
          </div>
          <div className="bham-watermark">FORWARD · BIRMINGHAM</div>
        </div>
      </div>

      <div className="rcol">
        {selected
          ? <UcCombinedDetailPanel ward={selected} wards={data.wards} sources={data.sources} onClose={() => setSelected(null)} />
          : emptyBull}
      </div>
    </div>
  );
}
