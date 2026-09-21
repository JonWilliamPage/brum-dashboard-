'use client';

import { useEffect, useRef } from 'react';
import type { EducationWard } from '@/lib/types';

interface Props {
  wards: EducationWard[];
  selected: EducationWard | null;
}

const QUAL_COLORS = ['#3a1a1a','#683428','#7d4e36','#b07a5e','#c4a882','#1a3a2a','#4a8a6a'];
const QUAL_LABELS = ['No qualifications','Level 1','Level 2','Apprenticeship','Level 3','Level 4+','Other'];
const QUAL_KEYS: (keyof EducationWard)[] = ['qual_none','qual_level1','qual_level2','qual_apprenticeship','qual_level3','qual_level4plus','qual_other'];

function cityAvg(wards: EducationWard[], key: keyof EducationWard): number {
  return wards.reduce((s, w) => s + (w[key] as number), 0) / wards.length;
}

function QualPie({ data, label }: { data: number[]; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    let ch: { destroy: () => void } | null = null;

    async function init() {
      const { Chart } = await import('chart.js/auto');
      if (!canvasRef.current) return;
      if (chartRef.current) chartRef.current.destroy();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ch = new Chart(canvasRef.current, {
        type: 'pie',
        data: {
          labels: QUAL_LABELS,
          datasets: [{
            data,
            backgroundColor: QUAL_COLORS,
            borderColor: '#f5f3ee',
            borderWidth: 1.5,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0e0f11',
              titleColor: '#fff',
              bodyColor: '#e5e3df',
              borderWidth: 0,
              padding: 8,
              callbacks: {
                label: (c: { label: string; parsed: number }) => ` ${c.label}: ${c.parsed.toFixed(1)}%`,
              },
            },
          },
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      chartRef.current = ch;
    }

    init();
    return () => { if (ch) ch.destroy(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <div className="qual-pie-col">
      <div style={{ textAlign: 'center', fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </div>
      <div className="chart-canvas-wrap" style={{ height: 220, position: 'relative' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

export default function QualBars({ wards, selected }: Props) {
  const cityData = QUAL_KEYS.map(k => parseFloat(cityAvg(wards, k).toFixed(1)));
  const wardData = selected ? QUAL_KEYS.map(k => (selected[k] as number)) : null;

  return (
    <div>
      <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>
        Qualification split{selected ? ` — ${selected.ward_name} vs Birmingham average` : ' — Birmingham average'}
      </div>
      <div className="qual-pie-row">
        <QualPie data={cityData} label="Birmingham average" />
        {wardData && <QualPie data={wardData} label={selected!.ward_name} />}
      </div>
      <div className="comp-legend" style={{ marginTop: 12, justifyContent: 'center' }}>
        {QUAL_LABELS.map((l, i) => (
          <span key={l}><i style={{ background: QUAL_COLORS[i] }} /> {l}</span>
        ))}
      </div>
    </div>
  );
}
