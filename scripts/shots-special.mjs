// Screenshots of special states using the ?debug hook. Usage: node scripts/shots-special.mjs <outDir> [url]
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const out = process.argv[2] ?? 'shots';
const url = (process.argv[3] ?? 'http://localhost:4173/') + '?debug';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const shot = async (name, wait = 400) => { await page.waitForTimeout(wait); await page.screenshot({ path: `${out}/${name}.png` }); };

await page.goto(url);
await page.waitForTimeout(600);
// rich player with all licenses and a variety showcase
await page.evaluate(() => {
  const { useStore, G } = window.__rr;
  useStore.getState().act((g) => {
    g.cash = 250000; g.tutorial = 9;
    g.licenses = ['iron', 'diesel', 'electric', 'bullet', 'maglev'];
    const add = (cardId, variety, first, grade, grader) => g.cards.push({ uid: g.nextUid++, cardId, variety, first, tg: grade ?? 9, z: 0.2, status: 'binder', at: Date.now(), grade, grader });
    add('IH-23', 'std', true); add('IH-24', 'holo', false); add('DD-21', 'full', false); add('EA-23', 'gold', true);
    add('BD-24', 'misprint', false); add('MF-25', 'std', false); add('IH-21', 'holo', true, 10, 'plat'); add('MF-23', 'full', false, 9.5, 'gold');
    for (let i = 0; i < 6; i++) G.openPack(g, 'diesel') || (g.packs.diesel = 6);
    g.packs.maglev = 3;
  });
});
await page.locator('.nav-btn:has-text("Binder")').click();
await page.locator('.seg button:has-text("All cards")').click();
await shot('20-all');
await page.locator('.list-row').nth(0).click();
await shot('21-sheet-top');
await page.evaluate(() => window.__rr.useStore.getState().closeAll());
await page.locator('.list-row').nth(3).click();
await shot('22-sheet-gold');
await page.evaluate(() => window.__rr.useStore.getState().closeAll());
// open a forced UR pack with a fake-out
await page.evaluate(() => {
  const { useStore, G } = window.__rr;
  const st = useStore.getState();
  st.act((g) => { g.packs.maglev = 3; });
  const res = st.act((g) => G.openPack(g, 'maglev', { hit: 'UR', fake: true }));
  st.setOpening({ set: 'maglev', results: [res], quick: false });
});
await shot('23-maglev-pack');
await page.locator('.tear-zone').click();
await page.waitForTimeout(900);
const flags = {};
for (let i = 0; i < 40 && !(await page.locator('.summary-phase').count()); i++) {
  const glow = await page.locator('.flip-card:not(.flipped) .card-back.glow').count();
  const cracked = await page.locator('.flip-card.cracked:not(.flipped)').count();
  const holdable = await page.locator('.flip-card.holdable:not(.flipped)').count();
  const flipped = await page.locator('.flip-card.flipped').count();
  const burst = await page.locator('.burst .rays').count();
  if (holdable) {
    if (!flags.cracked) { flags.cracked = 1; await shot('26-cracked', 300); }
    const box = await page.locator('.flip-card').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(800);
    await shot('27-charging', 0);
    await page.waitForTimeout(700);
    await page.mouse.up();
    await page.waitForTimeout(350);
    await shot('28-ur-burst', 0);
    await page.waitForTimeout(1300);
    await shot('29-ur-settled', 0);
    continue;
  }
  if (glow && !cracked && !flags.glow) { flags.glow = 1; await shot('25-hit-glow', 300); await page.locator('.flip-card').click(); await page.waitForTimeout(500); continue; }
  if (flipped && !flags.unc) { flags.unc = 1; await shot('24-uncommon', 300); }
  if (!glow && !flipped && !holdable && i > 0) { await page.locator('.flip-card').click(); await page.waitForTimeout(500); continue; }
  if (flipped) { await page.locator('.flip-card').click(); await page.waitForTimeout(500); continue; }
  await page.waitForTimeout(300);
  void burst;
}
await shot('30-summary', 800);
await page.locator('text=Done').click();
// quick open
await page.evaluate(() => {
  const { useStore, G } = window.__rr;
  const st = useStore.getState();
  st.act((g) => { g.packs.electric = 24; });
  const results = st.act((g) => { const o = []; while (g.packs.electric > 0) o.push(G.openPack(g, 'electric')); return o; });
  st.setOpening({ set: 'electric', results, quick: true });
});
await shot('31-quick', 1200);
await page.evaluate(() => window.__rr.useStore.getState().setOpening(null));
await page.locator('.nav-btn:has-text("Shop")').click();
await shot('32-shop-rich');
await page.locator('.nav-btn:has-text("Market")').click();
await shot('33-market-rich');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
