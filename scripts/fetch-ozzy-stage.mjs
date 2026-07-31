#!/usr/bin/env node
/**
 * Ozzy Stage — theatrical combined 3D stage packing UC weather + PIP place series
 * for dual-layer presentation. Requires both parent proposals.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UC = join(ROOT, 'proposals', 'uc-weather.proposal.json');
const PIP = join(ROOT, 'proposals', 'pip-place.proposal.json');
const OUT = join(ROOT, 'proposals', 'ozzy-stage.proposal.json');

if (!existsSync(UC) || !existsSync(PIP)) {
  console.error('Need both uc-weather and pip-place proposals first.');
  process.exit(1);
}

const uc = JSON.parse(readFileSync(UC, 'utf8'));
const pip = JSON.parse(readFileSync(PIP, 'utf8'));

// Align ward lists by code
const pipByCode = Object.fromEntries((pip.wards || []).map((w) => [w.ward_code, w]));
const wards = (uc.wards || []).map((w) => ({
  ward_code: w.ward_code,
  ward_name: w.ward_name,
  population: w.population,
  uc_series: w.series,
  uc_latest: w.latest,
  uc_delta: w.delta,
  pip_series: pipByCode[w.ward_code]?.series ?? null,
  pip_latest: pipByCode[w.ward_code]?.latest ?? null,
  pip_delta: pipByCode[w.ward_code]?.delta ?? null,
}));

const proposal = {
  id: 'ozzy-stage',
  status: 'pending',
  title: 'Ozzy Stage — dual 3D city (UC + PIP caseload theatre)',
  metric: 'Interactive Three.js dual-layer ward extrusions (UC people / PIP cases) + city £ context',
  unit: 'claimants / cases',
  geography: 'ward (caseload presentation) + LA £ context',
  generated: new Date().toISOString(),
  presentation: 'three-dual-stage',
  as_of: `${uc.as_of} · PIP ${pip.as_of}`,
  source: {
    as_of: uc.as_of,
    label: 'Stat-Xplore UC + PIP caseload · LA expenditure context · Three.js stage',
    publisher: 'Department for Work & Pensions / Ozzy presentation',
  },
  sources: [
    ...(uc.sources || []).map((s) => ({ ...s, id: `uc_${s.id || 'src'}` })),
    ...(pip.sources || []).map((s) => ({ ...s, id: `pip_${s.id || 'src'}` })),
  ],
  uc: {
    months: uc.months,
    city: uc.city,
  },
  pip: {
    months: pip.months,
    city: pip.city,
    category_mix: pip.category_mix,
    gb_conditions: pip.gb_conditions
      ? {
          years: pip.gb_conditions.years,
          // slim: top categories only for stage HUD
          top_categories: (pip.gb_conditions.categories || []).slice(0, 8).map((c) => ({
            name: c.name,
            latest_real: c.real?.[c.real.length - 1] ?? null,
          })),
          gb_total_real_latest: pip.gb_conditions.gb_total_real_latest,
        }
      : null,
  },
  wards,
  validation: {
    presentation: 'three-js-dual-extrusion-stage',
    wards_found: wards.length,
    uc_months: uc.months?.length ?? 0,
    pip_months: pip.months?.length ?? 0,
    honesty:
      '3D heights are CASELOAD intensity (people/cases), not £. City £ panels use LA accounts. GB PIP conditions are national £ only.',
  },
};

writeFileSync(OUT, JSON.stringify(proposal, null, 2));
console.log(
  'Wrote',
  OUT,
  '·',
  wards.length,
  'wards · UC months',
  uc.months?.length,
  '· PIP months',
  pip.months?.length
);
