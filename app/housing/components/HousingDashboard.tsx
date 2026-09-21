'use client';
import { useState } from 'react';
import type { HousingWard } from '@/lib/types';
import HousingGrid from './HousingGrid';
import HousingTable from './HousingTable';
import FocusableChart from '../../components/FocusableChart';

type Tab = 'grid' | 'table';

interface Props {
  wards: HousingWard[];
  selected: string | null;
  onSelect: (code: string) => void;
}

export default function HousingDashboard({ wards, selected, onSelect }: Props) {
  const [tab, setTab] = useState<Tab>('grid');

  const highestWard = [...wards].sort((a, b) => b.housing_pressure_score - a.housing_pressure_score)[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Sub-tabs + note */}
      <div className="sub-hdr">
        <div className="sub-tab-bar">
          <button className={`sub-tab${tab === 'grid' ? ' active' : ''}`} onClick={() => setTab('grid')}>Grid</button>
          <button className={`sub-tab${tab === 'table' ? ' active' : ''}`} onClick={() => setTab('table')}>Table</button>
        </div>
        <div className="sub-hdr-note">
          Showing housing pressure index — modelled composite, not an official measure.
          Highest pressure ward: <strong>{highestWard?.ward_name}</strong> (decile {highestWard?.housing_pressure_decile}/10)
        </div>
      </div>

      {/* Grid / table — selection flows up to the shared right-side detail panel */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {tab === 'grid' && (
          <FocusableChart title="Housing Grid">
            <HousingGrid wards={wards} selected={selected} onSelect={onSelect} />
          </FocusableChart>
        )}
        {tab === 'table' && (
          <FocusableChart title="Housing Table">
            <HousingTable wards={wards} selected={selected} onSelect={onSelect} />
          </FocusableChart>
        )}
      </div>

    </div>
  );
}
