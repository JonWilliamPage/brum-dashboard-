'use client';

import { useEffect, useRef } from 'react';
import type { BillYear } from '@/lib/types';

// vs Britain — one honest line: Birmingham's share of Great Britain's entire DWP
// benefit bill, from the same workbook's GREAT BRITAIN row. One axis, one ratio.
interface Props {
  history: BillYear[];
}

export default function BillShareLine({ history }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<{ destroy: () => void } | null>(null);
  const pts = history.filter(h => h.share_pct != null);

  useEffect(() => {
    let ch: { destroy: () => void } | null = null;
    async function init() {
      const { Chart } = await import('chart.js/auto');
      if (!canvasRef.current) return;
      if (chartRef.current) chartRef.current.destroy();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ch = new Chart(canvasRef.current, {
        type: 'line',
        data: {
          labels: pts.map(h => h.year),
          datasets: [{
            label: "Birmingham's share of GB benefit spend",
            data: pts.map(h => h.share_pct),
            borderColor: '#16306f',
            backgroundColor: 'rgba(22,48,111,.06)',
            borderWidth: 2,
            pointRadius: 0,
            pointHitRadius: 12,
            fill: true,
            tension: 0.15,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index' as const, intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0e0f11', titleColor: '#fff', bodyColor: '#e5e3df', borderWidth: 0, padding: 8,
              callbacks: {
                label: (c: { parsed: { y: number | null } }) => ` ${c.parsed.y}% of the GB bill`,
              },
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#6b6760', font: { size: 8.5, family: 'IBM Plex Mono' }, maxRotation: 45, autoSkipPadding: 8 } },
            y: {
              grid: { color: 'rgba(14,15,17,.05)' },
              ticks: { color: '#6b6760', font: { size: 9, family: 'IBM Plex Mono' }, callback: (v: number | string) => `${v}%` },
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
  }, [history]);

  const first = pts[0], last = pts.at(-1);

  return (
    <div>
      <div className="bill-sec-ttl">Birmingham&apos;s slice of Great Britain&apos;s entire benefits bill</div>
      <div className="chart-canvas-wrap" style={{ height: 280, position: 'relative' }}>
        <canvas ref={canvasRef} />
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted2)', marginTop: 6, lineHeight: 1.7 }}>
        {first && last && <>From {first.share_pct}% ({first.year}) to {last.share_pct}% ({last.year}). </>}
        Context: Birmingham holds roughly 1.8% of Great Britain&apos;s population (ONS mid-2024 ≈ 1.18m of ≈ 66m) —
        a share line persistently above that means more benefit money flows here per person than the national average.
        Both series are the same DWP workbook; the ratio needs no price deflator.
      </div>
    </div>
  );
}
