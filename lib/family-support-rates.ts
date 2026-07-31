/**
 * Official benefit *rates* for the Family Support Model.
 *
 * Source: DWP "Benefit and pension rates 2026 to 2027"
 * https://www.gov.uk/government/publications/benefit-and-pension-rates-2026-to-2027/proposed-benefit-and-pension-rates-2026-to-2027
 * Child Benefit: HMRC rates 2026/27
 * https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance
 *
 * These are STATUTORY RATES (what the rules pay if eligible), not Birmingham
 * administrative outturn. Birmingham *observed means* come from Stat-Xplore
 * via the uc-payments proposal and are joined at fetch time.
 *
 * Weekly → monthly conversion: × 52 / 12 (standard DWP monthlyisation used in UC).
 */

export const RATES_YEAR = '2026/27';
export const RATES_SOURCE_URL =
  'https://www.gov.uk/government/publications/benefit-and-pension-rates-2026-to-2027/proposed-benefit-and-pension-rates-2026-to-2027';
export const CHILD_BENEFIT_SOURCE_URL =
  'https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance';

export function weekToMonth(weekly: number): number {
  return Math.round(((weekly * 52) / 12) * 100) / 100;
}

/** Universal Credit — monthly rates 2026/27 (GOV.UK table). */
export const UC = {
  standard_single_u25: 338.58,
  standard_single_25plus: 424.9,
  standard_couple_both_u25: 528.34,
  standard_couple_one_or_both_25plus: 666.97,
  /** First child born before 6 Apr 2017 */
  child_first_pre_2017: 351.88,
  /**
   * First child born on/after 6 Apr 2017, and second/subsequent children
   * (two-child limit abolished 6 Apr 2026 — all qualifying children can attract an element).
   */
  child_element: 303.94,
  disabled_child_lower: 164.79,
  disabled_child_higher: 514.71,
  /** Limited capability for work and work-related activity (existing/full rate in rates table) */
  lcwra: 429.8,
  /** Lower LCWRA figure also listed in 2026/27 rates (pathways reform) — flag in UI */
  lcwra_alt_listed: 217.26,
  carer_element: 209.34,
  childcare_max_one: 1071.09,
  childcare_max_two_plus: 1836.16,
} as const;

/** PIP — weekly 2026/27 → monthly. */
export const PIP = {
  daily_living_standard_w: 76.7,
  daily_living_enhanced_w: 114.6,
  mobility_standard_w: 30.3,
  mobility_enhanced_w: 80.0,
  get daily_living_standard_m() {
    return weekToMonth(this.daily_living_standard_w);
  },
  get daily_living_enhanced_m() {
    return weekToMonth(this.daily_living_enhanced_w);
  },
  get mobility_standard_m() {
    return weekToMonth(this.mobility_standard_w);
  },
  get mobility_enhanced_m() {
    return weekToMonth(this.mobility_enhanced_w);
  },
  get max_one_person_m() {
    return (
      Math.round(
        (this.daily_living_enhanced_m + this.mobility_enhanced_m) * 100,
      ) / 100
    );
  },
} as const;

/** Carer's Allowance — weekly 2026/27. Overlaps with UC carer element (interaction rules). */
export const CA = {
  weekly: 86.45,
  get monthly() {
    return weekToMonth(this.weekly);
  },
} as const;

/** Child Benefit — weekly 2026/27 (HMRC). Outside DWP Benefits Bill. */
export const CHILD_BENEFIT = {
  eldest_weekly: 27.05,
  additional_weekly: 17.9,
  monthlyFor(nChildren: number): number {
    if (nChildren <= 0) return 0;
    const w =
      this.eldest_weekly + Math.max(0, nChildren - 1) * this.additional_weekly;
    return weekToMonth(w);
  },
} as const;

/** Benefit Cap — monthly, Rest of Great Britain (Birmingham), couples/with children 2026/27. */
export const BENEFIT_CAP = {
  couple_or_with_children_monthly_rest_gb: 1835.0,
  single_no_children_monthly_rest_gb: 1229.42,
  note: 'Applies to some working-age benefits including UC; PIP and Carer’s Allowance are typically excluded from the cap calculation. Confirm current exemptions on GOV.UK.',
} as const;

export type StackLineKind =
  | 'uc_element'
  | 'disability'
  | 'carer'
  | 'child_benefit'
  | 'housing'
  | 'observed'
  | 'cap';

export interface StackLine {
  id: string;
  label: string;
  kind: StackLineKind;
  /** Monthly £ if included in this scenario */
  monthly: number | null;
  /** Whether this line is in the scenario total */
  included: boolean;
  /** Who it attaches to */
  attaches_to: 'household' | 'adult_1' | 'adult_2' | 'child' | 'area_context';
  eligibility: string;
  source: string;
  note?: string;
}

export interface FamilyScenario {
  id: string;
  title: string;
  summary: string;
  adults: number;
  children: number;
  assumptions: string[];
  lines: StackLine[];
  /** Sum of included lines with a number */
  total_monthly: number;
  total_excludes: string[];
}

/** Couple both 25+, 4 children all born after Apr 2017, no earned income, rent not modelled. */
export function scenarioCoupleFourChildren(opts?: {
  /** One adult has LCWRA (full listed rate) */
  lcwra?: boolean;
  /** One adult is a carer (UC carer element; CA listed separately as optional stack) */
  carer_uc?: boolean;
  /** Include full CA as extra line (interaction: usually offsets UC — labelled) */
  carer_allowance_extra?: boolean;
  /** Adult 1 PIP enhanced both components */
  pip_adult1?: boolean;
  /** Adult 2 PIP enhanced both components */
  pip_adult2?: boolean;
  /** One child higher-rate disabled child addition on UC */
  disabled_child_higher?: boolean;
  /** Child Benefit for 4 children */
  child_benefit?: boolean;
}): FamilyScenario {
  const {
    lcwra = false,
    carer_uc = false,
    carer_allowance_extra = false,
    pip_adult1 = false,
    pip_adult2 = false,
    disabled_child_higher = false,
    child_benefit = true,
  } = opts ?? {};

  const lines: StackLine[] = [];

  lines.push({
    id: 'uc_standard',
    label: 'UC standard allowance (couple, one or both 25+)',
    kind: 'uc_element',
    monthly: UC.standard_couple_one_or_both_25plus,
    included: true,
    attaches_to: 'household',
    eligibility: 'One joint UC claim for the couple — not two separate UC awards',
    source: `DWP rates ${RATES_YEAR} · UC standard allowance`,
  });

  // 4 × child element (post two-child limit abolition from 6 Apr 2026)
  const childTotal = Math.round(UC.child_element * 4 * 100) / 100;
  lines.push({
    id: 'uc_children',
    label: 'UC child elements × 4',
    kind: 'uc_element',
    monthly: childTotal,
    included: true,
    attaches_to: 'household',
    eligibility:
      '4 qualifying children; each at the £303.94 rate (born on/after 6 Apr 2017). Two-child limit abolished 6 Apr 2026.',
    source: `DWP rates ${RATES_YEAR} · 4 × £${UC.child_element}`,
    note: `Arithmetic: 4 × ${UC.child_element} = ${childTotal}`,
  });

  if (disabled_child_higher) {
    lines.push({
      id: 'uc_disabled_child',
      label: 'UC disabled child addition (higher)',
      kind: 'uc_element',
      monthly: UC.disabled_child_higher,
      included: true,
      attaches_to: 'child',
      eligibility: 'Child qualifies for higher disabled child addition (DLA/PIP-linked rules)',
      source: `DWP rates ${RATES_YEAR}`,
    });
  }

  if (lcwra) {
    lines.push({
      id: 'uc_lcwra',
      label: 'UC LCWRA element (one adult)',
      kind: 'uc_element',
      monthly: UC.lcwra,
      included: true,
      attaches_to: 'adult_1',
      eligibility: 'Limited capability for work and work-related activity',
      source: `DWP rates ${RATES_YEAR} · LCWRA £${UC.lcwra}/mo`,
      note: `Rates table also lists £${UC.lcwra_alt_listed} (pathways reform) — using full £${UC.lcwra} as “max existing-style” rate; confirm claim vintage.`,
    });
  }

  if (carer_uc) {
    lines.push({
      id: 'uc_carer',
      label: 'UC carer element',
      kind: 'uc_element',
      monthly: UC.carer_element,
      included: true,
      attaches_to: 'adult_2',
      eligibility: 'Regularly provides care for 35+ hours/week for a severely disabled person',
      source: `DWP rates ${RATES_YEAR}`,
    });
  }

  if (pip_adult1) {
    lines.push({
      id: 'pip_a1',
      label: 'PIP adult 1 (enhanced daily living + enhanced mobility)',
      kind: 'disability',
      monthly: PIP.max_one_person_m,
      included: true,
      attaches_to: 'adult_1',
      eligibility: 'Personal, non-means-tested; assessed on daily living & mobility',
      source: `DWP rates ${RATES_YEAR} · weekly (£${PIP.daily_living_enhanced_w}+£${PIP.mobility_enhanced_w}) × 52/12`,
      note: 'PIP is usually ignored as income for UC (does not reduce UC standard/child elements).',
    });
  }

  if (pip_adult2) {
    lines.push({
      id: 'pip_a2',
      label: 'PIP adult 2 (enhanced daily living + enhanced mobility)',
      kind: 'disability',
      monthly: PIP.max_one_person_m,
      included: true,
      attaches_to: 'adult_2',
      eligibility: 'Second adult also awarded max PIP',
      source: `DWP rates ${RATES_YEAR} · same as adult 1`,
    });
  }

  if (carer_allowance_extra) {
    lines.push({
      id: 'ca',
      label: "Carer's Allowance (weekly benefit)",
      kind: 'carer',
      monthly: CA.monthly,
      included: true,
      attaches_to: 'adult_2',
      eligibility: '35+ hrs care; earnings rules; overlapping benefit rules with UC carer element',
      source: `DWP rates ${RATES_YEAR} · £${CA.weekly}/wk × 52/12`,
      note: 'If UC carer element is also paid, CA is usually treated as income that reduces UC — do not naively add both as extra cash.',
    });
  }

  if (child_benefit) {
    const cb = CHILD_BENEFIT.monthlyFor(4);
    lines.push({
      id: 'child_benefit',
      label: 'Child Benefit (4 children)',
      kind: 'child_benefit',
      monthly: cb,
      included: true,
      attaches_to: 'household',
      eligibility: 'HMRC Child Benefit — not in DWP Benefits Bill totals',
      source: `HMRC 2026/27 · eldest £${CHILD_BENEFIT.eldest_weekly} + 3 × £${CHILD_BENEFIT.additional_weekly} /wk × 52/12`,
      note: `Arithmetic: (${CHILD_BENEFIT.eldest_weekly} + 3×${CHILD_BENEFIT.additional_weekly}) × 52/12 = ${cb}`,
    });
  }

  lines.push({
    id: 'housing',
    label: 'Housing costs (UC housing element / HB)',
    kind: 'housing',
    monthly: null,
    included: false,
    attaches_to: 'household',
    eligibility: 'Depends on rent, LHA/social rent, tenure — not a fixed national rate',
    source: 'Not a fixed GOV.UK rate',
    note: 'Omitted from fixed totals. Rent support is real but case-specific.',
  });

  const total_monthly =
    Math.round(
      lines
        .filter((l) => l.included && l.monthly != null)
        .reduce((s, l) => s + (l.monthly as number), 0) * 100,
    ) / 100;

  return {
    id: 'couple-4-children',
    title: 'Couple + 4 children (worked example)',
    summary:
      'One joint UC claim, optional disability/carer add-ons, Child Benefit. Housing rent support not fixed.',
    adults: 2,
    children: 4,
    assumptions: [
      'Both adults aged 25+',
      'One joint Universal Credit claim (not two UC awards)',
      'Four dependent children, all born on/after 6 Apr 2017',
      'Two-child limit abolished from 6 Apr 2026 — four child elements included',
      'No earned income / no work allowance interaction modelled',
      'Housing element omitted (rent-specific)',
      'Childcare costs element omitted unless working and paying childcare',
      'Benefit Cap may limit some UC awards — shown as a separate rule, not auto-applied',
      ratesYearNote(),
    ],
    lines,
    total_monthly,
    total_excludes: [
      'Actual rent / UC housing element',
      'Council Tax Support (local scheme)',
      'Free school meals / passported help',
      'Any earnings taper',
      'Benefit Cap reduction (may apply to UC)',
    ],
  };
}

function ratesYearNote() {
  return `Statutory rates are ${RATES_YEAR} from DWP/HMRC publications (not Birmingham averages).`;
}

/** Catalogue of payments that *can* accrue — for the index tab. */
export const PAYMENT_CATALOGUE: {
  id: string;
  name: string;
  unit: string;
  stacks_with_uc: string;
  in_statxplore_means: boolean;
  in_bham_bill: boolean;
  person_or_household: 'household' | 'person' | 'either';
  notes: string;
}[] = [
  {
    id: 'uc',
    name: 'Universal Credit',
    unit: 'One claim per household (couple = joint claim)',
    stacks_with_uc: '— (this is UC)',
    in_statxplore_means: true,
    in_bham_bill: true,
    person_or_household: 'household',
    notes: 'Standard + child + housing + LCWRA + carer + childcare elements',
  },
  {
    id: 'pip',
    name: 'Personal Independence Payment',
    unit: 'Per disabled adult (not means-tested)',
    stacks_with_uc: 'Usually ignored as income for UC',
    in_statxplore_means: true,
    in_bham_bill: true,
    person_or_household: 'person',
    notes: 'Daily living + mobility; both adults can qualify separately',
  },
  {
    id: 'dla_child',
    name: 'DLA (child) / child disability',
    unit: 'Per disabled child under PIP age',
    stacks_with_uc: 'Can unlock UC disabled child addition',
    in_statxplore_means: true,
    in_bham_bill: true,
    person_or_household: 'person',
    notes: 'Children usually claim DLA, not PIP',
  },
  {
    id: 'ca',
    name: "Carer's Allowance",
    unit: 'Per carer (earnings rules)',
    stacks_with_uc: 'Overlaps with UC carer element — not free double-count',
    in_statxplore_means: true,
    in_bham_bill: true,
    person_or_household: 'person',
    notes: '35+ hours care; interaction with UC is complex',
  },
  {
    id: 'cb',
    name: 'Child Benefit',
    unit: 'Per family (HMRC)',
    stacks_with_uc: 'Separate; high-income charge may apply',
    in_statxplore_means: false,
    in_bham_bill: false,
    person_or_household: 'household',
    notes: 'Not in DWP LA expenditure tables',
  },
  {
    id: 'hb',
    name: 'Housing Benefit',
    unit: 'Legacy / specific cases',
    stacks_with_uc: 'Usually not with UC housing element for same rent',
    in_statxplore_means: true,
    in_bham_bill: true,
    person_or_household: 'household',
    notes: 'Most working-age renters get housing via UC, not HB',
  },
  {
    id: 'esa',
    name: 'ESA (legacy)',
    unit: 'Legacy incapacity',
    stacks_with_uc: 'Migrating to UC',
    in_statxplore_means: true,
    in_bham_bill: true,
    person_or_household: 'person',
    notes: 'Not typical for a new full-UC household model',
  },
  {
    id: 'aa',
    name: 'Attendance Allowance',
    unit: 'State-pension-age disability',
    stacks_with_uc: 'Different life stage',
    in_statxplore_means: true,
    in_bham_bill: true,
    person_or_household: 'person',
    notes: 'Not for working-age couple+children scenario',
  },
];
