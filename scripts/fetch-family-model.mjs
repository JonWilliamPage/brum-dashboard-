#!/usr/bin/env node
/**
 * Family Support Model — ILLUSTRATIVE entitlement stack + Birmingham observed means.
 *
 *   • Statutory rates: GOV.UK DWP/HMRC 2026/27 (coded in lib/family-support-rates.ts)
 *   • Observed: Stat-Xplore UC household means by family type (uc-payments proposal)
 *   • City context: Benefits Bill UC/PIP/CA/HB lines (benefits-bill proposal)
 *
 * NOT a real household. NOT ward-level. Derived scenario totals labelled.
 *
 * Writes proposals/family-model.proposal.json only.
 * Run: node scripts/fetch-family-model.mjs
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
// Compile-free: re-implement scenario arithmetic here from the same published rates
// (mirrors lib/family-support-rates.ts — keep in sync).

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'proposals', 'family-model.proposal.json');

const RATES_YEAR = '2026/27';
const RATES_URL = 'https://www.gov.uk/universal-credit/what-youll-get';
const RATES_TABLE_URL =
  'https://www.gov.uk/government/publications/benefit-and-pension-rates-2026-to-2027';
const CB_URL = 'https://www.gov.uk/child-benefit/what-youll-get';
const CB_RATES_URL =
  'https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance';
const TWO_CHILD_URL =
  'https://www.gov.uk/guidance/universal-credit-and-families-with-more-than-2-children-information-for-claimants';
const CAP_URL = 'https://www.gov.uk/benefit-cap/benefit-cap-amounts';
const CAP_EXEMPT_URL = 'https://www.gov.uk/benefit-cap/when-youre-not-affected';
const CAP_AFFECTED_URL = 'https://www.gov.uk/benefit-cap/benefits-that-are-capped';
const PIP_URL = 'https://www.gov.uk/pip/how-much-youll-get';

const weekToMonth = (w) => Math.round(((w * 52) / 12) * 100) / 100;

/** Official 2026/27 rates (monthly unless noted). Child element is £303.94/child/mo on GOV.UK. */
const UC = {
  couple_25: 666.97,
  child: 303.94, // official monthly child element — not invented
  lcwra: 429.8,
  carer: 209.34,
  disabled_child_higher: 514.71,
};
const PIP_MAX_M = weekToMonth(114.6 + 80);
const CA_M = weekToMonth(86.45);
const CB_FIRST_WK = 27.05;
const CB_OTHER_WK = 17.9;
const CB_4_M = weekToMonth(CB_FIRST_WK + 3 * CB_OTHER_WK);
const CAP_COUPLE_M = 1835.0;

function line(id, label, kind, monthly, included, attaches, eligibility, source, note, catalogueUrl) {
  return {
    id,
    label,
    kind,
    monthly,
    included,
    attaches_to: attaches,
    eligibility,
    source,
    note,
    catalogueUrl: catalogueUrl || null,
  };
}

function buildScenario(flags) {
  const lines = [];
  lines.push(
    line(
      'uc_standard',
      'UC standard allowance (couple, one or both 25+)',
      'uc_element',
      UC.couple_25,
      true,
      'household',
      'One joint UC claim — mother and father do not each get a full separate UC award',
      `DWP · GOV.UK What you'll get · ${RATES_YEAR}`,
      'Official monthly rate for couple where one or both are 25+',
      RATES_URL,
    ),
  );
  const childTot = Math.round(UC.child * 4 * 100) / 100;
  lines.push(
    line(
      'uc_children',
      `UC child element × 4 (4 × £${UC.child})`,
      'uc_element',
      childTot,
      true,
      'household',
      `Official rate £${UC.child}/child/month × 4 children. Two-child limit abolished 6 Apr 2026 — every child can attract this element.`,
      `DWP · GOV.UK · ${RATES_YEAR} · arithmetic 4 × £${UC.child}`,
      `Rate is real (£${UC.child}/mo). “4×” is just count × official rate = £${childTot}. Not the same as Child Benefit.`,
      RATES_URL,
    ),
  );
  if (flags.disabled_child) {
    lines.push(
      line(
        'uc_disabled_child',
        'UC disabled child addition (higher)',
        'uc_element',
        UC.disabled_child_higher,
        true,
        'child',
        'One child meets higher disabled child rules (e.g. higher-rate DLA/PIP daily living)',
        `DWP · GOV.UK · ${RATES_YEAR}`,
        'Extra on top of the basic child element for that child',
        RATES_URL,
      ),
    );
  }
  if (flags.lcwra) {
    lines.push(
      line(
        'uc_lcwra',
        'UC LCWRA (one adult)',
        'uc_element',
        UC.lcwra,
        true,
        'adult_1',
        'Limited capability for work and work-related activity',
        `DWP · GOV.UK · ${RATES_YEAR}`,
        'Also an exemption route from the benefit cap when UC is paid for LCWRA',
        RATES_URL,
      ),
    );
  }
  if (flags.carer_uc) {
    lines.push(
      line(
        'uc_carer',
        'UC carer element',
        'uc_element',
        UC.carer,
        true,
        'adult_2',
        '35+ hours/week care for someone on a qualifying disability benefit',
        `DWP · GOV.UK · ${RATES_YEAR}`,
        'Do not naively add full Carer’s Allowance on top as free extra cash',
        RATES_URL,
      ),
    );
  }
  if (flags.pip1) {
    lines.push(
      line(
        'pip1',
        'PIP adult 1 (enhanced daily living + enhanced mobility)',
        'disability',
        PIP_MAX_M,
        true,
        'adult_1',
        'Non-means-tested personal award — not part of the UC calculation as income in the usual way',
        `DWP PIP rates · (£114.60+£80)/wk × 52/12`,
        'PIP is outside the benefit-cap “capped benefits” list; a household with PIP is also exempt from the cap',
        PIP_URL,
      ),
    );
  }
  if (flags.pip2) {
    lines.push(
      line(
        'pip2',
        'PIP adult 2 (enhanced daily living + enhanced mobility)',
        'disability',
        PIP_MAX_M,
        true,
        'adult_2',
        'Second adult also on max PIP — rare dual-max case; used as a ceiling',
        `DWP PIP rates · ${RATES_YEAR}`,
        'Confirms high stack can still be a legal package when disability awards exist',
        PIP_URL,
      ),
    );
  }
  if (flags.ca) {
    lines.push(
      line(
        'ca',
        "Carer's Allowance",
        'carer',
        CA_M,
        true,
        'adult_2',
        'May offset UC carer element — not free double pay',
        `DWP rates · £86.45/wk × 52/12`,
        'Interaction: CA is usually treated as income against UC',
        'https://www.gov.uk/carers-allowance/what-youll-get',
      ),
    );
  }
  if (flags.cb) {
    lines.push(
      line(
        'cb',
        `Child Benefit (4 children) — HMRC, not UC`,
        'child_benefit',
        CB_4_M,
        true,
        'household',
        `Separate HMRC benefit. Weekly: £${CB_FIRST_WK} eldest + £${CB_OTHER_WK} each other child. Never limited by the two-child UC rule.`,
        `HMRC · (£${CB_FIRST_WK}+3×£${CB_OTHER_WK})/wk × 52/12 = £${CB_4_M}/mo`,
        'Child Benefit ≠ UC child element. You can claim both (subject to High Income Child Benefit Charge rules).',
        CB_URL,
      ),
    );
  }
  lines.push(
    line(
      'housing',
      'Housing (UC housing element / rent)',
      'housing',
      null,
      false,
      'household',
      'Case-specific rent / LHA — not a fixed national rate',
      '—',
      'Omitted from totals so the stack stays comparable',
      'https://www.gov.uk/housing-and-universal-credit',
    ),
  );

  const total = Math.round(
    lines.filter((l) => l.included && l.monthly != null).reduce((s, l) => s + l.monthly, 0) * 100,
  ) / 100;
  const ucOnly = Math.round(
    lines
      .filter((l) => l.included && l.kind === 'uc_element' && l.monthly != null)
      .reduce((s, l) => s + l.monthly, 0) * 100,
  ) / 100;

  return { lines, total_monthly: total, uc_only_monthly: ucOnly };
}

function main() {
  const ucPayPath = join(ROOT, 'proposals', 'uc-payments.proposal.json');
  const billPath = join(ROOT, 'proposals', 'benefits-bill.proposal.json');
  if (!existsSync(ucPayPath)) {
    console.error('Run scripts/fetch-uc-payments.mjs first');
    process.exit(1);
  }
  const ucPay = JSON.parse(readFileSync(ucPayPath, 'utf8'));
  const bill = existsSync(billPath) ? JSON.parse(readFileSync(billPath, 'utf8')) : null;

  const observed = {
    as_of: ucPay.as_of,
    city_mean_payment_gbp: ucPay.city.latest_mean_payment_gbp,
    city_households: ucPay.city.latest_households,
    by_family_type: (ucPay.family_types || []).map((f) => ({
      family_type: f.family_type,
      households: f.households,
      mean_payment_gbp: f.mean_payment_gbp,
    })),
    couple_with_children_mean_gbp:
      (ucPay.family_types || []).find((f) => /Couple, with children/i.test(f.family_type))
        ?.mean_payment_gbp ?? null,
    couple_with_children_households:
      (ucPay.family_types || []).find((f) => /Couple, with children/i.test(f.family_type))
        ?.households ?? null,
    source: 'Stat-Xplore UC_Households · MEAN Payment Amount · Birmingham LA',
  };

  const bill_context = bill
    ? {
        year: bill.year,
        lines: (bill.lines || [])
          .filter((l) => ['uc', 'pip', 'ca', 'hb', 'dla', 'esa'].includes(l.id))
          .map((l) => ({ id: l.id, label: l.label, amount_m: l.amount_m })),
        note: 'City-wide annual accounts — not per household',
      }
    : null;

  // A) Observed anchor — couple with children mean UC payment (Birmingham)
  // B) Core statutory UC for couple+4 (no disability)
  // C) "High support" statutory stack
  const core = buildScenario({
    lcwra: false,
    carer_uc: false,
    ca: false,
    pip1: false,
    pip2: false,
    disabled_child: false,
    cb: true,
  });
  const high = buildScenario({
    lcwra: true,
    carer_uc: true,
    ca: false, // avoid naive double-count with carer element
    pip1: true,
    pip2: true,
    disabled_child: true,
    cb: true,
  });
  // Max cash-ish if someone claims CA *instead of counting it free on top of carer element*
  const high_with_ca_note = buildScenario({
    lcwra: true,
    carer_uc: true,
    ca: true,
    pip1: true,
    pip2: true,
    disabled_child: true,
    cb: true,
  });

  const scenarios = [
    {
      id: 'observed-couple-children',
      title: 'Observed: Birmingham couples with children (UC only)',
      kind: 'observed_mean',
      description:
        'Real Stat-Xplore mean Payment Amount for family type “Couple, with children” in Birmingham LA. Mix of family sizes, housing, disability — not specifically 4 children.',
      monthly_total: observed.couple_with_children_mean_gbp,
      households: observed.couple_with_children_households,
      lines: [
        {
          id: 'uc_mean',
          label: 'Mean UC payment (all elements combined)',
          kind: 'observed',
          monthly: observed.couple_with_children_mean_gbp,
          included: true,
          attaches_to: 'household',
          eligibility: 'Households recorded as Couple, with children on UC',
          source: observed.source,
          note: `${observed.couple_with_children_households?.toLocaleString()} households · ${observed.as_of}`,
        },
      ],
      total_excludes: ['PIP', 'Child Benefit', 'Housing split', 'Any non-UC benefit'],
    },
    {
      id: 'statutory-core-couple-4',
      title: 'Statutory core: couple 25+ · 4 children · UC + Child Benefit',
      kind: 'statutory_core',
      description:
        'What you can claim if eligible: one UC couple standard + official child element for each of 4 children + HMRC Child Benefit. No disability, no carer, no housing. Rates are statutory; total is sum of those rates.',
      ...core,
      monthly_total: core.total_monthly,
      assumptions: [
        'Joint UC claim (one household award)',
        'Both 25+',
        '4 children each attract the official UC child element of £303.94/mo',
        'HMRC Child Benefit for 4 (separate from UC)',
        'No LCWRA / carer / PIP / disabled child',
        'Housing omitted (rent is case-specific)',
      ],
      total_excludes: ['Rent/housing element', 'PIP', 'Carer', 'Childcare costs element'],
      benefit_cap_monthly: CAP_COUPLE_M,
      benefit_cap_note:
        `Rest of GB couple/with-children cap is £${CAP_COUPLE_M}/mo. This core stack’s UC+Child Benefit can hit the cap if the household is not exempt. PIP is not in this scenario — without a disability/carer exemption the cap can reduce UC.`,
      cap_applies_if_no_exemption: true,
      cap_exempt_reason: null,
    },
    {
      id: 'statutory-high-couple-4',
      title: 'Statutory high-support stack (eligibility assumed)',
      kind: 'statutory_high',
      description:
        'Ceiling if many eligibility rules are met at once: core UC + disabled-child addition + LCWRA + carer element + max PIP on both adults + Child Benefit. Rare — not a typical family. Housing omitted. Carer’s Allowance not double-counted.',
      ...high,
      monthly_total: high.total_monthly,
      assumptions: [
        'All high-support eligibility conditions met',
        'Both adults on enhanced PIP daily living + mobility',
        'One adult LCWRA; one adult carer on UC carer element',
        'One child higher disabled child addition',
        'CA not added on top (would usually offset UC)',
        'Because someone gets PIP, the household is exempt from the benefit cap (GOV.UK)',
      ],
      total_excludes: ['Housing', 'Childcare costs', 'CA double-count'],
      benefit_cap_monthly: CAP_COUPLE_M,
      benefit_cap_note:
        `Possible stack: PIP is not counted toward the cap, and a household where you/partner/child gets PIP is not affected by the cap at all. So this high stack can legally exceed £${CAP_COUPLE_M}/mo without the cap cutting UC — provided the PIP (and other) awards are real.`,
      cap_applies_if_no_exemption: false,
      cap_exempt_reason:
        'PIP in the household (also LCWRA / carer element are separate exemption routes)',
    },
  ];

  // Comparison maths for UI
  const comparisons = {
    observed_vs_core_uc: {
      formula: 'statutory UC-only (core without CB) − observed couple-with-children mean',
      observed_mean: observed.couple_with_children_mean_gbp,
      statutory_uc_only: core.uc_only_monthly,
      difference:
        observed.couple_with_children_mean_gbp != null
          ? Math.round((core.uc_only_monthly - observed.couple_with_children_mean_gbp) * 100) / 100
          : null,
      note: 'Core UC-only is for exactly 4 children; observed mean averages all couple-with-children households (1+ children, mixed housing/disability). Not like-for-like.',
    },
    high_total: high.total_monthly,
    high_with_naive_ca: high_with_ca_note.total_monthly,
    naive_ca_warning:
      'Adding full Carer’s Allowance on top of UC carer element overstates cash — CA usually reduces UC.',
  };

  const catalogue = [
    {
      id: 'uc',
      name: 'Universal Credit',
      person_or_household: 'household',
      stacks: 'One claim per couple',
      bham_data: 'Stat-Xplore means + Benefits Bill £',
    },
    {
      id: 'pip',
      name: 'PIP',
      person_or_household: 'person',
      stacks: 'Usually ignored as UC income',
      bham_data: 'Bill £; caseload by ward; mean awards via Stat-Xplore',
    },
    {
      id: 'ca',
      name: "Carer's Allowance",
      person_or_household: 'person',
      stacks: 'Interacts with UC carer element',
      bham_data: 'Benefits Bill £',
    },
    {
      id: 'cb',
      name: 'Child Benefit',
      person_or_household: 'household',
      stacks: 'HMRC separate',
      bham_data: 'Rates only (not in DWP Bill)',
    },
    {
      id: 'hb',
      name: 'Housing Benefit / UC housing',
      person_or_household: 'household',
      stacks: 'Rent-specific',
      bham_data: 'Bill HB £; not fixed per family',
    },
  ];

  const proposal = {
    id: 'family-model',
    status: 'pending',
    title: 'Family Support Model — illustrative rates + Birmingham UC means',
    metric: 'Statutory monthly entitlement stack + observed UC mean by family type',
    unit: '£ per month (illustrative) / £ mean payment (observed)',
    geography: 'rates=national; observed means=Birmingham LA',
    generated: new Date().toISOString(),
    as_of: observed.as_of,
    rates_year: RATES_YEAR,
    source: {
      as_of: observed.as_of,
      label: 'DWP/HMRC rates + Stat-Xplore UC households',
      publisher: 'Department for Work & Pensions / HMRC',
    },
    rates_explainer: {
      uc_child_element_month: UC.child,
      child_benefit_first_week: CB_FIRST_WK,
      child_benefit_other_week: CB_OTHER_WK,
      two_child_limit:
        'The two-child limit restricted the UC child element to (usually) two children. It was abolished on 6 April 2026. It never limited Child Benefit.',
      derived_means:
        '“4 × £303.94” is official rate × number of children (arithmetic). The £303.94 figure itself is the published statutory monthly child element — not an estimate.',
      benefit_cap_couple_month: CAP_COUPLE_M,
      pip_and_cap:
        'PIP is not in the list of benefits that count toward the cap. If you, your partner or a child under 18 gets PIP, the household is not affected by the cap.',
    },
    sources: [
      {
        id: 'dwpUcWhatYoullGet',
        label: 'Universal Credit — what you’ll get (incl. £303.94 child element)',
        publisher: 'Department for Work & Pensions',
        dataset: 'GOV.UK UC guide',
        method: 'statutory monthly rates',
        licence: 'Open Government Licence v3.0',
        as_of: RATES_YEAR,
        catalogueUrl: RATES_URL,
        apiUrl: RATES_URL,
      },
      {
        id: 'dwpRatesTable',
        label: `Benefit and pension rates ${RATES_YEAR}`,
        publisher: 'Department for Work & Pensions',
        dataset: 'Benefit and pension rates 2026 to 2027',
        method: 'statutory rates table',
        licence: 'Open Government Licence v3.0',
        as_of: RATES_YEAR,
        catalogueUrl: RATES_TABLE_URL,
        apiUrl: RATES_TABLE_URL,
      },
      {
        id: 'hmrcChildBenefit',
        label: 'Child Benefit — what you’ll get',
        publisher: 'HM Revenue & Customs',
        dataset: 'GOV.UK Child Benefit rates',
        method: 'statutory weekly rates',
        licence: 'Open Government Licence v3.0',
        as_of: '2026/27',
        catalogueUrl: CB_URL,
        apiUrl: CB_RATES_URL,
      },
      {
        id: 'twoChildLimit',
        label: 'Two-child limit ended 6 April 2026 (UC child element)',
        publisher: 'Department for Work & Pensions',
        dataset: 'UC families with more than 2 children',
        method: 'policy guidance',
        licence: 'Open Government Licence v3.0',
        as_of: 'April 2026',
        catalogueUrl: TWO_CHILD_URL,
        apiUrl: TWO_CHILD_URL,
      },
      {
        id: 'benefitCap',
        label: 'Benefit cap amounts (Rest of GB couple £1,835/mo)',
        publisher: 'Department for Work & Pensions',
        dataset: 'Benefit cap',
        method: 'statutory cap',
        licence: 'Open Government Licence v3.0',
        as_of: RATES_YEAR,
        catalogueUrl: CAP_URL,
        apiUrl: CAP_AFFECTED_URL,
      },
      {
        id: 'benefitCapExempt',
        label: 'When you’re not affected by the benefit cap (incl. PIP)',
        publisher: 'Department for Work & Pensions',
        dataset: 'Benefit cap exemptions',
        method: 'statutory rules',
        licence: 'Open Government Licence v3.0',
        as_of: RATES_YEAR,
        catalogueUrl: CAP_EXEMPT_URL,
        apiUrl: CAP_EXEMPT_URL,
      },
      {
        id: 'pipRates',
        label: 'PIP — how much you’ll get',
        publisher: 'Department for Work & Pensions',
        dataset: 'PIP rates',
        method: 'statutory weekly rates',
        licence: 'Open Government Licence v3.0',
        as_of: RATES_YEAR,
        catalogueUrl: PIP_URL,
        apiUrl: PIP_URL,
      },
      {
        id: 'statxploreUcHouseholds',
        label: 'Birmingham UC household means by family type',
        publisher: 'Department for Work & Pensions',
        dataset: 'UC_Households via uc-payments proposal',
        method: 'administrative MEAN Payment Amount',
        licence: 'Open Government Licence v3.0',
        as_of: observed.as_of,
        catalogueUrl: 'https://stat-xplore.dwp.gov.uk/',
        apiUrl: 'https://stat-xplore.dwp.gov.uk/webapi/rest/v1',
      },
      {
        id: 'benefitsBillContext',
        label: 'Birmingham benefit expenditure (context)',
        publisher: 'Department for Work & Pensions',
        dataset: 'benefit-expenditure-by-local-authority',
        method: 'annual accounts — city totals not household',
        licence: 'Open Government Licence v3.0',
        as_of: bill?.year ?? '—',
        catalogueUrl:
          'https://www.gov.uk/government/publications/benefit-expenditure-and-caseload-tables-2025',
        apiUrl:
          'https://assets.publishing.service.gov.uk/media/693ffb536a12691d48491fb3/benefit-expenditure-by-local-authority-2024-25.ods',
      },
    ],
    framing: {
      what_this_is:
        'An illustrative model of which state payments can accrue to a family, using official rates and Birmingham observed UC means.',
      what_this_is_not:
        'Not a real household. Not linked microdata. Not advice. Not “what every couple with four children gets.”',
      key_rule:
        'A couple has ONE Universal Credit claim — mother and father do not each receive a full separate UC standard allowance.',
    },
    observed,
    bill_context,
    catalogue,
    scenarios,
    comparisons,
    method_notes: [
      'Weekly benefits converted to monthly as × 52 / 12.',
      'UC child element £303.94/mo is the official published rate; 4× is arithmetic for a 4-child household.',
      'Child Benefit is a separate HMRC payment (weekly rates) — not the UC child element.',
      'Two-child limit (abolished 6 Apr 2026) only limited UC child elements, not Child Benefit.',
      'Benefit cap: Rest of GB couple/with children £1,835/mo. PIP does not count toward the cap; a household with PIP is exempt from the cap entirely.',
      'High stack with dual max PIP is therefore a possible legal package without cap cut — rare eligibility, not typical.',
      'UC housing element omitted — depends on actual rent.',
      'Carer’s Allowance + UC carer element must not be naively summed as extra cash.',
      'Observed couple-with-children mean is not conditioned on exactly four children.',
    ],
    validation: {
      complete: observed.couple_with_children_mean_gbp != null && scenarios.length === 3,
      rates_year: RATES_YEAR,
      observed_as_of: observed.as_of,
      scenarios: scenarios.length,
      core_total: core.total_monthly,
      high_total: high.total_monthly,
      observed_couple_children_mean: observed.couple_with_children_mean_gbp,
      note: 'Illustrative model. Checksums are arithmetic on published rates, not admin reconciliation of a real claim.',
    },
  };

  writeFileSync(OUT, JSON.stringify(proposal, null, 2));
  console.log(`[family-model] wrote ${OUT}`);
  console.log(`  observed couple+children mean UC £${observed.couple_with_children_mean_gbp}`);
  console.log(`  statutory core (UC+CB) £${core.total_monthly}/mo · UC-only £${core.uc_only_monthly}`);
  console.log(`  statutory high stack £${high.total_monthly}/mo`);
}

main();
