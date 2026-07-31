// Probe DWP Stat-Xplore: confirm the API key works, list benefit databases, and
// report which GEOGRAPHY levels each exposes for Birmingham (Ward? LSOA? LA only?).
//
// WHY: like NOMIS claimant count, Stat-Xplore may NOT publish at Birmingham's current
// 69-ward geography. This probe tells us, per benefit, whether we can pull wards
// directly or must aggregate up from LSOA (the fetch-claimant-wards.mjs pattern).
//
// The API key is read from .env.local and NEVER printed. Output is schema only.
//
// RUN: node scripts/probe-statxplore.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://stat-xplore.dwp.gov.uk/webapi/rest/v1';

// --- load key from .env.local (gitignored), without exposing it ---
function loadKey() {
  if (process.env.STATXPLORE_API_KEY) return process.env.STATXPLORE_API_KEY.trim();
  let txt = '';
  try { txt = readFileSync(join(ROOT, '.env.local'), 'utf8'); }
  catch { throw new Error('.env.local not found — add STATXPLORE_API_KEY=<key> to it.'); }
  const m = txt.match(/^\s*STATXPLORE_API_KEY\s*=\s*(.+?)\s*$/m);
  if (!m || !m[1]) throw new Error('STATXPLORE_API_KEY not set in .env.local');
  return m[1].replace(/^["']|["']$/g, '').trim();
}

const KEY = loadKey();

async function sx(path) {
  const r = await fetch(`${BASE}${path}`, {
    headers: { APIKey: KEY, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) {
    const body = (await r.text().catch(() => '')).slice(0, 300);
    throw new Error(`HTTP ${r.status} ${r.statusText} for ${path}${body ? ` — ${body}` : ''}`);
  }
  return r.json();
}

// Benefit databases we care about (matched loosely on label).
const WANTED = [
  'universal credit', 'personal independence', 'pip', 'disability living', 'attendance allowance',
  'state pension', 'pension credit', "carer", 'housing benefit', 'employment and support',
];

function wanted(label) {
  const l = label.toLowerCase();
  return WANTED.some(w => l.includes(w));
}

// Walk the schema tree to a bounded depth, collecting DATABASE nodes that look like benefits.
async function findBenefitDatabases(id = null, depth = 0, acc = []) {
  if (depth > 3) return acc;
  const node = await sx(id ? `/schema/${encodeURIComponent(id)}` : '/schema');
  const children = node.children || [];
  for (const c of children) {
    if (c.type === 'DATABASE' && wanted(c.label)) {
      acc.push({ id: c.id, label: c.label });
    } else if (c.type === 'FOLDER' || c.type === 'GROUP') {
      await findBenefitDatabases(c.id, depth + 1, acc);
    }
  }
  return acc;
}

// For a database, list its geography FIELD(s) and whether Ward / LSOA value sets exist.
async function geographyOf(dbId) {
  const node = await sx(`/schema/${encodeURIComponent(dbId)}`);
  const fields = (node.children || []).filter(c => c.type === 'FIELD');
  const geo = fields.filter(f => /geograph|area|region|ward|national|local authorit/i.test(f.label));
  const out = [];
  for (const g of geo) {
    let levels = [];
    try {
      const gnode = await sx(`/schema/${encodeURIComponent(g.id)}`);
      levels = (gnode.children || []).map(v => v.label);
    } catch { /* some fields aren't drillable */ }
    out.push({ field: g.label, levels });
  }
  return out;
}

async function main() {
  console.log('Probing Stat-Xplore (key loaded, not shown)…\n');

  // 1. Auth + rate-limit sanity check. NOTE: the endpoint is /rate_limit with an
  // UNDERSCORE — an earlier version of this script used /rate-limit (hyphen), which
  // 404s and made VALID keys look broken.
  try {
    const info = await sx('/rate_limit');
    console.log('AUTH OK — rate limit:', JSON.stringify(info));
  } catch (e) {
    console.error('AUTH CHECK FAILED:', e.message);
    console.error('');
    console.error('How to read this:');
    console.error('  HTTP 401/403 → the key itself is rejected. Fixes: (1) log into');
    console.error('    stat-xplore.dwp.gov.uk in a browser first (accepts any new T&Cs),');
    console.error('    (2) Account menu → Open Data API Access → copy the WHOLE key');
    console.error('    (they are long) or Reset to mint a fresh one, (3) make sure');
    console.error('    .env.local has no quotes/spaces around it.');
    console.error('  HTTP 404 → wrong URL/endpoint (this script now uses the correct ones).');
    console.error('  HTTP 429 → rate-limited; wait for the reset.');
    console.error('  timeout/ENOTFOUND → network/TLS to stat-xplore.dwp.gov.uk blocked.');
    process.exit(1);
  }
  console.log('');

  // 2. Find benefit databases.
  const dbs = await findBenefitDatabases();
  console.log(`Found ${dbs.length} benefit database(s):\n`);

  // 3. Report geography levels for each (the key question: Ward vs LSOA vs LA-only).
  for (const db of dbs) {
    console.log(`■ ${db.label}`);
    console.log(`  id: ${db.id}`);
    try {
      const geos = await geographyOf(db.id);
      if (!geos.length) { console.log('  geography: (none found at top level)'); }
      for (const g of geos) {
        const hasWard = g.levels.some(l => /ward/i.test(l));
        const hasLSOA = g.levels.some(l => /lsoa|lower (layer )?super output/i.test(l));
        const flag = hasWard ? '✅ WARD' : hasLSOA ? '⚠ LSOA (aggregate up)' : '✗ neither';
        console.log(`  geo field "${g.field}": ${flag}`);
        console.log(`    levels: ${g.levels.join(' | ') || '(not drillable here)'}`);
      }
    } catch (e) {
      console.log('  geography probe failed:', e.message);
    }
    console.log('');
  }

  console.log('Done. Use the ✅/⚠ flags to decide: direct ward pull, or LSOA→ward aggregation.');
}

main().catch(e => { console.error(e); process.exit(1); });
