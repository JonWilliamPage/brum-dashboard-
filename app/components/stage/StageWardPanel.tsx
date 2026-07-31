'use client';

/** Tile-style ward breakdown shown when a stage ward is selected. */

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toLocaleString('en-GB');
}

function Spark({ series, accent }: { series: (number | null)[]; accent: string }) {
  const pts = series.map((v, i) => ({ i, v })).filter((p) => p.v != null) as { i: number; v: number }[];
  if (pts.length < 2) {
    return <div className="stage-ward-spark empty">No series</div>;
  }
  const vals = pts.map((p) => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(max - min, 1);
  const w = 220;
  const h = 36;
  const d = pts
    .map((p, idx) => {
      const x = (idx / (pts.length - 1)) * w;
      const y = h - ((p.v - min) / span) * (h - 4) - 2;
      return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg className="stage-ward-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="none" stroke={accent} strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

export interface StageWardPanelProps {
  wardName: string;
  wardCode: string;
  monthLabel: string;
  /** Active layer value this frame */
  value: number | null;
  unitLabel: string;
  accent?: string;
  population?: number | null;
  /** Rank 1 = highest for current metric/month */
  rank?: number | null;
  rankOf?: number;
  cityTotal?: number | null;
  /** Full series for sparkline */
  series?: (number | null)[] | null;
  first?: number | null;
  firstMonth?: string | null;
  latest?: number | null;
  /** Extra tiles: { k, v } */
  extras?: { k: string; v: string }[];
  onClear?: () => void;
}

export default function StageWardPanel({
  wardName,
  wardCode,
  monthLabel,
  value,
  unitLabel,
  accent = '#b01225',
  population,
  rank,
  rankOf = 69,
  cityTotal,
  series,
  first,
  firstMonth,
  latest,
  extras,
  onClear,
}: StageWardPanelProps) {
  const per1000 =
    value != null && population && population > 0
      ? Math.round((value / population) * 1000 * 10) / 10
      : null;
  const share =
    value != null && cityTotal != null && cityTotal > 0
      ? Math.round((value / cityTotal) * 1000) / 10
      : null;
  const delta =
    first != null && (latest != null || value != null)
      ? (latest ?? value)! - first
      : null;

  return (
    <div className="stage-ward-panel">
      <div className="stage-ward-panel-hdr">
        <div>
          <span className="stage-ward-panel-tag">Selected ward</span>
          <h3 className="stage-ward-panel-name">{wardName}</h3>
          <span className="stage-ward-panel-code">
            {wardCode} · {monthLabel}
          </span>
        </div>
        {onClear && (
          <button type="button" className="stage-ward-panel-clear" onClick={onClear} aria-label="Clear selection">
            ✕
          </button>
        )}
      </div>

      <div className="stage-ward-tiles">
        <div className="stage-ward-tile primary" style={{ borderColor: accent }}>
          <span className="stage-ward-tile-k">This month</span>
          <span className="stage-ward-tile-v" style={{ color: accent }}>
            {fmt(value)}
          </span>
          <span className="stage-ward-tile-s">{unitLabel}</span>
        </div>
        <div className="stage-ward-tile">
          <span className="stage-ward-tile-k">City share</span>
          <span className="stage-ward-tile-v">{share != null ? `${share}%` : '—'}</span>
          <span className="stage-ward-tile-s">of city caseload</span>
        </div>
        <div className="stage-ward-tile">
          <span className="stage-ward-tile-k">Rank</span>
          <span className="stage-ward-tile-v">
            {rank != null ? `${rank}` : '—'}
            <small>/{rankOf}</small>
          </span>
          <span className="stage-ward-tile-s">this month</span>
        </div>
        <div className="stage-ward-tile">
          <span className="stage-ward-tile-k">Per 1,000</span>
          <span className="stage-ward-tile-v">{per1000 != null ? fmt(per1000) : '—'}</span>
          <span className="stage-ward-tile-s">
            {population != null ? `pop ${fmt(population)}` : 'no pop'}
          </span>
        </div>
        <div className="stage-ward-tile">
          <span className="stage-ward-tile-k">Series start</span>
          <span className="stage-ward-tile-v">{fmt(first)}</span>
          <span className="stage-ward-tile-s">{firstMonth ?? 'first non-null'}</span>
        </div>
        <div className="stage-ward-tile">
          <span className="stage-ward-tile-k">Change</span>
          <span className="stage-ward-tile-v">
            {delta != null ? `${delta >= 0 ? '+' : ''}${fmt(delta)}` : '—'}
          </span>
          <span className="stage-ward-tile-s">first → latest</span>
        </div>
        {extras?.map((e) => (
          <div className="stage-ward-tile" key={e.k}>
            <span className="stage-ward-tile-k">{e.k}</span>
            <span className="stage-ward-tile-v stage-ward-tile-v-sm">{e.v}</span>
          </div>
        ))}
      </div>

      {series && series.some((v) => v != null) && (
        <div className="stage-ward-spark-wrap">
          <span className="stage-ward-tile-k">Trend</span>
          <Spark series={series} accent={accent} />
        </div>
      )}
    </div>
  );
}
