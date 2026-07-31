export interface Ward {
  ward_code: string;
  ward_name: string;
  imd_employment_score: number;
  claimant_rate: number;
  inactivity_sick_pct: number;
  trend_12m: number[];
  trend_months: string[];
  gva_band: [number, number];
  char: string;
  // computed by normalise()
  imd_norm: number;
  cc_norm: number;
  ia_norm: number;
  composite: number;
  composite_decile: number;
  // computed by fetchGVA / synthGva
  gva: number;
  population: number;
  earnings: number;
  quadrant: 'prosperous' | 'workhorse' | 'commuter' | 'disadvantage';
  // crime fields (live or modelled)
  crime_rate_per_1000: number;
  crime_rank: number;
  crime_yoy_pct: number;
  crime_trend_12m: number[];
  crime_categories: Record<string, number>;
  // NEET risk (modelled composite index)
  youth_claimant_rate: number;
  neet_risk_score: number;
  neet_risk_decile: number;
}

// Real ward-level crime, official 69 wards (data.police.uk → public/data/crime-wards.json)
export interface CrimeWard {
  ward_code: string;
  ward_name: string;
  population: number;
  crime_rate_per_1000: number;
  crime_rank: number;
  crime_categories: Record<string, number>;
}

// Universal Credit — % of residents on UC per ward. Shared shape used identically
// by the Review preview (from a proposal) and the live Dashboards view (from the
// published public/data/uc-wards.json) — so the same component renders in both.
export interface UcWard {
  ward_code: string;
  ward_name: string;
  uc_claimants: number;
  population: number | null;
  pct_on_uc: number | null;
}
export interface UcSource {
  label: string; publisher: string; dataset: string; licence: string;
  as_of: string; catalogueUrl: string; apiUrl: string;
  method?: string;
  id?: string;
}
export interface BenefitsData {
  as_of: string;
  city_pct: number | null;
  total_claimants: number;
  total_population: number;
  sources: UcSource[];
  wards: UcWard[];
}

// % of UC claimants in employment. The % is a share OF claimants, so we carry the
// claimant count (denominator), a derived in-work headcount, and population for parity.
export interface UcEmpWard {
  ward_code: string;
  ward_name: string;
  pct_in_employment: number;
  uc_claimants: number | null;
  in_work_count: number | null;   // derived: claimants × % ÷ 100
  population: number | null;
}
export interface UcEmpData {
  as_of: string;
  ward_mean_pct: number | null;
  sources: UcSource[];
  wards: UcEmpWard[];
}

// Universal Credit COMBINED — the full per-ward picture: total on UC, in work,
// NOT in work (derived: claimants − in-work), % of residents. Upgrades the UC tab.
export interface UcCombinedWard {
  ward_code: string;
  ward_name: string;
  uc_claimants: number;
  population: number | null;
  pct_on_uc: number | null;           // derived: claimants ÷ residents × 100
  pct_in_employment: number | null;   // native DWP %
  in_work_count: number | null;       // derived: claimants × % ÷ 100
  not_in_work_count: number | null;   // derived: claimants − in-work
}
export interface UcCombinedData {
  as_of: string;
  city: { total: number; in_work: number; not_in_work: number; pct_pop: number | null; pct_not_in_work: number | null };
  sources: UcSource[];
  wards: UcCombinedWard[];
}

// Crime Deep-Dive (City Observatory) — recorded offences per ward with a 36-month
// trend, category mix and outcomes. Shared shape rendered identically by the Review
// preview (from a proposal) and the published Dashboards view (public/data/crime-observatory.json).
export interface CrimeObsWard {
  ward_code: string;
  ward_name: string;
  population: number | null;
  latest_count: number | null;         // recorded offences, latest month
  rate_per_1000: number | null;        // derived: latest_count ÷ population × 1000
  categories: Record<string, number>;  // latest-month breakdown
  trend: (number | null)[];            // raw monthly counts, oldest → latest
  rank: number;
}
export interface CrimeObsData {
  as_of: string;                        // latest month YYYY-MM
  months: string[];                     // full series, oldest → latest
  categories: { name: string; latest_count: number }[]; // city vocabulary, latest first
  city: {
    monthly_totals: Record<string, number>;
    category_by_month: Record<string, Record<string, number>>;
    outcomes_by_month: Record<string, Record<string, number>>;
    latest_total: number;
  };
  sources: UcSource[];
  wards: CrimeObsWard[];
}

// Benefits Bill — DWP's actual £ expenditure in Birmingham by benefit (LA-level only;
// ward-level £ does not exist anywhere). From the DWP benefit-expenditure-by-LA tables.
export interface BenefitLine {
  id: string;
  label: string;
  amount_m: number;                   // £ million, nominal
  group: 'working-age' | 'pensioner' | 'mixed';
  note?: string;
}
export interface BillYear {
  year: string;                       // e.g. "2007/08"
  total_m: number;                    // Birmingham total, £m nominal (always real)
  gb_total_m: number | null;          // Great Britain total, same workbook
  share_pct: number | null;           // derived: Birmingham ÷ GB × 100
  components: Record<string, number> | null;  // canonical id → £m; null = failed the
                                      // sum-check against the workbook's own Total (withheld)
  partial?: boolean;                  // sheet's Total includes benefits it doesn't itemise
                                      // (e.g. no UC column in 2018/19) — listed benefits are
                                      // cluster-validated, but the full stack is withheld
  unlisted_m?: number;                // £m the sheet's Total contains but doesn't itemise
  uc_excluded_from_printed_total?: boolean;  // vintage quirk: printed Total omitted the UC
                                      // column; total_m is corrected to Total+UC (both real)
  anomalies?: string[];               // source defects in DWP's own sheet (value withheld)
}
export interface BenefitsBillData {
  year: string;                       // e.g. "2024/25"
  total_m: number;
  population: number | null;
  per_head: number | null;            // derived: total ÷ residents
  sources: UcSource[];
  lines: BenefitLine[];
  history?: BillYear[];               // 2002/03 → latest
}

// PIP deep dive — GB expenditure by reported medical condition, 2013/14 → latest,
// nominal + real (2025/26 prices), working-age/pension-age splits. GREAT BRITAIN ONLY
// (no sub-national £-by-condition exists); Birmingham's REAL total PIP £ is carried
// as context from the by-LA workbook.
export interface PipCategory {
  name: string;
  nominal: (number | null)[] | null;
  real: (number | null)[];
  wa_real: (number | null)[] | null;
  pa_real: (number | null)[] | null;
}
export interface PipCondition {
  name: string;
  real: (number | null)[];
}
export interface PipData {
  years: string[];
  categories: PipCategory[];         // sorted by latest real, desc
  conditions: PipCondition[];        // top 30 granular
  gb_total_real_latest: number;
  gb_total_nominal_latest: number;
  birmingham_pip_m: number | null;
  sources: UcSource[];
}

// Constituency Money Map — DWP's ACTUAL £ per benefit for Birmingham's 9 parliamentary
// constituencies (2024 boundaries), 2024/25, each row checksum-validated against the
// workbook's own Total. UC additionally carries a 2019/20→2024/25 trend (the only
// benefit DWP recalculated that far back onto the new boundaries).
export interface ConMoneyConstituency {
  code: string;
  name: string;
  total_m: number;
  benefits: Record<string, number>;    // canonical id → £m
  uc_trend: number[] | null;           // aligned to ConMoneyData.uc_years
}
export interface ConMoneyData {
  year: string;
  benefit_labels: Record<string, string>;
  uc_years: string[];
  city: { sum_m: number; la_total_m: number; drift_pct: number };
  sources: UcSource[];
  constituencies: ConMoneyConstituency[];
}

// Two-Child Limit — final DWP statistics (policy abolished 6 Apr 2026), Birmingham
// constituencies (no ward breakdown exists). £ gains derived from official counts ×
// the official child-element rate, labelled derived.
export interface TwoChildConstituency {
  name: string;
  households_affected: number;
  children_affected: number;          // children denied a child element
  households_gaining: number;         // likely to see higher award after removal
  derived_annual_gain_m: number;      // children_affected × child element × 12 (£m)
}
export interface TwoChildData {
  as_of: string;
  child_element_month: number;        // official rate, £/child/month
  city: {
    households_affected: number; children_in_households: number; children_affected: number;
    households_gaining: number; children_in_gaining: number; derived_annual_gain_m: number;
  };
  sources: UcSource[];
  constituencies: TwoChildConstituency[];
}

// Child Poverty — % of children 0-15 in ABSOLUTE low-income families, per ward,
// full annual series 2015/16 → latest. Native DWP/HMRC %; benchmarks are the REAL
// Birmingham-LA and England-mean series (not synthesised).
export interface ChildPovertyWard {
  ward_code: string;
  ward_name: string;
  latest_pct: number;
  first_pct: number | null;
  delta_pp: number | null;              // derived: latest − first, percentage points
  series: (number | null)[];            // aligned to ChildPovertyData.years
}
export interface ChildPovertyData {
  as_of: string;
  years: string[];                      // e.g. ['2015/16', …, '2024/25']
  city: {
    city_series: (number | null)[] | null;
    england_series: (number | null)[] | null;
    city_latest: number | null;
    england_latest: number | null;
  };
  sources: UcSource[];
  wards: ChildPovertyWard[];
}

// Claimant Count — unemployment-related benefits (UC "searching for work" + JSA) per ward.
// The % is DWP's NATIVE "claimants as a proportion of residents aged 16-64" (not derived).
// Counts are DWP-rounded to the nearest 5. trend[] aligns to ClaimantData.months.
export interface ClaimantWard {
  ward_code: string;
  ward_name: string;
  pct_16_64: number;             // native DWP proportion, Total
  count: number;                 // latest-month claimant count, Total
  male_count: number | null;
  female_count: number | null;
  male_pct: number | null;
  female_pct: number | null;
  age_16_24: number | null;      // latest-month counts by age band
  age_25_49: number | null;
  age_50_plus: number | null;
  trend: (number | null)[];      // monthly counts, aligned to ClaimantData.months
}
export interface ClaimantData {
  as_of: string;
  months: string[];              // 'YYYY-MM' labels for the trend series
  ward_mean_pct: number | null;
  total_claimants: number;
  sources: UcSource[];
  wards: ClaimantWard[];
}

// Housing Benefit — % of households in receipt. Published at LOCAL-AUTHORITY level
// only (no ward breakdown), so this shape is a comparison of the 7 West Midlands
// boroughs plus honest benchmarks — NOT 69 wards. The view labels the missing
// ward granularity explicitly. Same component renders in /review and Dashboards.
export interface HbArea {
  area_code: string;
  area_name: string;
  value: number;          // native % published by DWP (not derived, not modelled)
  is_birmingham: boolean;
  rank: number;           // 1 = highest % among the boroughs
}
export interface HousingBenefitData {
  as_of: string;
  metric: string;
  geography: string;                          // 'local-authority' — drives the "no ward data" banner
  areas: HbArea[];
  benchmarks: { wmca: number | null; england: number | null };
  birmingham_value: number | null;
  birmingham_rank: number | null;
  sources: UcSource[];
}

// Fly-tipping incidents per 1,000 people — LA-level only (Defra WasteDataFlow via Observatory).
// 7 WM metro boroughs + WMCA/England means + full annual series. No ward breakdown.
export interface FlyTipArea {
  area_code: string;
  area_name: string;
  value: number;                 // latest year rate per 1,000
  is_birmingham: boolean;
  rank: number;                  // 1 = highest rate among boroughs
  series: (number | null)[];     // aligned to FlyTipData.years
  first_value: number | null;
  change_pp: number | null;      // latest − first (rate points)
}
export interface FlyTipData {
  as_of: string;
  metric: string;
  geography: string;             // 'local-authority'
  years: string[];               // e.g. '2015/16' … '2024/25'
  areas: FlyTipArea[];
  benchmarks: { wmca: number | null; england: number | null };
  bench_series: { wmca: (number | null)[]; england: (number | null)[] };
  city: {
    series: (number | null)[];
    latest: number | null;
    first: number | null;
    change: number | null;
    peak: number | null;
    peak_year: string | null;
    rank: number | null;
  };
  birmingham_value: number | null;
  birmingham_rank: number | null;
  sources: UcSource[];
}

export interface DataSources {
  nomis: 'live' | 'cached';
  imd: 'live' | 'cached';
  gva: 'live' | 'cached';
  crime: 'live' | 'cached';
  neet: 'live' | 'cached';
}

export interface DataMeta {
  nomis: { count: number | null; date: string | null; err: string | null };
  imd: { lsoas: number | null; wards: number | null; err: string | null };
  gva: { count: number | null; year?: number; err: string | null };
  crime: { count: number | null; err: string | null };
  neet: { count: number | null; bham_neet_pct: number | null; bham_year: string; err: string | null };
}

export interface NeetCityData {
  bham_neet_pct: number | null;
  bham_year: string;
  wmca_neet_pct: number | null;
  source: 'live' | 'cached';
}

export interface WardExtras {
  youth_unemp: number;
  uc_pct: number;
  no_quals: number;
  vacancies: number;
}

export interface EducationWard {
  ward_code: string;
  ward_name: string;
  qual_none: number;
  qual_level1: number;
  qual_level2: number;
  qual_apprenticeship: number;
  qual_level3: number;
  qual_level4plus: number;
  qual_other: number;
  skills_decile: number;   // derived from % no quals: 1 = least, 10 = most skills-deprived
  edu_rank: number;
}

export interface EduDataMeta {
  wards: number;
  vintage: string;
}

export interface FiscalBenefits {
  universalCredit: number;
  statePension: number;
  disability: number;
  childBenefit: number;
  pensionCredit: number;
  carers: number;
  councilTaxSupportOther: number;
}

export interface FiscalWard {
  ward_code: string;
  ward_name: string;
  population: number;
  age: { children: number; working: number; pension: number };
  benefits: FiscalBenefits;
  benefitPerHead: number;
  revenuePerHead: number;
  servicePerHead: number;
  net: number;
  driver: string;
  provenance: { benefits: string; revenue: string; population: string };
}

export interface HousingWard {
  ward_code: string;
  ward_name: string;
  // Affordability — all modelled
  median_house_price_k: number;    // £k
  price_to_income: number;          // ratio
  private_rent_pcm: number;         // £/month
  rent_income_pct: number;          // % of annual earnings spent on rent
  // Tenure mix — modelled from Census 2021 profile
  owner_occupation_pct: number;
  social_rented_pct: number;
  private_rented_pct: number;
  // Conditions
  overcrowding_pct: number;         // % households overcrowded
  // Composite
  housing_pressure_score: number;   // 0-1
  housing_pressure_decile: number;  // 1-10
  housing_pressure_rank: number;    // 1 = most pressure
  // Context from base Ward
  char: string;
  earnings: number;
  claimant_rate: number;
  imd_employment_score: number;
}

// Wrong Payments — illustrative fraud & error leakage on Birmingham's DWP bill.
// National overpayment rates (Fraud & Error FYE 2025) × Birmingham LA spend.
// Derived figures are labelled; not a Birmingham audit.
export interface WrongPaymentLine {
  id: string;
  label: string;
  group: 'working-age' | 'pensioner' | 'mixed';
  note?: string;
  spend_m: number;
  rate_pct: number;
  fraud_rate_pct: number | null;
  claimant_rate_pct: number | null;
  official_rate_pct: number | null;
  overpaid_m: number;
  fraud_m: number | null;
  claimant_error_m: number | null;
  official_error_m: number | null;
  correctly_paid_m: number;
  rate_method: 'benefit-specific' | 'all-benefit-rate';
  last_measured: string | null;
  share_of_leak_pct: number;
}
export interface WrongPaymentReason {
  id: string;
  label: string;
  rate_pct: number;
  note?: string;
  bham_illustrative_m: number | null;
}
export interface WrongPaymentsNational {
  year: string;
  expenditure_bn: number;
  overpaid_bn: number;
  overpaid_rate_pct: number;
  fraud_bn: number;
  fraud_rate_pct: number;
  claimant_error_bn: number;
  claimant_error_rate_pct: number;
  official_error_bn: number;
  official_error_rate_pct: number;
  underpaid_bn: number;
  underpaid_rate_pct: number;
  net_loss_bn: number;
  net_loss_rate_pct: number;
  recovered_bn: number;
  prior: {
    year: string;
    overpaid_bn: number;
    overpaid_rate_pct: number;
    uc_overpaid_rate_pct: number;
  };
  uc_overpaid_rate_pct: number;
  source_url: string;
  tables_url: string;
}
export interface WrongPaymentsData {
  year: string;
  as_of: string;
  sources: UcSource[];
  national: WrongPaymentsNational;
  city: {
    bill_m: number;
    population: number | null;
    overpaid_m: number;
    implied_rate_pct: number;
    one_in: number | null;
    per_resident: number | null;
    per_day_m: number;
    per_minute: number;
    correctly_paid_m: number;
    measured_spend_m: number;
    unmeasured_spend_m: number;
    fraud_m: number;
    claimant_error_m: number;
    official_error_m: number;
    untyped_m: number;
    uc_overpaid_m: number | null;
    uc_spend_m: number | null;
    uc_rate_pct: number | null;
    top_leak_id: string | null;
    top_leak_label: string | null;
    top_leak_m: number | null;
  };
  uc_reasons: WrongPaymentReason[];
  lines: WrongPaymentLine[];
  method_notes?: string[];
}

// Wrong Payments — illustrative fraud & error leakage on Birmingham's DWP bill.
// National overpayment rates (Fraud & Error FYE 2025) × Birmingham LA spend.
// Derived figures are labelled; not a Birmingham audit.
export interface WrongPaymentLine {
  id: string;
  label: string;
  group: 'working-age' | 'pensioner' | 'mixed';
  note?: string;
  spend_m: number;
  rate_pct: number;
  fraud_rate_pct: number | null;
  claimant_rate_pct: number | null;
  official_rate_pct: number | null;
  overpaid_m: number;
  fraud_m: number | null;
  claimant_error_m: number | null;
  official_error_m: number | null;
  correctly_paid_m: number;
  rate_method: 'benefit-specific' | 'all-benefit-rate';
  last_measured: string | null;
  share_of_leak_pct: number;
}
export interface WrongPaymentReason {
  id: string;
  label: string;
  rate_pct: number;
  note?: string;
  bham_illustrative_m: number | null;
}
export interface WrongPaymentsNational {
  year: string;
  expenditure_bn: number;
  overpaid_bn: number;
  overpaid_rate_pct: number;
  fraud_bn: number;
  fraud_rate_pct: number;
  claimant_error_bn: number;
  claimant_error_rate_pct: number;
  official_error_bn: number;
  official_error_rate_pct: number;
  underpaid_bn: number;
  underpaid_rate_pct: number;
  net_loss_bn: number;
  net_loss_rate_pct: number;
  recovered_bn: number;
  prior: {
    year: string;
    overpaid_bn: number;
    overpaid_rate_pct: number;
    uc_overpaid_rate_pct: number;
  };
  uc_overpaid_rate_pct: number;
  source_url: string;
  tables_url: string;
}
export interface WrongPaymentsData {
  year: string;
  as_of: string;
  sources: UcSource[];
  national: WrongPaymentsNational;
  city: {
    bill_m: number;
    population: number | null;
    overpaid_m: number;
    implied_rate_pct: number;
    one_in: number | null;
    per_resident: number | null;
    per_day_m: number;
    per_minute: number;
    correctly_paid_m: number;
    measured_spend_m: number;
    unmeasured_spend_m: number;
    fraud_m: number;
    claimant_error_m: number;
    official_error_m: number;
    untyped_m: number;
    uc_overpaid_m: number | null;
    uc_spend_m: number | null;
    uc_rate_pct: number | null;
    top_leak_id: string | null;
    top_leak_label: string | null;
    top_leak_m: number | null;
  };
  uc_reasons: WrongPaymentReason[];
  lines: WrongPaymentLine[];
  method_notes?: string[];
}

// UC Money Weather � ward caseload over months (Stat-Xplore) + city UC � (LA accounts)
export interface UcWeatherWard {
  ward_code: string;
  ward_name: string;
  population: number | null;
  series: (number | null)[];
  latest: number | null;
  first: number | null;
  first_month: string | null;
  delta: number | null;
  per_1000: number | null;
}
export interface UcWeatherData {
  as_of: string;
  sources: UcSource[];
  months: string[];
  month_keys?: string[];
  city: {
    series: (number | null)[];
    latest: number;
    first: number | null;
    delta: number | null;
    bill_uc: { year: string; uc_m: number; total_m: number }[];
  };
  wards: UcWeatherWard[];
}

// UC Payments — LA-level household award intensity (Stat-Xplore UC_Households).
// Households ≠ people. Mean Payment Amount ≠ annual Benefits Bill UC £.
export interface UcPaymentMonth {
  month: string;
  month_key: string | null;
  households: number | null;
  mean_payment_gbp: number | null;
}
export interface UcPaymentBand {
  band: string;
  households: number | null;
}
export interface UcPaymentFamily {
  family_type: string;
  households: number | null;
  mean_payment_gbp: number | null;
}
export interface UcPaymentsData {
  as_of: string;
  sources: UcSource[];
  months: string[];
  month_keys?: (string | null)[];
  city: {
    series: UcPaymentMonth[];
    latest_households: number;
    latest_mean_payment_gbp: number;
    first_month: string;
    first_households: number;
    first_mean_payment_gbp: number | null;
    households_delta: number;
    households_pct_change: number | null;
    bill_uc_context: {
      year: string | null;
      uc_m: number | null;
      total_m: number | null;
      note: string;
    } | null;
  };
  award_bands: UcPaymentBand[];
  family_types: UcPaymentFamily[];
  method_notes?: string[];
}

// PIP Place � ward caseload play + city PIP � + GB conditions + Bham category mix
export interface PipPlaceWard {
  ward_code: string;
  ward_name: string;
  population: number | null;
  series: (number | null)[];
  latest: number | null;
  first: number | null;
  first_month: string | null;
  delta: number | null;
  per_1000: number | null;
}
export interface PipPlaceData {
  as_of: string;
  sources: UcSource[];
  months: string[];
  month_keys?: string[];
  city: {
    series: (number | null)[];
    latest: number;
    first: number | null;
    delta: number | null;
    bill_pip: { year: string; pip_m: number; total_m: number }[];
  };
  wards: PipPlaceWard[];
  category_mix: {
    early_month: string | null;
    latest_month: string | null;
    early: { name: string; count: number | null }[];
    latest: { name: string; count: number | null }[];
  };
  gb_conditions: {
    years: string[];
    categories: PipCategory[];
    conditions: PipCondition[];
    gb_total_real_latest: number;
    gb_total_nominal_latest: number;
  } | null;
}

// 3D stage dashboards (Three.js presentation of caseload series)
export interface OzzyStageWard {
  ward_code: string;
  ward_name: string;
  population: number | null;
  uc_series: (number | null)[] | null;
  uc_latest: number | null;
  uc_delta: number | null;
  pip_series: (number | null)[] | null;
  pip_latest: number | null;
  pip_delta: number | null;
}
export interface OzzyStageData {
  as_of: string;
  sources: UcSource[];
  uc: {
    months: string[];
    city: {
      series: (number | null)[];
      latest: number;
      first: number | null;
      delta: number | null;
      bill_uc: { year: string; uc_m: number; total_m: number }[];
    };
  };
  pip: {
    months: string[];
    city: {
      series: (number | null)[];
      latest: number;
      first: number | null;
      delta: number | null;
      bill_pip: { year: string; pip_m: number; total_m: number }[];
    };
    category_mix: {
      early_month: string | null;
      latest_month: string | null;
      early: { name: string; count: number | null }[];
      latest: { name: string; count: number | null }[];
    } | null;
    gb_conditions: {
      years?: string[];
      top_categories: { name: string; latest_real: number | null }[];
      gb_total_real_latest: number;
    } | null;
  };
  wards: OzzyStageWard[];
}
