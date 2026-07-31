#!/usr/bin/env node
/**
 * UC Money Weather — ward caseload over time (Stat-Xplore) + city UC £ (LA accounts).
 *
 *   • People on UC by Birmingham ward × month — Stat-Xplore UC_Monthly (admin hard counts)
 *   • City UC expenditure £m by year — benefits-bill proposal (DWP LA workbook)
 *   • Rate per 1,000 residents — DERIVED from ONS mid-2024 population (labelled)
 *
 * Writes proposals/uc-weather.proposal.json only. Never public/data/.
 * Run: node scripts/fetch-uc-weather.mjs
 */
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  sx,
  bhamWardCodes,
  monthRange,
  parseCube2d,
  loadStatXploreKey,
} from './lib-statxplore.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'proposals', 'uc-weather.proposal.json');

const DB = 'str:database:UC_Monthly';
const MEASURE = 'str:count:UC_Monthly:V_F_UC_CASELOAD_FULL';
const MONTH_FIELD = 'str:field:UC_Monthly:F_UC_DATE:DATE_NAME';
const WARD_FIELD = 'str:field:UC_Monthly:V_F_UC_CASELOAD_FULL:WARD_CODE';
const monthVal = (yyyymm) =>
  `str:value:UC_Monthly:F_UC_DATE:DATE_NAME:C_UC_DATE:${yyyymm}`;
const wardVal = (code) =>
  `str:value:UC_Monthly:V_F_UC_CASELOAD_FULL:WARD_CODE:V_C_MASTERGEOG21_WARD_TO_LA:${code}`;

function loadPop() {
  const src = readFileSync(join(ROOT, 'lib', 'population.ts'), 'utf8');
  const map = {};
  const re = /ward_code:\s*'(E05\d{6})',\s*ward_name:\s*"([^"]+)"|ward_code:\s*'(E05\d{6})',\s*ward_name:\s*'([^']+)'/g;
  let m;
  // simpler line-by-line
  for (const line of src.split('\n')) {
    const mm = line.match(/ward_code:\s*'(E05\d{6})',\s*ward_name:\s*"([^"]+)",\s*population:\s*(\d+)/)
      || line.match(/ward_code:\s*'(E05\d{6})',\s*ward_name:\s*'([^']+)',\s*population:\s*(\d+)/);
    if (mm) map[mm[1]] = { name: mm[2], population: Number(mm[3]) };
  }
  return map;
}

function loadBillUc() {
  const p = join(ROOT, 'proposals', 'benefits-bill.proposal.json');
  if (!existsSync(p)) return [];
  const bill = JSON.parse(readFileSync(p, 'utf8'));
  return (bill.history || [])
    .map((h) => ({
      year: h.year,
      uc_m: h.components?.uc ?? null,
      total_m: h.total_m,
    }))
    .filter((h) => h.uc_m != null);
}

async function main() {
  loadStatXploreKey();
  const POP = loadPop();
  const codes = bhamWardCodes();
  console.log(`[uc-weather] ${codes.length} wards, pop matched ${Object.keys(POP).length}`);

  // Full monthly series from UC Stat-Xplore start → latest (construct IDs)
  // UC people series begins May 2013 in schema; latest ~ Feb 2026 from probes
  // Latest confirmed present in Stat-Xplore (do not invent future months)
  const endYm = process.env.UC_WEATHER_END || '202602';
  let months = monthRange('201305', endYm, 1);
  if (months.length > 180) months = months.slice(-160);
  console.log(`[uc-weather] requesting ${months.length} months ${months[0]}→${months.at(-1)}`);

  const body = {
    database: DB,
    measures: [MEASURE],
    recodes: {
      [MONTH_FIELD]: { map: months.map((m) => [monthVal(m)]) },
      [WARD_FIELD]: { map: codes.map((c) => [wardVal(c)]) },
    },
    dimensions: [[MONTH_FIELD], [WARD_FIELD]],
  };

  console.log('[uc-weather] Stat-Xplore /table …');
  const table = await sx('/table', { method: 'POST', body });
  const { dim0, items1, values } = parseCube2d(table, MEASURE);
  // dim0 = month labels, items1 = wards, values[monthIdx][wardIdx]
  console.log(`[uc-weather] cube ${dim0.length} months × ${items1.length} wards`);

  // Align months that returned data (drop all-null leading/trailing if any)
  const monthKeys = [];
  const monthLabels = [];
  for (let i = 0; i < dim0.length; i++) {
    const row = values[i] || [];
    const sum = row.reduce((s, v) => s + (typeof v === 'number' && !Number.isNaN(v) ? v : 0), 0);
    if (sum > 0) {
      // extract YYYYMM from recode if possible
      const uri = table.fields[0].items[i]?.uris?.[0] || '';
      const yyyymm = uri.split(':').pop() || months[i];
      monthKeys.push(yyyymm.length === 6 ? yyyymm : months[i]);
      monthLabels.push(dim0[i]);
    }
  }
  // Remap values to kept months only
  const keptIdx = [];
  for (let i = 0; i < dim0.length; i++) {
    const row = values[i] || [];
    const sum = row.reduce((s, v) => s + (typeof v === 'number' && !Number.isNaN(v) ? v : 0), 0);
    if (sum > 0) keptIdx.push(i);
  }

  const wards = [];
  let cityLatest = 0;
  for (let j = 0; j < items1.length; j++) {
    const code = items1[j].code;
    if (!codes.includes(code)) continue;
    const name = POP[code]?.name || items1[j].label;
    const population = POP[code]?.population ?? null;
    const series = keptIdx.map((i) => {
      const v = values[i]?.[j];
      return typeof v === 'number' && !Number.isNaN(v) ? Math.round(v) : null;
    });
    const latest = series.at(-1);
    const first = series.find((v) => v != null) ?? null;
    const firstIdx = series.findIndex((v) => v != null);
    const delta = latest != null && first != null ? latest - first : null;
    const pct_pop =
      latest != null && population ? Math.round((latest / population) * 1000 * 10) / 10 : null; // per 1000
    if (latest != null) cityLatest += latest;
    wards.push({
      ward_code: code,
      ward_name: name,
      population,
      series,
      latest,
      first,
      first_month: firstIdx >= 0 ? monthLabels[firstIdx] : null,
      delta,
      per_1000: pct_pop,
    });
  }

  wards.sort((a, b) => (b.latest ?? 0) - (a.latest ?? 0));

  const city_series = keptIdx.map((i) => {
    let s = 0;
    let any = false;
    for (let j = 0; j < items1.length; j++) {
      const code = items1[j].code;
      if (!codes.includes(code)) continue;
      const v = values[i]?.[j];
      if (typeof v === 'number' && !Number.isNaN(v)) {
        s += v;
        any = true;
      }
    }
    return any ? Math.round(s) : null;
  });

  const bill_uc = loadBillUc();
  const sources = [
    {
      id: 'statxploreUc',
      label: 'People on Universal Credit — Stat-Xplore (ward, monthly)',
      publisher: 'Department for Work & Pensions',
      dataset: 'UC_Monthly / People on Universal Credit',
      method: 'administrative hard count — Open Data API',
      licence: 'Open Government Licence v3.0',
      as_of: monthLabels.at(-1) ?? '',
      catalogueUrl: 'https://stat-xplore.dwp.gov.uk/',
      apiUrl: 'https://stat-xplore.dwp.gov.uk/webapi/rest/v1',
    },
    {
      id: 'benefitsBillUc',
      label: 'Birmingham UC expenditure £m (LA accounts)',
      publisher: 'Department for Work & Pensions',
      dataset: 'benefit-expenditure-by-local-authority-2024-25.ods',
      method: 'administrative — accounting outturn via benefits-bill proposal',
      licence: 'Open Government Licence v3.0',
      as_of: bill_uc.at(-1)?.year ?? '2024/25',
      catalogueUrl:
        'https://www.gov.uk/government/publications/benefit-expenditure-and-caseload-tables-2025',
      apiUrl:
        'https://assets.publishing.service.gov.uk/media/693ffb536a12691d48491fb3/benefit-expenditure-by-local-authority-2024-25.ods',
    },
    {
      id: 'population',
      label: 'Ward population (per-1,000 denominator)',
      publisher: 'Office for National Statistics',
      dataset: 'NOMIS NM_2014_1 mid-2024',
      method: 'official estimate',
      licence: 'Open Government Licence v3.0',
      as_of: 'Mid-2024',
      catalogueUrl: 'https://www.nomisweb.co.uk/datasets/pestsyoala',
      apiUrl: 'https://www.nomisweb.co.uk/datasets/pestsyoala',
    },
  ];

  const proposal = {
    id: 'uc-weather',
    status: 'pending',
    title: 'UC Money Weather — claimants by ward over time + city UC £',
    metric: 'People on Universal Credit (count) by ward over months; city UC £m annual',
    unit: 'claimants / £ million',
    geography: 'ward (caseload) + local-authority (£)',
    generated: new Date().toISOString(),
    as_of: monthLabels.at(-1) ?? '',
    source: {
      as_of: monthLabels.at(-1) ?? '',
      label: 'Stat-Xplore UC people + DWP LA UC expenditure',
      publisher: 'Department for Work & Pensions',
    },
    sources,
    months: monthLabels,
    month_keys: monthKeys,
    city: {
      series: city_series,
      latest: cityLatest,
      first: city_series.find((v) => v != null) ?? null,
      delta:
        cityLatest && city_series.find((v) => v != null) != null
          ? cityLatest - city_series.find((v) => v != null)
          : null,
      bill_uc,
    },
    wards,
    validation: {
      geography_level: 'ward',
      wards_found: wards.length,
      wards_expected: 69,
      complete: wards.length === 69,
      months_span: monthLabels.length,
      series_from: monthLabels[0] ?? null,
      series_to: monthLabels.at(-1) ?? null,
      city_latest: cityLatest,
      bill_uc_years: bill_uc.length,
      note: 'Caseload is administrative. City £ is LA accounts. per_1000 is DERIVED (count ÷ ONS pop × 1000). No ward-level £ outturn exists.',
    },
  };

  writeFileSync(OUT, JSON.stringify(proposal, null, 2));
  console.log(`[uc-weather] wrote ${OUT}`);
  console.log(
    `  ${wards.length} wards · ${monthLabels.length} months · city latest ${cityLatest.toLocaleString()} · top ${wards[0]?.ward_name} ${wards[0]?.latest}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
