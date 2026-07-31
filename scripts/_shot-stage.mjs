import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const out = 'scripts/_shots';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 180));
});

async function openStage(chipRe, label) {
  await page.goto('http://localhost:3000/review', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(1500);
  const chip = page.locator('button.review-chip', { hasText: chipRe });
  if (!(await chip.count())) {
    console.log('missing chip', label, 'all:', await page.locator('button.review-chip').allTextContents());
    return false;
  }
  await chip.first().click();
  console.log('clicked', label);
  await page.waitForTimeout(5000);
  await page.waitForFunction(
    () => {
      const t = document.body.innerText;
      return t.includes('BIRMINGHAM') || t.includes('69 WARDS') || !!document.querySelector('canvas');
    },
    { timeout: 25000 }
  ).catch(() => {});
  await page.waitForTimeout(1500);
  return true;
}

async function shotStage(label) {
  const canvas = page.locator('.stage-root canvas').first();
  await canvas.waitFor({ state: 'visible', timeout: 30000 });
  await page.screenshot({ path: `${out}/${label}.png`, fullPage: false });
  console.log('wrote', label + '.png');

  const box = await canvas.boundingBox();
  if (!box) {
    console.log('no canvas box');
    return;
  }

  let hit = false;
  let hitText = '';
  // Dense probe over the map region (city sits mid-lower in frame)
  outer: for (let fy = 0.35; fy <= 0.72; fy += 0.04) {
    for (let fx = 0.28; fx <= 0.72; fx += 0.04) {
      await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy);
      await page.waitForTimeout(120);
      const hud = page.locator('[data-testid="stage-hover-hud"]');
      if (await hud.count()) {
        hit = true;
        hitText = (await hud.innerText()).replace(/\s+/g, ' ');
        console.log(label, 'hover HIT', fx.toFixed(2), fy.toFixed(2), hitText);
        break outer;
      }
    }
  }
  console.log(label, 'hover', hit ? 'OK' : 'MISS');
  await page.screenshot({ path: `${out}/${label}-hover.png`, fullPage: false });
  console.log('wrote', label + '-hover.png');

  // Orbit drag only (no click navigation risk)
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.68, box.y + box.height * 0.42, { steps: 16 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/${label}-orbit.png`, fullPage: false });
  console.log('wrote', label + '-orbit.png');
}

// Fresh load per stage to avoid HMR/state bleed
const stages = [
  [/UC Stage/i, 'uc-stage'],
  [/Ozzy Stage/i, 'ozzy-stage'],
  [/PIP Stage/i, 'pip-stage'],
];

for (const [re, file] of stages) {
  const ok = await openStage(re, file);
  if (ok) await shotStage(file);
}

await browser.close();
console.log('done');
