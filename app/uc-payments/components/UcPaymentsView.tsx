'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { UcPaymentsData, UcPaymentMonth, UcPaymentFamily, UcPaymentBand } from '@/lib/types';

// UC Payments story — Birmingham LA household award intensity (Stat-Xplore UC_Households).
// Every chart lists the raw inputs and the exact arithmetic used. No dual axes.
// Mean Payment Amount ≠ annual Benefits Bill UC £ (shown only as labelled context).

const UC = '#2a55bf';
const MUTED = '#8a8f99';
const INK = '#15181e';
const FAM_COLORS = ['#2a55bf', '#b01225', '#1f7a33', '#d99a00', '#8a8f99'];

type Sub = 'story' | 'path' | 'awards' | 'families' | 'workings';

function fmtN(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—';
  return Math.round(n).toLocaleString('en-GB');
}
function fmtGbp(n: number | null | undefined, dig = 2) {
  if (n == null || Number.isNaN(n)) return '—';
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: dig, maximumFractionDigits: dig })}`;
}
function fmtPct(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—';
  const s = n > 0 ? '+' : '';
  return `${s}${n.toFixed(1)}%`;
}
function fmtM(m: number) {
  return m >= 1000 ? `£${(m / 1000).toFixed(2)}bn` : `£${m.toFixed(m < 10 ? 1 : 0)}m`;
}

/** Tiny calc block under each chart — shows formula + inputs. */
function CalcNote({
  title,
  formula,
  lines,
}: {
  title: string;
  formula: string;
  lines: { label: string; value: string; source?: string }[];
}) {
  return (
    <div className="ucp-calc" role="note">
      <div className="ucp-calc-ttl">{title}</div>
      <div className="ucp-calc-formula">
        <span className="ucp-calc-k">Formula</span> {formula}
      </div>
      <table className="ucp-calc-table">
        <tbody>
          {lines.map((r) => (
            <tr key={r.label}>
              <td className="ucp-calc-lbl">{r.label}</td>
              <td className="ucp-calc-val">{r.value}</td>
              <td className="ucp-calc-src">{r.source ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DataTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="ucp-data">
      <div className="bill-sec-ttl">{caption}</div>
      <div className="ucp-data-scroll">
        <table className="ucp-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LineChart({
  labels,
  values,
  color,
  yPrefix,
  ySuffix,
  height = 220,
}: {
  labels: string[];
  values: (number | null)[];
  color: string;
  yPrefix?: string;
  ySuffix?: string;
  height?: number;
}) {
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
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'series',
              data: values,
              borderColor: color,
              backgroundColor: color + '14',
              borderWidth: 2,
              pointRadius: 0,
              pointHitRadius: 12,
              fill: true,
              tension: 0.15,
              spanGaps: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index' as const, intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0e0f11',
              titleColor: '#fff',
              bodyColor: '#e5e3df',
              borderWidth: 0,
              padding: 8,
              callbacks: {
                label: (c: { parsed: { y: number | null } }) => {
                  const y = c.parsed.y;
                  if (y == null) return ' —';
                  const core =
                    yPrefix === '£'
                      ? `£${y.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`
                      : y.toLocaleString('en-GB');
                  return ` ${core}${ySuffix ?? ''}`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                color: '#6b6760',
                font: { size: 8.5, family: 'IBM Plex Mono' },
                maxRotation: 45,
                autoSkipPadding: 8,
              },
            },
            y: {
              grid: { color: 'rgba(14,15,17,.05)' },
              ticks: {
                color: '#6b6760',
                font: { size: 9, family: 'IBM Plex Mono' },
                callback: (v: number | string) => {
                  const n = Number(v);
                  if (yPrefix === '£') return `£${n.toLocaleString()}`;
                  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
                  return String(n);
                },
              },
            },
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      chartRef.current = ch;
    }
    init();
    return () => {
      if (ch) ch.destroy();
    };
  }, [labels, values, color, yPrefix, ySuffix]);

  return (
    <div style={{ height, position: 'relative' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

export default function UcPaymentsView({ data }: { data: UcPaymentsData }) {
  const [sub, setSub] = useState<Sub>('story');
  const city = data.city;
  const series = city.series ?? [];
  const bands = (data.award_bands ?? []).filter((b) => b.households != null);
  const families = (data.family_types ?? []).filter((f) => f.households != null);

  const latest = series.at(-1);
  const first = series[0];

  // ── Derived figures (all shown in workings) ───────────────────────────────
  const calc = useMemo(() => {
    const hh0 = city.first_households;
    const hh1 = city.latest_households;
    const mean0 = city.first_mean_payment_gbp;
    const mean1 = city.latest_mean_payment_gbp;
    const delta = city.households_delta; // already hh1 - hh0 from fetch
    const pct =
      city.households_pct_change ??
      (hh0 > 0 ? Math.round(((hh1 - hh0) / hh0) * 1000) / 10 : null);
    // Verify delta matches arithmetic
    const deltaCheck = hh1 - hh0;
    const pctCheck = hh0 > 0 ? Math.round(((hh1 - hh0) / hh0) * 1000) / 10 : null;

    const bandSum = bands.reduce((s, b) => s + (b.households ?? 0), 0);
    const famSum = families.reduce((s, f) => s + (f.households ?? 0), 0);
    const bandDriftPct =
      hh1 > 0 ? Math.round((Math.abs(bandSum - hh1) / hh1) * 1000) / 10 : null;
    const famDriftPct =
      hh1 > 0 ? Math.round((Math.abs(famSum - hh1) / hh1) * 1000) / 10 : null;

    const withChildren = families.filter((f) => /with children/i.test(f.family_type));
    const noChildren = families.filter(
      (f) => /no children/i.test(f.family_type) || /^Single, no/i.test(f.family_type),
    );
    const hhWithKids = withChildren.reduce((s, f) => s + (f.households ?? 0), 0);
    const hhNoKids = noChildren.reduce((s, f) => s + (f.households ?? 0), 0);
    const shareWithKids = hh1 > 0 ? Math.round((hhWithKids / hh1) * 1000) / 10 : null;

    // Weighted mean of family-type means (should ≈ city mean)
    let wSum = 0;
    let wN = 0;
    for (const f of families) {
      if (f.households != null && f.mean_payment_gbp != null) {
        wSum += f.households * f.mean_payment_gbp;
        wN += f.households;
      }
    }
    const weightedMean = wN > 0 ? Math.round((wSum / wN) * 100) / 100 : null;

    // Illustrative monthly outlay (NOT annual accounts) — labelled derived
    const illustrativeMonthly =
      hh1 != null && mean1 != null ? Math.round(hh1 * mean1) : null;

    return {
      hh0,
      hh1,
      mean0,
      mean1,
      delta,
      pct,
      deltaCheck,
      pctCheck,
      bandSum,
      famSum,
      bandDriftPct,
      famDriftPct,
      hhWithKids,
      hhNoKids,
      shareWithKids,
      weightedMean,
      illustrativeMonthly,
      wSum,
      wN,
    };
  }, [city, bands, families]);

  const labels = series.map((s) => s.month);
  const hhSeries = series.map((s) => s.households);
  const meanSeries = series.map((s) => s.mean_payment_gbp);
  const maxBand = Math.max(...bands.map((b) => b.households ?? 0), 1);
  const maxFamHh = Math.max(...families.map((f) => f.households ?? 0), 1);
  const maxFamMean = Math.max(...families.map((f) => f.mean_payment_gbp ?? 0), 1);

  const bill = city.bill_uc_context;

  const tabs: [Sub, string][] = [
    ['story', 'The Story'],
    ['path', 'The Path'],
    ['awards', 'Awards'],
    ['families', 'Families'],
    ['workings', 'All numbers'],
  ];

  return (
    <div className="body">
      <div className="lcol">
        <div className="hb-nowward" role="note">
          <span className="hb-nowward-tag">
            ◇ LOCAL AUTHORITY · HOUSEHOLDS · STAT-XPLORE — NOT PEOPLE · NOT ANNUAL ACCOUNTS £ · NOT WARD £
          </span>
          <p>
            Birmingham LA (<strong>E08000025</strong>). Unit = <strong>UC households</strong> (one claim),
            not each adult. <strong>Mean Payment Amount</strong> = average £ paid per household in the
            assessment period (Stat-Xplore MEAN). That is <strong>not</strong> the same as the Benefits
            Bill annual UC outturn
            {bill?.uc_m != null ? ` (${fmtM(bill.uc_m)}, ${bill.year})` : ''}. Every derived figure
            shows its formula below the chart. Source: DWP Stat-Xplore cube{' '}
            <code style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>UC_Households</code> · as-of{' '}
            {data.as_of}.
          </p>
        </div>

        <div className="sub-tab-bar">
          {tabs.map(([s, lbl]) => (
            <button
              key={s}
              className={`sub-tab${sub === s ? ' active' : ''}`}
              onClick={() => setSub(s)}
            >
              {lbl}
            </button>
          ))}
        </div>

        <div className="panel" style={{ flex: 1, position: 'relative' }}>
          <div className="panel-body" style={{ padding: '16px 18px' }}>
            {/* ── STORY ───────────────────────────────────────────────── */}
            {(sub === 'story' || sub === 'path') && (
              <>
                {sub === 'story' && (
                  <>
                    <p className="bill-story-headline" style={{ marginBottom: 12 }}>
                      UC in Birmingham isn&apos;t only how many people claim — it&apos;s how large{' '}
                      <em>household awards</em> are, and who holds them.
                    </p>

                    <div className="bill-kpi-grid" role="group" aria-label="Key figures">
                      <div className="bill-kpi">
                        <div className="bill-kpi-k">Households on UC</div>
                        <div className="bill-kpi-v bill-kpi-accent">{fmtN(calc.hh1)}</div>
                        <div className="bill-kpi-note">
                          COUNT · {data.as_of} · Stat-Xplore UC_Households
                        </div>
                      </div>
                      <div className="bill-kpi">
                        <div className="bill-kpi-k">Mean payment</div>
                        <div className="bill-kpi-v">{fmtGbp(calc.mean1)}</div>
                        <div className="bill-kpi-note">
                          MEAN of Payment Amount · per household · assessment period
                        </div>
                      </div>
                      <div className="bill-kpi">
                        <div className="bill-kpi-k">Household change</div>
                        <div className="bill-kpi-v">
                          {calc.delta >= 0 ? '+' : ''}
                          {fmtN(calc.delta)}
                        </div>
                        <div className="bill-kpi-note">
                          {fmtPct(calc.pct)} · {city.first_month} → {data.as_of}
                        </div>
                      </div>
                      <div className="bill-kpi">
                        <div className="bill-kpi-k">Context · Benefits Bill UC</div>
                        <div className="bill-kpi-v" style={{ fontSize: 18, color: MUTED }}>
                          {bill?.uc_m != null ? fmtM(bill.uc_m) : '—'}
                        </div>
                        <div className="ucp-context-warn">
                          Annual accounts {bill?.year ?? '—'} · different metric
                        </div>
                      </div>
                    </div>

                    <CalcNote
                      title="Hero calculations (household change)"
                      formula="Δ households = latest − first ·  % change = (Δ ÷ first) × 100"
                      lines={[
                        {
                          label: 'first (households)',
                          value: fmtN(calc.hh0),
                          source: `${city.first_month} · COUNT`,
                        },
                        {
                          label: 'latest (households)',
                          value: fmtN(calc.hh1),
                          source: `${data.as_of} · COUNT`,
                        },
                        {
                          label: 'Δ = latest − first',
                          value: `${calc.hh1} − ${calc.hh0} = ${calc.deltaCheck}`,
                          source: 'derived in UI (matches fetch households_delta)',
                        },
                        {
                          label: '% = (Δ ÷ first) × 100',
                          value:
                            calc.hh0 > 0
                              ? `(${calc.deltaCheck} ÷ ${calc.hh0}) × 100 = ${calc.pctCheck}%`
                              : '—',
                          source: 'derived · 1 d.p.',
                        },
                        {
                          label: 'mean payment (latest)',
                          value: fmtGbp(calc.mean1),
                          source: 'Stat-Xplore MEAN · not derived',
                        },
                      ]}
                    />
                  </>
                )}

                <div className="bill-sec-ttl" style={{ marginTop: sub === 'story' ? 18 : 0 }}>
                  Households on UC over time — raw COUNT each month (not modelled)
                </div>
                <LineChart labels={labels} values={hhSeries} color={UC} height={200} />
                <CalcNote
                  title="Households chart"
                  formula="Each point = Stat-Xplore COUNT of Households on Universal Credit for Birmingham LA that month"
                  lines={[
                    {
                      label: 'n months',
                      value: String(series.length),
                      source: `${city.first_month} → ${data.as_of}`,
                    },
                    {
                      label: 'y-axis',
                      value: 'households (integer count)',
                      source: 'no smoothing / no interpolation',
                    },
                    {
                      label: 'first → last',
                      value: `${fmtN(calc.hh0)} → ${fmtN(calc.hh1)}`,
                      source: 'see full table on “All numbers”',
                    },
                  ]}
                />

                <div className="bill-sec-ttl" style={{ marginTop: 18 }}>
                  Mean Payment Amount (£) over time — separate chart (no dual axis)
                </div>
                <LineChart
                  labels={labels}
                  values={meanSeries}
                  color="#16306f"
                  yPrefix="£"
                  height={200}
                />
                <CalcNote
                  title="Mean payment chart"
                  formula="Each point = Stat-Xplore MEAN of measure Payment Amount for households in Birmingham that month"
                  lines={[
                    {
                      label: 'unit',
                      value: '£ per household per assessment period',
                      source: 'not annual; not per person',
                    },
                    {
                      label: 'first → last',
                      value: `${fmtGbp(calc.mean0)} → ${fmtGbp(calc.mean1)}`,
                      source: 'MEAN, not derived by us',
                    },
                    {
                      label: 'NOT annual UC bill',
                      value:
                        bill?.uc_m != null
                          ? `Benefits Bill UC = ${fmtM(bill.uc_m)} (${bill.year}) accounts`
                          : '—',
                      source: 'different source & definition',
                    },
                  ]}
                />

                {sub === 'story' && (
                  <>
                    <div className="bill-sec-ttl" style={{ marginTop: 22 }}>
                      Who holds the awards — family type ({data.as_of})
                    </div>
                    <FamilyBars families={families} maxHh={maxFamHh} maxMean={maxFamMean} />
                    <CalcNote
                      title="Family-type figures"
                      formula="Per row: COUNT of households + MEAN Payment Amount, sliced by Family Type (same month, Birmingham LA)"
                      lines={[
                        ...families.map((f) => ({
                          label: f.family_type,
                          value: `${fmtN(f.households)} hh · mean ${fmtGbp(f.mean_payment_gbp)}`,
                          source: 'Stat-Xplore · not estimated',
                        })),
                        {
                          label: 'checksum Σ households',
                          value: `${fmtN(calc.famSum)} vs city ${fmtN(calc.hh1)} · drift ${calc.famDriftPct ?? '—'}%`,
                          source: 'Σ family counts ÷ city total',
                        },
                        {
                          label: 'weighted mean check',
                          value:
                            calc.weightedMean != null
                              ? `Σ(hh × mean) ÷ Σ(hh) = ${fmtGbp(calc.weightedMean)} (city mean ${fmtGbp(calc.mean1)})`
                              : '—',
                          source: `Σ(hh×mean)=${calc.wSum.toFixed(0)} · Σ(hh)=${calc.wN}`,
                        },
                        {
                          label: 'with-children share',
                          value:
                            calc.shareWithKids != null
                              ? `${fmtN(calc.hhWithKids)} ÷ ${fmtN(calc.hh1)} = ${calc.shareWithKids}%`
                              : '—',
                          source: 'derived · labels matching /with children/i',
                        },
                      ]}
                    />
                  </>
                )}
              </>
            )}

            {/* ── AWARDS ──────────────────────────────────────────────── */}
            {sub === 'awards' && (
              <>
                <div className="bill-sec-ttl">
                  Monthly award amount bands — household COUNT ({data.as_of})
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
                  Each bar is the number of households whose Payment Amount fell in that band.
                  Bands are Stat-Xplore categories (not our bins). Aggregate “£1500.01 or over” was
                  dropped at fetch when finer £100 bands exist, to avoid double-counting.
                </p>
                {bands.map((b) => (
                  <div key={b.band} className="hb-row" style={{ padding: '4px 0' }}>
                    <div className="hb-name" style={{ fontSize: 12 }}>{b.band}</div>
                    <div className="hb-track" style={{ height: 16 }}>
                      <div
                        className="hb-bar"
                        style={{
                          height: 16,
                          width: `${((b.households ?? 0) / maxBand) * 100}%`,
                          background: b.band === 'No payment' ? MUTED : UC,
                        }}
                      />
                      <span className="hb-val">{fmtN(b.households)}</span>
                    </div>
                  </div>
                ))}
                <CalcNote
                  title="Award-band chart"
                  formula="Bar length ∝ households in band · max scale = max(band households)"
                  lines={[
                    {
                      label: 'max band (scale)',
                      value: fmtN(maxBand),
                      source: 'max of series',
                    },
                    {
                      label: 'Σ all bands',
                      value: fmtN(calc.bandSum),
                      source: 'sum of bar values',
                    },
                    {
                      label: 'city total households',
                      value: fmtN(calc.hh1),
                      source: `${data.as_of} COUNT`,
                    },
                    {
                      label: 'checksum drift',
                      value: `${calc.bandDriftPct ?? '—'}% · |Σbands − total| ÷ total`,
                      source: '0% = exact match (DWP rounding may differ)',
                    },
                  ]}
                />
                <DataTable
                  caption="Raw band inputs (linked to chart)"
                  columns={['Band', 'Households', 'Share of city total']}
                  rows={bands.map((b) => [
                    b.band,
                    fmtN(b.households),
                    calc.hh1 > 0 && b.households != null
                      ? `${((b.households / calc.hh1) * 100).toFixed(1)}%`
                      : '—',
                  ])}
                />
              </>
            )}

            {/* ── FAMILIES ────────────────────────────────────────────── */}
            {sub === 'families' && (
              <>
                <div className="bill-sec-ttl">
                  Family type — count and mean payment ({data.as_of})
                </div>
                <FamilyBars families={families} maxHh={maxFamHh} maxMean={maxFamMean} />
                <CalcNote
                  title="Why the city mean is ~£859"
                  formula="City mean is a blend: large low-award group (single, no children) + smaller high-award groups (with children)"
                  lines={[
                    {
                      label: 'Single, no children',
                      value: (() => {
                        const f = families.find((x) => /Single, no children/i.test(x.family_type));
                        return f
                          ? `${fmtN(f.households)} hh (${calc.hh1 ? ((f.households! / calc.hh1) * 100).toFixed(0) : '—'}%) · ${fmtGbp(f.mean_payment_gbp)}`
                          : '—';
                      })(),
                      source: 'pulls mean down',
                    },
                    {
                      label: 'With children (single + couple)',
                      value: `${fmtN(calc.hhWithKids)} hh · means ~£1,180–£1,200`,
                      source: 'pulls mean up',
                    },
                    {
                      label: 'Reconstructed weighted mean',
                      value: fmtGbp(calc.weightedMean),
                      source: 'Σ(hh × mean_f) ÷ Σ(hh)',
                    },
                    {
                      label: 'Published city mean',
                      value: fmtGbp(calc.mean1),
                      source: 'Stat-Xplore MEAN (all households)',
                    },
                  ]}
                />
                <DataTable
                  caption="Raw family-type inputs"
                  columns={['Family type', 'Households', 'Share', 'Mean payment £', 'hh × mean']}
                  rows={families.map((f) => {
                    const share =
                      calc.hh1 > 0 && f.households != null
                        ? `${((f.households / calc.hh1) * 100).toFixed(1)}%`
                        : '—';
                    const product =
                      f.households != null && f.mean_payment_gbp != null
                        ? Math.round(f.households * f.mean_payment_gbp).toLocaleString('en-GB')
                        : '—';
                    return [
                      f.family_type,
                      fmtN(f.households),
                      share,
                      fmtGbp(f.mean_payment_gbp),
                      product,
                    ];
                  })}
                />
              </>
            )}

            {/* ── ALL NUMBERS ─────────────────────────────────────────── */}
            {sub === 'workings' && (
              <>
                <div className="bill-sec-ttl">Full monthly series (chart inputs)</div>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
                  These are the exact points plotted on The Path. Households = COUNT.
                  Mean £ = MEAN of Payment Amount. Nothing interpolated.
                </p>
                <DataTable
                  caption={`Birmingham LA · ${series.length} months`}
                  columns={['Month', 'month_key', 'Households (COUNT)', 'Mean payment £ (MEAN)']}
                  rows={series.map((s: UcPaymentMonth) => [
                    s.month,
                    s.month_key ?? '—',
                    fmtN(s.households),
                    fmtGbp(s.mean_payment_gbp),
                  ])}
                />

                <CalcNote
                  title="Illustrative monthly outlay (NOT the Benefits Bill)"
                  formula="households × mean_payment_gbp  →  rough cash paid that month · labelled DERIVED · not annual accounts"
                  lines={[
                    {
                      label: 'inputs',
                      value: `${fmtN(calc.hh1)} × ${fmtGbp(calc.mean1)}`,
                      source: data.as_of,
                    },
                    {
                      label: 'product',
                      value:
                        calc.illustrativeMonthly != null
                          ? `£${calc.illustrativeMonthly.toLocaleString('en-GB')}`
                          : '—',
                      source: 'DERIVED · order-of-magnitude only',
                    },
                    {
                      label: 'Benefits Bill UC (accounts)',
                      value: bill?.uc_m != null ? `${fmtM(bill.uc_m)} in ${bill.year}` : '—',
                      source: 'different metric — do not equate',
                    },
                    {
                      label: 'Why they differ',
                      value:
                        'Assessment-period mean × stock ≠ financial-year outturn; definitions, timing, rounding, non-payment cases differ',
                      source: 'see method_notes',
                    },
                  ]}
                />

                {(data.method_notes ?? []).length > 0 && (
                  <div className="ucp-methods">
                    <div className="bill-sec-ttl">Method notes (from fetch)</div>
                    <ul>
                      {(data.method_notes ?? []).map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="bham-watermark">FORWARD · BIRMINGHAM</div>
        </div>
      </div>

      <div className="rcol">
        <div className="hb-headline">
          <div className="hb-big">{fmtN(calc.hh1)}</div>
          <div className="hb-big-sub">
            UC households in Birmingham · {data.as_of}
            <br />
            mean payment {fmtGbp(calc.mean1)} · Stat-Xplore COUNT + MEAN
          </div>

          <div className="hb-facts">
            <div className="hb-fact">
              <span className="hb-fact-k">Δ households</span>
              <span className="hb-fact-v">
                {fmtN(calc.hh0)} ({city.first_month}) → {fmtN(calc.hh1)} ({data.as_of})
                <br />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
                  {calc.hh1} − {calc.hh0} = {calc.deltaCheck} ({fmtPct(calc.pctCheck)})
                </span>
              </span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">With children (share)</span>
              <span className="hb-fact-v">
                {fmtN(calc.hhWithKids)} households · {calc.shareWithKids ?? '—'}% of total
              </span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">Checksums</span>
              <span className="hb-fact-v">
                Bands Σ {fmtN(calc.bandSum)} (drift {calc.bandDriftPct ?? '—'}%)
                <br />
                Family Σ {fmtN(calc.famSum)} (drift {calc.famDriftPct ?? '—'}%)
              </span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">Geography</span>
              <span className="hb-fact-v" style={{ color: 'var(--herald-red)' }}>
                Local authority E08000025 — no ward £ in this dataset
              </span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">What this is not</span>
              <span className="hb-fact-v">
                Not people on UC · not annual accounts £ · not council tax · not ward spend
              </span>
            </div>
            {bill?.uc_m != null && (
              <div className="hb-fact">
                <span className="hb-fact-k">Benefits Bill UC (context)</span>
                <span className="hb-fact-v">
                  {fmtM(bill.uc_m)} · {bill.year}
                  <br />
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{bill.note}</span>
                </span>
              </div>
            )}
          </div>

          <div className="hb-sources">
            <div className="hb-sources-ttl">Sources (linked)</div>
            {(data.sources ?? []).map((s, i) => (
              <div key={i} className="hb-src">
                <a href={s.catalogueUrl} target="_blank" rel="noopener noreferrer">
                  {s.label}
                </a>
                <span className="hb-src-meta">
                  {s.publisher}
                  {s.dataset ? ` · ${s.dataset}` : ''}
                  {' · '}
                  {s.licence} · {s.as_of}
                </span>
                {s.method ? (
                  <span className="hb-src-meta" style={{ display: 'block' }}>
                    method: {s.method}
                  </span>
                ) : null}
              </div>
            ))}
            <a href="/sources" className="hb-sources-all">
              All sources &amp; methods →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function FamilyBars({
  families,
  maxHh,
  maxMean,
}: {
  families: UcPaymentFamily[];
  maxHh: number;
  maxMean: number;
}) {
  return (
    <div className="ucp-fam">
      {families.map((f, i) => {
        const col = FAM_COLORS[i % FAM_COLORS.length];
        return (
          <div key={f.family_type} className="ucp-fam-row">
            <div className="ucp-fam-name">{f.family_type}</div>
            <div className="ucp-fam-tracks">
              <div className="ucp-fam-track">
                <span className="ucp-fam-k">households</span>
                <div className="ucp-fam-bar-wrap">
                  <div
                    className="ucp-fam-bar"
                    style={{
                      width: `${((f.households ?? 0) / maxHh) * 100}%`,
                      background: col,
                    }}
                  />
                </div>
                <span className="ucp-fam-v">{fmtN(f.households)}</span>
              </div>
              <div className="ucp-fam-track">
                <span className="ucp-fam-k">mean £</span>
                <div className="ucp-fam-bar-wrap">
                  <div
                    className="ucp-fam-bar"
                    style={{
                      width: `${((f.mean_payment_gbp ?? 0) / maxMean) * 100}%`,
                      background: col,
                      opacity: 0.55,
                    }}
                  />
                </div>
                <span className="ucp-fam-v">{fmtGbp(f.mean_payment_gbp)}</span>
              </div>
            </div>
          </div>
        );
      })}
      <div className="ucp-fam-legend">
        Solid bar = household COUNT (scale max {fmtN(maxHh)}) · Faded bar = MEAN payment (scale max{' '}
        {fmtGbp(maxMean)}) · two scales, two bars — not dual-axis
      </div>
    </div>
  );
}
