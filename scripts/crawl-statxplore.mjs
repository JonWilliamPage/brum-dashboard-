#!/usr/bin/env node
/**
 * Crawl Stat-Xplore Open Data API schema: list folders/databases, geography fields,
 * and any money/expenditure-like measures. Key from .env.local only — never printed.
 *
 * RUN: node scripts/crawl-statxplore.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://stat-xplore.dwp.gov.uk/webapi/rest/v1';
const OUT = join(ROOT, 'scripts', '_statxplore-crawl.json');

function loadKey() {
  if (process.env.STATXPLORE_API_KEY) return process.env.STATXPLORE_API_KEY.trim();
  const txt = readFileSync(join(ROOT, '.env.local'), 'utf8');
  const m = txt.match(/^\s*STATXPLORE_API_KEY\s*=\s*(.+?)\s*$/m);
  if (!m) throw new Error('STATXPLORE_API_KEY not set');
  return m[1].replace(/^["']|["']$/g, '').trim();
}

const KEY = loadKey();

async function sx(path, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(`${BASE}${path}`, {
        headers: { APIKey: KEY, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(90000),
      });
      const t = await r.text();
      if (r.status === 503 || r.status === 429) {
        await new Promise((res) => setTimeout(res, 2000 * (i + 1)));
        continue;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status} ${path} ${t.slice(0, 120)}`);
      return JSON.parse(t);
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
    }
  }
}

const GEO_RE =
  /geograph|national|local authorit|ward|lsoa|msoa|parliament|constituency|region|country|authority|borough|postcode|census|output area|oa\b/i;
const MONEY_RE =
  /amount|expenditure|spend|payment|award|value of|monetary|cost|debt|overpay|subsidy|£|gbp|entitlement|weekly|monthly/i;

async function main() {
  const root = await sx('/schema');
  const folders = (root.children || []).filter((c) => c.type === 'FOLDER');
  console.log(`ROOT FOLDERS: ${folders.length}`);
  console.log(`rate_limit check…`);
  try {
    const rl = await sx('/rate_limit');
    console.log(`rate_limit remaining=${rl.remaining}/${rl.limit}`);
  } catch (e) {
    console.log('rate_limit failed', e.message);
  }

  const report = [];

  for (const folder of folders) {
    let fnode;
    try {
      fnode = await sx(`/schema/${encodeURIComponent(folder.id)}`);
    } catch (e) {
      report.push({ folder: folder.label, err: String(e.message).slice(0, 100) });
      console.log(`ERR folder ${folder.label}`);
      continue;
    }

    // Empty folders (e.g. Fraud) still recorded
    if (!(fnode.children || []).length) {
      report.push({ folder: folder.label, databases: [], note: 'empty folder via API' });
      console.log(`${folder.label} → empty`);
      continue;
    }

    const dbs = [];
    const stack = (fnode.children || []).map((c) => ({ ...c, depth: 0 }));
    while (stack.length) {
      const c = stack.shift();
      if (c.type === 'DATABASE') dbs.push(c);
      else if ((c.type === 'FOLDER' || c.type === 'GROUP') && c.depth < 2) {
        try {
          const n = await sx(`/schema/${encodeURIComponent(c.id)}`);
          for (const ch of n.children || []) stack.push({ ...ch, depth: c.depth + 1 });
        } catch {
          /* skip */
        }
      }
    }

    console.log(`${folder.label} → ${dbs.length} dbs`);

    for (const db of dbs) {
      try {
        const n = await sx(`/schema/${encodeURIComponent(db.id)}`);
        const fields = (n.children || []).filter((c) =>
          ['FIELD', 'MEASURE', 'MEASURE GROUP', 'SUBJECT FIELD'].includes(c.type)
        );
        const labels = fields.map((f) => f.label);
        const geo = labels.filter((l) => GEO_RE.test(l));
        const money = labels.filter((l) => MONEY_RE.test(l));

        let levelSample = [];
        const geoField = fields.find((f) => GEO_RE.test(f.label));
        if (geoField) {
          try {
            const gn = await sx(`/schema/${encodeURIComponent(geoField.id)}`);
            levelSample = (gn.children || []).map((k) => `${k.type}:${k.label}`).slice(0, 40);
          } catch {
            /* skip */
          }
        }

        report.push({
          folder: folder.label,
          database: db.label,
          id: db.id,
          fieldCount: labels.length,
          fields: labels,
          geo,
          money,
          levelSample,
        });
      } catch (e) {
        report.push({
          folder: folder.label,
          database: db.label,
          err: String(e.message).slice(0, 100),
        });
      }
    }
  }

  console.log('\n======== SUMMARY (geo + money) ========');
  for (const r of report) {
    if (r.err) {
      console.log(`ERR ${r.folder} | ${r.database || ''} | ${r.err}`);
      continue;
    }
    if (r.note) {
      console.log(`${r.folder} | ${r.note}`);
      continue;
    }
    console.log(`\n${r.folder} | ${r.database}`);
    console.log(`  GEO: ${r.geo?.join(', ') || '—'}`);
    console.log(`  MONEY: ${r.money?.join(', ') || '—'}`);
    if (r.levelSample?.length) {
      console.log(`  LEVELS: ${r.levelSample.join(' | ').slice(0, 280)}`);
    }
  }

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${OUT} (${report.length} rows)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
