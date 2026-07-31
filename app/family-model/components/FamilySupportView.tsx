'use client';

import { useMemo, useState } from 'react';

/**
 * Family Support Model — ILLUSTRATIVE.
 * Combines official GOV.UK rates with Birmingham Stat-Xplore UC means.
 * Never claims a real household received the stacked total.
 */

export type FamilyModelData = {
  as_of: string;
  rates_year: string;
  rates_explainer?: {
    uc_child_element_month: number;
    child_benefit_first_week: number;
    child_benefit_other_week: number;
    two_child_limit: string;
    derived_means: string;
    benefit_cap_couple_month: number;
    pip_and_cap: string;
  };
  sources: {
    label: string;
    publisher: string;
    dataset?: string;
    licence: string;
    as_of: string;
    catalogueUrl: string;
    method?: string;
  }[];
  framing: { what_this_is: string; what_this_is_not: string; key_rule: string };
  observed: {
    as_of: string;
    city_mean_payment_gbp: number;
    city_households: number;
    by_family_type: {
      family_type: string;
      households: number;
      mean_payment_gbp: number;
    }[];
    couple_with_children_mean_gbp: number | null;
    couple_with_children_households: number | null;
    source: string;
  };
  bill_context: {
    year: string;
    lines: { id: string; label: string; amount_m: number }[];
    note: string;
  } | null;
  catalogue: {
    id: string;
    name: string;
    person_or_household: string;
    stacks: string;
    bham_data: string;
  }[];
  scenarios: {
    id: string;
    title: string;
    kind: string;
    description: string;
    monthly_total?: number;
    households?: number | null;
    lines: {
      id: string;
      label: string;
      kind: string;
      monthly: number | null;
      included: boolean;
      attaches_to: string;
      eligibility: string;
      source: string;
      note?: string | null;
      catalogueUrl?: string | null;
    }[];
    total_monthly?: number;
    uc_only_monthly?: number;
    assumptions?: string[];
    total_excludes?: string[];
    benefit_cap_monthly?: number;
    benefit_cap_note?: string;
    cap_applies_if_no_exemption?: boolean;
    cap_exempt_reason?: string | null;
  }[];
  comparisons: {
    observed_vs_core_uc: {
      formula: string;
      observed_mean: number | null;
      statutory_uc_only: number;
      difference: number | null;
      note: string;
    };
    high_total: number;
    high_with_naive_ca: number;
    naive_ca_warning: string;
  };
  method_notes?: string[];
};

type Sub = 'story' | 'stack' | 'catalogue' | 'workings';

const KIND_COLOR: Record<string, string> = {
  uc_element: '#2a55bf',
  disability: '#b01225',
  carer: '#d99a00',
  child_benefit: '#1f7a33',
  housing: '#8a8f99',
  observed: '#16306f',
  cap: '#5b2a23',
};

function fmtGbp(n: number | null | undefined, dig = 2) {
  if (n == null || Number.isNaN(n)) return '—';
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: dig, maximumFractionDigits: dig })}`;
}
function fmtN(n: number | null | undefined) {
  if (n == null) return '—';
  return Math.round(n).toLocaleString('en-GB');
}
function fmtM(m: number) {
  return m >= 1000 ? `£${(m / 1000).toFixed(2)}bn` : `£${m.toFixed(m < 10 ? 1 : 0)}m`;
}

function Calc({
  title,
  formula,
  rows,
}: {
  title: string;
  formula: string;
  rows: { k: string; v: string; s?: string }[];
}) {
  return (
    <div className="ucp-calc" role="note">
      <div className="ucp-calc-ttl">{title}</div>
      <div className="ucp-calc-formula">
        <span className="ucp-calc-k">Formula</span> {formula}
      </div>
      <table className="ucp-calc-table">
        <tbody>
          {rows.map((r) => (
            <tr key={r.k}>
              <td className="ucp-calc-lbl">{r.k}</td>
              <td className="ucp-calc-val">{r.v}</td>
              <td className="ucp-calc-src">{r.s ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FamilySupportView({ data }: { data: FamilyModelData }) {
  const [sub, setSub] = useState<Sub>('story');
  const [scenarioId, setScenarioId] = useState('statutory-high-couple-4');

  const scenario = useMemo(
    () => data.scenarios.find((s) => s.id === scenarioId) ?? data.scenarios[0],
    [data.scenarios, scenarioId],
  );

  const total =
    scenario.monthly_total ??
    scenario.total_monthly ??
    scenario.lines
      .filter((l) => l.included && l.monthly != null)
      .reduce((s, l) => s + (l.monthly as number), 0);

  const included = scenario.lines.filter((l) => l.included && l.monthly != null);
  const maxLine = Math.max(...included.map((l) => l.monthly as number), 1);

  const obs = data.observed;
  const coupleMean = obs.couple_with_children_mean_gbp;
  const core = data.scenarios.find((s) => s.id === 'statutory-core-couple-4');
  const high = data.scenarios.find((s) => s.id === 'statutory-high-couple-4');

  return (
    <div className="body">
      <div className="lcol">
        <div className="hb-nowward" role="note">
          <span className="hb-nowward-tag">
            ◇ ILLUSTRATIVE MODEL · STATUTORY RATES + BIRMINGHAM UC MEANS · NOT A REAL HOUSEHOLD
          </span>
          <p>
            {data.framing.what_this_is} <strong>{data.framing.key_rule}</strong>{' '}
            {data.framing.what_this_is_not} Rates year: <strong>{data.rates_year}</strong>. Observed
            UC means: Birmingham LA · {data.as_of}.
          </p>
        </div>

        <div className="sub-tab-bar">
          {(
            [
              ['story', 'The Story'],
              ['stack', 'Family stack'],
              ['catalogue', 'What can stack'],
              ['workings', 'All numbers'],
            ] as [Sub, string][]
          ).map(([s, lbl]) => (
            <button
              key={s}
              className={`sub-tab${sub === s ? ' active' : ''}`}
              onClick={() => setSub(s)}
            >
              {lbl}
            </button>
          ))}
        </div>

        <div className="panel" style={{ flex: 1, position: 'relative' }}>
          <div className="panel-body" style={{ padding: '16px 18px' }}>
            {sub === 'story' && (
              <>
                <p className="bill-story-headline" style={{ marginBottom: 10 }}>
                  What <em>can</em> a family claim — and what do Birmingham couples with children{' '}
                  <em>actually</em> receive on UC?
                </p>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55, maxWidth: '48rem' }}>
                  We do not have linked household microdata. So this view is honest about two layers:{' '}
                  <strong>observed means</strong> (real Stat-Xplore) and <strong>statutory rates</strong>{' '}
                  (GOV.UK rules if eligible). Adding every max rate is a ceiling for a rare eligibility
                  mix — not a typical award.
                </p>

                <div className="bill-kpi-grid" style={{ marginTop: 14 }}>
                  <div className="bill-kpi">
                    <div className="bill-kpi-k">Observed · couple with children</div>
                    <div className="bill-kpi-v bill-kpi-accent">{fmtGbp(coupleMean)}</div>
                    <div className="bill-kpi-note">
                      Mean UC payment / mo · {fmtN(obs.couple_with_children_households)} Bham
                      households · {obs.as_of}
                    </div>
                  </div>
                  <div className="bill-kpi">
                    <div className="bill-kpi-k">Statutory core · couple + 4 kids</div>
                    <div className="bill-kpi-v">{fmtGbp(core?.total_monthly ?? core?.monthly_total)}</div>
                    <div className="bill-kpi-note">
                      UC standard + 4× child element + Child Benefit · no disability · no housing
                    </div>
                  </div>
                  <div className="bill-kpi">
                    <div className="bill-kpi-k">Statutory high stack</div>
                    <div className="bill-kpi-v">{fmtGbp(high?.total_monthly ?? high?.monthly_total)}</div>
                    <div className="bill-kpi-note">
                      + LCWRA + carer element + disabled child + max PIP ×2 + CB · housing still out
                    </div>
                  </div>
                  <div className="bill-kpi">
                    <div className="bill-kpi-k">Benefit Cap (RoGB couple)</div>
                    <div className="bill-kpi-v" style={{ fontSize: 20 }}>
                      {fmtGbp(1835, 0)}
                    </div>
                    <div className="ucp-context-warn">
                      May cut UC · PIP usually excluded · not auto-applied to stacks
                    </div>
                  </div>
                </div>

                <Calc
                  title="Hero figures — where the numbers come from"
                  formula="Observed = Stat-Xplore MEAN · Core/High = sum of official monthly rates"
                  rows={[
                    {
                      k: 'Observed couple+children',
                      v: `${fmtGbp(coupleMean)} = MEAN Payment Amount`,
                      s: `UC_Households · ${fmtN(obs.couple_with_children_households)} hh · not only 4-child families`,
                    },
                    {
                      k: 'UC child element (official)',
                      v: `£${data.rates_explainer?.uc_child_element_month ?? 303.94} / child / month`,
                      s: 'GOV.UK Universal Credit — what you’ll get',
                    },
                    {
                      k: 'Core UC-only (no Child Benefit)',
                      v: `${fmtGbp(data.comparisons.observed_vs_core_uc.statutory_uc_only)} = £666.97 + 4×£303.94`,
                      s: 'Official rates: couple standard + 4 child elements',
                    },
                    {
                      k: 'Core + Child Benefit (HMRC)',
                      v: fmtGbp(core?.total_monthly ?? core?.monthly_total),
                      s: 'UC above + Child Benefit for 4 (separate weekly rates)',
                    },
                    {
                      k: 'High stack MAX total',
                      v: fmtGbp(data.comparisons.high_total),
                      s: 'Ceiling if disability/carer eligibility met — see Family stack',
                    },
                    {
                      k: 'Why observed < core UC-only',
                      v:
                        data.comparisons.observed_vs_core_uc.difference != null
                          ? `Core UC-only − observed = ${fmtGbp(data.comparisons.observed_vs_core_uc.difference)}`
                          : '—',
                      s: data.comparisons.observed_vs_core_uc.note,
                    },
                  ]}
                />

                <div className="bill-sec-ttl" style={{ marginTop: 18 }}>
                  Birmingham UC means by family type (real admin data)
                </div>
                {obs.by_family_type
                  .filter((f) => !/^Total$/i.test(f.family_type))
                  .map((f) => {
                    const maxM = Math.max(
                      ...obs.by_family_type.map((x) => x.mean_payment_gbp || 0),
                      1,
                    );
                    return (
                      <div key={f.family_type} className="hb-row" style={{ padding: '5px 0' }}>
                        <div className="hb-name" style={{ fontSize: 13 }}>{f.family_type}</div>
                        <div className="hb-track" style={{ height: 18 }}>
                          <div
                            className="hb-bar"
                            style={{
                              height: 18,
                              width: `${((f.mean_payment_gbp || 0) / maxM) * 100}%`,
                              background: '#2a55bf',
                            }}
                          />
                          <span className="hb-val">
                            {fmtGbp(f.mean_payment_gbp)} · {fmtN(f.households)} hh
                          </span>
                        </div>
                      </div>
                    );
                  })}
                <Calc
                  title="Family-type chart"
                  formula="Each bar = Stat-Xplore MEAN of Payment Amount for that Family Type in Birmingham LA"
                  rows={obs.by_family_type
                    .filter((f) => !/^Total$/i.test(f.family_type))
                    .map((f) => ({
                      k: f.family_type,
                      v: `${fmtN(f.households)} hh · mean ${fmtGbp(f.mean_payment_gbp)}`,
                      s: obs.source,
                    }))}
                />
              </>
            )}

            {sub === 'stack' && (
              <>
                <div className="fm-rates-box" role="region" aria-label="What the rates mean">
                  <div className="bill-sec-ttl" style={{ marginTop: 0 }}>
                    Plain English — what these numbers are
                  </div>
                  <div className="fm-rates-grid">
                    <div className="fm-rates-card">
                      <div className="fm-rates-k">UC child element</div>
                      <div className="fm-rates-v">
                        £{data.rates_explainer?.uc_child_element_month ?? 303.94}
                        <small>/ child / month</small>
                      </div>
                      <p>
                        Official Universal Credit extra for <strong>each</strong> qualifying child
                        (GOV.UK). So <strong>4 × £303.94 = £1,215.76</strong> is just 4 children ×
                        that published rate — not a made-up figure.
                      </p>
                      <a href="https://www.gov.uk/universal-credit/what-youll-get" target="_blank" rel="noopener noreferrer">
                        GOV.UK · UC what you&apos;ll get →
                      </a>
                    </div>
                    <div className="fm-rates-card">
                      <div className="fm-rates-k">Child Benefit (HMRC)</div>
                      <div className="fm-rates-v">
                        £{data.rates_explainer?.child_benefit_first_week ?? 27.05}
                        <small>/wk first</small>
                        {' · '}
                        £{data.rates_explainer?.child_benefit_other_week ?? 17.9}
                        <small>/wk each other</small>
                      </div>
                      <p>
                        <strong>Different payment</strong> from the UC child element. Paid by HMRC
                        for every child. You can claim Child Benefit <em>and</em> UC child elements
                        (High Income Child Benefit Charge may apply to higher earners).
                      </p>
                      <a href="https://www.gov.uk/child-benefit/what-youll-get" target="_blank" rel="noopener noreferrer">
                        GOV.UK · Child Benefit rates →
                      </a>
                    </div>
                    <div className="fm-rates-card">
                      <div className="fm-rates-k">Two-child limit (ended 6 Apr 2026)</div>
                      <p>
                        Only limited the <strong>UC child element</strong> (usually to two children).
                        It did <strong>not</strong> cap Child Benefit. From 6 April 2026 every child
                        can attract the UC child element again.
                      </p>
                      <a
                        href="https://www.gov.uk/guidance/universal-credit-and-families-with-more-than-2-children-information-for-claimants"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        GOV.UK · two-child limit ended →
                      </a>
                    </div>
                    <div className="fm-rates-card">
                      <div className="fm-rates-k">Benefit cap vs PIP</div>
                      <div className="fm-rates-v">
                        £{data.rates_explainer?.benefit_cap_couple_month ?? 1835}
                        <small>/mo couple (Rest of GB)</small>
                      </div>
                      <p>
                        Cap can cut <strong>UC / Child Benefit</strong> etc. PIP is{' '}
                        <strong>not</strong> a capped benefit. If you, your partner or a child under
                        18 gets <strong>PIP</strong>, the household is{' '}
                        <strong>not affected by the cap</strong> — so a high disability stack can
                        legally exceed the cap total.
                      </p>
                      <a href="https://www.gov.uk/benefit-cap/when-youre-not-affected" target="_blank" rel="noopener noreferrer">
                        GOV.UK · when the cap does not apply →
                      </a>
                    </div>
                  </div>
                </div>

                <div className="sub-tab-bar" style={{ margin: '14px 0', border: '1px solid var(--border)' }}>
                  {data.scenarios.map((s) => (
                    <button
                      key={s.id}
                      className={`sub-tab${scenarioId === s.id ? ' active' : ''}`}
                      onClick={() => setScenarioId(s.id)}
                    >
                      {s.kind === 'observed_mean'
                        ? 'Observed'
                        : s.kind === 'statutory_core'
                          ? 'Core (claimable rates)'
                          : 'High max stack'}
                    </button>
                  ))}
                </div>

                <div className="bill-sec-ttl">{scenario.title}</div>
                <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 12 }}>
                  {scenario.description}
                </p>

                <div className="fm-total">
                  <span className="fm-total-k">
                    {scenario.kind === 'observed_mean'
                      ? 'Observed mean (real admin data)'
                      : scenario.kind === 'statutory_high'
                        ? 'Maximum illustrated total (if fully eligible)'
                        : 'Core claimable total (if eligible)'}
                  </span>
                  <span className="fm-total-v">{fmtGbp(total)}</span>
                  <span className="fm-total-s">£ / month · sum of lines below</span>
                </div>

                {scenario.benefit_cap_monthly != null && (
                  <div
                    className={`fm-cap${
                      scenario.cap_applies_if_no_exemption === false ? ' fm-cap-ok' : ''
                    }`}
                  >
                    <strong>Benefit cap check.</strong> Rest of GB couple/with children:{' '}
                    <strong>{fmtGbp(scenario.benefit_cap_monthly, 0)}/mo</strong>.
                    {scenario.cap_applies_if_no_exemption === false ? (
                      <span>
                        {' '}
                        This high stack includes <strong>PIP</strong> — under GOV.UK rules the
                        household is <strong>exempt from the cap</strong>
                        {scenario.cap_exempt_reason ? ` (${scenario.cap_exempt_reason})` : ''}. So
                        this is a <strong>possible</strong> full stack, not blocked by the cap.
                      </span>
                    ) : total > scenario.benefit_cap_monthly ? (
                      <span>
                        {' '}
                        Arithmetic total is above the cap. Without a PIP/LCWRA/carer exemption,{' '}
                        <strong>UC may be reduced</strong> so cash-in-hand is lower than the sum of
                        rates.
                      </span>
                    ) : (
                      <span> Total is under the cap reference.</span>
                    )}
                    {scenario.benefit_cap_note ? (
                      <div style={{ marginTop: 6 }}>{scenario.benefit_cap_note}</div>
                    ) : null}
                    <div className="fm-cap-links">
                      <a href="https://www.gov.uk/benefit-cap/benefit-cap-amounts" target="_blank" rel="noopener noreferrer">
                        Cap amounts
                      </a>
                      <a href="https://www.gov.uk/benefit-cap/benefits-that-are-capped" target="_blank" rel="noopener noreferrer">
                        What counts toward the cap
                      </a>
                      <a href="https://www.gov.uk/benefit-cap/when-youre-not-affected" target="_blank" rel="noopener noreferrer">
                        Exemptions (PIP)
                      </a>
                    </div>
                  </div>
                )}

                {included.map((l) => (
                  <div key={l.id} className="fm-line">
                    <div className="fm-line-top">
                      <span className="fm-line-lbl">
                        <i style={{ background: KIND_COLOR[l.kind] || '#8a8f99' }} />
                        {l.label}
                      </span>
                      <span className="fm-line-amt">{fmtGbp(l.monthly)}</span>
                    </div>
                    <div className="fm-line-bar-wrap">
                      <div
                        className="fm-line-bar"
                        style={{
                          width: `${((l.monthly as number) / maxLine) * 100}%`,
                          background: KIND_COLOR[l.kind] || '#8a8f99',
                        }}
                      />
                    </div>
                    <div className="fm-line-meta">
                      <span>{l.attaches_to}</span>
                      <span>{l.eligibility}</span>
                      {l.catalogueUrl ? (
                        <a href={l.catalogueUrl} target="_blank" rel="noopener noreferrer">
                          {l.source} ↗
                        </a>
                      ) : (
                        <span>{l.source}</span>
                      )}
                      {l.note ? <span className="fm-line-note">{l.note}</span> : null}
                    </div>
                  </div>
                ))}

                {scenario.lines
                  .filter((l) => !l.included || l.monthly == null)
                  .map((l) => (
                    <div key={l.id} className="fm-line fm-line-omit">
                      <div className="fm-line-top">
                        <span className="fm-line-lbl">{l.label}</span>
                        <span className="fm-line-amt">not in total</span>
                      </div>
                      <div className="fm-line-meta">
                        <span>{l.eligibility}</span>
                        {l.note ? <span>{l.note}</span> : null}
                        {l.catalogueUrl ? (
                          <a href={l.catalogueUrl} target="_blank" rel="noopener noreferrer">
                            Source ↗
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ))}

                <Calc
                  title="How the total is built"
                  formula="total = sum of included lines (official rates or observed mean)"
                  rows={[
                    ...included.map((l) => ({
                      k: l.label,
                      v: fmtGbp(l.monthly),
                      s: l.source,
                    })),
                    {
                      k: 'Σ MAX / scenario total',
                      v: fmtGbp(total),
                      s: `${included.length} lines · ${scenario.kind === 'statutory_high' ? 'ceiling if eligible' : scenario.kind === 'observed_mean' ? 'real mean' : 'core if eligible'}`,
                    },
                    ...(scenario.uc_only_monthly != null
                      ? [
                          {
                            k: 'UC elements only (no CB / PIP)',
                            v: fmtGbp(scenario.uc_only_monthly),
                            s: 'sum of kind=uc_element',
                          },
                        ]
                      : []),
                  ]}
                />

                {(scenario.assumptions?.length || scenario.total_excludes?.length) && (
                  <div className="fm-assumptions">
                    {scenario.assumptions && (
                      <>
                        <div className="bill-sec-ttl">What this scenario assumes you can claim</div>
                        <ul>
                          {scenario.assumptions.map((a) => (
                            <li key={a}>{a}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    {scenario.total_excludes && (
                      <>
                        <div className="bill-sec-ttl">Not included in this total</div>
                        <ul>
                          {scenario.total_excludes.map((a) => (
                            <li key={a}>{a}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}

                <div className="fm-warn">
                  {data.comparisons.naive_ca_warning} High stack with naive CA would show{' '}
                  {fmtGbp(data.comparisons.high_with_naive_ca)} — we do not use that as the main total.
                </div>

                <div className="hb-sources" style={{ marginTop: 16 }}>
                  <div className="hb-sources-ttl">Links used for this stack</div>
                  {(data.sources ?? []).map((s, i) => (
                    <div key={i} className="hb-src">
                      <a href={s.catalogueUrl} target="_blank" rel="noopener noreferrer">
                        {s.label}
                      </a>
                      <span className="hb-src-meta">
                        {s.publisher} · {s.as_of}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {sub === 'catalogue' && (
              <>
                <div className="bill-sec-ttl">Payments that can accrue to a family</div>
                <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 12 }}>
                  Important: <strong>mother and father do not each get a full separate UC award</strong>.
                  Couples make one joint claim. PIP and Carer&apos;s Allowance are person-level and can
                  stack under rules; housing is rent-specific.
                </p>
                <div className="ucp-data-scroll">
                  <table className="ucp-table">
                    <thead>
                      <tr>
                        <th>Payment</th>
                        <th>Unit</th>
                        <th>Stacks with UC?</th>
                        <th>Birmingham data we have</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.catalogue.map((c) => (
                        <tr key={c.id}>
                          <td>{c.name}</td>
                          <td>{c.person_or_household}</td>
                          <td>{c.stacks}</td>
                          <td>{c.bham_data}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {data.bill_context && (
                  <>
                    <div className="bill-sec-ttl" style={{ marginTop: 18 }}>
                      City context — Birmingham annual accounts ({data.bill_context.year})
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--muted)' }}>{data.bill_context.note}</p>
                    {data.bill_context.lines.map((l) => (
                      <div key={l.id} className="hb-row" style={{ padding: '4px 0' }}>
                        <div className="hb-name" style={{ fontSize: 13 }}>{l.label}</div>
                        <div className="hb-track" style={{ height: 16 }}>
                          <div
                            className="hb-bar"
                            style={{
                              height: 16,
                              width: `${(l.amount_m / Math.max(...data.bill_context!.lines.map((x) => x.amount_m), 1)) * 100}%`,
                              background: '#16306f',
                            }}
                          />
                          <span className="hb-val">{fmtM(l.amount_m)}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}

            {sub === 'workings' && (
              <>
                <div className="bill-sec-ttl">Official rate arithmetic (2026/27)</div>
                <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 10 }}>
                  “Derived” here only means <strong>count × official rate</strong> (e.g. 4 children ×
                  £303.94). The pound figure itself is the published statutory rate — not an estimate.
                </p>
                <Calc
                  title="UC couple + 4 children (core elements)"
                  formula="standard + 4 × official child element [+ optional extras]"
                  rows={[
                    { k: 'Couple standard (25+)', v: '£666.97 / mo', s: 'GOV.UK UC · official' },
                    {
                      k: 'UC child element (per child)',
                      v: '£303.94 / mo each',
                      s: 'GOV.UK UC · official',
                    },
                    {
                      k: '4 × child element',
                      v: '4 × £303.94 = £1,215.76',
                      s: 'arithmetic on official rate',
                    },
                    {
                      k: 'UC-only subtotal',
                      v: '666.97 + 1,215.76 = £1,882.73',
                      s: 'core scenario',
                    },
                    {
                      k: 'Child Benefit 4 kids (HMRC)',
                      v: '(£27.05 + 3×£17.90)/wk × 52/12 ≈ £349.92',
                      s: 'separate from UC child element',
                    },
                    { k: 'PIP max one adult', v: '(£114.60+£80)/wk × 52/12', s: 'enhanced + enhanced' },
                    { k: "Carer's Allowance", v: '£86.45/wk × 52/12', s: 'DWP rates' },
                    { k: 'LCWRA', v: '£429.80 / month', s: 'DWP rates (full listed rate)' },
                    { k: 'UC carer element', v: '£209.34 / month', s: 'DWP rates' },
                    {
                      k: 'Disabled child higher',
                      v: '£514.71 / month',
                      s: 'DWP rates',
                    },
                  ]}
                />

                <div className="bill-sec-ttl">All scenario lines (exportable)</div>
                {data.scenarios.map((sc) => (
                  <div key={sc.id} style={{ marginBottom: 16 }}>
                    <div className="bill-sec-ttl" style={{ color: 'var(--ink)' }}>
                      {sc.title} · total {fmtGbp(sc.monthly_total ?? sc.total_monthly)}
                    </div>
                    <div className="ucp-data-scroll">
                      <table className="ucp-table">
                        <thead>
                          <tr>
                            <th>Line</th>
                            <th>Included</th>
                            <th>£/mo</th>
                            <th>Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sc.lines.map((l) => (
                            <tr key={l.id}>
                              <td>{l.label}</td>
                              <td>{l.included ? 'yes' : 'no'}</td>
                              <td>{l.monthly == null ? '—' : fmtGbp(l.monthly)}</td>
                              <td style={{ whiteSpace: 'normal', maxWidth: 280 }}>{l.source}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                {(data.method_notes ?? []).length > 0 && (
                  <div className="ucp-methods">
                    <div className="bill-sec-ttl">Method notes</div>
                    <ul>
                      {(data.method_notes ?? []).map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="bham-watermark">FORWARD · BIRMINGHAM</div>
        </div>
      </div>

      <div className="rcol">
        <div className="hb-headline">
          <div className="hb-big" style={{ fontSize: 42 }}>
            {fmtGbp(coupleMean, 0)}
          </div>
          <div className="hb-big-sub">
            Mean UC payment for Birmingham <strong>couples with children</strong> · {obs.as_of}
            <br />
            Observed · {fmtN(obs.couple_with_children_households)} households
          </div>
          <div className="hb-facts">
            <div className="hb-fact">
              <span className="hb-fact-k">Key rule</span>
              <span className="hb-fact-v">{data.framing.key_rule}</span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">Statutory core (couple+4+CB)</span>
              <span className="hb-fact-v">
                {fmtGbp(core?.total_monthly ?? core?.monthly_total)} / mo
              </span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">High eligibility stack</span>
              <span className="hb-fact-v">{fmtGbp(data.comparisons.high_total)} / mo</span>
            </div>
            <div className="hb-fact">
              <span className="hb-fact-k">What this is not</span>
              <span className="hb-fact-v" style={{ color: 'var(--herald-red)' }}>
                Not a real family · not advice · not ward totals · not “everyone gets the max”
              </span>
            </div>
          </div>
          <div className="hb-sources">
            <div className="hb-sources-ttl">Sources</div>
            {(data.sources ?? []).map((s, i) => (
              <div key={i} className="hb-src">
                <a href={s.catalogueUrl} target="_blank" rel="noopener noreferrer">
                  {s.label}
                </a>
                <span className="hb-src-meta">
                  {s.publisher} · {s.licence} · {s.as_of}
                </span>
                {s.method ? (
                  <span className="hb-src-meta" style={{ display: 'block' }}>
                    {s.method}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
