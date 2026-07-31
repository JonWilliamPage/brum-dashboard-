// Agent fetch tool — Birmingham ward crime from the City Observatory.
//
// The "researcher" step of the agent loop. It:
//   1. finds the latest month in the Observatory's street-level police feed,
//   2. enumerates every month in the series and confirms ward coverage,
//   3. pulls server-side AGGREGATES (never raw street rows) per month:
//        city×category, city×outcome, ward×category, ward totals,
//   4. filters to Birmingham's 69 official wards (E05011118–E05011186),
//   5. JOINS ONS ward population (mid-2024) and derives a rate per 1,000 residents,
//   6. validates every value + checksums components against monthly totals,
//   7. writes a PROPOSAL to proposals/ — it NEVER writes to public/data/.
//
// Only a human ACCEPT in the /review UI promotes this to the published dataset.
//   Run:  node scripts/fetch-crime-observatory.mjs
//
// Sources (both official, both cited in the proposal):
//   • Crime        — West Midlands Police street-level recorded crime, via
//                    Birmingham City Observatory (ODS v2.1). No key.
//                    dataset: west-midlands-police-crime  (source system: data.police.uk)
//   • Population   — ONS mid-2024 SAPE (NOMIS NM_2014_1), committed in lib/population.ts.
// The rate is a DERIVED value: offences ÷ residents × 1000, computed transparently
// from the two official inputs and labelled as derived (CLAUDE.md allows this).
// Trend counts are raw recorded offences per month — NOT smoothed, NOT modelled.

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const DATASET = 'west-midlands-police-crime';
const BASE =
  `https://cityobservatory.birmingham.gov.uk/api/explore/v2.1/catalog/datasets/${DATASET}/records`;
const BHAM_LAD = 'E08000025';
const WHERE_LAD = `local_authority_code="${BHAM_LAD}"`;

// A clean, WORKING "live API" link for reproducibility (Birmingham only).
const LIVE_API_URL = `${BASE}?where=local_authority_code%3D%22${BHAM_LAD}%22&order_by=date%20DESC&limit=100`;

// Birmingham's 69 official wards are the contiguous ONS block E05011118–E05011186.
const BHAM_MIN = 11118, BHAM_MAX = 11186;
const isBirmingham = code =>
  typeof code === 'string' && /^E05(\d{6})$/.test(code) &&
  Number(code.slice(3)) >= BHAM_MIN && Number(code.slice(3)) <= BHAM_MAX;

// Load ONS population + ward names (mid-2024) from the committed snapshot
// lib/population.ts. Matches either quote style; ward_name may contain spaces.
function loadPopulation() {
  const src = readFileSync(join(ROOT, 'lib', 'population.ts'), 'utf8');
  const map = {};
  // Parse line-by-line: code is single-quoted, name is double-quoted and may
  // itself contain an apostrophe (e.g. "King's Heath"), population is an integer.
  for (const line of src.split('\n')) {
    const cm = line.match(/ward_code:\s*'(E05\d{6})'/);
    const nm = line.match(/ward_name:\s*"([^"]+)"/);
    const pm = line.match(/population:\s*(\d+)/);
    if (cm && nm && pm) map[cm[1]] = { name: nm[1], population: Number(pm[1]) };
  }
  return map;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getJson(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

// Server-side aggregate: SELECT <select> ... GROUP BY <groupBy> [WHERE ...]
// Paginates with offset — a two-field group_by (ward × category) returns far
// more than 100 rows, and ODS truncates at `limit`, so we must walk the pages.
async function agg(select, groupBy, where) {
  const out = [];
  for (let offset = 0; ; offset += 100) {
    let u = `${BASE}?limit=100&offset=${offset}&select=${encodeURIComponent(select)}&group_by=${encodeURIComponent(groupBy)}`;
    if (where) u += `&where=${encodeURIComponent(where)}`;
    const j = await getJson(u);
    const recs = j.results ?? [];
    out.push(...recs);
    if (recs.length < 100) break;
  }
  return out;
}

// YYYY-MM from an ISO date string.
const ym = iso => String(iso).slice(0, 7);

async function main() {
  const POP = loadPopulation();
  console.log(`[crime-obs] loaded population for ${Object.keys(POP).length} wards`);

  // 1. Latest month + the full month list (Birmingham).
  console.log('[crime-obs] enumerating series…');
  const latestRec = (await getJson(`${BASE}?order_by=date%20DESC&limit=1&where=${encodeURIComponent(WHERE_LAD)}`)).results?.[0];
  if (!latestRec) throw new Error('no records — dataset may have changed');
  const latest = ym(latestRec.date);
  const monthRows = await agg('date, count(*) as n', 'date', WHERE_LAD);
  const months = monthRows.map(r => ym(r.date)).sort();
  const cityMonthly = Object.fromEntries(monthRows.map(r => [ym(r.date), r.n]));
  console.log(`[crime-obs] series ${months[0]} → ${latest} (${months.length} months) · latest ${cityMonthly[latest]?.toLocaleString()} offences`);

  // 2. Confirm ward coverage in the latest month before committing to a full crawl.
  const coverage = await agg('ward_code, count(*) as n', 'ward_code', `${WHERE_LAD} AND date=date'${latest}'`);
  const bhamWardsPresent = coverage.filter(r => isBirmingham(r.ward_code)).length;
  console.log(`[crime-obs] wards present in ${latest}: ${bhamWardsPresent}/69`);
  if (bhamWardsPresent < 69) console.warn(`[crime-obs] ⚠ only ${bhamWardsPresent} Birmingham wards this month — gaps will render as "—"`);

  // 3. Crawl every month: city×category, city×outcome, ward×category, ward totals.
  const cityCatByMonth = {};   // month → { category: n }
  const outcomeByMonth = {};   // month → { outcome: n }
  const wardMonthCat = {};     // code → { month: { category: n } }
  const wardMonthTotal = {};   // code → { month: n }

  for (const m of months) {
    const where = `${WHERE_LAD} AND date=date'${m}'`;
    const [cat, out, wcat, wtot] = await Promise.all([
      agg('crime_type, count(*) as n', 'crime_type', where),
      agg('last_outcome_category, count(*) as n', 'last_outcome_category', where),
      agg('ward_code, crime_type, count(*) as n', 'ward_code, crime_type', where),
      agg('ward_code, count(*) as n', 'ward_code', where),
    ]);
    cityCatByMonth[m] = Object.fromEntries(cat.map(r => [r.crime_type, r.n]));
    outcomeByMonth[m] = Object.fromEntries(out.map(r => [r.last_outcome_category ?? 'Not yet recorded', r.n]));
    for (const r of wcat) {
      if (!isBirmingham(r.ward_code)) continue;
      (wardMonthCat[r.ward_code] ??= {})[m] = Object.assign(wardMonthCat[r.ward_code][m] ?? {}, { [r.crime_type]: r.n });
    }
    for (const r of wtot) {
      if (!isBirmingham(r.ward_code)) continue;
      (wardMonthTotal[r.ward_code] ??= {})[m] = r.n;
    }
    process.stdout.write('.');
    await sleep(80); // be polite
  }
  console.log('\n[crime-obs] crawled all months');

  // 4. Assemble wards (latest month headline + full trend + latest categories).
  const skipped = [];
  const wards = [];
  for (const code of Object.keys(POP).filter(isBirmingham).sort()) {
    const population = POP[code]?.population ?? null;
    const ward_name = POP[code]?.name ?? code;
    const trend = months.map(m => (wardMonthTotal[code]?.[m] != null ? wardMonthTotal[code][m] : null));
    const latest_count = wardMonthTotal[code]?.[latest] ?? null;
    if (latest_count == null) {
      skipped.push({ code, name: ward_name, reason: `no records in latest month ${latest}` });
      continue;
    }
    const categories = wardMonthCat[code]?.[latest] ?? {};
    // DERIVED: offences per 1,000 residents = count ÷ population × 1000.
    const rate_per_1000 = population ? Math.round((latest_count / population) * 1000 * 100) / 100 : null;
    if (population == null) skipped.push({ code, name: ward_name, reason: 'no population match — rate omitted' });
    wards.push({
      ward_code: code,
      ward_name,
      population,                                   // ONS mid-2024
      latest_count,                                 // recorded offences, latest month
      rate_per_1000,                                // DERIVED
      categories,                                   // latest-month breakdown
      trend,                                        // raw monthly counts, oldest → latest
      provenance: {
        count: { source: 'West Midlands Police · via Birmingham City Observatory', method: 'administrative (recorded crime)', url: `${BASE}?where=${encodeURIComponent(`ward_code="${code}"`)}&order_by=date%20DESC&limit=1` },
        population: { source: 'ONS mid-2024 SAPE (NOMIS NM_2014_1)', method: 'official estimate' },
        rate: { method: 'derived — offences ÷ residents × 1000' },
      },
    });
  }

  // Rank by the honest metric — offences per 1,000 residents — not raw count.
  wards.sort((a, b) => (b.rate_per_1000 ?? -1) - (a.rate_per_1000 ?? -1));
  wards.forEach((w, i) => { w.rank = i + 1; });

  // 5. Checksums: components must reconcile with the monthly totals.
  const checksums = [];
  let checksumOk = true;
  for (const m of months) {
    const catSum = Object.values(cityCatByMonth[m]).reduce((s, n) => s + n, 0);
    const total = cityMonthly[m] ?? 0;
    const ok = catSum === total;
    if (!ok) checksumOk = false;
    checksums.push({ month: m, category_sum: catSum, monthly_total: total, ok });
  }
  // Ward checksum for the latest month: ward totals sum to the city total.
  const wardSumLatest = Object.values(wardMonthTotal).reduce((s, mm) => s + (mm[latest] ?? 0), 0);
  const cityLatestTotal = cityMonthly[latest] ?? 0;
  const wardChecksumOk = wardSumLatest === cityLatestTotal;
  if (!wardChecksumOk) checksumOk = false;

  // Category colour/label vocabulary (city-wide, ordered by latest-month volume).
  const categories = Object.entries(cityCatByMonth[latest] ?? {})
    .sort(([, a], [, b]) => b - a)
    .map(([name, n]) => ({ name, latest_count: n }));

  const rates = wards.map(w => w.rate_per_1000).filter(v => v != null);
  const hi = wards[0], lo = wards[wards.length - 1];

  const proposal = {
    id: 'crime-observatory',
    status: 'pending',
    title: 'Recorded crime by ward — deep dive',
    metric: 'Recorded offences per 1,000 residents (with 36-month trend, category mix and outcomes)',
    unit: 'offences / 1,000 residents',
    generated: new Date().toISOString(),
    as_of: latest,
    geography: 'Birmingham — 69 official wards',
    months,
    categories,
    city: {
      monthly_totals: cityMonthly,                 // month → offences (city)
      category_by_month: cityCatByMonth,           // month → { category: n }
      outcomes_by_month: outcomeByMonth,           // month → { outcome: n }
      latest_total: cityLatestTotal,
    },
    sources: [
      { id: 'crimeObservatory', label: 'Recorded crime (street-level)',
        publisher: 'West Midlands Police · via Birmingham City Observatory', dataset: DATASET,
        method: 'administrative (recorded offences, not modelled)', licence: 'Open Government Licence v3.0',
        as_of: latest,
        catalogueUrl: `https://cityobservatory.birmingham.gov.uk/explore/dataset/${DATASET}/`,
        apiUrl: LIVE_API_URL },
      { id: 'population', label: 'Ward population (denominator for the rate)',
        publisher: 'Office for National Statistics', dataset: 'NOMIS NM_2014_1 (SAPE)',
        method: 'official estimate', licence: 'Open Government Licence v3.0', as_of: 'Mid-2024',
        catalogueUrl: 'https://www.nomisweb.co.uk/datasets/pestsyoala',
        apiUrl: 'https://www.nomisweb.co.uk/datasets/pestsyoala' },
    ],
    // Back-compat primary source so the UI reads it uniformly.
    source: {
      label: 'Recorded crime (street-level)', publisher: 'West Midlands Police · via Birmingham City Observatory',
      dataset: DATASET, method: 'administrative (recorded offences, not modelled)',
      licence: 'Open Government Licence v3.0', as_of: latest,
      catalogueUrl: `https://cityobservatory.birmingham.gov.uk/explore/dataset/${DATASET}/`,
      apiUrl: LIVE_API_URL,
    },
    validation: {
      wards_found: wards.length, wards_expected: 69, complete: wards.length === 69,
      wards_with_data_latest: wards.length,
      months_in_series: months.length, series_from: months[0], series_to: latest,
      category_checksum_ok: checksumOk, ward_checksum_latest_ok: wardChecksumOk,
      checksum_drift: checksums.filter(c => !c.ok),
      latest_total: cityLatestTotal, ward_sum_latest: wardSumLatest,
      highest: hi ? { ward: hi.ward_name, rate: hi.rate_per_1000 } : null,
      lowest: lo ? { ward: lo.ward_name, rate: lo.rate_per_1000 } : null,
      min_rate: rates.length ? Math.min(...rates) : null, max_rate: rates.length ? Math.max(...rates) : null,
      skipped,
    },
    raw_sample: [
      { _note: 'Aggregates only — raw street-level rows are never shipped to the browser (privacy + payload).',
        example_latest_month_category: cityCatByMonth[latest],
        example_latest_month_outcomes: outcomeByMonth[latest] },
    ],
    wards,
  };

  const outDir = join(ROOT, 'proposals');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'crime-observatory.proposal.json');
  writeFileSync(outPath, JSON.stringify(proposal, null, 2));

  console.log(`[crime-obs] ✓ proposal written: ${outPath}`);
  console.log(`[crime-obs]   ${wards.length}/69 wards · ${months.length} months (${months[0]}→${latest}) · latest city total ${cityLatestTotal.toLocaleString()} offences`);
  console.log(`[crime-obs]   checksums: category ${checksumOk ? 'OK' : 'DRIFT'} · ward-vs-city ${wardChecksumOk ? 'OK' : 'DRIFT'} (${wardSumLatest.toLocaleString()} vs ${cityLatestTotal.toLocaleString()})`);
  if (hi) console.log(`[crime-obs]   highest: ${hi.ward_name} ${hi.rate_per_1000}/1000 (${hi.latest_count} offences of ${hi.population?.toLocaleString()})`);
  if (lo) console.log(`[crime-obs]   lowest:  ${lo.ward_name} ${lo.rate_per_1000}/1000 (${lo.latest_count} offences of ${lo.population?.toLocaleString()})`);
  if (skipped.length) console.log(`[crime-obs]   skipped ${skipped.length}: ${skipped.map(s => s.name).join(', ')}`);
}

main().catch(err => { console.error('[crime-obs] FAILED:', err.message); process.exit(1); });
