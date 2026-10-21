// Takes phone-sized screenshots of the built game. Usage:
//   node scripts/shots.mjs <outDir> [url]
// Requires `npm run preview` (or any static server) to be running.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const out = process.argv[2] ?? 'shots';
const url = process.argv[3] ?? 'http://localhost:4173/';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const shot = async (name) => { await page.waitForTimeout(400); await page.screenshot({ path: `${out}/${name}.png` }); };
const click = async (sel) => { await page.locator(sel).first().click(); await page.waitForTimeout(300); };

await page.goto(url);
await page.waitForTimeout(800);
await shot('01-shop-start');
await click('text=Claim');
await click('.nav-btn:has-text("Rip")');
await shot('02-rip');
await click('text=Rip one open');
await shot('03-pack');
await click('.tear-zone');
await page.waitForTimeout(2600);
await shot('04-reveal');
for (let i = 0; i < 8; i++) {
  const sum = await page.locator('.summary-phase').count();
  if (sum) break;
  const holdable = await page.locator('.flip-card.holdable').count();
  if (holdable) {
    const box = await page.locator('.flip-card').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); await page.waitForTimeout(1500); await page.mouse.up();
  } else {
    await page.locator('.flip-card').click();
  }
  await page.waitForTimeout(700);
  if (i === 1) await shot('05-flipped');
}
await shot('06-summary');
await click('text=Done');
// give money to explore
await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('rail-riches-save-v1'));
  void raw;
});
await click('.nav-btn:has-text("Binder")');
await shot('07-binder');
await click('.seg button:has-text("All cards")');
await shot('08-binder-all');
await click('.list-row');
await shot('09-card-sheet');
await page.keyboard.press('Escape');
await page.locator('.sheet-wrap').first().click({ position: { x: 10, y: 10 } }).catch(() => {});
await click('.nav-btn:has-text("Market")');
await shot('10-market');
await click('.nav-btn:has-text("Grading")');
await shot('11-grading');
await click('.menu-btn');
await shot('12-menu');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
await browser.close();
