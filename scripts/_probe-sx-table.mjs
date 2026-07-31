#!/usr/bin/env node
/** Probe Stat-Xplore schema values + table for Birmingham. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://stat-xplore.dwp.gov.uk/webapi/rest/v1';
const key = readFileSync(join(ROOT, '.env.local'), 'utf8')
  .match(/^\s*STATXPLORE_API_KEY\s*=\s*(.+?)\s*$/m)[1]
  .replace(/^["']|["']$/g, '')
  .trim();

async function sx(path, opts = {}) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`${BASE}${path}`, {
      ...opts,
      headers: {
        APIKey: key,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(opts.headers || {}),
      },
      signal: AbortSignal.timeout(120000),
    });
    const t = await r.text();
    if (r.status === 503 || r.status === 429) {
      await new Promise((x) => setTimeout(x, 2000 * (i + 1)));
      continue;
    }
    if (!r.ok) throw new Error(`HTTP ${r.status} ${path}\n${t.slice(0, 1000)}`);
    return t ? JSON.parse(t) : null;
  }
}

async function main() {
  // Check valueset pagination headers / structure for months
  const monthVs = 'str:valueset:UC_Monthly:F_UC_DATE:DATE_NAME';
  // try different endpoints
  for (const p of [
    `/schema/${encodeURIComponent(monthVs)}`,
    `/schema/${encodeURIComponent(monthVs)}?page=0`,
    `/schema/${encodeURIComponent(monthVs)}?limit=500`,
  ]) {
    try {
      const r = await fetch(`${BASE}${p}`, {
        headers: { APIKey: key, Accept: 'application/json' },
        signal: AbortSignal.timeout(60000),
      });
      const t = await r.text();
      console.log('\n', p, 'status', r.status, 'headers', {
        total: r.headers.get('X-Total-Count'),
        link: r.headers.get('Link'),
        rate: r.headers.get('X-RateLimit-Remaining'),
      });
      const j = JSON.parse(t);
      const kids = j.children || [];
      console.log('children', kids.length, 'first', kids[0]?.label, 'last', kids.at(-1)?.label);
    } catch (e) {
      console.log(p, e.message.slice(0, 120));
    }
  }

  // Search schema for Birmingham in LA valueset - maybe use /schema/.../search
  const laVs = 'str:valueset:UC_Monthly:V_F_UC_CASELOAD_FULL:WARD_CODE:V_C_MASTERGEOG21_LA_TO_REGION';
  const la = await sx(`/schema/${encodeURIComponent(laVs)}`);
  console.log('\nLA children count', (la.children || []).length);
  console.log('sample LAs', (la.children || []).slice(0, 5).map((c) => c.label));
  console.log(
    'Birmingham hits',
    (la.children || []).filter((c) => /Birmingham|E08000025/i.test(c.label)).map((c) => c.label + '|' + c.id)
  );

  // Try valueset codes endpoint patterns from SuperSTAR docs
  for (const p of [
    `/schema/${encodeURIComponent(laVs)}/codes?codes=E08000025`,
    `/schema/${encodeURIComponent(laVs)}?codes=E08000025`,
  ]) {
    try {
      const j = await sx(p);
      console.log('codes path', p, JSON.stringify(j).slice(0, 400));
    } catch (e) {
      console.log('codes fail', p, e.message.slice(0, 150));
    }
  }

  // City Observatory simpler queries
  const co =
    'https://www.cityobservatory.birmingham.gov.uk/api/explore/v2.1/catalog/datasets?limit=20&where=search(universal)';
  try {
    const r = await fetch(co, { signal: AbortSignal.timeout(30000) });
    console.log('\nCO search status', r.status);
    const j = await r.json();
    console.log('total', j.total_count);
    for (const d of j.results || []) console.log(' ', d.dataset_id, d.title || d.metas?.default?.title);
  } catch (e) {
    console.log('CO', e.message);
  }

  // known UC dataset months depth
  const uc =
    'https://www.cityobservatory.birmingham.gov.uk/api/explore/v2.1/catalog/datasets/number-of-people-on-universal-credit-wmca-wards-2025/records?select=date,periodlabel&order_by=date%20ASC&limit=5';
  const uc2 =
    'https://www.cityobservatory.birmingham.gov.uk/api/explore/v2.1/catalog/datasets/number-of-people-on-universal-credit-wmca-wards-2025/records?select=date&order_by=date%20DESC&limit=3';
  for (const u of [uc, uc2]) {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
      const j = await r.json();
      console.log('\nUC records', u.slice(-40), r.status, j.total_count, (j.results || []).map((x) => x.date));
    } catch (e) {
      console.log('UC', e.message);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
