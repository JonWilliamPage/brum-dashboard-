#!/usr/bin/env node
/**
 * PIP Place — Birmingham PIP £ (LA accounts) + ward caseload play (Stat-Xplore)
 * + GB condition £ (existing pip-conditions) + Bham disability-category mix (counts).
 *
 * Writes proposals/pip-place.proposal.json only.
 * Run: node scripts/fetch-pip-place.mjs
 */
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sx, bhamWardCodes, monthRange, parseCube2d, loadStatXploreKey } from './lib-statxplore.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'proposals', 'pip-place.proposal.json');

const DB = 'str:database:PIP_Monthly_new';
const MEASURE = 'str:count:PIP_Monthly_new:V_F_PIP_MONTHLY';
const MONTH_FIELD = 'str:field:PIP_Monthly_new:F_PIP_DATE:DATE2';
const WARD_FIELD = 'str:field:PIP_Monthly_new:V_F_PIP_MONTHLY:WARD_CODE';
const DIS_FIELD = 'str:field:PIP_Monthly_new:V_F_PIP_MONTHLY:DISABILITY_CODE';
// Disability Category is a valueset under DISABILITY_CODE field — use as dimension via field
// For category breakdown we recode the Disability field's category valueset
const CAT_VS = 'str:valueset:PIP_Monthly_new:V_F_PIP_MONTHLY:DISABILITY_CODE:C_PIP_DIS_CAT';

const monthVal = (yyyymm) =>
  `str:value:PIP_Monthly_new:F_PIP_DATE:DATE2:C_PIP_DATE:${yyyymm}`;
const wardVal = (code) =>
  `str:value:PIP_Monthly_new:V_F_PIP_MONTHLY:WARD_CODE:V_C_MASTERGEOG21_WARD_TO_LA:${code}`;

function loadPop() {
  const src = readFileSync(join(ROOT, 'lib', 'population.ts'), 'utf8');
  const map = {};
  for (const line of src.split('\n')) {
    const mm =
      line.match(/ward_code:\s*'(E05\d{6})',\s*ward_name:\s*"([^"]+)",\s*population:\s*(\d+)/) ||
      line.match(/ward_code:\s*'(E05\d{6})',\s*ward_name:\s*'([^']+)',\s*population:\s*(\d+)/);
    if (mm) map[mm[1]] = { name: mm[2], population: Number(mm[3]) };
  }
  return map;
}

function loadBillPip() {
  const p = join(ROOT, 'proposals', 'benefits-bill.proposal.json');
  if (!existsSync(p)) return [];
  const bill = JSON.parse(readFileSync(p, 'utf8'));
  return (bill.history || []).map((h) => ({
    year: h.year,
    pip_m: h.components?.pip ?? (h.year < '2013/14' ? 0 : null),
    total_m: h.total_m,
  }));
}

function loadGbConditions() {
  const p = join(ROOT, 'proposals', 'pip-conditions.proposal.json');
  if (!existsSync(p)) return null;
  const j = JSON.parse(readFileSync(p, 'utf8'));
  return {
    years: j.years,
    categories: j.categories,
    conditions: (j.conditions || []).slice(0, 25),
    gb_total_real_latest: j.gb_total_real_latest,
    gb_total_nominal_latest: j.gb_total_nominal_latest,
  };
}

async function main() {
  loadStatXploreKey();
  const POP = loadPop();
  const codes = bhamWardCodes();
  console.log(`[pip-place] ${codes.length} wards`);

  // Quarterly from Jan 2019 → latest (PIP "from 2019" database)
  const months = monthRange('201901', process.env.PIP_PLACE_END || '202601', 3);
  console.log(`[pip-place] ${months.length} quarter-months ${months[0]}→${months.at(-1)}`);

  const body = {
    database: DB,
    measures: [MEASURE],
    recodes: {
      [MONTH_FIELD]: { map: months.map((m) => [monthVal(m)]) },
      [WARD_FIELD]: { map: codes.map((c) => [wardVal(c)]) },
    },
    dimensions: [[MONTH_FIELD], [WARD_FIELD]],
  };

  console.log('[pip-place] Stat-Xplore ward × month …');
  const table = await sx('/table', { method: 'POST', body });
  const { dim0, items1, values } = parseCube2d(table, MEASURE);
  console.log(`[pip-place] cube ${dim0.length} × ${items1.length}`);

  const keptIdx = [];
  const monthLabels = [];
  const monthKeys = [];
  for (let i = 0; i < dim0.length; i++) {
    const row = values[i] || [];
    const sum = row.reduce((s, v) => s + (typeof v === 'number' && !Number.isNaN(v) ? v : 0), 0);
    if (sum > 0) {
      keptIdx.push(i);
      monthLabels.push(dim0[i]);
      const uri = table.fields[0].items[i]?.uris?.[0] || '';
      monthKeys.push(uri.split(':').pop() || months[i]);
    }
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
    if (latest != null) cityLatest += latest;
    wards.push({
      ward_code: code,
      ward_name: name,
      population,
      series,
      latest,
      first,
      first_month: firstIdx >= 0 ? monthLabels[firstIdx] : null,
      delta: latest != null && first != null ? latest - first : null,
      per_1000:
        latest != null && population
          ? Math.round((latest / population) * 1000 * 10) / 10
          : null,
    });
  }
  wards.sort((a, b) => (b.latest ?? 0) - (a.latest ?? 0));

  const city_series = keptIdx.map((i) => {
    let s = 0;
    let any = false;
    for (let j = 0; j < items1.length; j++) {
      if (!codes.includes(items1[j].code)) continue;
      const v = values[i]?.[j];
      if (typeof v === 'number' && !Number.isNaN(v)) {
        s += v;
        any = true;
      }
    }
    return any ? Math.round(s) : null;
  });

  // Disability category mix for Birmingham — latest month, all 69 wards × categories
  console.log('[pip-place] disability categories …');
  const catNode = await sx(`/schema/${encodeURIComponent(CAT_VS)}`);
  const catValues = (catNode.children || []).filter((c) => c.type === 'VALUE' || c.id?.includes('value'));
  // children may be VALUE nodes
  const cats = (catNode.children || []).map((c) => ({ id: c.id, label: c.label }));
  console.log(`[pip-place] ${cats.length} categories`);

  const latestKey = monthKeys.at(-1) || '202601';
  const earlyKey = monthKeys[0] || '201901';

  async function categoryMix(yyyymm) {
    // All recoded fields must appear in dimensions (Stat-Xplore rule).
    // Cube: Disability Category × Ward for one month → sum wards client-side.
    const b = {
      database: DB,
      measures: [MEASURE],
      recodes: {
        [MONTH_FIELD]: { map: [[monthVal(yyyymm)]] },
        [WARD_FIELD]: { map: codes.map((c) => [wardVal(c)]) },
        [DIS_FIELD]: { map: cats.map((c) => [c.id]) },
      },
      dimensions: [[DIS_FIELD], [WARD_FIELD], [MONTH_FIELD]],
    };
    try {
      const t = await sx('/table', { method: 'POST', body: b });
      const catField = t.fields?.find((f) => /Disability/i.test(f.label)) || t.fields?.[0];
      const measureUri = MEASURE;
      const raw = t.cubes?.[measureUri]?.values;
      // Expect values[cat][ward][month] or values[cat][ward] depending on nest order
      const byCat = (catField?.items || []).map((it, ci) => {
        let sum = 0;
        let any = false;
        const slice = raw?.[ci];
        if (Array.isArray(slice)) {
          for (const cell of slice.flat(2)) {
            if (typeof cell === 'number' && !Number.isNaN(cell)) {
              sum += cell;
              any = true;
            }
          }
        } else if (typeof slice === 'number') {
          sum = slice;
          any = true;
        }
        return { name: it.labels?.[0] ?? 'Unknown', count: any ? Math.round(sum) : null };
      });
      return byCat;
    } catch (e) {
      console.warn('[pip-place] category mix failed', yyyymm, e.message.slice(0, 200));
      return [];
    }
  }

  const mix_latest = await categoryMix(latestKey);
  const mix_early = await categoryMix(earlyKey);
  mix_latest.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));

  const bill_pip = loadBillPip();
  const gb = loadGbConditions();

  const sources = [
    {
      id: 'statxplorePip',
      label: 'PIP Cases with Entitlement — Stat-Xplore (ward, monthly)',
      publisher: 'Department for Work & Pensions',
      dataset: 'PIP_Monthly_new',
      method: 'administrative hard count — Open Data API',
      licence: 'Open Government Licence v3.0',
      as_of: monthLabels.at(-1) ?? '',
      catalogueUrl: 'https://stat-xplore.dwp.gov.uk/',
      apiUrl: 'https://stat-xplore.dwp.gov.uk/webapi/rest/v1',
    },
    {
      id: 'benefitsBillPip',
      label: 'Birmingham PIP expenditure £m (LA accounts)',
      publisher: 'Department for Work & Pensions',
      dataset: 'benefit-expenditure-by-local-authority-2024-25.ods',
      method: 'administrative — accounting outturn',
      licence: 'Open Government Licence v3.0',
      as_of: bill_pip.filter((x) => x.pip_m).at(-1)?.year ?? '2024/25',
      catalogueUrl:
        'https://www.gov.uk/government/publications/benefit-expenditure-and-caseload-tables-2025',
      apiUrl:
        'https://assets.publishing.service.gov.uk/media/693ffb536a12691d48491fb3/benefit-expenditure-by-local-authority-2024-25.ods',
    },
    {
      id: 'pipConditionsGb',
      label: 'PIP expenditure by reported medical condition (Great Britain)',
      publisher: 'Department for Work & Pensions',
      dataset: 'pip-expenditure-2024-to-2025.ods',
      method: 'administrative — GB only; no LA split by condition',
      licence: 'Open Government Licence v3.0',
      as_of: gb?.years?.at(-1) ?? '2024/25',
      catalogueUrl:
        'https://assets.publishing.service.gov.uk/media/695b8ddfa2fb6c15f98d1954/pip-expenditure-2024-to-2025.ods',
      apiUrl:
        'https://www.gov.uk/government/publications/benefit-expenditure-and-caseload-tables-2025',
    },
  ];

  const proposal = {
    id: 'pip-place',
    status: 'pending',
    title: 'PIP Place — city £, ward caseload play, GB conditions, Bham diagnosis mix',
    metric: 'PIP caseload by ward over time; city PIP £m; GB £ by condition; Bham category counts',
    unit: 'cases / £ million',
    geography: 'ward (caseload) + LA (£) + GB (condition £)',
    generated: new Date().toISOString(),
    as_of: monthLabels.at(-1) ?? '',
    source: {
      as_of: monthLabels.at(-1) ?? '',
      label: 'Stat-Xplore PIP + DWP expenditure tables',
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
          ? cityLatest - (city_series.find((v) => v != null) ?? 0)
          : null,
      bill_pip,
    },
    wards,
    category_mix: {
      early_month: monthLabels[0] ?? null,
      latest_month: monthLabels.at(-1) ?? null,
      early: mix_early,
      latest: mix_latest,
    },
    gb_conditions: gb,
    validation: {
      geography_level: 'ward',
      wards_found: wards.length,
      wards_expected: 69,
      complete: wards.length === 69,
      months_span: monthLabels.length,
      series_from: monthLabels[0] ?? null,
      series_to: monthLabels.at(-1) ?? null,
      city_latest_caseload: cityLatest,
      categories_latest: mix_latest.filter((c) => c.count != null).length,
      gb_condition_years: gb?.years?.length ?? 0,
      honesty:
        'Ward figures are CASELOAD not £. City £ from LA accounts. Condition £ is GB-only. Category mix is count of cases by reported disability category (admin classification, not a fraud finding).',
    },
  };

  writeFileSync(OUT, JSON.stringify(proposal, null, 2));
  console.log(`[pip-place] wrote ${OUT}`);
  console.log(
    `  ${wards.length} wards · ${monthLabels.length} snapshots · city cases ${cityLatest} · top categories:`,
    mix_latest.slice(0, 5).map((c) => `${c.name}:${c.count}`).join(', ')
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
