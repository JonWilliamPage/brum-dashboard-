#!/usr/bin/env node
/**
 * Wrong Payments — illustrative fraud & error leakage on Birmingham's DWP bill.
 *
 * Combines TWO official sources (neither is fabricated):
 *   1. Birmingham benefit £ by line — already validated in proposals/benefits-bill.proposal.json
 *      (DWP benefit-expenditure-by-local-authority-2024-25.ods, E08000025).
 *   2. National overpayment rates by benefit — DWP Fraud and error in the benefit system,
 *      Financial Year Ending 2025 (accredited official statistics).
 *
 * DERIVATION (labelled in the proposal and UI):
 *   illustrative_overpaid_£m = Birmingham_spend_£m × (national_overpayment_rate_% / 100)
 *
 * This is NOT a Birmingham audit. DWP does not publish LA-level fraud/error monetary
 * values. Rates are Great Britain averages applied to the city's real spend to show
 * order-of-magnitude leakage. Benefits without a benefit-specific FYE 2025 rate use the
 * national all-benefit rate (3.3%) and are tagged method: "all-benefit rate".
 *
 * Writes ONLY to proposals/wrong-payments.proposal.json — never public/data/.
 *
 * Run: node scripts/fetch-wrong-payments.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BILL_PATH = join(ROOT, 'proposals', 'benefits-bill.proposal.json');
const OUT = join(ROOT, 'proposals', 'wrong-payments.proposal.json');

// ── Official FYE 2025 rates (DWP Fraud & Error statistics) ───────────────────
// Source: https://www.gov.uk/government/statistics/fraud-and-error-in-the-benefit-system-financial-year-2024-to-2025-estimates
// Appendix 1 rates (% of that benefit's GB expenditure). Monetary values are national.
//
// total = fraud + claimant_error + official_error (may round by 0.1pp in the source).
const RATES = {
  uc:  { label: 'Universal Credit',              total: 9.7, fraud: 8.0, claimant: 0.9, official: 0.8, measured: true,  last_measured: 'Nov 2023 – Oct 2024' },
  sp:  { label: 'State Pension',                 total: 0.1, fraud: 0.0, claimant: 0.1, official: 0.1, measured: true,  last_measured: 'Nov 2023 – Oct 2024' },
  pip: { label: 'Personal Independence Payment', total: 1.3, fraud: 0.4, claimant: 0.7, official: 0.2, measured: true,  last_measured: 'Sep 2023 – Aug 2024' },
  hb:  { label: 'Housing Benefit',               total: 7.2, fraud: 4.1, claimant: 2.5, official: 0.6, measured: true,  last_measured: 'Nov 2023 – Oct 2024' },
  esa: { label: 'Employment & Support Allowance', total: 3.4, fraud: 1.5, claimant: 1.6, official: 0.4, measured: true,  last_measured: 'Sep 2021 – Aug 2022' },
  dla: { label: 'Disability Living Allowance',   total: 2.2, fraud: 0.0, claimant: 1.9, official: 0.3, measured: true,  last_measured: 'Oct 2020 – Aug 2021' },
  aa:  { label: 'Attendance Allowance',          total: 0.5, fraud: 0.1, claimant: 0.2, official: 0.2, measured: true,  last_measured: 'Mar 2023 – Oct 2023' },
  pc:  { label: 'Pension Credit',                total: 10.3, fraud: 4.5, claimant: 4.1, official: 1.7, measured: true, last_measured: 'Nov 2023 – Oct 2024' },
  ca:  { label: 'Carer\'s Allowance',            total: 3.9, fraud: 2.5, claimant: 1.0, official: 0.5, measured: true,  last_measured: 'Mar 2024 – Sep 2024' },
};

// National all-benefit headline (FYE 2025)
const NATIONAL = {
  year: 'FYE 2025',
  expenditure_bn: 292.2,
  overpaid_bn: 9.5,
  overpaid_rate_pct: 3.3,
  fraud_bn: 6.5,
  fraud_rate_pct: 2.2,
  claimant_error_bn: 1.9,
  claimant_error_rate_pct: 0.7,
  official_error_bn: 1.0,
  official_error_rate_pct: 0.4,
  underpaid_bn: 1.2,
  underpaid_rate_pct: 0.4,
  net_loss_bn: 8.4,
  net_loss_rate_pct: 2.9,
  recovered_bn: 1.1,
  // Prior year for the "is it getting better" strip
  prior: {
    year: 'FYE 2024',
    overpaid_bn: 9.7,
    overpaid_rate_pct: 3.6,
    uc_overpaid_rate_pct: 12.4,
  },
  uc_overpaid_rate_pct: 9.7,
  // UC fraud reason rates as % of UC expenditure (FYE 2025)
  uc_reasons: [
    { id: 'earnings',   label: 'Under-declared earnings / employment', rate_pct: 2.2, note: 'Largest fraud reason on UC' },
    { id: 'together',   label: 'Living together (undeclared partner)', rate_pct: 1.7, note: 'Second-largest fraud reason' },
    { id: 'capital',    label: 'Under-declared financial assets (capital)', rate_pct: 1.3, note: 'Third-largest fraud reason' },
    { id: 'engage',     label: 'Failure to provide evidence / engage', rate_pct: 0.9, note: 'Down from 2.2% in FYE 2024' },
  ],
  source_url: 'https://www.gov.uk/government/statistics/fraud-and-error-in-the-benefit-system-financial-year-2024-to-2025-estimates/fraud-and-error-in-the-benefit-system-financial-year-ending-fye-2025',
  tables_url: 'https://www.gov.uk/government/statistics/fraud-and-error-in-the-benefit-system-financial-year-2024-to-2025-estimates',
};

const ALL_BENEFIT_RATE = NATIONAL.overpaid_rate_pct; // 3.3

function round1(n) {
  return Math.round(n * 10) / 10;
}
function round2(n) {
  return Math.round(n * 100) / 100;
}

function main() {
  if (!existsSync(BILL_PATH)) {
    console.error('Missing', BILL_PATH, '— run scripts/fetch-benefits-bill.mjs first.');
    process.exit(1);
  }
  const bill = JSON.parse(readFileSync(BILL_PATH, 'utf8'));
  if (!bill.lines?.length || !bill.total_m) {
    console.error('benefits-bill proposal is incomplete.');
    process.exit(1);
  }

  const year = bill.year || '2024/25';
  const bill_m = bill.total_m;
  const population = bill.population ?? null;

  /** @type {object[]} */
  const lines = [];
  let measured_spend_m = 0;
  let unmeasured_spend_m = 0;
  let overpaid_m = 0;
  let fraud_m = 0;
  let claimant_m = 0;
  let official_m = 0;

  for (const bl of bill.lines) {
    const rate = RATES[bl.id];
    const spend = bl.amount_m;
    const measured = !!rate?.measured;
    const total_rate = measured ? rate.total : ALL_BENEFIT_RATE;
    const fraud_rate = measured ? rate.fraud : null;
    const claimant_rate = measured ? rate.claimant : null;
    const official_rate = measured ? rate.official : null;

    const line_overpaid = round2(spend * (total_rate / 100));
    const line_fraud = fraud_rate != null ? round2(spend * (fraud_rate / 100)) : null;
    const line_claimant = claimant_rate != null ? round2(spend * (claimant_rate / 100)) : null;
    const line_official = official_rate != null ? round2(spend * (official_rate / 100)) : null;

    overpaid_m += line_overpaid;
    if (line_fraud != null) fraud_m += line_fraud;
    if (line_claimant != null) claimant_m += line_claimant;
    if (line_official != null) official_m += line_official;
    if (measured) measured_spend_m += spend;
    else unmeasured_spend_m += spend;

    lines.push({
      id: bl.id,
      label: bl.label,
      group: bl.group,
      note: bl.note,
      spend_m: spend,
      rate_pct: total_rate,
      fraud_rate_pct: fraud_rate,
      claimant_rate_pct: claimant_rate,
      official_rate_pct: official_rate,
      overpaid_m: line_overpaid,
      fraud_m: line_fraud,
      claimant_error_m: line_claimant,
      official_error_m: line_official,
      correctly_paid_m: round2(spend - line_overpaid),
      rate_method: measured ? 'benefit-specific' : 'all-benefit-rate',
      last_measured: rate?.last_measured ?? null,
      // share of city illustrative leakage
      share_of_leak_pct: null, // filled after sum
    });
  }

  overpaid_m = round2(overpaid_m);
  fraud_m = round2(fraud_m);
  claimant_m = round2(claimant_m);
  official_m = round2(official_m);

  for (const l of lines) {
    l.share_of_leak_pct = overpaid_m > 0 ? round1((l.overpaid_m / overpaid_m) * 100) : 0;
  }

  // Sort by illustrative overpaid £ desc — the leakage ranking
  lines.sort((a, b) => b.overpaid_m - a.overpaid_m);

  const implied_rate = bill_m > 0 ? round2((overpaid_m / bill_m) * 100) : 0;
  // "one pound in N"
  const one_in = implied_rate > 0 ? Math.round(100 / implied_rate) : null;
  const per_resident = population ? Math.round((overpaid_m * 1e6) / population) : null;
  const per_day_m = round2(overpaid_m / 365);
  const per_minute = Math.round((overpaid_m * 1e6) / (365 * 24 * 60));

  // UC-specific deep dive (national reasons × Birmingham UC spend)
  const uc_line = lines.find(l => l.id === 'uc');
  const uc_reasons = NATIONAL.uc_reasons.map(r => ({
    ...r,
    bham_illustrative_m: uc_line ? round2(uc_line.spend_m * (r.rate_pct / 100)) : null,
  }));

  // Error-type composition of the measured slice (fraud+CE+OE on measured benefits only)
  const error_composition = {
    fraud_m,
    claimant_error_m: claimant_m,
    official_error_m: official_m,
    // residual: overpaid on unmeasured lines + rounding vs type split on measured
    untyped_m: round2(Math.max(0, overpaid_m - fraud_m - claimant_m - official_m)),
  };

  const sources = [
    {
      id: 'fraudError',
      label: 'Fraud and error in the benefit system, Financial Year Ending 2025',
      publisher: 'Department for Work & Pensions',
      dataset: 'fraud-and-error-in-the-benefit-system-financial-year-2024-to-2025-estimates',
      method: 'accredited official statistics — sample review of claims, rates applied to expenditure',
      licence: 'Open Government Licence v3.0',
      as_of: 'FYE 2025',
      catalogueUrl: NATIONAL.source_url,
      apiUrl: NATIONAL.tables_url,
    },
    {
      id: 'benefitsBill',
      label: 'Benefit expenditure by local authority 2024/25 — Birmingham (E08000025)',
      publisher: 'Department for Work & Pensions',
      dataset: 'benefit-expenditure-by-local-authority-2024-25.ods',
      method: 'administrative — accounting outturn (via benefits-bill proposal)',
      licence: 'Open Government Licence v3.0',
      as_of: year,
      catalogueUrl: 'https://assets.publishing.service.gov.uk/media/693ffb536a12691d48491fb3/benefit-expenditure-by-local-authority-2024-25.ods',
      apiUrl: 'https://www.gov.uk/government/publications/benefit-expenditure-and-caseload-tables-2025',
    },
    {
      id: 'benefitsBillPage',
      label: 'DWP Benefit expenditure and caseload tables 2025 (publication page)',
      publisher: 'Department for Work & Pensions',
      dataset: 'Collection page',
      method: 'reference',
      licence: 'Open Government Licence v3.0',
      as_of: year,
      catalogueUrl: 'https://www.gov.uk/government/publications/benefit-expenditure-and-caseload-tables-2025',
      apiUrl: 'https://www.gov.uk/government/publications/benefit-expenditure-and-caseload-tables-2025',
    },
  ];

  const proposal = {
    id: 'wrong-payments',
    status: 'pending',
    title: 'Wrong Payments — fraud & error on Birmingham\'s benefits bill',
    metric: 'Illustrative overpayments: Birmingham DWP spend × national fraud/error rates',
    unit: '£ million / year (illustrative)',
    geography: 'local-authority (rates are Great Britain)',
    generated: new Date().toISOString(),
    year,
    as_of: `${year} spend × FYE 2025 rates`,
    source: {
      as_of: `${year} spend × FYE 2025 rates`,
      label: 'DWP Fraud & Error FYE 2025 × Birmingham LA expenditure',
      publisher: 'Department for Work & Pensions',
    },
    sources,
    national: NATIONAL,
    city: {
      bill_m,
      population,
      overpaid_m,
      implied_rate_pct: implied_rate,
      one_in,
      per_resident,
      per_day_m,
      per_minute,
      correctly_paid_m: round2(bill_m - overpaid_m),
      measured_spend_m: round2(measured_spend_m),
      unmeasured_spend_m: round2(unmeasured_spend_m),
      ...error_composition,
      uc_overpaid_m: uc_line?.overpaid_m ?? null,
      uc_spend_m: uc_line?.spend_m ?? null,
      uc_rate_pct: uc_line?.rate_pct ?? null,
      top_leak_id: lines[0]?.id ?? null,
      top_leak_label: lines[0]?.label ?? null,
      top_leak_m: lines[0]?.overpaid_m ?? null,
    },
    uc_reasons,
    error_composition,
    lines,
    validation: {
      geography_level: 'local-authority',
      ward_breakdown_available: false,
      rates_are_national: true,
      derivation: 'Birmingham_spend_£m × (national_overpayment_rate_% / 100)',
      bill_m,
      overpaid_m,
      implied_rate_pct: implied_rate,
      one_in,
      lines_found: lines.length,
      measured_lines: lines.filter(l => l.rate_method === 'benefit-specific').length,
      unmeasured_lines: lines.filter(l => l.rate_method === 'all-benefit-rate').length,
      sum_spend_check: round2(lines.reduce((s, l) => s + l.spend_m, 0)) === bill_m
        || Math.abs(round2(lines.reduce((s, l) => s + l.spend_m, 0)) - bill_m) < 0.15,
      sum_overpaid_check: Math.abs(round2(lines.reduce((s, l) => s + l.overpaid_m, 0)) - overpaid_m) < 0.15,
      national_overpaid_bn: NATIONAL.overpaid_bn,
      national_rate_pct: NATIONAL.overpaid_rate_pct,
      honesty_banner: 'Illustrative only — national rates applied to city spend. Not a Birmingham audit.',
    },
    method_notes: [
      'Overpaid £ figures are DERIVED: each Birmingham benefit line × the matching national overpayment rate from DWP Fraud & Error FYE 2025.',
      'DWP does not publish fraud/error monetary values at local-authority level. Do not present these as audited Birmingham losses.',
      'Benefits without a benefit-specific rate (small lines) use the national all-benefit rate of 3.3% and are tagged rate_method: all-benefit-rate.',
      'Fraud / claimant error / official error splits use benefit-specific rates where published; residual on unmeasured lines is untyped.',
      'Net national loss deducts recoveries (£1.1bn recovered of £9.5bn overpaid in FYE 2025). Recovery is not apportioned to Birmingham.',
      'Underpayments (£1.2bn nationally, 0.4%) are people paid too little — shown as context, not as "waste".',
    ],
  };

  writeFileSync(OUT, JSON.stringify(proposal, null, 2));

  console.log('── Wrong Payments proposal ──');
  console.log(`Birmingham bill ${year}: £${bill_m}m`);
  console.log(`Illustrative overpaid: £${overpaid_m}m  (${implied_rate}% · ~1 in ${one_in} pounds)`);
  console.log(`  of which fraud £${fraud_m}m · claimant error £${claimant_m}m · official error £${official_m}m`);
  console.log(`UC alone: £${uc_line?.spend_m}m spend × ${uc_line?.rate_pct}% → £${uc_line?.overpaid_m}m`);
  console.log(`Top leaks:`);
  for (const l of lines.slice(0, 5)) {
    console.log(`  ${l.label.padEnd(32)} spend £${String(l.spend_m).padStart(7)}m  rate ${String(l.rate_pct).padStart(4)}%  → £${l.overpaid_m}m  [${l.rate_method}]`);
  }
  console.log(`Wrote ${OUT}`);
  console.log('Status: pending — Accept in /review to publish.');
}

main();
