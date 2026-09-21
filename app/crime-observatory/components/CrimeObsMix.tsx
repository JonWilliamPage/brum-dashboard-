'use client';

import type { CrimeObsData } from '@/lib/types';
import { crimeObsLabel, crimeObsColor } from '@/lib/constants';
import FocusableChart from '../../components/FocusableChart';
import PieChart from '../../components/PieChart';

// Category mix — two honest forms for one moment in time:
//   1. a pie of the city's latest-month composition (part-to-whole), and
//   2. a ranked bar list of every category with its count and share.
// Counts are raw recorded offences for the latest month — no weighting, no model.
interface Props {
  data: CrimeObsData;
  onSelect: (code: string) => void;
}

export default function CrimeObsMix({ data }: Props) {
  const latest = data.as_of;
  const total = Math.max(data.city.latest_total, 1);
  const cats = data.categories;

  // Fold the long tail past the top 8 into "Other" for the pie's legibility.
  const top = cats.slice(0, 8);
  const tail = cats.slice(8);
  const tailSum = tail.reduce((s, c) => s + c.latest_count, 0);
  const pieSlices = [
    ...top.map(c => ({ label: crimeObsLabel(c.name), value: c.latest_count, color: crimeObsColor(c.name) })),
    ...(tailSum > 0 ? [{ label: 'All other categories', value: tailSum, color: '#8a8f99' }] : []),
  ];

  return (
    <div>
      <div className="bill-sec-ttl">What the {total.toLocaleString()} offences in {latest} were made of</div>

      <FocusableChart title="Crime Category Mix">
        <PieChart slices={pieSlices} />
      </FocusableChart>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted2)', margin: '8px 0 18px' }}>
        Each slice is that category's share of the month's recorded offences. The 8 largest are named; the rest fold into gray.
      </div>

      {/* Ranked category bars */}
      <div className="crime-cats">
        {cats.map(c => {
          const pct = (c.latest_count / total) * 100;
          return (
            <div key={c.name} className="crime-cat-row" style={{ marginBottom: 8 }}>
              <div className="crime-cat-lbl" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{crimeObsLabel(c.name)}</span>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{c.latest_count.toLocaleString()} · {pct.toFixed(1)}%</span>
              </div>
              <div className="crime-cat-bar-wrap">
                <div className="crime-cat-bar-fill" style={{ width: `${(c.latest_count / cats[0].latest_count) * 100}%`, background: crimeObsColor(c.name) }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted2)', marginTop: 14, lineHeight: 1.6 }}>
        Source: West Midlands Police street-level recorded crime via Birmingham City Observatory ({latest}).
        Recorded offences reflect police activity and reporting as well as underlying incidence.
      </div>
    </div>
  );
}
