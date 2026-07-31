'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { FlyTipArea, FlyTipData } from '@/lib/types';
import ScoringNote from '../../components/brand/ScoringNote';
import { RAMP } from '@/lib/constants';

const FlyTipMap = dynamic(() => import('./FlyTipMap'), { ssr: false });

// Shared in /review and Dashboards. LA-level only — no ward map invented.

const RED = '#b01225';
const NAVY = '#16306f';
const GOLD = '#efb700';
const GREEN = '#1f7a33'; // positive outlier (Wolverhampton decline)
const MUTED = 'rgba(14,15,17,.45)';
const PEER = 'rgba(22,48,111,.35)';

const WOLV_CODE = 'E08000031';

type Sub = 'peers' | 'history' | 'change' | 'multiples' | 'table' | 'map' | 'outlier';

function fmt(v: number | null | undefined, d = 1) {
  return v == null || Number.isNaN(v) ? '—' : v.toFixed(d);
}

function isWolv(a: { area_code?: string; area_name?: string }) {
  return a.area_code === WOLV_CODE || a.area_name === 'Wolverhampton';
}

/** Declining series from first non-null to latest — derived from the same Observatory rates. */
function fallingAreas(areas: FlyTipArea[]) {
  return areas.filter(a => a.change_pp != null && a.change_pp < 0);
}

export default function FlyTippingView({ data }: { data: FlyTipData }) {
  const [sub, setSub] = useState<Sub>('peers');
  const areas = data.areas ?? [];
  const years = data.years ?? [];
  const bham = data.birmingham_value ?? data.city?.latest ?? null;
  const { wmca, england } = data.benchmarks ?? { wmca: null, england: null };
  const firstYear = years[0] ?? '';
  const lastYear = years[years.length - 1] ?? data.as_of;

  const wolv = useMemo(() => areas.find(isWolv) ?? null, [areas]);
  const fell = useMemo(() => fallingAreas(areas), [areas]);
  const onlyWolvFell = fell.length === 1 && wolv && isWolv(fell[0]);

  const maxPeer = Math.max(...areas.map(a => a.value), wmca ?? 0, england ?? 0, 1);
  const scale = Math.ceil(maxPeer / 5) * 5 || 40;
  const pct = (v: number) => `${(v / scale) * 100}%`;
  const mult = (n: number | null) => (n && bham ? (bham / n).toFixed(2) : '—');

  const tabs: [Sub, string][] = [
    ['peers', 'Peers'],
    ['history', 'History'],
    ['change', 'Change'],
    ['multiples', 'Boroughs'],
    ['table', 'Table'],
    ['map', 'Map'],
    ['outlier', 'Why Wolverhampton?'],
  ];

  return (
    <div className="body">
      <div className="lcol">
        <div className="hb-nowward" role="note">
          <span className="hb-nowward-tag">◇ LOCAL-AUTHORITY FIGURE</span>
          <p>
            Defra publishes fly-tipping rates for <strong>whole local authorities only</strong> —
            there is <strong>no ward-level breakdown</strong> in this official series. Shown as the
            honest like-for-like comparison: Birmingham against the other six West Midlands
            metropolitan boroughs, with the published West Midlands and England means. Rate =
            reported incidents per 1,000 residents (WasteDataFlow + ONS population). Defra warns
            that crude league tables can mislead — recording practices differ; still useful for
            peer context.
          </p>
        </div>

        <ScoringNote label="What you're seeing">
          Fly-tipping incidents per 1,000 people ({data.as_of}). Higher = more reported illegal
          deposits of waste per resident. Birmingham is rank #{data.birmingham_rank ?? data.city?.rank ?? '—'} of {areas.length}.
          Series {firstYear}→{lastYear}.
          {wolv && onlyWolvFell && (
            <> <strong style={{ color: GREEN }}>Wolverhampton is the performance outlier</strong> —
            only borough whose rate fell over the full series ({fmt(wolv.change_pp)} points) and
            second-lowest level today. Open <em>Why Wolverhampton?</em> for policy evidence.
            </>
          )}
        </ScoringNote>

        {(sub === 'peers' || sub === 'change' || sub === 'history') && wolv && (
          <OutlierCallout
            wolv={wolv}
            firstYear={firstYear}
            lastYear={lastYear}
            onlyFell={onlyWolvFell}
            onOpen={() => setSub('outlier')}
          />
        )}

        <div className="sub-tab-bar">
          {tabs.map(([s, lbl]) => (
            <button key={s} className={`sub-tab${sub === s ? ' active' : ''}`} onClick={() => setSub(s)}>{lbl}</button>
          ))}
        </div>

        {sub === 'map' && (
          <div className="data-view-toolbar">
            <div className="legend-row">
              <span className="llbl" style={{ marginRight: 2 }}>Lower</span>
              {RAMP.map((c, i) => <div key={i} className="lsw" style={{ background: c }} />)}
              <span className="llbl" style={{ marginLeft: 2 }}>Higher — incidents / 1,000</span>
              <span className="llbl" style={{ marginLeft: 12, color: 'var(--herald-red)' }}>▬ Birmingham</span>
              <span className="llbl" style={{ marginLeft: 10, color: GREEN }}>▬ Wolverhampton (outlier)</span>
            </div>
          </div>
        )}

        <div className="panel" style={{ flex: 1, position: 'relative' }}>
          <div
            className="panel-body"
            style={
              sub === 'map'
                ? { padding: 0, height: '100%' }
                : sub === 'outlier'
                  ? { overflow: 'auto', padding: '12px 14px 20px' }
                  : undefined
            }
          >
            {sub === 'peers' && (
              <div className="hb-chart">
                {areas.map(a => {
                  const w = isWolv(a);
                  return (
                    <div key={a.area_code} className={`hb-row${a.is_birmingham ? ' is-bham' : ''}${w ? ' is-wolv' : ''}`}>
                      <div className="hb-name">
                        {a.area_name}
                        {a.is_birmingham && <span className="hb-you"> ← Birmingham</span>}
                        {w && <span className="ft-wolv-tag"> · only net fall</span>}
                      </div>
                      <div className="hb-track">
                        <div
                          className="hb-bar"
                          style={{
                            width: pct(a.value),
                            background: a.is_birmingham ? RED : w ? GREEN : NAVY,
                          }}
                        />
                        <span className="hb-val">{fmt(a.value)}</span>
                      </div>
                    </div>
                  );
                })}
                <div className="hb-benchdiv">Benchmarks (Defra / Observatory, {data.as_of})</div>
                {([['West Midlands average', wmca], ['England average (all LAs)', england]] as const).map(
                  ([label, val]) =>
                    val != null && (
                      <div key={label} className="hb-row is-bench">
                        <div className="hb-name">{label}</div>
                        <div className="hb-track">
                          <div className="hb-bar hb-bar-bench" style={{ width: pct(val) }} />
                          <span className="hb-val">{fmt(val)}</span>
                        </div>
                      </div>
                    ),
                )}
                <div className="hb-axis">
                  <span>0</span>
                  <span>{(scale / 2).toFixed(0)}</span>
                  <span>{scale.toFixed(0)} / 1,000</span>
                </div>
              </div>
            )}

            {sub === 'history' && (
              <HistoryChart
                years={years}
                areas={areas}
                bhamSeries={data.city?.series ?? []}
                bench={data.bench_series}
              />
            )}

            {sub === 'change' && (
              <DumbbellChange areas={areas} firstYear={firstYear} lastYear={lastYear} />
            )}

            {sub === 'multiples' && (
              <SmallMultiples years={years} areas={areas} benchEngland={data.bench_series?.england ?? []} />
            )}

            {sub === 'table' && (
              <PeerTable areas={areas} years={years} firstYear={firstYear} lastYear={lastYear} wmca={wmca} england={england} />
            )}

            {sub === 'map' && (
              <FlyTipMap areas={areas} asOf={data.as_of} />
            )}

            {sub === 'outlier' && (
              <WolverhamptonPanel
                wolv={wolv}
                areas={areas}
                firstYear={firstYear}
                lastYear={lastYear}
                bham={bham}
                onlyFell={!!onlyWolvFell}
              />
            )}
          </div>
          {sub !== 'map' && sub !== 'outlier' && <div className="bham-watermark">FORWARD · BIRMINGHAM</div>}
        </div>
      </div>

      <div className="rcol">
        <div className="hb-headline">
          <div className="hb-big">{bham != null ? fmt(bham) : '—'}</div>
          <div className="hb-big-sub">
            fly-tipping incidents per 1,000 people in Birmingham · {data.as_of}
          </div>

          <div className="hb-facts">
            <div className="hb-fact">
              <span className="hb-fact-k">Rank in region</span>
              <span className="hb-fact-v">#{data.birmingham_rank ?? data.city?.rank ?? '—'} of {areas.length} boroughs</span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">vs West Midlands avg</span>
              <span className="hb-fact-v">{mult(wmca)}× ({fmt(wmca)})</span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">vs England avg</span>
              <span className="hb-fact-v">{mult(england)}× ({fmt(england)})</span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">Change {firstYear} → {lastYear}</span>
              <span className="hb-fact-v" style={{ color: (data.city?.change ?? 0) > 0 ? RED : NAVY }}>
                {data.city?.change != null && data.city.change > 0 ? '+' : ''}{fmt(data.city?.change ?? null)} points
              </span>
            </div>
            {wolv && (
              <div className="hb-fact">
                <span className="hb-fact-k">Wolverhampton (outlier)</span>
                <span className="hb-fact-v" style={{ color: GREEN }}>
                  {fmt(wolv.value)} / 1,000 · {wolv.change_pp != null && wolv.change_pp < 0 ? '' : '+'}{fmt(wolv.change_pp)} since {firstYear}
                  {onlyWolvFell ? ' · only net fall in WM' : ''}
                </span>
              </div>
            )}
            <div className="hb-fact">
              <span className="hb-fact-k">Peak in series (Birmingham)</span>
              <span className="hb-fact-v">{fmt(data.city?.peak ?? null)} · {data.city?.peak_year ?? '—'}</span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">Geography</span>
              <span className="hb-fact-v" style={{ color: 'var(--herald-red)' }}>Local authority — no ward breakdown</span>
            </div>
          </div>

          <button
            type="button"
            className="ft-open-outlier"
            onClick={() => setSub('outlier')}
          >
            Why is Wolverhampton different? →
          </button>

          <div className="hb-sources">
            <div className="hb-sources-ttl">Source (rates)</div>
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

function OutlierCallout({
  wolv,
  firstYear,
  lastYear,
  onlyFell,
  onOpen,
}: {
  wolv: FlyTipArea;
  firstYear: string;
  lastYear: string;
  onlyFell: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="ft-callout" role="note">
      <div className="ft-callout-tag">◈ PERFORMANCE OUTLIER</div>
      <p>
        <strong>Wolverhampton</strong> sits at <strong>{fmt(wolv.value)}</strong> incidents per 1,000
        in {lastYear} (rank #{wolv.rank}) — and is{' '}
        {onlyFell ? (
          <strong>the only West Midlands metro whose rate fell</strong>
        ) : (
          <strong>among the few with a lower rate than at the start</strong>
        )}{' '}
        of the series ({firstYear}→{lastYear}: <strong style={{ color: GREEN }}>{fmt(wolv.change_pp)} points</strong>).
        Dudley is lower today but has been <em>rising</em> from a very low base; Wolverhampton’s path is
        flat control plus a multi-year enforcement programme.
      </p>
      <button type="button" className="ft-callout-btn" onClick={onOpen}>
        Why Wolverhampton? — policy evidence →
      </button>
    </div>
  );
}

/** Sourced evidence panel — rates from Observatory; enforcement claims from Wolverhampton council publications. */
function WolverhamptonPanel({
  wolv,
  areas,
  firstYear,
  lastYear,
  bham,
  onlyFell,
}: {
  wolv: FlyTipArea | null;
  areas: FlyTipArea[];
  firstYear: string;
  lastYear: string;
  bham: number | null;
  onlyFell: boolean;
}) {
  const sandwell = areas.find(a => a.area_name === 'Sandwell');
  const dudley = areas.find(a => a.area_name === 'Dudley');

  return (
    <div className="ft-story">
      <div className="ft-story-kicker">Evidence brief · not a causal claim</div>
      <h3 className="ft-story-title">Why Wolverhampton looks different</h3>
      <p className="ft-story-lead">
        On the official rate series, Wolverhampton is the West Midlands metro that combined a
        <strong> low level</strong> with a <strong>net fall</strong> over a decade — while Birmingham
        and most neighbours rose. Below: what the numbers show, then what Wolverhampton’s council
        says it did (policies, enforcement, politics). We do <strong>not</strong> invent a proof that
        policy X caused rate Y; we put the evidence next to the chart.
      </p>

      <section className="ft-story-sec">
        <h4>1. What the rate data shows</h4>
        <ul className="ft-story-list">
          <li>
            <strong>Wolverhampton {lastYear}:</strong> {fmt(wolv?.value)} incidents / 1,000 · rank #{wolv?.rank ?? '—'} of {areas.length}
            {wolv && <> · change {firstYear}→{lastYear}: <span style={{ color: GREEN }}>{fmt(wolv.change_pp)} points</span></>}
          </li>
          <li>
            <strong>Birmingham {lastYear}:</strong> {fmt(bham)} / 1,000 · change {firstYear}→{lastYear}: +{fmt(
              areas.find(a => a.is_birmingham)?.change_pp ?? null,
            )} points
          </li>
          {sandwell && (
            <li>
              <strong>Sandwell (highest):</strong> {fmt(sandwell.value)} / 1,000 · change {fmt(sandwell.change_pp)} points
            </li>
          )}
          {dudley && (
            <li>
              <strong>Dudley (lowest level):</strong> {fmt(dudley.value)} / 1,000 but <em>rising</em> from {fmt(dudley.first_value)} ({fmt(dudley.change_pp)} points) — different story from Wolverhampton’s sustained control
            </li>
          )}
          <li>
            {onlyFell
              ? 'Wolverhampton is the only one of the seven metros with a negative full-series change.'
              : 'Wolverhampton’s series stays in a narrow band while peers spike after 2020.'}
          </li>
        </ul>
        <p className="ft-story-src">
          Source: Defra WasteDataFlow rates via Birmingham City Observatory ·{' '}
          <a href="https://www.cityobservatory.birmingham.gov.uk/explore/dataset/fly-tipping-incidents-per-1000-people-wmca/" target="_blank" rel="noopener noreferrer">
            fly-tipping-incidents-per-1000-people-wmca
          </a>
        </p>
      </section>

      <section className="ft-story-sec">
        <h4>2. Long-running policy package — “Shop a Tipper”</h4>
        <p>
          From <strong>2019</strong>, City of Wolverhampton Council ran an award-winning{' '}
          <strong>Fly-Tipping Reduction Scheme</strong> (CIEH Excellence Awards — Best Environmental
          Health Project). Core design:
        </p>
        <ul className="ft-story-list">
          <li>
            Public intelligence campaign (<strong>shopatipper.com</strong>, hotline, media uploads)
          </li>
          <li>
            <strong>£100 Enjoy Wolverhampton gift card</strong> when a tip-off leads to a paid FPN or successful prosecution
          </li>
          <li>
            Integrated <strong>in-house waste + environmental crime</strong> systems (report → investigate within ~24h → clear → FPN)
          </li>
          <li>
            Early campaign results claimed by the council: ~<strong>50% cut in reports</strong>, ~<strong>£75k</strong> clean-up saving, first vehicle seizures/crushes under waste seizure regulations
          </li>
        </ul>
        <p className="ft-story-src">
          Source:{' '}
          <a href="https://www.cieh.org/media/3696/cieh_excellence-awards-winners-case-study-2019_best-environmental-health-project.pdf" target="_blank" rel="noopener noreferrer">
            CIEH case study — City of Wolverhampton Fly-Tipping Reduction Scheme (PDF)
          </a>
        </p>
      </section>

      <section className="ft-story-sec">
        <h4>3. Hard enforcement vs Black Country neighbours</h4>
        <p>
          Wolverhampton’s own scrutiny presentation (April 2025) tables Defra-linked enforcement over
          ~10 years and compares Black Country peers. These are <strong>the council’s published
          comparison</strong> — not re-derived by Ozzy:
        </p>
        <div className="ft-enforce-table-wrap">
          <table className="data-table ft-enforce-table">
            <thead>
              <tr>
                <th>Authority</th>
                <th>FPNs (~10 yrs)</th>
                <th>Prosecutions</th>
                <th>Vehicles seized</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: 'rgba(31,122,51,.08)' }}>
                <td><strong>Wolverhampton</strong></td>
                <td style={{ fontFamily: 'var(--mono)' }}>330</td>
                <td style={{ fontFamily: 'var(--mono)' }}>58</td>
                <td style={{ fontFamily: 'var(--mono)' }}>24</td>
              </tr>
              <tr>
                <td>Sandwell</td>
                <td style={{ fontFamily: 'var(--mono)' }}>150</td>
                <td style={{ fontFamily: 'var(--mono)' }}>10</td>
                <td style={{ fontFamily: 'var(--mono)' }}>0</td>
              </tr>
              <tr>
                <td>Dudley</td>
                <td style={{ fontFamily: 'var(--mono)' }}>129</td>
                <td style={{ fontFamily: 'var(--mono)' }}>11</td>
                <td style={{ fontFamily: 'var(--mono)' }}>12</td>
              </tr>
              <tr>
                <td>Walsall</td>
                <td style={{ fontFamily: 'var(--mono)' }}>81</td>
                <td style={{ fontFamily: 'var(--mono)' }}>0</td>
                <td style={{ fontFamily: 'var(--mono)' }}>2</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="ft-story-list">
          <li>
            <strong>2024 calendar year (council figures):</strong> 57 × £400 FPNs for fly-tipping; 38 paid
            (~£15k+ reinvested into clearance, target-hardening, materials); 6 prosecutions that year;
            14 further cases into legal for 2025
          </li>
          <li>
            FPNs for lesser tips; <strong>prosecution</strong> preferred for commercial / high-cost tips
          </li>
          <li>
            FPN ceiling later moved toward the national max (<strong>£1,000</strong> with early-payment discount) in the wider enforcement conversation
          </li>
        </ul>
        <p className="ft-story-src">
          Source:{' '}
          <a href="https://wolverhampton.moderngov.co.uk/documents/s294481/Fly+Tipping+Presentation+final.pdf" target="_blank" rel="noopener noreferrer">
            City of Wolverhampton — Scrutiny Fly Tipping Update, 10 Apr 2025 (PDF)
          </a>
        </p>
      </section>

      <section className="ft-story-sec">
        <h4>4. Hotspot playbook, cameras, drones</h4>
        <ul className="ft-story-list">
          <li>
            <strong>Targeted streets:</strong> warning letters → CCTV → Shop a Tipper leaflets (images of offenders for intel) → FPNs. One hotspot case study claimed ~<strong>90% reduction</strong> (279 items in 4 months before → 29 after)
          </li>
          <li>
            Locations chosen via a <strong>Shop a Tipper Project Board</strong> (resource-heavy — not blanket city-wide)
          </li>
          <li>
            Council states the approach is being shared by <strong>Defra as national best practice</strong>
          </li>
          <li>
            <strong>AI / environmental cameras</strong> and public “we are watching” prosecutions
          </li>
          <li>
            <strong>Drones</strong> (three qualified pilots) for illegal waste storage / hard-to-access land
          </li>
          <li>
            <strong>Vehicle seizure and crushing</strong> used as high-visibility deterrent
          </li>
        </ul>
        <p className="ft-story-src">
          Sources: Scrutiny pack (above);{' '}
          <a href="https://www.wolverhamptonhomes.org.uk/news/community-news/city-s-fly-tipping-crackdown-delivers-success-as-dumped-rubbish-is-halved-in-hotspot-areas/" target="_blank" rel="noopener noreferrer">
            Council media via Wolverhampton Homes (Aug 2023 crackdown)
          </a>
          ;{' '}
          <a href="https://www.wolverhampton.gov.uk/news/we-are-watching-city-cameras-lead-prosecutions-environmental-crimes" target="_blank" rel="noopener noreferrer">
            “We are watching” camera prosecutions
          </a>
        </p>
      </section>

      <section className="ft-story-sec">
        <h4>5. Political ownership &amp; place discipline</h4>
        <ul className="ft-story-list">
          <li>
            Cabinet member for environment &amp; climate change (<strong>Cllr Craig Collingswood</strong>) publicly fronted crackdowns
          </li>
          <li>
            Officer ownership under Resident Services / Environment &amp; Regulation (scrutiny led by Director Resident Services)
          </li>
          <li>
            <strong>Section 46</strong> notices for wrongly presented waste / bins left on streets — e.g. 960 notices across six focused streets (not city-wide blanket)
          </li>
          <li>
            Legal outlets promoted: free HWRC walk-in; bulky collections
          </li>
          <li>
            Heavy <strong>comms</strong> on prosecutions and cameras — framed as countering “broken windows” (if people think the council does not care, dumping spreads)
          </li>
        </ul>
      </section>

      <section className="ft-story-sec ft-story-lessons">
        <h4>6. What this does — and does not — mean for Birmingham</h4>
        <ul className="ft-story-list">
          <li>
            <strong>Package, not a poster:</strong> intelligence rewards + high FPN/prosecution/seizure volume + hotspot CCTV/drones + reinvested fine income + political ownership
          </li>
          <li>
            Birmingham is a larger, denser LA with more absolute volume; Defra also flags that <strong>enforcement data quality can vary</strong> between councils — rates are the fairer peer metric
          </li>
          <li>
            We cannot prove “Shop a Tipper caused the rate path” without a formal evaluation (displacement, private land, HWRC rules, recording changes)
          </li>
          <li>
            Fair Ozzy line: <em>Wolverhampton is the peer that both looks different on the official rate and has a multi-year, nationally cited enforcement model Birmingham can learn from.</em>
          </li>
        </ul>
      </section>
    </div>
  );
}

function HistoryChart({
  years,
  areas,
  bhamSeries,
  bench,
}: {
  years: string[];
  areas: FlyTipData['areas'];
  bhamSeries: (number | null)[];
  bench: FlyTipData['bench_series'];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);
      if (cancelled || !canvasRef.current) return;
      if (chartRef.current) chartRef.current.destroy();

      const wolv = areas.find(isWolv);
      const others = areas.filter(a => !a.is_birmingham && !isWolv(a));
      const datasets = [
        ...others.map(a => ({
          label: a.area_name,
          data: a.series.map(v => v ?? NaN),
          borderColor: PEER,
          backgroundColor: 'transparent',
          borderWidth: 1.2,
          pointRadius: 0,
          tension: 0.2,
          order: 4,
        })),
        {
          label: 'England mean',
          data: (bench?.england ?? []).map(v => v ?? NaN),
          borderColor: MUTED,
          borderDash: [4, 3],
          borderWidth: 1.4,
          pointRadius: 0,
          tension: 0,
          order: 3,
        },
        {
          label: 'WMCA mean',
          data: (bench?.wmca ?? []).map(v => v ?? NaN),
          borderColor: GOLD,
          borderDash: [3, 3],
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0,
          order: 3,
        },
        ...(wolv
          ? [{
              label: 'Wolverhampton',
              data: wolv.series.map(v => v ?? NaN),
              borderColor: GREEN,
              backgroundColor: 'transparent',
              borderWidth: 2.6,
              pointRadius: 3,
              pointBackgroundColor: GREEN,
              tension: 0.25,
              order: 2,
            }]
          : []),
        {
          label: 'Birmingham',
          data: bhamSeries.map(v => v ?? NaN),
          borderColor: RED,
          backgroundColor: 'rgba(176,18,37,.08)',
          fill: true,
          borderWidth: 2.4,
          pointRadius: 3,
          pointBackgroundColor: RED,
          tension: 0.25,
          order: 1,
        },
      ];

      chartRef.current = new Chart(canvasRef.current, {
        type: 'line',
        data: { labels: years, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 10,
                font: { size: 10, family: 'IBM Plex Mono, monospace' },
                filter: item =>
                  ['Birmingham', 'Wolverhampton', 'England mean', 'WMCA mean'].includes(item.text ?? ''),
              },
            },
            tooltip: {
              backgroundColor: '#0e0f11',
              titleFont: { size: 11 },
              bodyFont: { size: 11, family: 'IBM Plex Mono, monospace' },
              callbacks: {
                label: ctx => {
                  const y = ctx.parsed.y;
                  if (y == null || Number.isNaN(y)) return `${ctx.dataset.label}: —`;
                  return `${ctx.dataset.label}: ${y.toFixed(1)} / 1,000`;
                },
              },
            },
          },
          scales: {
            x: {
              ticks: { color: MUTED, font: { size: 9, family: 'IBM Plex Mono, monospace' }, maxRotation: 45 },
              grid: { color: 'rgba(14,15,17,.06)' },
            },
            y: {
              title: { display: true, text: 'Incidents per 1,000 people', color: MUTED, font: { size: 10 } },
              ticks: { color: MUTED, font: { size: 9, family: 'IBM Plex Mono, monospace' } },
              grid: { color: 'rgba(14,15,17,.06)' },
              beginAtZero: true,
            },
          },
        },
      });
    })();
    return () => {
      cancelled = true;
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [years, areas, bhamSeries, bench]);

  return (
    <div style={{ height: '100%', minHeight: 340, padding: '8px 4px' }}>
      <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.5 }}>
        <strong style={{ color: RED }}>Birmingham</strong> in red ·{' '}
        <strong style={{ color: GREEN }}>Wolverhampton</strong> in green (performance outlier) ·
        other boroughs light navy · dashed gold = WMCA · dashed grey = England.
      </div>
      <div style={{ height: 'calc(100% - 36px)', minHeight: 300 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

function DumbbellChange({
  areas,
  firstYear,
  lastYear,
}: {
  areas: FlyTipData['areas'];
  firstYear: string;
  lastYear: string;
}) {
  const vals = areas.flatMap(a => [a.first_value, a.value].filter((v): v is number => v != null));
  const maxV = Math.max(...vals, 1);
  const scale = Math.ceil(maxV / 5) * 5;

  const sorted = [...areas].sort((a, b) => (b.change_pp ?? 0) - (a.change_pp ?? 0));

  return (
    <div className="ft-dumbbell" style={{ padding: '10px 8px 16px' }}>
      <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.55 }}>
        Before → after: {firstYear} (open circle) to {lastYear} (filled). Sorted by rise in the rate.
        Wolverhampton in green if it fell.
      </div>
      {sorted.map(a => {
        const w = isWolv(a);
        const accent = a.is_birmingham ? RED : w ? GREEN : NAVY;
        const x0 = a.first_value != null ? (a.first_value / scale) * 100 : null;
        const x1 = (a.value / scale) * 100;
        const left = x0 != null ? Math.min(x0, x1) : x1;
        const width = x0 != null ? Math.abs(x1 - x0) : 0;
        return (
          <div key={a.area_code} className="ft-db-row" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              fontFamily: 'var(--sans)', fontSize: 12, fontWeight: a.is_birmingham || w ? 700 : 500,
              color: accent, width: 110, flexShrink: 0,
            }}>
              {a.area_name}
            </div>
            <div style={{ flex: 1, position: 'relative', height: 22 }}>
              <div style={{ position: 'absolute', left: 0, right: 0, top: 10, height: 1, background: 'rgba(14,15,17,.1)' }} />
              {x0 != null && (
                <div style={{
                  position: 'absolute', left: `${left}%`, width: `${width}%`, top: 9, height: 3,
                  background: a.is_birmingham ? 'rgba(176,18,37,.45)' : w ? 'rgba(31,122,51,.45)' : 'rgba(22,48,111,.35)',
                }} />
              )}
              {x0 != null && (
                <div style={{
                  position: 'absolute', left: `calc(${x0}% - 5px)`, top: 5, width: 11, height: 11,
                  borderRadius: '50%', border: `2px solid ${accent}`,
                  background: '#f5f3ee',
                }} />
              )}
              <div style={{
                position: 'absolute', left: `calc(${x1}% - 5px)`, top: 5, width: 11, height: 11,
                borderRadius: '50%', background: accent,
              }} />
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 11, width: 72, textAlign: 'right',
              color: (a.change_pp ?? 0) > 0 ? RED : (a.change_pp ?? 0) < 0 ? GREEN : 'var(--muted)',
            }}>
              {a.change_pp != null ? `${a.change_pp > 0 ? '+' : ''}${a.change_pp.toFixed(1)}` : '—'}
            </div>
          </div>
        );
      })}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginTop: 8, paddingLeft: 110, paddingRight: 72 }}>
        <span>0</span>
        <span>{(scale / 2).toFixed(0)}</span>
        <span>{scale} / 1,000</span>
      </div>
    </div>
  );
}

function SmallMultiples({
  years,
  areas,
  benchEngland,
}: {
  years: string[];
  areas: FlyTipData['areas'];
  benchEngland: (number | null)[];
}) {
  const maxY = Math.max(
    ...areas.flatMap(a => a.series.filter((v): v is number => v != null)),
    ...benchEngland.filter((v): v is number => v != null),
    1,
  );

  return (
    <div className="ft-multiples" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
      gap: 12,
      padding: 8,
    }}>
      {areas.map(a => (
        <SparkCard
          key={a.area_code}
          name={a.area_name}
          series={a.series}
          years={years}
          maxY={maxY}
          accent={a.is_birmingham}
          positive={isWolv(a)}
          latest={a.value}
          eng={benchEngland}
        />
      ))}
    </div>
  );
}

function SparkCard({
  name, series, years, maxY, accent, positive, latest, eng,
}: {
  name: string;
  series: (number | null)[];
  years: string[];
  maxY: number;
  accent: boolean;
  positive?: boolean;
  latest: number;
  eng: (number | null)[];
}) {
  const w = 160;
  const h = 56;
  const pad = 4;
  const stroke = accent ? RED : positive ? GREEN : NAVY;
  const pts = series.map((v, i) => {
    if (v == null) return null;
    const x = pad + (i / Math.max(years.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - (v / maxY) * (h - pad * 2);
    return `${x},${y}`;
  }).filter(Boolean).join(' ');
  const engPts = eng.map((v, i) => {
    if (v == null) return null;
    const x = pad + (i / Math.max(years.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - (v / maxY) * (h - pad * 2);
    return `${x},${y}`;
  }).filter(Boolean).join(' ');

  return (
    <div style={{
      border: `1px solid ${accent ? 'rgba(176,18,37,.35)' : positive ? 'rgba(31,122,51,.4)' : 'var(--border-solid)'}`,
      borderTop: accent ? `3px solid ${RED}` : positive ? `3px solid ${GREEN}` : '1px solid var(--border-solid)',
      padding: '10px 10px 8px',
      background: accent ? 'rgba(176,18,37,.03)' : positive ? 'rgba(31,122,51,.04)' : 'var(--surface)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--sans)', fontSize: 12, fontWeight: accent || positive ? 700 : 600, color: stroke }}>{name}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink)' }}>{fmt(latest)}</span>
      </div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        {engPts && <polyline points={engPts} fill="none" stroke={MUTED} strokeWidth="1" strokeDasharray="3 2" />}
        {pts && <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.8" />}
      </svg>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)' }}>
        {years[0]} → {years[years.length - 1]}
        {positive ? ' · outlier' : ''}
      </div>
    </div>
  );
}

function PeerTable({
  areas, years, firstYear, lastYear, wmca, england,
}: {
  areas: FlyTipData['areas'];
  years: string[];
  firstYear: string;
  lastYear: string;
  wmca: number | null;
  england: number | null;
}) {
  return (
    <div style={{ overflow: 'auto', padding: 4 }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Local authority</th>
            <th>{lastYear}</th>
            <th>{firstYear}</th>
            <th>Change</th>
            <th>vs Eng.</th>
          </tr>
        </thead>
        <tbody>
          {areas.map(a => {
            const w = isWolv(a);
            return (
              <tr
                key={a.area_code}
                style={
                  a.is_birmingham
                    ? { background: 'rgba(176,18,37,.06)' }
                    : w
                      ? { background: 'rgba(31,122,51,.08)' }
                      : undefined
                }
              >
                <td style={{ fontFamily: 'var(--mono)' }}>{a.rank}</td>
                <td style={{ fontWeight: a.is_birmingham || w ? 700 : 500, color: w ? GREEN : undefined }}>
                  {a.area_name}{w ? ' ★' : ''}
                </td>
                <td style={{ fontFamily: 'var(--mono)' }}>{fmt(a.value)}</td>
                <td style={{ fontFamily: 'var(--mono)' }}>{fmt(a.first_value)}</td>
                <td style={{
                  fontFamily: 'var(--mono)',
                  color: (a.change_pp ?? 0) > 0 ? RED : (a.change_pp ?? 0) < 0 ? GREEN : undefined,
                }}>
                  {a.change_pp != null ? `${a.change_pp > 0 ? '+' : ''}${a.change_pp.toFixed(1)}` : '—'}
                </td>
                <td style={{ fontFamily: 'var(--mono)' }}>
                  {england && a.value ? `${(a.value / england).toFixed(2)}×` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} style={{ color: 'var(--muted)' }}>West Midlands mean</td>
            <td style={{ fontFamily: 'var(--mono)' }}>{fmt(wmca)}</td>
            <td colSpan={3} />
          </tr>
          <tr>
            <td colSpan={2} style={{ color: 'var(--muted)' }}>England mean</td>
            <td style={{ fontFamily: 'var(--mono)' }}>{fmt(england)}</td>
            <td colSpan={3} style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
              {years.length} years · incidents / 1,000 residents · ★ only net fall
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
