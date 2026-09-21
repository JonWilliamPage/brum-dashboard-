'use client';

import { useEffect, useRef } from 'react';

export interface PieSlice {
  label: string;
  value: number;
  color: string;
}

/**
 * Shared pie chart: canvas + a legend list that always shows each slice's
 * value and percentage as plain text (not just on hover), so the split reads
 * at a glance without needing to interact with the chart.
 */
export default function PieChart({ slices, height = 220 }: { slices: PieSlice[]; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<{ destroy: () => void } | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;

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
          labels: slices.map(s => s.label),
          datasets: [{
            data: slices.map(s => s.value),
            backgroundColor: slices.map(s => s.color),
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
                label: (c: { label: string; parsed: number }) =>
                  ` ${c.label}: ${c.parsed.toLocaleString()} (${((c.parsed / total) * 100).toFixed(1)}%)`,
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
  }, [slices, total]);

  return (
    <div className="pie-with-legend">
      <div className="pie-canvas-wrap" style={{ height }}>
        <canvas ref={canvasRef} />
      </div>
      <div className="pie-legend-list">
        {slices.map(s => (
          <div key={s.label} className="pie-legend-row">
            <i style={{ background: s.color }} />
            <span className="pie-legend-lbl">{s.label}</span>
            <span className="pie-legend-val">{s.value.toLocaleString()}</span>
            <span className="pie-legend-pct">{((s.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
