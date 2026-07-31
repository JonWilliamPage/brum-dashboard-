#!/usr/bin/env node
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
  for (let i = 0; i < 5; i++) {
    const r = await fetch(`${BASE}${path}`, {
      ...opts,
      headers: {
        APIKey: key,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(opts.headers || {}),
      },
      signal: AbortSignal.timeout(180000),
    });
    const t = await r.text();
    if (r.status === 503 || r.status === 429) {
      await new Promise((x) => setTimeout(x, 2000 * (i + 1)));
      continue;
    }
    if (!r.ok) throw new Error(`HTTP ${r.status} ${path}\n${t.slice(0, 800)}`);
    return t ? JSON.parse(t) : null;
  }
}

function ym(y, m) {
  return `${y}${String(m).padStart(2, '0')}`;
}

async function main() {
  // Construct IDs from known patterns
  const monthField = 'str:field:UC_Monthly:F_UC_DATE:DATE_NAME';
  const wardField = 'str:field:UC_Monthly:V_F_UC_CASELOAD_FULL:WARD_CODE';
  const measure = 'str:count:UC_Monthly:V_F_UC_CASELOAD_FULL';
  const monthId = (yyyymm) =>
    `str:value:UC_Monthly:F_UC_DATE:DATE_NAME:C_UC_DATE:${yyyymm}`;
  const wardId = (code) =>
    `str:value:UC_Monthly:V_F_UC_CASELOAD_FULL:WARD_CODE:V_C_MASTERGEOG21_WARD_TO_LA:${code}`;

  const months = ['202602', '202601', '202502', '202402', '202302'];
  const wards = ['E05011118', 'E05011153', 'E05011145']; // Acocks Green, Lozells, Heartlands?

  const body = {
    database: 'str:database:UC_Monthly',
    measures: [measure],
    recodes: {
      [monthField]: { map: months.map((m) => [monthId(m)]) },
      [wardField]: { map: wards.map((w) => [wardId(w)]) },
    },
    dimensions: [[monthField], [wardField]],
  };

  console.log('UC table…');
  const t = await sx('/table', { method: 'POST', body: JSON.stringify(body) });
  writeFileSync(join(ROOT, 'scripts', '_sx-uc-sample.json'), JSON.stringify(t, null, 2));
  console.log(
    'fields',
    t.fields.map((f) => f.label + ':' + f.items.map((i) => i.labels?.[0]).join(','))
  );
  const cube = t.cubes[measure];
  console.log('cube values', JSON.stringify(cube.values).slice(0, 500));

  // PIP Cases with Entitlement from 2019
  const pipDb = 'str:database:PIP_Monthly_new';
  const pipSchema = await sx(`/schema/${encodeURIComponent(pipDb)}`);
  console.log(
    '\nPIP children',
    (pipSchema.children || []).map((c) => c.type + ':' + c.label)
  );
  const pipCount = (pipSchema.children || []).find((c) => c.type === 'COUNT');
  const pipMonth = (pipSchema.children || []).find((c) => c.label === 'Month');
  const pipGeo = (pipSchema.children || []).find((c) => /Geography/i.test(c.label));
  console.log('count', pipCount?.id, 'month', pipMonth?.id, 'geo', pipGeo?.id);

  const geoN = await sx(`/schema/${encodeURIComponent(pipGeo.id)}`);
  const wardF = (geoN.children || []).find((c) => /Ward/i.test(c.label));
  console.log('pip ward field', wardF?.id);
  const disF = (pipSchema.children || []).find((c) => c.label === 'Disability');
  console.log('disability', disF?.id);
  if (disF) {
    const dn = await sx(`/schema/${encodeURIComponent(disF.id)}`);
    console.log(
      'dis children',
      (dn.children || []).map((c) => c.type + ':' + c.label + ':' + c.id)
    );
  }

  // Infer PIP id patterns from a tiny valueset sample
  const wNode = await sx(`/schema/${encodeURIComponent(wardF.id)}`);
  const wVs = (wNode.children || []).find((c) => c.type === 'VALUESET' && /Ward/i.test(c.label));
  const sample = await sx(`/schema/${encodeURIComponent(wVs.id)}`);
  console.log('sample ward value id', sample.children?.[0]?.id);

  const mNode = await sx(`/schema/${encodeURIComponent(pipMonth.id)}`);
  const mVs = (mNode.children || []).find((c) => c.type === 'VALUESET');
  const mSample = await sx(`/schema/${encodeURIComponent(mVs.id)}`);
  console.log(
    'sample month',
    mSample.children?.[0]?.label,
    mSample.children?.[0]?.id,
    'last',
    mSample.children?.at(-1)?.label,
    mSample.children?.at(-1)?.id
  );

  // Try construct PIP ward + month table
  // IDs likely: str:value:PIP_Monthly_new:....:E05011118
  const sampleWardId = sample.children[0].id;
  const codePart = sampleWardId.split(':').pop();
  const pipWardPrefix = sampleWardId.slice(0, sampleWardId.lastIndexOf(':') + 1);
  console.log('pipWardPrefix', pipWardPrefix, 'example code', codePart);

  const sampleMonthId = mSample.children.at(-1).id;
  console.log('sampleMonthId', sampleMonthId);
  // extract pattern for yyyymm
  const pipMonthPrefix = sampleMonthId.replace(/:\d{6}$/, ':').replace(/:\d{4}-\d{2}$/, ':');
  // better: replace trailing code
  const monthTail = sampleMonthId.split(':').pop();
  const pipMonthBase = sampleMonthId.slice(0, sampleMonthId.length - monthTail.length);

  const pipMonths = ['202602', '202501', '202401'];
  // try formats
  for (const fmt of pipMonths.map((m) => pipMonthBase + m)) {
    console.log('try month id', fmt);
  }

  const bodyPip = {
    database: pipDb,
    measures: [pipCount.id],
    recodes: {
      [pipMonth.id]: {
        map: [[sampleMonthId]], // just latest from list
      },
      [wardF.id]: {
        map: wards.map((w) => [pipWardPrefix + w]),
      },
    },
    dimensions: [[pipMonth.id], [wardF.id]],
  };
  try {
    const pt = await sx('/table', { method: 'POST', body: JSON.stringify(bodyPip) });
    writeFileSync(join(ROOT, 'scripts', '_sx-pip-sample.json'), JSON.stringify(pt, null, 2));
    console.log(
      'PIP table OK',
      pt.fields.map((f) => f.label + ':' + f.items.length),
      JSON.stringify(pt.cubes[pipCount.id]?.values).slice(0, 300)
    );
  } catch (e) {
    console.log('PIP table fail', e.message.slice(0, 400));
  }

  // Disability category x Birmingham LA for one month
  // Use LA valueset under ward field or OAs field
  const laVs = (wNode.children || []).find((c) => /Local Authority/i.test(c.label));
  if (laVs) {
    const la = await sx(`/schema/${encodeURIComponent(laVs.id)}?codes=E08000025`);
    console.log('PIP Bham LA', la.children?.[0]?.id, la.children?.[0]?.label);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
