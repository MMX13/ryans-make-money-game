/* Balance simulation: pack EV per set and bot pacing to the net worth milestones. */
import { SETS, type SetId } from '../src/engine/data';
import * as G from '../src/engine/game';
import { UPGRADES, type UpgradeId } from '../src/engine/config';

function evTable() {
  console.log('\nPack EV (hype 1.0, 20k packs per set)');
  console.log('set        price   market/pack  dealer/pack  hit share  p(UR+)');
  for (const set of SETS) {
    const s = G.newGame(0, 12345);
    s.licenses = SETS.map((x) => x.id);
    s.upgrades.autoBulk = 0;
    const N = 20000;
    let total = 0, hit = 0, big = 0;
    for (let i = 0; i < N; i++) {
      s.packs[set.id] = 1;
      s.opened[set.id] = 999; // ignore 1st edition
      const res = G.openPack(s, set.id)!;
      total += res.total;
      hit += res.cards[4].value;
      if (res.cards.some((c) => ['UR', 'SEC'].includes(G.card(c.inst).rarity))) big++;
      s.cards.length = 0;
      s.seen = {};
    }
    const m = total / N / set.packPrice;
    console.log(`${set.name.padEnd(16)} ${String(set.packPrice).padStart(5)}   ${m.toFixed(3).padStart(8)}     ${(m * G.dealerRate(s)).toFixed(3).padStart(8)}     ${(hit / total).toFixed(2)}      ${(big / N).toFixed(3)}`);
  }
}

interface BotOpts { listRatio: number; gradeMin: number; seconds: number; dealerBelow: number; backlog: number }

function bot(seed: number, opts: BotOpts) {
  const s = G.newGame(0, seed);
  let t = 0;
  const marks: Record<number, number> = {};
  const spendTime = (sec: number) => { t += sec * 1000; G.advance(s, t); };
  const sets = SETS.map((x) => x.id);
  const reachedAt = (m: number) => marks[m];
  let lastLog = 0;
  let waiting = 0;
  while (t < opts.seconds * 1000) {
    // licenses
    for (const set of sets) {
      if (!G.hasLicense(s, set)) {
        const lic = SETS.find((x) => x.id === set)!.license;
        if (s.cash > lic * 1.6) { G.buyLicense(s, set); spendTime(2); }
        break;
      }
    }
    // upgrades
    for (const id of Object.keys(UPGRADES) as UpgradeId[]) {
      const c = G.upgradeCost(s, id);
      if (c !== null && c < s.cash * 0.12) { G.buyUpgrade(s, id); spendTime(1); }
    }
    if (s.freePacks > 0) { G.claimFreePack(s); spendTime(1); }
    if (G.isBroke(s)) { G.claimCharity(s); }
    // choose set: highest whose pack costs <= cash/6
    const owned = s.licenses;
    let pick: SetId = owned[0];
    for (const id of owned) if (G.packPrice(s, id) <= s.cash / 6) pick = id;
    const totalPacks = sets.reduce((a, id) => a + s.packs[id], 0);
    if (totalPacks === 0 && waiting <= G.listingSlots(s) * opts.backlog) {
      const price = G.packPrice(s, pick);
      const buyBox = G.boxPrice(s, pick) <= s.cash * 0.6;
      if (buyBox) G.buyPacks(s, pick, 12, true);
      else { const n = Math.min(12, Math.floor((s.cash * 0.8) / price)); if (n > 0) G.buyPacks(s, pick, n); }
      spendTime(2);
    }
    // open
    for (const id of sets) while (s.packs[id] > 0) { G.openPack(s, id); spendTime(2.5); }
    // bulk
    const bulk = G.bulkCandidates(s);
    if (bulk.length) { G.sellCards(s, bulk, true); spendTime(1); }
    // requests
    for (const q of [...s.requests]) {
      const m = s.cards.find((c) => G.requestMatches(q, c));
      if (m) { G.fulfilRequest(s, q.id, m.uid); spendTime(3); }
    }
    // bounties
    for (const id of owned) if (!s.bounties.includes(id) && G.setProgress(s, id).owned >= 24) { G.claimBounty(s, id); spendTime(1); }
    // crack slabs
    for (const g of [...s.grading]) if (g.doneAt <= s.now) { G.crackSlab(s, g.uid); spendTime(2); }
    // dispose of the binder: grade good ones, list valuable ones, dealer the rest (keep 1 of each for sets)
    const binder = s.cards.filter((c) => c.status === 'binder').sort((a, b) => G.value(s, b) - G.value(s, a));
    const keep = new Set<string>();
    waiting = 0;
    const toDealer: G.CardInst[] = [];
    for (const c of binder) {
      const v = G.value(s, c);
      const def = G.card(c);
      const [lo] = G.gradeEstimate(s, c);
      const grader = G.hasLicense(s, 'electric') && v > 400 ? 'gold' : 'plat';
      if (c.grade === undefined && lo >= opts.gradeMin && v > G.gradingFee(s, c, grader) * 3 && s.grading.length < G.gradingSlots(s)) {
        if (G.submitGrading(s, c.uid, grader)) { spendTime(3); continue; }
      }
      if (!keep.has(c.cardId) && !s.bounties.includes(def.set)) { keep.add(c.cardId); continue; }
      const packP = G.packPrice(s, def.set);
      if (v > packP * opts.dealerBelow) {
        if (s.listings.length < G.listingSlots(s)) { G.listCard(s, c.uid, v * opts.listRatio); spendTime(3); }
        else waiting++;
        continue;
      }
      toDealer.push(c);
    }
    if (toDealer.length) { G.sellCards(s, toDealer); spendTime(1); }
    // if stuck waiting on listings with no cash, just wait
    spendTime(1);
    const nw = G.netWorth(s);
    for (const m of [1e3, 1e4, 1e5, 1e6]) if (nw >= m && !marks[m]) marks[m] = t;
    if (marks[1e6]) break;
    if (t - lastLog > 30 * 60_000) { lastLog = t; }
  }
  return { marks, s, reachedAt };
}

if (!process.env.NOEV) evTable();
const opts: BotOpts = { listRatio: 1.0, gradeMin: 9, seconds: 8 * 3600, dealerBelow: Number(process.env.DB ?? 0.15), backlog: Number(process.env.BL ?? 2) };
console.log('\nBot pacing (minutes to reach net worth)');
console.log('seed    $1k    $10k   $100k   $1M    packs  graded  requests');
for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
  const { marks, s } = bot(seed, opts);
  const f = (m: number) => (marks[m] ? (marks[m] / 60000).toFixed(0) : '—').padStart(6);
  console.log(`${String(seed).padEnd(5)} ${f(1e3)} ${f(1e4)} ${f(1e5)} ${f(1e6)}  ${String(s.stats.packsOpened).padStart(6)}  ${String(s.stats.graded).padStart(6)}  ${String(s.stats.requests).padStart(6)}   nw ${G.fmtMoney(G.netWorth(s))}`);
  if (process.env.LEDGER) console.log('   ', Object.entries(s.stats.ledger).map(([k, v]) => `${k}:${G.fmtMoney(v, true)}`).join(' '));
}
