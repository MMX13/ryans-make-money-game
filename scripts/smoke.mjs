// End-to-end smoke test: drives every major flow in a phone-sized browser and
// fails on any page error. Usage: node scripts/smoke.mjs [url]   (needs `npm run preview`)
import { chromium } from 'playwright-core';

const url = (process.argv[2] ?? 'http://localhost:4173/') + '?debug';
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const step = async (name, fn) => {
  try { await fn(); console.log('ok  ', name); } catch (e) { errors.push(`${name}: ${e.message.split('\n')[0]}`); console.log('FAIL', name); }
  if (await page.locator('.crash').count()) { errors.push(`${name}: error boundary shown`); await page.locator('.crash .btn.primary').click(); }
};
const st = (fn, arg) => page.evaluate(fn, arg);

await page.goto(url);
await page.waitForTimeout(600);
await step('claim free pack', () => page.locator('.free-card .btn').first().click());
await step('open a pack fully', async () => {
  await page.locator('.nav-btn:has-text("Rip")').click();
  await page.locator('text=Rip one open').click();
  await page.locator('.tear-zone').click();
  for (let i = 0; i < 40 && !(await page.locator('.summary-phase').count()); i++) {
    const hold = await page.locator('.flip-card.holdable').count();
    if (hold) {
      const b = await page.locator('.flip-card').boundingBox();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(1500); await page.mouse.up();
    } else if (await page.locator('.flip-card').count()) await page.locator('.flip-card').click();
    await page.waitForTimeout(450);
  }
  if (!(await page.locator('.summary-phase').count())) throw new Error('never reached summary');
  await page.locator('.sum-actions .btn:has-text("Done")').click();
});
await step('rich state + forced hits', () => st(() => {
  const { useStore, G } = window.__rr;
  useStore.getState().act((g) => { g.cash = 300000; g.tutorial = 31; g.licenses = ['iron', 'diesel', 'electric', 'bullet', 'maglev']; g.packs.maglev = 2; g.packs.electric = 24; });
}));
await step('forced UR fake-out pack', async () => {
  await st(() => { const { useStore, G } = window.__rr; const s = useStore.getState(); const r = s.act((g) => G.openPack(g, 'maglev', { hit: 'UR', fake: true })); s.setOpening({ set: 'maglev', results: [r], quick: false }); });
  await page.locator('.opening .btn:has-text("Skip")').waitFor({ timeout: 3000 }).catch(() => {});
  await page.locator('.tear-zone').click();
  await page.waitForTimeout(900);
  await page.locator('.opening .btn:has-text("Skip")').click();
  await page.locator('.sum-actions .btn:has-text("Done")').click();
});
await step('quick-open with showcase', async () => {
  await st(() => { const { useStore, G } = window.__rr; const s = useStore.getState(); const rs = s.act((g) => { const o = [G.openPack(g, 'electric', { hit: 'SEC' })]; while (g.packs.electric > 0) o.push(G.openPack(g, 'electric')); return o; }); s.setOpening({ set: 'electric', results: rs, quick: true }); });
  await page.waitForTimeout(500);
  for (let i = 0; i < 10 && (await page.locator('.card-stage.showcase').count()); i++) { await page.locator('.opening').click(); await page.waitForTimeout(300); }
  await page.locator('.sum-actions .btn:has-text("Done")').click();
});
await step('list a card', async () => {
  await page.locator('.nav-btn:has-text("Binder")').click();
  await page.locator('.seg button:has-text("All cards")').click();
  await page.locator('.list-row').first().click();
  await page.locator('text=List on marketplace').click();
  await page.locator('text=List it').click();
});
await step('grade and crack a slab', async () => {
  await st(() => { const { useStore, G } = window.__rr; useStore.getState().act((g) => { const c = g.cards.find((x) => x.status === 'binder' && x.grade === undefined); G.submitGrading(g, c.uid, 'gold'); g.grading.forEach((x) => { x.doneAt = Date.now() - 1; }); }); });
  await page.locator('.nav-btn:has-text("Grading")').click();
  await page.locator('text=Crack it!').first().click();
  await page.waitForTimeout(400);
  await page.locator('.slab-reveal').click();
  await page.waitForTimeout(700);
  await page.locator('.slab-reveal').click();
});
await step('market, deliver, singles', async () => {
  await page.locator('.nav-btn:has-text("Market")').click();
  const d = page.locator('.request .btn:has-text("Deliver")');
  if (await d.count()) await d.first().click();
  await page.locator('.single .btn').first().click();
});
await step('menu sheets', async () => {
  for (const item of ['Upgrades', 'Display Case', 'Achievements', 'Stats', 'How to play', 'Settings']) {
    await page.locator('.menu-btn').click();
    await page.locator(`.menu-item:has-text("${item}")`).click();
    await page.waitForTimeout(200);
    await page.locator('.sheet-head .icon-btn').last().click();
  }
});
await step('display a card', async () => {
  await page.locator('.menu-btn').click();
  await page.locator('.menu-item:has-text("Display Case")').click();
  await page.locator('.display-empty').first().click();
  await page.locator('.sheet .list-row').first().click();
  const w = await page.locator('.display-slot .card').first().evaluate((el) => el.getBoundingClientRect().width);
  if (w < 20) throw new Error('display card has no width');
});
await step('victory at $1M', async () => {
  await page.evaluate(() => window.__rr.useStore.getState().closeAll());
  await st(() => window.__rr.useStore.getState().act((g) => { g.cash = 1_200_000; }));
  await page.locator('.victory').waitFor({ timeout: 5000 });
});
await step('reload keeps progress', async () => {
  await page.waitForTimeout(5500);
  await page.reload();
  await page.waitForTimeout(800);
  const cash = await st(() => window.__rr.useStore.getState().game.cash);
  if (cash < 1_000_000) throw new Error('cash lost on reload: ' + cash);
});

await browser.close();
if (errors.length) { console.error('\nSMOKE FAILED:\n' + errors.join('\n')); process.exit(1); }
console.log('\nsmoke test passed');
