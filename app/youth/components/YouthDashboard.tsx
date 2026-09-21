'use client';

import { useState } from 'react';
import type { Ward } from '@/lib/types';
import NeetGrid from './NeetGrid';
import NeetTable from './NeetTable';
import FocusableChart from '../../components/FocusableChart';

type Sub = 'grid' | 'table';

interface Props {
  wards: Ward[];
  selected: Ward | null;
  onSelect: (code: string) => void;
}

export default function YouthDashboard({ wards, selected, onSelect }: Props) {
  const [sub, setSub] = useState<Sub>('grid');

  const sorted = [...wards].sort((a, b) => b.neet_risk_score - a.neet_risk_score);
  const highestRisk = sorted[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Milburn review banner */}
      <div className="milburn-banner">
        <div className="mb-label">MILBURN REVIEW</div>
        <div className="mb-text">
          Government independent investigation into youth inactivity — launched Nov 2025.
          Led by Alan Milburn. Focuses on mental health and disability as barriers.
        </div>
        <div className="mb-timeline">
          <span className="mb-milestone mb-done">▸ Launched Nov 2025</span>
          <span className="mb-line">————</span>
          <span className="mb-milestone mb-upcoming">◎ Interim findings Spring 2026</span>
          <span className="mb-line">————</span>
          <span className="mb-milestone mb-future">◎ Final report Summer 2026</span>
        </div>
      </div>

      {/* Sub-tab bar + modelled note */}
      <div className="sub-hdr">
        <div className="sub-tab-bar">
          <button className={`sub-tab${sub === 'grid' ? ' active' : ''}`} onClick={() => setSub('grid')}>Grid</button>
          <button className={`sub-tab${sub === 'table' ? ' active' : ''}`} onClick={() => setSub('table')}>Table</button>
        </div>
        <div className="sub-hdr-note">
          Showing NEET risk index — modelled composite, not an official rate.
          Highest risk ward: <strong>{highestRisk?.ward_name}</strong> (decile {highestRisk?.neet_risk_decile}/10)
        </div>
      </div>

      {/* Grid / table — selection flows up to the shared right-side detail panel */}
      <div className="scroll-release" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {sub === 'grid' && (
          <FocusableChart title="Youth &amp; NEET Grid">
            <NeetGrid wards={wards} selected={selected} onSelect={onSelect} />
          </FocusableChart>
        )}
        {sub === 'table' && (
          <FocusableChart title="Youth &amp; NEET Table">
            <NeetTable wards={wards} selected={selected} onSelect={onSelect} />
          </FocusableChart>
        )}
      </div>

    </div>
  );
}
