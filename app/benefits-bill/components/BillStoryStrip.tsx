'use client';

import type { BenefitsBillData, BillYear } from '@/lib/types';

// Story lede + four hero facts derived only from real workbook totals.
// Cash terms only (no invented deflator). Growth uses the series start (2002/03),
// which is a real full-bill year — not a benefit launch year.

interface Props {
  data: BenefitsBillData;
  first: BillYear;
  last: BillYear;
  scrubYear: BillYear;
}

function fmtM(m: number) {
  return m >= 1000 ? `£${(m / 1000).toFixed(2)}bn` : `£${m.toFixed(m < 10 ? 1 : 0)}m`;
}

export default function BillStoryStrip({ data, first, last, scrubYear }: Props) {
  const multiple = first.total_m > 0 ? last.total_m / first.total_m : null;
  const cashDelta = last.total_m - first.total_m;
  const cashPct = first.total_m > 0 ? ((cashDelta / first.total_m) * 100) : null;
  const scrubIndex = first.total_m > 0 ? (scrubYear.total_m / first.total_m) * 100 : null;
  const isLatest = scrubYear.year === last.year;

  return (
    <div className="bill-story">
      <div className="bill-story-lede">
        <p className="bill-story-headline">
          Birmingham&apos;s DWP benefits bill has grown from{' '}
          <strong>{fmtM(first.total_m)}</strong> in {first.year} to{' '}
          <strong>{fmtM(last.total_m)}</strong> in {last.year}
          {multiple != null && (
            <> — <em>{multiple.toFixed(1)}× in cash terms</em></>
          )}
          .
        </p>
        <p className="bill-story-sub">
          Nominal £ from DWP&apos;s benefit-expenditure-by-local-authority tables (actual accounts).
          Not inflation-adjusted. Not the city council&apos;s budget — central government money paid
          to residents. Scrub a year below to see the composition at that point.
        </p>
      </div>

      <div className="bill-kpi-grid" role="group" aria-label="Key figures">
        <div className="bill-kpi">
          <div className="bill-kpi-k">Then → now</div>
          <div className="bill-kpi-v">
            {fmtM(first.total_m)}
            <span className="bill-kpi-arrow">→</span>
            {fmtM(last.total_m)}
          </div>
          <div className="bill-kpi-note">{first.year} → {last.year} · cash</div>
        </div>

        <div className="bill-kpi">
          <div className="bill-kpi-k">Cash multiple</div>
          <div className="bill-kpi-v bill-kpi-accent">
            {multiple != null ? `${multiple.toFixed(2)}×` : '—'}
          </div>
          <div className="bill-kpi-note">
            {cashPct != null ? `${cashPct > 0 ? '+' : ''}${Math.round(cashPct)}% · +${fmtM(cashDelta)}` : '—'}
          </div>
        </div>

        <div className="bill-kpi">
          <div className="bill-kpi-k">Per resident</div>
          <div className="bill-kpi-v">
            {data.per_head != null ? `£${data.per_head.toLocaleString()}` : '—'}
          </div>
          <div className="bill-kpi-note">
            {data.year} · ÷ ONS mid-year population
            {data.population != null ? ` (${(data.population / 1e6).toFixed(2)}m)` : ''}
          </div>
        </div>

        <div className="bill-kpi">
          <div className="bill-kpi-k">Share of GB bill</div>
          <div className="bill-kpi-v">
            {last.share_pct != null ? `${last.share_pct}%` : '—'}
          </div>
          <div className="bill-kpi-note">
            {first.share_pct != null && last.share_pct != null
              ? first.share_pct === last.share_pct
                ? `Flat at ${last.share_pct}% since ${first.year} (same workbook)`
                : `${first.share_pct}% (${first.year}) → ${last.share_pct}% (${last.year})`
              : 'Birmingham ÷ Great Britain total'}
          </div>
        </div>
      </div>

      {!isLatest && scrubIndex != null && (
        <div className="bill-scrub-chip" role="status">
          Scrubbing <strong>{scrubYear.year}</strong>: bill was {fmtM(scrubYear.total_m)}
          {' '}({scrubIndex.toFixed(0)} on an index of {first.year} = 100)
          {scrubYear.share_pct != null ? ` · ${scrubYear.share_pct}% of GB` : ''}
        </div>
      )}
    </div>
  );
}
