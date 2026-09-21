'use client';

import { useState } from 'react';
import type { EducationWard } from '@/lib/types';

type SortKey = 'ward_name' | 'qual_none' | 'qual_level4plus' | 'qual_level3' | 'qual_level2' | 'qual_apprenticeship' | 'qual_level1' | 'skills_decile';

interface Props {
  wards: EducationWard[];
  selected: EducationWard | null;
  onSelect: (code: string) => void;
}

const COLS: { key: SortKey; label: string; title: string }[] = [
  { key: 'ward_name',        label: 'Ward',         title: 'Ward name' },
  { key: 'qual_none',        label: 'No quals',      title: '% with no qualifications' },
  { key: 'qual_level1',      label: 'Level 1',       title: '% Level 1 / entry level' },
  { key: 'qual_level2',      label: 'Level 2',       title: '% Level 2 (e.g. GCSE A*–C)' },
  { key: 'qual_apprenticeship', label: 'Apprent.',   title: '% Apprenticeship' },
  { key: 'qual_level3',      label: 'Level 3',       title: '% Level 3 (e.g. A-level, BTEC)' },
  { key: 'qual_level4plus',  label: 'Level 4+',      title: '% Level 4+ (degree level and above)' },
  { key: 'skills_decile',    label: 'Skills',        title: 'Skills decile by % no qualifications (10 = most deprived)' },
];

const RAMP = ['#7a8270','#7a7a5e','#7d6e4e','#7e5e40','#7d4e36','#73402e','#683428','#5b2a23','#4d211d','#3a1a1a'];

function decileColor(d: number): string {
  return RAMP[Math.max(0, Math.min(9, (d || 1) - 1))];
}

export default function QualTable({ wards, selected, onSelect }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('qual_none');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(key === 'ward_name'); }
  };

  const sorted = [...wards].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (typeof av === 'string') return sortAsc ? av.localeCompare(String(bv)) : String(bv).localeCompare(av);
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  return (
    <div className="scroll-release-x" style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
      <table className="data-table" style={{ minWidth: 720 }}>
        <thead>
          <tr>
            {COLS.map(c => (
              <th key={c.key} title={c.title} onClick={() => handleSort(c.key)} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {c.label}{sortKey === c.key ? (sortAsc ? ' ↑' : ' ↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(w => {
            const isSelected = selected?.ward_code === w.ward_code;
            return (
              <tr
                key={w.ward_code}
                className={isSelected ? 'selected' : ''}
                onClick={() => onSelect(w.ward_code)}
                style={{ cursor: 'pointer' }}
              >
                <td style={{ fontFamily: 'var(--serif)', fontSize: 13 }}>{w.ward_name}</td>
                <td style={{ fontWeight: 500, color: w.qual_none > 30 ? '#3a1a1a' : 'inherit' }}>{w.qual_none.toFixed(1)}%</td>
                <td>{w.qual_level1.toFixed(1)}%</td>
                <td>{w.qual_level2.toFixed(1)}%</td>
                <td>{w.qual_apprenticeship.toFixed(1)}%</td>
                <td>{w.qual_level3.toFixed(1)}%</td>
                <td style={{ fontWeight: 500, color: w.qual_level4plus > 40 ? '#1a3a2a' : 'inherit' }}>{w.qual_level4plus.toFixed(1)}%</td>
                <td>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 0, background: decileColor(w.skills_decile), marginRight: 5, verticalAlign: 'middle' }} />
                  {w.skills_decile}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
