// Agent fetch tool — fly-tipping incidents per 1,000 people (LA-level WMCA).
// Geography is LOCAL AUTHORITY only — no ward breakdown. Same honest pattern as
// Housing Benefit: 7 WM metro boroughs + published WMCA/England means + full annual series.
//
//   Run:  node scripts/fetch-fly-tipping.mjs  → proposals/fly-tipping.proposal.json
//
// Source: Defra WasteDataFlow via Birmingham City Observatory —
//   fly-tipping-incidents-per-1000-people-wmca
//
// HARD RULE: official only, no modelled wards, writes ONLY to /proposals.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const DS = 'fly-tipping-incidents-per-1000-people-wmca';
const ODS = 'https://www.cityobservatory.birmingham.gov.uk/api/explore/v2.1/catalog/datasets';
const BASE = `${ODS}/${DS}/records`;

const BIRMINGHAM = 'E08000025';
const BOROUGHS = {
  E08000025: 'Birmingham',
  E08000026: 'Coventry',
  E08000027: 'Dudley',
  E08000028: 'Sandwell',
  E08000029: 'Solihull',
  E08000030: 'Walsall',
  E08000031: 'Wolverhampton',
};
const WMCA_ID = 'CombinedAuthorities_WestMidlands';
const ENGLAND_ID = 'AllLaInCountry_England';

async function getJson(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

async function main() {
  // Pull entire cube (90 rows) — 9 areas × ~10 years.
  const all = [];
  for (let offset = 0; offset < 500; offset += 100) {
    const page = await getJson(`${BASE}?limit=100&offset=${offset}`);
    const recs = page.results ?? [];
    all.push(...recs);
    if (recs.length < 100) break;
  }
  if (!all.length) throw new Error('no records — dataset slug may have changed');

  const asRate = v => (v == null || Number.isNaN(Number(v)) ? null : Math.round(Number(v) * 10) / 10);

  // period keys: use periodlabel for display order, date for sorting
  const byAreaPeriod = {}; // code -> periodlabel -> { value, date, periodlabel, geom? }
  for (const rec of all) {
    const code = rec.areaidentifier;
    const pl = rec.periodlabel ?? String(rec.date);
    if (!byAreaPeriod[code]) byAreaPeriod[code] = {};
    byAreaPeriod[code][pl] = {
      value: asRate(rec.value),
      date: rec.date,
      periodlabel: pl,
      geo_shape: rec.geo_shape ?? rec.geom,
    };
  }

  // Ordered years from Birmingham series (or any borough)
  const yearSet = new Set();
  for (const code of Object.keys(BOROUGHS)) {
    for (const pl of Object.keys(byAreaPeriod[code] ?? {})) yearSet.add(pl);
  }
  const years = [...yearSet].sort((a, b) => {
    const da = byAreaPeriod[BIRMINGHAM]?.[a]?.date ?? a;
    const db = byAreaPeriod[BIRMINGHAM]?.[b]?.date ?? b;
    return String(da).localeCompare(String(db));
  });
  if (!years.length) throw new Error('no year labels found');

  const latestYear = years[years.length - 1];
  const firstYear = years[0];
  console.log(`[fly] series ${firstYear} → ${latestYear} (${years.length} years) · ${all.length} raw rows`);

  // Latest peer areas
  const areas = [];
  const skipped = [];
  for (const [code, name] of Object.entries(BOROUGHS)) {
    const cell = byAreaPeriod[code]?.[latestYear];
    const value = cell?.value ?? null;
    if (value == null) {
      skipped.push({ code, name, reason: 'missing/NaN latest' });
      continue;
    }
    const series = years.map(y => byAreaPeriod[code]?.[y]?.value ?? null);
    const first = series.find(v => v != null) ?? null;
    const last = value;
    const change = first != null ? Math.round((last - first) * 10) / 10 : null;
    areas.push({
      area_code: code,
      area_name: name,
      value,
      is_birmingham: code === BIRMINGHAM,
      period: latestYear,
      series, // aligned to years[]
      first_value: first,
      change_pp: change, // points per 1,000 (absolute rate change)
      provenance: {
        value: {
          source: 'Defra WasteDataFlow · via Birmingham City Observatory',
          method: 'administrative',
          url: `${BASE}?where=areaidentifier%3D%22${code}%22&limit=20`,
        },
      },
    });
  }
  areas.sort((a, b) => b.value - a.value);
  areas.forEach((a, i) => { a.rank = i + 1; });

  const benchmarks = {
    wmca: byAreaPeriod[WMCA_ID]?.[latestYear]?.value ?? null,
    england: byAreaPeriod[ENGLAND_ID]?.[latestYear]?.value ?? null,
  };
  const benchSeries = {
    wmca: years.map(y => byAreaPeriod[WMCA_ID]?.[y]?.value ?? null),
    england: years.map(y => byAreaPeriod[ENGLAND_ID]?.[y]?.value ?? null),
  };

  const bham = areas.find(a => a.is_birmingham) ?? null;
  const bhamSeries = years.map(y => byAreaPeriod[BIRMINGHAM]?.[y]?.value ?? null);
  const bhamFirst = bhamSeries.find(v => v != null) ?? null;
  const bhamLatest = bham?.value ?? null;
  const bhamChange = bhamFirst != null && bhamLatest != null
    ? Math.round((bhamLatest - bhamFirst) * 10) / 10
    : null;
  const peak = bhamSeries.reduce(
    (acc, v, i) => (v != null && (acc.v == null || v > acc.v) ? { v, year: years[i] } : acc),
    { v: null, year: null },
  );

  const validation = {
    geography_level: 'local-authority',
    ward_breakdown_available: false,
    areas_found: areas.length,
    areas_expected: Object.keys(BOROUGHS).length,
    complete: areas.length === Object.keys(BOROUGHS).length,
    skipped,
    years_span: years.length,
    series_from: firstYear,
    series_to: latestYear,
    birmingham_value: bhamLatest,
    birmingham_rank: bham?.rank ?? null,
    birmingham_change: bhamChange,
    birmingham_peak: peak.v,
    birmingham_peak_year: peak.year,
    wmca_benchmark: benchmarks.wmca,
    england_benchmark: benchmarks.england,
  };

  const sources = [
    {
      id: 'flyTipping',
      label: 'Fly-tipping incidents per 1,000 people',
      publisher: 'Defra · via Birmingham City Observatory',
      dataset: DS,
      method: 'administrative',
      licence: 'Open Government Licence v3.0',
      as_of: latestYear,
      catalogueUrl: `https://www.cityobservatory.birmingham.gov.uk/explore/dataset/${DS}/`,
      apiUrl: `${BASE}?limit=100`,
    },
  ];

  const proposal = {
    id: 'fly-tipping',
    status: 'pending',
    title: 'Fly-tipping — incidents per 1,000 people',
    metric: 'Fly-tipping incidents per 1,000 people',
    unit: 'incidents per 1,000 residents',
    geography: 'local-authority',
    generated: new Date().toISOString(),
    sources,
    source: sources[0],
    validation,
    as_of: latestYear,
    years,
    areas,
    benchmarks,
    bench_series: benchSeries,
    city: {
      series: bhamSeries,
      latest: bhamLatest,
      first: bhamFirst,
      change: bhamChange,
      peak: peak.v,
      peak_year: peak.year,
      rank: bham?.rank ?? null,
    },
    raw_sample: [byAreaPeriod[BIRMINGHAM]?.[latestYear], byAreaPeriod[WMCA_ID]?.[latestYear], byAreaPeriod[ENGLAND_ID]?.[latestYear]]
      .filter(Boolean)
      .map(r => {
        const { geo_shape, ...rest } = r;
        return rest;
      }),
  };

  const outDir = join(ROOT, 'proposals');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'fly-tipping.proposal.json'), JSON.stringify(proposal, null, 2));

  // Borough polygons for map (value-free geometry) — only if not already present with 7 features
  const features = [];
  for (const code of Object.keys(BOROUGHS)) {
    const shape = byAreaPeriod[code]?.[latestYear]?.geo_shape
      ?? Object.values(byAreaPeriod[code] ?? {}).find(c => c.geo_shape)?.geo_shape;
    const geom = shape?.geometry ?? shape;
    if (geom?.type) {
      features.push({
        type: 'Feature',
        properties: { code, name: BOROUGHS[code] },
        geometry: geom.type === 'Feature' ? geom.geometry : geom,
      });
    }
  }
  if (features.length) {
    const dataDir = join(ROOT, 'public', 'data');
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(join(dataDir, 'wm-boroughs.geojson'), JSON.stringify({ type: 'FeatureCollection', features }));
    console.log(`[fly] ✓ boundaries · ${features.length}/7 → public/data/wm-boroughs.geojson`);
  }

  console.log(`[fly] ✓ proposal · ${areas.length}/7 boroughs · ${latestYear}`);
  console.log(`[fly]   Birmingham: ${bhamLatest} per 1,000 (rank ${bham?.rank}) · change ${firstYear}→${latestYear}: ${bhamChange}`);
  console.log(`[fly]   benchmarks: WMCA ${benchmarks.wmca} · England ${benchmarks.england}`);
  areas.forEach(a => console.log(`[fly]     ${String(a.rank).padStart(2)}. ${a.area_name.padEnd(14)} ${a.value}${a.is_birmingham ? '  ← Birmingham' : ''}`));
  if (skipped.length) console.log(`[fly]   skipped: ${skipped.map(s => s.name).join(', ')}`);
}

main().catch(err => { console.error('[fly] FAILED:', err.message); process.exit(1); });
