// Renders every card in each set's binder view. Usage: node scripts/gallery.mjs <outDir> [url]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const out = process.argv[2] ?? 'gallery';
const url = (process.argv[3] ?? 'http://localhost:4173/') + '?debug';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 1500 }, deviceScaleFactor: 2 })).newPage();
await page.goto(url);
await page.waitForTimeout(500);
await page.evaluate(() => {
  const { useStore } = window.__rr;
  useStore.getState().act((g) => {
    g.tutorial = 31; g.licenses = ['iron', 'diesel', 'electric', 'bullet', 'maglev'];
    for (const set of ['IH', 'DD', 'EA', 'BD', 'MF']) for (let i = 1; i <= 25; i++) {
      g.cards.push({ uid: g.nextUid++, cardId: `${set}-${String(i).padStart(2, '0')}`, variety: 'std', first: false, tg: 9, z: 0, status: 'binder', at: Date.now() });
    }
  });
});
await page.locator('.nav-btn:has-text("Binder")').click();
const sets = ['iron', 'diesel', 'electric', 'bullet', 'maglev'];
for (const s of sets) {
  await page.evaluate((s) => window.__rr.useStore.getState().setBinderSet(s), s);
  await page.waitForTimeout(500);
  await page.locator('.binder-grid').screenshot({ path: `${out}/${s}.png` });
}
await browser.close();
