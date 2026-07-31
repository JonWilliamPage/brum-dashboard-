#!/usr/bin/env node
/**
 * UC Payments — Household award intensity in Birmingham (Stat-Xplore).
 *
 * Cube: Households on Universal Credit (UC_Households)
 * Geography: Birmingham LA E08000025 only (ward £ intensity is a later slice;
 *   do not invent ward-level expenditure).
 *
 * Measures (all administrative, Stat-Xplore):
 *   • COUNT — Households on Universal Credit
 *   • MEAN of Payment Amount — mean £ paid per household (assessment period)
 *   • Monthly Award Amount bands — household counts by payment band
 *   • Family Type — household counts + mean payment by family type
 *
 * Cross-ref (not mixed as the same metric):
 *   • Benefits Bill UC £m annual (LA accounts) — context only, labelled
 *
 * Writes proposals/uc-payments.proposal.json only. Never public/data/.
 * Run: node scripts/fetch-uc-payments.mjs
 *
 * Env: STATXPLORE_API_KEY in .env.local
 * Optional: UC_PAYMENTS_END=202602  UC_PAYMENTS_MONTHS=24
 */
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sx, monthRange, loadStatXploreKey } from './lib-statxplore.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'proposals', 'uc-payments.proposal.json');

const DB = 'str:database:UC_Households';
const COUNT = 'str:count:UC_Households:V_F_UC_HOUSEHOLDS';
const MEAN = 'str:statfn:UC_Households:V_F_UC_HOUSEHOLDS:HNTOTAL_PAYMENT_AMOUNT:MEAN';
const GEO = 'str:field:UC_Households:V_F_UC_HOUSEHOLDS:WARD_CODE';
const MONTH = 'str:field:UC_Households:F_UC_HH_DATE:DATE_NAME';
const BANDS = 'str:field:UC_Households:V_F_UC_HOUSEHOLDS:hnpayment_band';
const FAMILY = 'str:field:UC_Households:V_F_UC_HOUSEHOLDS:hnfamily_type';
const LA =
  'str:value:UC_Households:V_F_UC_HOUSEHOLDS:WARD_CODE:V_C_MASTERGEOG21_LA_TO_REGION:E08000025';
const monthVal = (ym) =>
  `str:value:UC_Households:F_UC_HH_DATE:DATE_NAME:C_UC_HH_DATE:${ym}`;

function leaf(v) {
  if (v == null) return null;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (Array.isArray(v)) return leaf(v[0] ?? v[v.length - 1]);
  return null;
}

/** Extract 2D table → [{label, value}] using dim0 labels and first numeric leaf. */
function rowsFromTable(table, measureUri) {
  const fields = table.fields || [];
  const m =
    (table.measures || []).find((x) => x.uri === measureUri || x.measure === measureUri) ||
    (table.measures || [])[0];
  const uri = m?.uri || m?.measure || measureUri;
  const values = table.cubes?.[uri]?.values ?? [];
  const f0 = fields[0];
  return (f0?.items || []).map((it, i) => {
    const label = it.labels?.[0] ?? String(i);
    const raw = values[i];
    let value = null;
    if (Array.isArray(raw)) {
      const nums = JSON.stringify(raw).match(/-?\d+(\.\d+)?/g);
      value = nums ? Number(nums[nums.length - 1]) : null;
    } else value = leaf(raw);
    return { label, value };
  });
}

async function listValueset(fieldId) {
  const field = await sx(`/schema/${encodeURIComponent(fieldId)}`);
  const vs = (field.children || []).find((c) => c.type === 'VALUESET');
  if (!vs) throw new Error('No valueset under ' + fieldId);
  const all = [];
  for (let page = 0; page < 40; page++) {
    const n = await sx(`/schema/${encodeURIComponent(vs.id)}?offset=${page * 100}&limit=100`);
    const kids = n.children || [];
    if (!kids.length) break;
    if (page > 0 && kids[0]?.id && all.some((a) => a.id === kids[0].id)) break;
    for (const k of kids) {
      if (k.id && !all.some((a) => a.id === k.id)) all.push(k);
    }
    if (kids.length < 100) break;
  }
  return all;
}

function loadBillUc() {
  const p = join(ROOT, 'proposals', 'benefits-bill.proposal.json');
  if (!existsSync(p)) return null;
  const bill = JSON.parse(readFileSync(p, 'utf8'));
  const last = (bill.history || []).filter((h) => h.components?.uc != null).at(-1);
  const line = (bill.lines || []).find((l) => l.id === 'uc');
  return {
    year: bill.year ?? last?.year ?? null,
    uc_m: line?.amount_m ?? last?.components?.uc ?? null,
    total_m: bill.total_m ?? last?.total_m ?? null,
    note: 'Annual accounting outturn — not the same metric as mean monthly Payment Amount',
  };
}

async function main() {
  loadStatXploreKey();
  const endYm = process.env.UC_PAYMENTS_END || '202602';
  const nMonths = Number(process.env.UC_PAYMENTS_MONTHS || 24);
  let months = monthRange('201305', endYm, 1);
  if (months.length > nMonths) months = months.slice(-nMonths);
  console.log(`[uc-payments] Birmingham LA · ${months.length} months ${months[0]}→${months.at(-1)}`);

  // ── 1. Monthly series: household count + mean payment ─────────────────────
  console.log('[uc-payments] series COUNT + MEAN…');
  const tCount = await sx('/table', {
    method: 'POST',
    body: {
      database: DB,
      measures: [COUNT],
      recodes: {
        [MONTH]: { map: months.map((m) => [monthVal(m)]), total: false },
        [GEO]: { map: [[LA]], total: false },
      },
      dimensions: [[MONTH], [GEO]],
    },
  });
  const tMean = await sx('/table', {
    method: 'POST',
    body: {
      database: DB,
      measures: [MEAN],
      recodes: {
        [MONTH]: { map: months.map((m) => [monthVal(m)]), total: false },
        [GEO]: { map: [[LA]], total: false },
      },
      dimensions: [[MONTH], [GEO]],
    },
  });
  const cRows = rowsFromTable(tCount, COUNT);
  const mRows = rowsFromTable(tMean, MEAN);
  const series = [];
  for (let i = 0; i < cRows.length; i++) {
    const hh = cRows[i].value;
    const mean = mRows[i]?.value;
    if (hh == null && mean == null) continue;
    // drop all-null leading months if URI was invalid (should not happen for valid range)
    if (hh === 0 && mean == null) continue;
    const uri = tCount.fields?.[0]?.items?.[i]?.uris?.[0] || '';
    const yyyymm = uri.split(':').pop();
    series.push({
      month: cRows[i].label,
      month_key: /^\d{6}$/.test(yyyymm) ? yyyymm : months[i] || null,
      households: hh != null ? Math.round(hh) : null,
      mean_payment_gbp: mean != null ? Math.round(mean * 100) / 100 : null,
    });
  }
  // Keep only rows with real household counts
  const seriesLive = series.filter((s) => s.households != null && s.households > 0);
  if (seriesLive.length < 2) throw new Error('Series too short — check month URIs / API');
  const latest = seriesLive.at(-1);
  const first = seriesLive[0];
  console.log(
    `  ${seriesLive.length} months · ${first.month} ${first.households} hh · ${latest.month} ${latest.households} hh · mean £${latest.mean_payment_gbp}`,
  );

  // ── 2. Award bands (latest month) ─────────────────────────────────────────
  console.log('[uc-payments] award bands…');
  let bandVals = await listValueset(BANDS);
  // Drop aggregate "£1500.01 or over" when finer £100 bands exist (avoids double-count)
  if (bandVals.some((b) => /1500\.01 to 1600/i.test(b.label || ''))) {
    bandVals = bandVals.filter((b) => b.label !== '£1500.01 or over');
  }
  bandVals = bandVals.filter((b) => !/^Total$/i.test(b.label || ''));
  const tBands = await sx('/table', {
    method: 'POST',
    body: {
      database: DB,
      measures: [COUNT],
      recodes: {
        [MONTH]: { map: [[monthVal(latest.month_key)]], total: false },
        [GEO]: { map: [[LA]], total: false },
        [BANDS]: { map: bandVals.map((v) => [v.id]), total: true },
      },
      dimensions: [[BANDS], [MONTH], [GEO]],
    },
  });
  const award_bands = rowsFromTable(tBands, COUNT)
    .filter((r) => r.label && !/^Total$/i.test(r.label))
    .map((r) => ({
      band: r.label,
      households: r.value != null ? Math.round(r.value) : null,
    }))
    .filter((r) => r.households != null);

  // ── 3. Family type (latest month) ─────────────────────────────────────────
  console.log('[uc-payments] family type…');
  const famVals = (await listValueset(FAMILY)).filter((b) => !/^Total$/i.test(b.label || ''));
  const famRecode = {
    [MONTH]: { map: [[monthVal(latest.month_key)]], total: false },
    [GEO]: { map: [[LA]], total: false },
    [FAMILY]: { map: famVals.map((v) => [v.id]), total: true },
  };
  const tFamC = await sx('/table', {
    method: 'POST',
    body: {
      database: DB,
      measures: [COUNT],
      recodes: famRecode,
      dimensions: [[FAMILY], [MONTH], [GEO]],
    },
  });
  const tFamM = await sx('/table', {
    method: 'POST',
    body: {
      database: DB,
      measures: [MEAN],
      recodes: famRecode,
      dimensions: [[FAMILY], [MONTH], [GEO]],
    },
  });
  const famC = rowsFromTable(tFamC, COUNT).filter((r) => !/^Total$/i.test(r.label || ''));
  const famM = rowsFromTable(tFamM, MEAN);
  const family_types = famC.map((r) => {
    const m = famM.find((x) => x.label === r.label);
    return {
      family_type: r.label,
      households: r.value != null ? Math.round(r.value) : null,
      mean_payment_gbp: m?.value != null ? Math.round(m.value * 100) / 100 : null,
    };
  });

  // ── Validation / checksums ────────────────────────────────────────────────
  const bandSum = award_bands.reduce((s, b) => s + (b.households || 0), 0);
  const famSum = family_types.reduce((s, f) => s + (f.households || 0), 0);
  const bandDrift = latest.households ? Math.abs(bandSum - latest.households) / latest.households : null;
  const famDrift = latest.households ? Math.abs(famSum - latest.households) / latest.households : null;
  // DWP rounding: allow small drift; flag if > 2%
  const band_ok = bandDrift != null && bandDrift <= 0.02;
  const fam_ok = famDrift != null && famDrift <= 0.02;

  const bill_uc = loadBillUc();
  const hhDelta = latest.households - first.households;
  const hhPct =
    first.households > 0 ? Math.round((hhDelta / first.households) * 1000) / 10 : null;

  const sources = [
    {
      id: 'statxploreUcHouseholds',
      label: 'Households on Universal Credit — Stat-Xplore',
      publisher: 'Department for Work & Pensions',
      dataset: 'UC_Households / Households on Universal Credit',
      method:
        'administrative — Open Data API; COUNT of households; MEAN of Payment Amount; award bands; family type',
      licence: 'Open Government Licence v3.0',
      as_of: latest.month,
      catalogueUrl: 'https://stat-xplore.dwp.gov.uk/',
      apiUrl: 'https://stat-xplore.dwp.gov.uk/webapi/rest/v1',
    },
  ];
  if (bill_uc?.uc_m != null) {
    sources.push({
      id: 'benefitsBillUc',
      label: 'Birmingham UC expenditure £m (LA accounts) — context only',
      publisher: 'Department for Work & Pensions',
      dataset: 'benefit-expenditure-by-local-authority (via benefits-bill proposal)',
      method: 'annual accounting outturn — NOT mean monthly Payment Amount',
      licence: 'Open Government Licence v3.0',
      as_of: bill_uc.year,
      catalogueUrl:
        'https://www.gov.uk/government/publications/benefit-expenditure-and-caseload-tables-2025',
      apiUrl:
        'https://assets.publishing.service.gov.uk/media/693ffb536a12691d48491fb3/benefit-expenditure-by-local-authority-2024-25.ods',
    });
  }

  const proposal = {
    id: 'uc-payments',
    status: 'pending',
    title: 'UC Payments — household award intensity in Birmingham',
    metric:
      'Households on UC; mean Payment Amount (£); award-size bands; family-type split',
    unit: 'households / £ per household (assessment period)',
    geography: 'local-authority',
    la_code: 'E08000025',
    la_name: 'Birmingham',
    generated: new Date().toISOString(),
    as_of: latest.month,
    year: latest.month,
    source: {
      as_of: latest.month,
      label: 'Stat-Xplore Households on Universal Credit',
      publisher: 'Department for Work & Pensions',
    },
    sources,
    months: seriesLive.map((s) => s.month),
    month_keys: seriesLive.map((s) => s.month_key),
    city: {
      series: seriesLive,
      latest_households: latest.households,
      latest_mean_payment_gbp: latest.mean_payment_gbp,
      first_month: first.month,
      first_households: first.households,
      first_mean_payment_gbp: first.mean_payment_gbp,
      households_delta: hhDelta,
      households_pct_change: hhPct,
      bill_uc_context: bill_uc,
    },
    award_bands: award_bands,
    family_types: family_types,
    // Explicit non-coverage — ward mean payment is possible later but not in this proposal
    wards: [],
    validation: {
      geography_level: 'local-authority',
      la_code: 'E08000025',
      complete: seriesLive.length >= 2 && award_bands.length >= 5 && family_types.length >= 4,
      months_span: seriesLive.length,
      series_from: first.month,
      series_to: latest.month,
      latest_households: latest.households,
      latest_mean_payment_gbp: latest.mean_payment_gbp,
      award_bands_count: award_bands.length,
      award_bands_sum: bandSum,
      award_bands_drift_pct: bandDrift != null ? Math.round(bandDrift * 1000) / 10 : null,
      award_bands_checksum_ok: band_ok,
      family_types_count: family_types.length,
      family_types_sum: famSum,
      family_types_drift_pct: famDrift != null ? Math.round(famDrift * 1000) / 10 : null,
      family_types_checksum_ok: fam_ok,
      wards_found: 0,
      note:
        'LA-level only. Households ≠ people on UC. Mean Payment Amount ≠ annual Benefits Bill UC £. Band/family sums may drift slightly from total due to DWP rounding. No ward-level £ outturn published as accounts.',
    },
    method_notes: [
      'Unit of analysis is the UC household claim, not each adult on the claim.',
      'Payment Amount is the mean £ paid in the assessment period (monthly-ish), not annual expenditure.',
      'Benefits Bill UC line (if present) is annual DWP accounting outturn for Birmingham LA — different metric; shown as context only.',
      'Ward-level mean payment is available in Stat-Xplore but not included until code↔label join is validated — no broken sample shipped.',
      'Aggregate band "£1500.01 or over" dropped when finer £100 bands exist to avoid double-counting.',
    ],
  };

  if (!proposal.validation.complete) {
    console.error('[uc-payments] validation incomplete', proposal.validation);
    process.exit(1);
  }
  if (!band_ok) {
    console.warn(
      `[uc-payments] ⚠ award band sum ${bandSum} vs total ${latest.households} (drift ${(bandDrift * 100).toFixed(2)}%)`,
    );
  }
  if (!fam_ok) {
    console.warn(
      `[uc-payments] ⚠ family sum ${famSum} vs total ${latest.households} (drift ${(famDrift * 100).toFixed(2)}%)`,
    );
  }

  writeFileSync(OUT, JSON.stringify(proposal, null, 2));
  console.log(`[uc-payments] wrote ${OUT}`);
  console.log(
    `  ${latest.month}: ${latest.households.toLocaleString()} households · mean £${latest.mean_payment_gbp} · ${award_bands.length} bands · ${family_types.length} family types`,
  );
  console.log(
    `  checksums: bands ${band_ok ? 'OK' : 'WARN'} (drift ${proposal.validation.award_bands_drift_pct}%) · family ${fam_ok ? 'OK' : 'WARN'} (drift ${proposal.validation.family_types_drift_pct}%)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
