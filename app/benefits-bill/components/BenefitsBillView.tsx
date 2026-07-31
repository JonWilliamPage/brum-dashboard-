'use client';

import { useMemo, useState } from 'react';
import type { BenefitsBillData, BenefitLine, BillYear } from '@/lib/types';
import BillHistoryChart, { BILL_SERIES } from './BillHistoryChart';
import BillSmallMultiples from './BillSmallMultiples';
import BillShareLine from './BillShareLine';
import BillStoryStrip from './BillStoryStrip';
import BillYearScrubber from './BillYearScrubber';
import BillMixShift from './BillMixShift';

// The Benefits Bill — where DWP money actually goes in Birmingham.
// Story-first: history as the front door, then composition, path, and GB share.
// LA-level only; nominal £; never invent ward totals or real-terms without a deflator.

const GROUP_COLOR: Record<BenefitLine['group'], string> = {
  'working-age': '#16306f',
  'pensioner': '#7d4e36',
  'mixed': '#5b2a23',
};
const GROUP_LABEL: Record<BenefitLine['group'], string> = {
  'working-age': 'working-age & children',
  'pensioner': 'pensioners',
  'mixed': 'mixed ages',
};

const LINE_META: Record<string, { label: string; group: BenefitLine['group'] }> = {
  uc: { label: 'Universal Credit', group: 'working-age' },
  sp: { label: 'State Pension', group: 'pensioner' },
  hb: { label: 'Housing Benefit', group: 'mixed' },
  pip: { label: 'Personal Independence Payment', group: 'working-age' },
  esa: { label: 'Employment & Support Allowance', group: 'working-age' },
  dla: { label: 'Disability Living Allowance', group: 'mixed' },
  pc: { label: 'Pension Credit', group: 'pensioner' },
  ca: { label: "Carer's Allowance", group: 'working-age' },
  aa: { label: 'Attendance Allowance', group: 'pensioner' },
  jsa: { label: "Jobseeker's Allowance", group: 'working-age' },
  is: { label: 'Income Support', group: 'working-age' },
  wfp: { label: 'Winter Fuel Payments', group: 'pensioner' },
  bb: { label: 'Bereavement Support', group: 'mixed' },
  dhp: { label: 'Discretionary Housing Payments', group: 'working-age' },
  sda: { label: 'Severe Disablement Allowance', group: 'working-age' },
};

type Sub = 'story' | 'today' | 'history' | 'britain';
type HistMode = 'absolute' | 'index';

function fmt(m: number) {
  return m >= 1000 ? `£${(m / 1000).toFixed(2)}bn` : `£${m.toFixed(m < 10 ? 1 : 0)}m`;
}

/** Build ranked lines for a history year from real components only. */
function linesForYear(h: BillYear, fallback: BenefitLine[]): BenefitLine[] {
  if (!h.components || h.partial) return fallback;
  return Object.entries(h.components)
    .map(([id, amount_m]) => ({
      id,
      label: LINE_META[id]?.label ?? id.toUpperCase(),
      amount_m,
      group: LINE_META[id]?.group ?? ('mixed' as const),
    }))
    .filter(l => l.amount_m > 0)
    .sort((a, b) => b.amount_m - a.amount_m);
}

function Mosaic({ lines, total }: { lines: BenefitLine[]; total: number }) {
  if (total <= 0) return null;
  return (
    <>
      <div className="bill-sec-ttl">Where the money goes — share of {fmt(total)}</div>
      <div className="bill-mosaic">
        {lines.filter(l => l.amount_m / total > 0.004).map(l => (
          <div
            key={l.id}
            className="bill-block"
            style={{ flexGrow: l.amount_m, background: GROUP_COLOR[l.group] }}
            title={`${l.label}: ${fmt(l.amount_m)} (${((l.amount_m / total) * 100).toFixed(1)}%)`}
          >
            {l.amount_m / total > 0.045 && (
              <span className="bill-block-lbl">{l.label}<em>{((l.amount_m / total) * 100).toFixed(0)}%</em></span>
            )}
          </div>
        ))}
      </div>
      <div className="comp-legend" style={{ marginTop: 8 }}>
        {(['working-age', 'pensioner', 'mixed'] as const).map(g => {
          const amount = lines.filter(l => l.group === g).reduce((s, l) => s + l.amount_m, 0);
          if (amount <= 0) return null;
          return (
            <span key={g}><i style={{ background: GROUP_COLOR[g] }} /> {GROUP_LABEL[g]} · {fmt(amount)}</span>
          );
        })}
      </div>
    </>
  );
}

export default function BenefitsBillView({ data }: { data: BenefitsBillData }) {
  const history = data.history ?? [];
  const hasHistory = history.length > 1;
  const first = history[0];
  const last = history[history.length - 1];

  const [sub, setSub] = useState<Sub>(hasHistory ? 'story' : 'today');
  const [scrubYear, setScrubYear] = useState(last?.year ?? data.year);
  const [histMode, setHistMode] = useState<HistMode>('absolute');

  const scrub = useMemo(
    () => history.find(h => h.year === scrubYear) ?? last ?? {
      year: data.year, total_m: data.total_m, gb_total_m: null, share_pct: null, components: null,
    },
    [history, scrubYear, last, data.year, data.total_m],
  );

  const latestLines = useMemo(
    () => [...(data.lines ?? [])].sort((a, b) => b.amount_m - a.amount_m),
    [data.lines],
  );
  const total = data.total_m || latestLines.reduce((s, l) => s + l.amount_m, 0);
  const maxLine = Math.max(...latestLines.map(l => l.amount_m), 1);

  const isScrubLatest = scrub.year === (last?.year ?? data.year);
  // Latest year: prefer proposal `lines` (labels + notes). Other years: components only.
  const scrubLines = useMemo(
    () => (isScrubLatest ? latestLines : linesForYear(scrub, latestLines)),
    [isScrubLatest, latestLines, scrub],
  );
  const scrubTotal = isScrubLatest ? total : scrub.total_m;
  const scrubCanSplit = isScrubLatest || !!(scrub.components && !scrub.partial);

  const groupTotals = (['working-age', 'pensioner', 'mixed'] as const).map(g => ({
    g,
    amount: latestLines.filter(l => l.group === g).reduce((s, l) => s + l.amount_m, 0),
  }));

  const tabs: [Sub, string][] = hasHistory
    ? [['story', 'The Story'], ['today', 'Today'], ['history', 'The Path'], ['britain', 'vs Britain']]
    : [['today', 'Today']];

  return (
    <div className="body">
      <div className="lcol">
        <div className="hb-nowward" role="note">
          <span className="hb-nowward-tag">◇ LOCAL-AUTHORITY FIGURE — ACTUAL DWP ACCOUNTS</span>
          <p>
            Real accounting outturn from DWP&apos;s benefit expenditure tables
            {hasHistory ? `, ${first?.year} → ${last?.year}` : `, ${data.year}`}, nominal £.
            <strong> Ward-level £ does not exist</strong> — DWP publishes expenditure for whole local
            authorities only. Excludes Child Benefit (HMRC) and council-administered support.
            This is not Birmingham City Council&apos;s budget.
          </p>
        </div>

        <div className="sub-tab-bar">
          {tabs.map(([s, lbl]) => (
            <button key={s} className={`sub-tab${sub === s ? ' active' : ''}`} onClick={() => setSub(s)}>{lbl}</button>
          ))}
          {(sub === 'story' || sub === 'history') && hasHistory && (
            <button
              className="sub-tab"
              style={{ marginLeft: 'auto', color: 'var(--herald-navy)' }}
              onClick={() => setHistMode(m => (m === 'absolute' ? 'index' : 'absolute'))}
            >
              ⇄ {histMode === 'absolute' ? 'cash £' : 'index (start=100)'}
            </button>
          )}
        </div>

        <div className="panel" style={{ flex: 1, position: 'relative' }}>
          <div className="panel-body" style={{ padding: '16px 18px' }}>

            {/* ── THE STORY ─────────────────────────────────────────────── */}
            {sub === 'story' && hasHistory && first && last && (
              <>
                <BillStoryStrip data={data} first={first} last={last} scrubYear={scrub} />
                <BillYearScrubber history={history} year={scrub.year} onChange={setScrubYear} />
                <div style={{ marginTop: 16 }}>
                  <BillHistoryChart history={history} highlightYear={scrub.year} mode={histMode} />
                </div>

                <div style={{ marginTop: 20 }}>
                  {scrubCanSplit ? (
                    <Mosaic lines={scrubLines} total={scrubTotal} />
                  ) : (
                    <>
                      <div className="bill-sec-ttl">Composition at {scrub.year}</div>
                      <div className="bill-withheld">
                        Total for {scrub.year}: <strong>{fmt(scrub.total_m)}</strong> (real workbook total).
                        {scrub.partial
                          ? ' DWP did not itemise every benefit inside that Total (e.g. no UC column) — split withheld, not estimated.'
                          : ' Component breakdown unavailable for this year — total only.'}
                        {isScrubLatest && ' Use the Today tab for the full ranked list.'}
                      </div>
                    </>
                  )}
                </div>

                <BillMixShift history={history} />

                <div style={{ marginTop: 8 }}>
                  <BillSmallMultiples history={history} />
                </div>
              </>
            )}

            {/* ── TODAY ─────────────────────────────────────────────────── */}
            {sub === 'today' && (
              <>
                <Mosaic lines={latestLines} total={total} />
                <div className="bill-sec-ttl" style={{ marginTop: 22 }}>By benefit, {data.year} (£ million, nominal)</div>
                {latestLines.map(l => (
                  <div key={l.id} className="hb-row" style={{ padding: '5px 0' }}>
                    <div className="hb-name" style={{ fontSize: 13.5 }}>
                      {l.label}
                      {l.note && (
                        <span className="hb-you" style={{ color: 'var(--muted2)', textTransform: 'none', letterSpacing: 0 }}>
                          {l.note}
                        </span>
                      )}
                    </div>
                    <div className="hb-track" style={{ height: 18 }}>
                      <div
                        className="hb-bar"
                        style={{ height: 18, width: `${(l.amount_m / maxLine) * 100}%`, background: GROUP_COLOR[l.group] }}
                      />
                      <span className="hb-val">{fmt(l.amount_m)}</span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* ── THE PATH ──────────────────────────────────────────────── */}
            {sub === 'history' && hasHistory && (
              <>
                <BillYearScrubber history={history} year={scrub.year} onChange={setScrubYear} />
                <div style={{ marginTop: 12 }}>
                  <BillHistoryChart history={history} highlightYear={scrub.year} mode={histMode} />
                </div>
                <div className="comp-legend" style={{ marginTop: 10 }}>
                  {BILL_SERIES.map(s => (
                    <span key={s.id}><i style={{ background: s.color }} /> {s.label}</span>
                  ))}
                </div>
                <BillSmallMultiples history={history} />
              </>
            )}

            {/* ── VS BRITAIN ────────────────────────────────────────────── */}
            {sub === 'britain' && hasHistory && (
              <BillShareLine history={history} />
            )}

          </div>
          <div className="bham-watermark">FORWARD · BIRMINGHAM</div>
        </div>
      </div>

      <div className="rcol">
        <div className="hb-headline">
          <div className="hb-big">{fmt(isScrubLatest ? total : scrub.total_m)}</div>
          <div className="hb-big-sub">
            DWP benefit spending in Birmingham, {isScrubLatest ? data.year : scrub.year}
            {isScrubLatest && data.per_head != null ? ` — £${data.per_head.toLocaleString()} per resident` : ' — cash total'}
            {!isScrubLatest && ' (scrubbed year)'}
          </div>

          <div className="hb-facts">
            {hasHistory && first && last && (
              <div className="hb-fact">
                <span className="hb-fact-k">Cash path</span>
                <span className="hb-fact-v">
                  {fmt(first.total_m)} ({first.year}) → {fmt(last.total_m)} ({last.year})
                  {' · '}
                  {(last.total_m / first.total_m).toFixed(1)}× nominal
                </span>
              </div>
            )}
            <div className="hb-fact">
              <span className="hb-fact-k">Largest line {isScrubLatest ? `(${data.year})` : `(${scrub.year})`}</span>
              <span className="hb-fact-v">
                {scrubCanSplit || isScrubLatest ? (
                  <>
                    {(scrubCanSplit ? scrubLines : latestLines)[0]?.label}
                    {' — '}
                    {fmt((scrubCanSplit ? scrubLines : latestLines)[0]?.amount_m ?? 0)}
                    {' ('}
                    {((((scrubCanSplit ? scrubLines : latestLines)[0]?.amount_m ?? 0) / (scrubCanSplit ? scrubTotal : total)) * 100).toFixed(0)}
                    {'%)'}
                  </>
                ) : (
                  'Itemised split withheld this year'
                )}
              </span>
            </div>
            {isScrubLatest && groupTotals.map(({ g, amount }) => (
              <div className="hb-fact" key={g}>
                <span className="hb-fact-k">{GROUP_LABEL[g]}</span>
                <span className="hb-fact-v">{fmt(amount)} · {((amount / total) * 100).toFixed(0)}% of the bill</span>
              </div>
            ))}
            {scrub.share_pct != null && (
              <div className="hb-fact">
                <span className="hb-fact-k">Share of GB bill</span>
                <span className="hb-fact-v">{scrub.share_pct}% · same DWP workbook</span>
              </div>
            )}
            <div className="hb-fact">
              <span className="hb-fact-k">Geography</span>
              <span className="hb-fact-v" style={{ color: 'var(--herald-red)' }}>Local authority — no ward-level £ exists</span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">What this is not</span>
              <span className="hb-fact-v">Not council tax, not BCC revenue budget, not inflation-adjusted</span>
            </div>
          </div>

          <div className="hb-sources">
            <div className="hb-sources-ttl">Source</div>
            {(data.sources ?? []).map((s, i) => (
              <div key={i} className="hb-src">
                <a href={s.catalogueUrl} target="_blank" rel="noopener noreferrer">{s.label}</a>
                <span className="hb-src-meta">{s.publisher} · {s.licence} · {s.as_of}</span>
              </div>
            ))}
            <a href="/sources" className="hb-sources-all">All sources &amp; methods →</a>
          </div>
        </div>
      </div>
    </div>
  );
}
