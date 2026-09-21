'use client';

import { useEffect, useRef, useState } from 'react';
import type { Ward } from '@/lib/types';
import { Q_COLORS, Q_LABELS, MUTED } from '@/lib/constants';
import FocusableChart from '../FocusableChart';

function median(arr: number[]) {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

interface SortState { key: string; dir: number }

interface Props {
  wards: Ward[];
  selected: Ward | null;
  onSelect: (code: string) => void;
}

export default function EconomicMatrix({ wards, selected, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<unknown>(null);
  const [activeQuadrant, setActiveQuadrant] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ key: 'composite', dir: -1 });

  const gvaMed = median(wards.map(w => w.gva));
  const depMed = median(wards.map(w => w.imd_employment_score));
  const popMax = Math.max(...wards.map(w => w.population));
  const popMin = Math.min(...wards.map(w => w.population));
  const sz = (p: number) => 4 + ((p - popMin) / (popMax - popMin)) * 16;

  useEffect(() => {
    let ch: { destroy: () => void } | null = null;

    async function init() {
      const { Chart } = await import('chart.js/auto');
      if (!canvasRef.current) return;
      if (chartRef.current) (chartRef.current as { destroy: () => void }).destroy();

      const filtered = activeQuadrant ? wards.filter(w => w.quadrant === activeQuadrant) : wards;
      const dimmed = activeQuadrant ? wards.filter(w => w.quadrant !== activeQuadrant) : [];
      const mk = (arr: Ward[]) => arr.map(w => ({ x: w.gva, y: w.imd_employment_score, r: sz(w.population), ward: w }));

      const quadPlugin = {
        id: 'quadLines',
        afterDraw(chart: { ctx: CanvasRenderingContext2D; scales: Record<string, { getPixelForValue: (v: number) => number }>; chartArea: { top: number; bottom: number; left: number; right: number } }) {
          const { ctx, scales: { x, y }, chartArea } = chart;
          const xPos = x.getPixelForValue(gvaMed);
          const yPos = y.getPixelForValue(depMed);
          ctx.save();
          ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(14,15,17,.25)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(xPos, chartArea.top); ctx.lineTo(xPos, chartArea.bottom); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(chartArea.left, yPos); ctx.lineTo(chartArea.right, yPos); ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = '9px IBM Plex Mono, monospace'; ctx.fillStyle = 'rgba(14,15,17,.32)';
          ctx.textAlign = 'left';  ctx.fillText('WORKHORSE',   chartArea.left + 8,  chartArea.top + 14);
          ctx.textAlign = 'right'; ctx.fillText('PROSPEROUS',  chartArea.right - 8, chartArea.top + 14);
          ctx.textAlign = 'left';  ctx.fillText('DISADVANTAGE',chartArea.left + 8,  chartArea.bottom - 8);
          ctx.textAlign = 'right'; ctx.fillText('COMMUTER',    chartArea.right - 8, chartArea.bottom - 8);
          ctx.restore();
        },
      };

      ch = new Chart(canvasRef.current, {
        type: 'bubble',
        plugins: [quadPlugin],
        data: {
          datasets: [
            ...(dimmed.length ? [{ label: 'other', data: mk(dimmed), backgroundColor: 'rgba(14,15,17,.06)', borderColor: 'rgba(14,15,17,.15)', borderWidth: 1 }] : []),
            { label: 'wards', data: mk(filtered), backgroundColor: filtered.map(w => Q_COLORS[w.quadrant] + 'cc'), borderColor: filtered.map(w => Q_COLORS[w.quadrant]), borderWidth: 1 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onClick: (_e: any, els: any[]) => {
            if (els.length) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const ds = (ch as unknown as { data: { datasets: { data: { ward: Ward }[] }[] } }).data.datasets[els[0].datasetIndex];
              onSelect(ds.data[els[0].index].ward.ward_code);
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label: (c: any) => {
                  const w = (c.raw as { ward: Ward }).ward;
                  return [`${w.ward_name}`, `GVA: £${w.gva.toFixed(1)}k/head`, `IMD: ${(w.imd_employment_score * 100).toFixed(1)}%`, `Pop: ${w.population.toLocaleString()}`, Q_LABELS[w.quadrant]];
                },
              },
              backgroundColor: '#0e0f11', titleColor: '#fff', bodyColor: '#e5e3df', borderWidth: 0, padding: 9,
            },
          },
          scales: {
            x: { title: { display: true, text: 'GVA per head (£k, workplace)', color: MUTED, font: { size: 10, family: 'IBM Plex Mono' } }, grid: { color: 'rgba(14,15,17,.06)' }, ticks: { color: MUTED, font: { size: 9, family: 'IBM Plex Mono' }, callback: (v: number | string) => '£' + v + 'k' } },
            y: { title: { display: true, text: 'IMD employment score', color: MUTED, font: { size: 10, family: 'IBM Plex Mono' } }, grid: { color: 'rgba(14,15,17,.06)' }, ticks: { color: MUTED, font: { size: 9, family: 'IBM Plex Mono' }, callback: (v: number | string) => (Number(v) * 100).toFixed(0) + '%' } },
          },
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      chartRef.current = ch;
    }

    init();
    return () => { if (ch) ch.destroy(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wards, activeQuadrant]);

  const filtered = activeQuadrant ? wards.filter(w => w.quadrant === activeQuadrant) : wards;
  const sortedRows = [...filtered].sort((a, b) => {
    if (sort.key === 'ward_name') return sort.dir * a.ward_name.localeCompare(b.ward_name);
    return sort.dir * ((a[sort.key as keyof Ward] as number) - (b[sort.key as keyof Ward] as number));
  });

  const handleSort = (key: string) => {
    setSort(s => s.key === key ? { key, dir: s.dir * -1 } : { key, dir: key === 'ward_name' ? 1 : -1 });
  };

  return (
    <div>
      <FocusableChart title="Economic Matrix">
        <div className="matrix-controls">
          {Object.entries(Q_LABELS).map(([k, v]) => {
            const count = wards.filter(w => w.quadrant === k).length;
            return (
              <button key={k} className={`q-chip${activeQuadrant === k ? ' active' : ''}`} onClick={() => setActiveQuadrant(q => q === k ? null : k)}>
                <span className="qsw" style={{ background: Q_COLORS[k] }} />
                {v} <span style={{ opacity: 0.6 }}>· {count}</span>
              </button>
            );
          })}
          <div className="matrix-axes">
            <span>X <b>GVA/head £k</b></span>
            <span>Y <b>IMD score</b></span>
            <span>Size <b>population</b></span>
          </div>
        </div>
        <div className="matrix-chart-wrap"><canvas ref={canvasRef} /></div>
      </FocusableChart>
      <FocusableChart title="Economic Matrix Table">
      <div className="matrix-table">
        <div className="matrix-row hr">
          <span>#</span>
          <span className="sortable" onClick={() => handleSort('ward_name')} style={{ cursor: 'pointer' }}>Ward ↕</span>
          <span className="sortable" style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('gva')}>GVA/head ↕</span>
          <span className="sortable" style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('composite')}>Score ↕</span>
          <span style={{ textAlign: 'right' }}>Quadrant</span>
        </div>
        {sortedRows.map((w, i) => (
          <div key={w.ward_code} className={`matrix-row${selected?.ward_code === w.ward_code ? ' selected' : ''}`} onClick={() => onSelect(w.ward_code)}>
            <span className="rnum">{i + 1}</span>
            <span className="wnm">{w.ward_name}</span>
            <span className="mcell">£{w.gva.toFixed(1)}k</span>
            <span className="mcell">{(w.imd_employment_score * 100).toFixed(1)}%</span>
            <span style={{ textAlign: 'right' }}>
              <span className="q-badge" style={{ color: Q_COLORS[w.quadrant], borderColor: Q_COLORS[w.quadrant] + '66', background: Q_COLORS[w.quadrant] + '0d' }}>
                {Q_LABELS[w.quadrant].split(' ')[0].toUpperCase()}
              </span>
            </span>
          </div>
        ))}
      </div>
      </FocusableChart>
    </div>
  );
}
