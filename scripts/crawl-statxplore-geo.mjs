#!/usr/bin/env node
/** List geography field hierarchy only (no VALUESET expansion). */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://stat-xplore.dwp.gov.uk/webapi/rest/v1';
const key = readFileSync(join(ROOT, '.env.local'), 'utf8')
  .match(/^\s*STATXPLORE_API_KEY\s*=\s*(.+?)\s*$/m)[1]
  .replace(/^["']|["']$/g, '')
  .trim();

async function sx(path) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch(`${BASE}${path}`, {
      headers: { APIKey: key, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(90000),
    });
    const t = await r.text();
    if (r.status === 503 || r.status === 429) {
      await new Promise((x) => setTimeout(x, 2000 * (i + 1)));
      continue;
    }
    if (!r.ok) throw new Error(`HTTP ${r.status} ${path} ${t.slice(0, 200)}`);
    return JSON.parse(t);
  }
}

/** Walk only structure types; never expand VALUESET children (huge month/geo trees). */
async function structureOnly(id, depth = 0, maxDepth = 4) {
  const n = await sx(`/schema/${encodeURIComponent(id)}`);
  const pad = '  '.repeat(depth);
  const kids = n.children || [];
  console.log(`${pad}${n.type}: ${n.label}  (${kids.length} children)`);
  if (depth >= maxDepth) return;
  for (const c of kids) {
    if (c.type === 'VALUESET' || c.type === 'VALUE' || c.type === 'COUNT' || c.type === 'STAT_FUNCTION') {
      console.log(`${pad}  ${c.type}: ${c.label}`);
      continue;
    }
    if (c.type === 'FIELD' || c.type === 'GROUP' || c.type === 'FOLDER' || c.type === 'MEASURE' || c.type === 'MEASURE GROUP') {
      // Only dig groups and fields that look geo, or top two levels of everything
      const dig =
        depth < 1 ||
        /geograph|national|regional|local|ward|lsoa|msoa|constitu|authority|area|postcode|census|output/i.test(
          c.label
        );
      if (dig) {
        try {
          await structureOnly(c.id, depth + 1, maxDepth);
        } catch (e) {
          console.log(`${pad}  ERR ${c.label}: ${String(e.message).slice(0, 80)}`);
        }
      } else {
        console.log(`${pad}  ${c.type}: ${c.label}`);
      }
    } else {
      console.log(`${pad}  ${c.type}: ${c.label}`);
    }
  }
}

const targets = [
  'str:database:UC_Monthly',
  // resolve others from crawl file
];

const crawl = JSON.parse(readFileSync(join(ROOT, 'scripts', '_statxplore-crawl.json'), 'utf8'));
const picks = [
  'People on Universal Credit',
  'Households on Universal Credit',
  'Housing Benefit - Data from April 2018',
  'PIP Cases with Entitlement from 2019',
  'BHC - Absolute Low Income',
  'State Pension - Data from May 2018',
  'Pension Credit - Data from May 2018',
];

for (const name of picks) {
  const r = crawl.find((x) => x.database === name && x.id);
  if (!r) {
    console.log('\nMISSING', name);
    continue;
  }
  console.log('\n############################');
  console.log(r.folder, '/', r.database);
  console.log('id:', r.id);
  await structureOnly(r.id, 0, 3);
}
