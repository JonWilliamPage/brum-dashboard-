#!/usr/bin/env node
/**
 * UC Stage (3D) — clones uc-weather proposal data into a 3D-stage proposal.
 * Requires proposals/uc-weather.proposal.json (run fetch-uc-weather.mjs first).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'proposals', 'uc-weather.proposal.json');
const OUT = join(ROOT, 'proposals', 'uc-stage.proposal.json');

if (!existsSync(SRC)) {
  console.error('Missing uc-weather.proposal.json — run: node scripts/fetch-uc-weather.mjs');
  process.exit(1);
}

const src = JSON.parse(readFileSync(SRC, 'utf8'));
const proposal = {
  ...src,
  id: 'uc-stage',
  status: 'pending',
  title: 'UC Stage — 3D extruded ward caseload over time',
  metric: src.metric + ' · Three.js extrusion stage',
  generated: new Date().toISOString(),
  presentation: 'three-extrusion',
  validation: {
    ...(src.validation || {}),
    presentation: 'three-js-extruded-wards',
    parent_proposal: 'uc-weather',
  },
  sources: [
    ...(src.sources || []),
    {
      id: 'stageNote',
      label: '3D presentation layer (Three.js) — same underlying Stat-Xplore / LA £ data',
      publisher: 'Ozzy / brum-dashboard',
      dataset: 'Ward extrusion of administrative caseload series',
      method: 'presentation only — no new statistics invented',
      licence: 'Open Government Licence v3.0 (underlying data)',
      as_of: src.as_of,
      catalogueUrl: 'https://stat-xplore.dwp.gov.uk/',
      apiUrl: 'https://stat-xplore.dwp.gov.uk/webapi/rest/v1',
    },
  ],
};

writeFileSync(OUT, JSON.stringify(proposal, null, 2));
console.log('Wrote', OUT, '·', proposal.wards?.length, 'wards ·', proposal.months?.length, 'months');
