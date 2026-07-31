/** Shared Stat-Xplore Open Data API helpers. Key from .env.local only. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SX_BASE = 'https://stat-xplore.dwp.gov.uk/webapi/rest/v1';

export function loadStatXploreKey() {
  if (process.env.STATXPLORE_API_KEY) return process.env.STATXPLORE_API_KEY.trim();
  const txt = readFileSync(join(ROOT, '.env.local'), 'utf8');
  const m = txt.match(/^\s*STATXPLORE_API_KEY\s*=\s*(.+?)\s*$/m);
  if (!m) throw new Error('STATXPLORE_API_KEY not set in .env.local');
  return m[1].replace(/^["']|["']$/g, '').trim();
}

export async function sx(path, { method = 'GET', body, key, retries = 5 } = {}) {
  const k = key || loadStatXploreKey();
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(`${SX_BASE}${path}`, {
        method,
        headers: {
          APIKey: k,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(180000),
      });
      const t = await r.text();
      if (r.status === 503 || r.status === 429) {
        await new Promise((x) => setTimeout(x, 2500 * (i + 1)));
        continue;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status} ${path}\n${t.slice(0, 600)}`);
      return t ? JSON.parse(t) : null;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise((x) => setTimeout(x, 1500 * (i + 1)));
    }
  }
}

/** Official Birmingham 69 wards E05011118–E05011186 */
export function bhamWardCodes() {
  const out = [];
  for (let n = 11118; n <= 11186; n++) out.push(`E05${String(n).padStart(6, '0')}`);
  return out;
}

export function monthRange(startYm, endYm, step = 1) {
  // startYm/endYm: 'YYYYMM'
  const out = [];
  let y = Number(startYm.slice(0, 4));
  let m = Number(startYm.slice(4, 6));
  const ey = Number(endYm.slice(0, 4));
  const em = Number(endYm.slice(4, 6));
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}${String(m).padStart(2, '0')}`);
    m += step;
    while (m > 12) {
      m -= 12;
      y += 1;
    }
  }
  return out;
}

/**
 * Parse Stat-Xplore /table response for a 2D cube: dim0 × dim1 → values matrix.
 * Returns { dim0: string[], dim1: [{uri,label,code?}], matrix: number[][] }
 */
export function parseCube2d(table, measureUri) {
  const fields = table.fields || [];
  const f0 = fields[0];
  const f1 = fields[1];
  const dim0 = (f0.items || []).map((it) => it.labels?.[0] ?? it.uris?.[0] ?? '');
  const dim1 = (f1.items || []).map((it) => {
    const uri = it.uris?.[0] ?? '';
    const code = uri.split(':').pop();
    return { label: it.labels?.[0] ?? code, uri, code };
  });
  const cube = table.cubes?.[measureUri];
  const values = cube?.values;
  if (!values) throw new Error('no cube values for ' + measureUri);
  return { dim0, dim1, values, labels0: dim0, items1: dim1 };
}

export function loadBillHistory() {
  const p = join(ROOT, 'proposals', 'benefits-bill.proposal.json');
  const bill = JSON.parse(readFileSync(p, 'utf8'));
  return bill;
}

export function loadPopulation() {
  const src = readFileSync(join(ROOT, 'lib', 'population.ts'), 'utf8');
  const map = {};
  const re = /ward_code:\s*'(E05\d{6})'[\s\S]*?ward_name:\s*'([^']+)'[\s\S]*?population:\s*(\d+)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    map[m[1]] = { name: m[2], population: Number(m[3]) };
  }
  // fallback simpler
  if (!Object.keys(map).length) {
    const re2 = /ward_code:\s*'(E05\d{6})'[^}]*?population:\s*(\d+)/g;
    while ((m = re2.exec(src)) !== null) map[m[1]] = { name: m[1], population: Number(m[2]) };
  }
  return map;
}

export function loadWardNames() {
  // from population or wards.ts
  try {
    const src = readFileSync(join(ROOT, 'lib', 'wards.ts'), 'utf8');
    const map = {};
    const re = /code:\s*'(E05\d{6})'[\s\S]*?name:\s*'([^']+)'/g;
    let m;
    while ((m = re.exec(src)) !== null) map[m[1]] = m[2];
    if (Object.keys(map).length) return map;
  } catch {
    /* fall through */
  }
  const pop = loadPopulation();
  const map = {};
  for (const [c, v] of Object.entries(pop)) map[c] = v.name;
  return map;
}
