import { CARDS, CARDS_BY_SET, CARD_BY_ID, SETS, SET_BY_ID, BASE_COUNT, type CardDef, type Rarity, type SetId } from './data';
import * as C from './config';
import type { GraderId, UpgradeId, Variety } from './config';
import { Rng } from './rng';

export const SAVE_VERSION = 1;

export type CardStatus = 'binder' | 'listed' | 'grading' | 'display';

export interface CardInst {
  uid: number;
  cardId: string;
  variety: Variety;
  first: boolean;
  /** Hidden true condition grade. */
  tg: number;
  /** Standard-normal noise for the condition estimate. */
  z: number;
  grade?: number;
  grader?: GraderId;
  status: CardStatus;
  fav?: boolean;
  at: number;
}

export interface Listing { uid: number; price: number; at: number }
export interface Submission { uid: number; grader: GraderId; doneAt: number; fee: number }
export interface Request {
  id: number;
  cardId: string;
  needVariety: boolean;
  minGrade: number;
  pay: number;
  expiresAt: number;
  who: string;
}
export interface Single { id: number; cardId: string; variety: Variety; tg: number; z: number }

export type EventKind = 'boom' | 'crash' | 'holo' | 'gradeRush' | 'convention' | 'sale';
export interface MarketEvent { kind: EventKind; set?: SetId; startAt: number; endAt: number; target?: number }

export type NoticeKind = 'sale' | 'grade' | 'request' | 'event' | 'achievement' | 'milestone' | 'info' | 'free';
export interface Notice { id: number; kind: NoticeKind; text: string; amount?: number }

export interface Stats {
  packsOpened: number;
  cardsPulled: number;
  earned: number;
  spent: number;
  sales: number;
  biggestSale: number;
  graded: number;
  tens: number;
  requests: number;
  bestPull: { cardId: string; variety: Variety; first: boolean; value: number } | null;
  playMs: number;
  displayEarned: number;
  bulkSold: number;
  ledger: Record<string, number>;
}

export interface GameState {
  version: number;
  seed: number;
  createdAt: number;
  now: number;
  lastMarketTick: number;
  cash: number;
  nextUid: number;
  nextId: number;
  cards: CardInst[];
  packs: Record<SetId, number>;
  licenses: SetId[];
  opened: Record<SetId, number>;
  pity: Record<SetId, number>;
  seen: Record<string, true>;
  hype: Record<SetId, number>;
  hypeHist: Record<SetId, number[]>;
  demand: Record<string, number>;
  sealedDemand: Record<SetId, number>;
  packCost: Record<SetId, number>;
  /** Unopened packs that were free (not part of the cost basis). */
  freeHeld: Record<SetId, number>;
  /** Set once `tutorial` holds a bitmask of finished tips. */
  tutorialBits?: boolean;
  event: MarketEvent | null;
  nextEventAt: number;
  listings: Listing[];
  grading: Submission[];
  requests: Request[];
  singles: Single[];
  nextSinglesAt: number;
  display: (number | null)[];
  upgrades: Record<UpgradeId, number>;
  freePacks: number;
  nextFreeAt: number;
  bounties: SetId[];
  achievements: string[];
  milestones: number[];
  stats: Stats;
  notices: Notice[];
  settings: { sound: boolean; haptics: boolean; reducedMotion: boolean };
  tutorial: number;
}

const ALL_SETS = SETS.map((s) => s.id);
const zeroBySet = <T,>(v: T) => Object.fromEntries(ALL_SETS.map((s) => [s, v])) as Record<SetId, T>;

export function newGame(now: number, seed = (Math.random() * 2 ** 32) >>> 0): GameState {
  const s: GameState = {
    version: SAVE_VERSION,
    seed,
    createdAt: now,
    now,
    lastMarketTick: now,
    cash: C.START_CASH,
    nextUid: 1,
    nextId: 1,
    cards: [],
    packs: zeroBySet(0),
    licenses: ['iron'],
    opened: zeroBySet(0),
    pity: zeroBySet(0),
    seen: {},
    hype: zeroBySet(1),
    hypeHist: Object.fromEntries(ALL_SETS.map((id) => [id, [1]])) as Record<SetId, number[]>,
    demand: {},
    sealedDemand: zeroBySet(1),
    packCost: zeroBySet(0),
    freeHeld: zeroBySet(0),
    tutorialBits: true,
    event: null,
    nextEventAt: now + 8 * 60_000,
    listings: [],
    grading: [],
    requests: [],
    singles: [],
    nextSinglesAt: now,
    display: [null, null],
    upgrades: { haggle: 0, listings: 0, display: 0, loupe: 0, gradeSlots: 0, autoBulk: 0 },
    freePacks: 1,
    nextFreeAt: now + C.FREE_PACK_MS,
    bounties: [],
    achievements: [],
    milestones: [],
    stats: { packsOpened: 0, cardsPulled: 0, earned: 0, spent: 0, sales: 0, biggestSale: 0, graded: 0, tens: 0, requests: 0, bestPull: null, playMs: 0, displayEarned: 0, bulkSold: 0, ledger: {} },
    notices: [],
    settings: { sound: true, haptics: true, reducedMotion: false },
    tutorial: 0,
  };
  refreshSingles(s);
  fillRequests(s);
  return s;
}

function rng(s: GameState) {
  const r = new Rng(s.seed);
  return {
    r,
    done: () => { s.seed = r.state; },
  };
}

/** Runs fn with a seeded RNG and writes the advanced seed back. */
function withRng<T>(s: GameState, fn: (r: Rng) => T): T {
  const { r, done } = rng(s);
  try { return fn(r); } finally { done(); }
}

export function notify(s: GameState, kind: NoticeKind, text: string, amount?: number) {
  s.notices.push({ id: s.nextId++, kind, text, amount });
  if (s.notices.length > 40) s.notices.splice(0, s.notices.length - 40);
}

// ---------------------------------------------------------------- values

export const card = (inst: { cardId: string }): CardDef => CARD_BY_ID[inst.cardId];

export function eventActive(s: GameState, kind: EventKind, set?: SetId): boolean {
  const e = s.event;
  return !!e && e.kind === kind && s.now >= e.startAt && s.now < e.endAt && (set === undefined || e.set === set);
}

/** Gold and Misprint cards are always worth a real amount, even on a common. */
export function varietyBase(def: CardDef, variety: Variety): number {
  const b = baseValue(def);
  if (variety === 'gold' || variety === 'misprint') return Math.max(b, SET_BY_ID[def.set].packPrice * C.SPECIAL_BASE_FLOOR * C.SET_VALUE_BOOST[def.set]);
  return b;
}

export function baseValue(def: CardDef): number {
  return SET_BY_ID[def.set].packPrice * C.RARITY_VALUE[def.rarity] * def.pop * C.SET_VALUE_BOOST[def.set];
}

export function itemMult(inst: Pick<CardInst, 'variety' | 'first' | 'grade' | 'grader'>, holoCraze = false): number {
  let m = C.VARIETY_MULT[inst.variety] * (inst.first ? C.FIRST_EDITION_MULT : 1);
  if (holoCraze && inst.variety === 'holo') m *= 1.5;
  if (inst.grade !== undefined) m *= C.gradeMult(inst.grade) * C.GRADERS[inst.grader ?? 'plat'].bonus;
  return Math.min(m, C.MAX_ITEM_MULT);
}

/** Current market value of a card instance (or a hypothetical one). */
export function value(s: GameState, inst: Pick<CardInst, 'cardId' | 'variety' | 'first' | 'grade' | 'grader'>): number {
  const def = CARD_BY_ID[inst.cardId];
  const d = s.demand[inst.cardId] ?? 1;
  return round2(varietyBase(def, inst.variety) * itemMult(inst, eventActive(s, 'holo')) * s.hype[def.set] * d);
}

export function dealerRate(s: GameState): number {
  return C.DEALER_BASE + C.DEALER_PER_HAGGLE * s.upgrades.haggle;
}

export function dealerPrice(s: GameState, inst: CardInst): number {
  return round2(value(s, inst) * dealerRate(s));
}

export function packPrice(s: GameState, set: SetId): number {
  return round2(SET_BY_ID[set].packPrice * s.hype[set]);
}

export function boxDiscount(s: GameState): number {
  return eventActive(s, 'sale') ? 0.2 : C.BOX_DISCOUNT;
}

export function boxPrice(s: GameState, set: SetId): number {
  return round2(packPrice(s, set) * C.BOX_SIZE * (1 - boxDiscount(s)));
}

/** Average of the recent hype history (sealed buyers are slow to react to spikes). */
export function avgHype(s: GameState, set: SetId): number {
  const h = s.hypeHist[set].slice(-10);
  return h.reduce((a, b) => a + b, 0) / h.length;
}

export function sealedResale(s: GameState, set: SetId): number {
  const hype = Math.min(s.hype[set], avgHype(s, set));
  return round2(SET_BY_ID[set].packPrice * hype * C.SEALED_RESALE * (s.sealedDemand[set] ?? 1));
}

export function netWorth(s: GameState): number {
  let w = s.cash;
  for (const c of s.cards) w += Math.max(dealerPrice(s, c), value(s, c) * C.NET_WORTH_CARD_RATE);
  for (const set of ALL_SETS) w += s.packs[set] * sealedResale(s, set);
  return round2(w);
}

/**
 * Honest odds of each grade given what the player can see. The visible reading
 * is the true grade plus noise (smaller with a better loupe); this is the
 * Bayesian posterior over the true grade given that reading.
 */
export function gradeOdds(s: GameState, inst: Pick<CardInst, 'tg' | 'z'>): [number, number][] {
  const sigma = C.LOUPE_SIGMA[s.upgrades.loupe];
  const reading = inst.tg + inst.z * sigma;
  const w = C.GRADE_DIST.map(([g, p]) => [g, p * Math.exp(-((reading - g) ** 2) / (2 * sigma * sigma))] as [number, number]);
  const total = w.reduce((a, [, x]) => a + x, 0) || 1;
  return w.map(([g, x]) => [g, x / total]);
}

/** Expected grade multiplier (before grader bonus) given the visible condition. */
export function expectedGradeMult(s: GameState, inst: Pick<CardInst, 'tg' | 'z'>): number {
  return gradeOdds(s, inst).reduce((a, [g, p]) => a + p * C.gradeMult(g), 0);
}

/** The most likely grades, covering at least 80% of the odds. */
export function gradeEstimate(s: GameState, inst: Pick<CardInst, 'tg' | 'z'>): [number, number] {
  const odds = gradeOdds(s, inst).sort((a, b) => b[1] - a[1]);
  let acc = 0;
  const picked: number[] = [];
  for (const [g, p] of odds) { picked.push(g); acc += p; if (acc >= 0.8) break; }
  return [Math.min(...picked), Math.max(...picked)];
}

export function fmtEstimate(r: [number, number]): string {
  return r[0] === r[1] ? `${r[0]}` : `${r[0]}–${r[1]}`;
}

export function gradingFee(s: GameState, inst: CardInst, grader: GraderId): number {
  const g = C.GRADERS[grader];
  const raw = value(s, { ...inst, grade: undefined });
  const fee = g.flat + g.pct * raw;
  return round2(eventActive(s, 'gradeRush') ? fee / 2 : fee);
}

export function listingSlots(s: GameState) { return 3 + s.upgrades.listings; }
export function gradingSlots(s: GameState) { return 2 + s.upgrades.gradeSlots; }
export function displaySlots(s: GameState) { return 2 + s.upgrades.display; }

export function displayCap(s: GameState): number {
  let cap = 0;
  for (const id of s.licenses) cap = Math.max(cap, C.DISPLAY_CAP_BY_SET[id]);
  return cap;
}

export function displayRate(s: GameState, inst: CardInst): number {
  return Math.min(value(s, inst) * C.DISPLAY_PCT_PER_HOUR, displayCap(s));
}

// ---------------------------------------------------------------- packs

export interface PulledCard { inst: CardInst; isNew: boolean; autoSold: boolean; value: number }
export interface PackResult {
  set: SetId;
  cards: PulledCard[];
  god: boolean;
  fakeFrom: Rarity | null;
  first: boolean;
  total: number;
  autoSoldTotal: number;
  /** What the player paid for this pack (0 for free packs). */
  paid: number;
}

function rollVariety(r: Rng, rarity: Rarity): Variety {
  const x = r.next();
  let t = C.VARIETY_ODDS.misprint;
  if (x < t) return 'misprint';
  t += C.VARIETY_ODDS.gold;
  if (x < t) return 'gold';
  if (rarity === 'SR' || rarity === 'UR' || rarity === 'SEC') {
    t += C.VARIETY_ODDS.fullOfSR;
    if (x < t) return 'full';
  }
  t += C.VARIETY_ODDS.holo;
  if (x < t) return 'holo';
  return 'std';
}

function rollGrade(r: Rng): number {
  return r.weighted(C.GRADE_DIST);
}

function pickCard(r: Rng, set: SetId, rarity: Rarity, used: Set<string>): CardDef {
  const all = CARDS_BY_SET[set].filter((c) => c.rarity === rarity);
  const fresh = all.filter((c) => !used.has(c.id));
  const def = r.pick(fresh.length ? fresh : all);
  used.add(def.id);
  return def;
}

const NEXT_RARITY: Partial<Record<Rarity, Rarity>> = { R: 'SR', SR: 'UR', UR: 'SEC' };

export function hasLicense(s: GameState, set: SetId) { return s.licenses.includes(set); }

export function openPack(s: GameState, set: SetId, force?: { hit?: Rarity; god?: boolean; fake?: boolean }): PackResult | null {
  if (s.packs[set] <= 0) return null;
  // free packs are opened first and cost nothing; bought packs carry their average price
  let paid = 0;
  if ((s.freeHeld[set] ?? 0) > 0) s.freeHeld[set]--;
  else {
    paid = round2((s.packCost[set] ?? 0) / Math.max(1, s.packs[set] - (s.freeHeld[set] ?? 0)));
    s.packCost[set] = Math.max(0, round2((s.packCost[set] ?? 0) - paid));
  }
  s.packs[set]--;
  const first = s.opened[set] < C.FIRST_EDITION_PACKS;
  s.opened[set]++;
  s.stats.packsOpened++;
  const result = withRng(s, (r) => {
    const rarities: Rarity[] = [];
    const god = force?.god ?? (s.stats.packsOpened > 5 && r.chance(C.GOD_PACK));
    let fakeFrom: Rarity | null = null;
    if (god) {
      for (let i = 0; i < 5; i++) rarities.push(i < 2 ? 'SR' : r.weighted<Rarity>([['SR', 0.3], ['UR', 0.6], ['SEC', 0.1]]));
    } else {
      for (let i = 0; i < 3; i++) rarities.push(r.chance(C.COMMON_UPGRADE) ? 'U' : 'C');
      rarities.push('U');
      let hit = r.weighted(C.HIT_ODDS);
      if (s.pity[set] >= C.PITY_PACKS - 1 && (hit === 'R' || hit === 'SR')) hit = r.chance(0.82) ? 'UR' : 'SEC';
      if (s.stats.packsOpened === 3 && hit === 'R') hit = 'SR';
      if (force?.hit) hit = force.hit;
      if (force?.fake && hit !== 'R') { fakeFrom = hit === 'SR' ? 'R' : hit === 'UR' ? 'SR' : 'UR'; }
      else if (!force && hit !== 'SEC' && r.chance(C.FAKEOUT)) { fakeFrom = hit; hit = NEXT_RARITY[hit]!; }
      rarities.push(hit);
    }
    const hasBig = rarities.some((x) => x === 'UR' || x === 'SEC');
    s.pity[set] = hasBig ? 0 : s.pity[set] + 1;
    const used = new Set<string>();
    const cards: PulledCard[] = rarities.map((rarity) => {
      const def = pickCard(r, set, rarity, used);
      const inst: CardInst = {
        uid: s.nextUid++,
        cardId: def.id,
        variety: rollVariety(r, rarity),
        first,
        tg: rollGrade(r),
        z: r.normal(),
        status: 'binder',
        at: s.now,
      };
      const isNew = !s.seen[def.id];
      s.seen[def.id] = true;
      return { inst, isNew, autoSold: false, value: 0 };
    });
    return { set, cards, god, fakeFrom, first, total: 0, autoSoldTotal: 0, paid } as PackResult;
  });
  for (const pc of result.cards) {
    s.cards.push(pc.inst);
    pc.value = value(s, pc.inst);
    result.total += pc.value;
    s.stats.cardsPulled++;
    if (!s.stats.bestPull || pc.value > s.stats.bestPull.value) {
      s.stats.bestPull = { cardId: pc.inst.cardId, variety: pc.inst.variety, first: pc.inst.first, value: pc.value };
    }
  }
  result.total = round2(result.total);
  if (s.upgrades.autoBulk) {
    const sold = bulkCandidates(s, result.cards.map((c) => c.inst.uid));
    for (const pc of result.cards) {
      if (sold.includes(pc.inst)) { pc.autoSold = true; }
    }
    result.autoSoldTotal = sellCards(s, sold, true);
  }
  checkAchievements(s);
  return result;
}

export function buyPacks(s: GameState, set: SetId, count: number, asBox = false): boolean {
  if (!hasLicense(s, set) || !Number.isInteger(count) || count <= 0) return false;
  const cost = asBox ? boxPrice(s, set) : round2(packPrice(s, set) * count);
  const n = asBox ? C.BOX_SIZE : count;
  if (s.cash + 1e-9 < cost) return false;
  spend(s, cost, 'packs');
  s.packs[set] += n;
  s.packCost[set] = round2((s.packCost[set] ?? 0) + cost);
  return true;
}

export function sellSealed(s: GameState, set: SetId, count: number): number {
  const n = Math.min(Math.floor(count), s.packs[set]);
  if (!(n > 0)) return 0;
  let amt = 0;
  for (let i = 0; i < n; i++) {
    amt += sealedResale(s, set);
    s.sealedDemand[set] = Math.max(0.5, (s.sealedDemand[set] ?? 1) * (1 - C.SEALED_PRESSURE));
  }
  amt = round2(amt);
  // sell free packs first, then reduce the cost basis of bought ones proportionally
  const free = Math.min(n, s.freeHeld[set] ?? 0);
  s.freeHeld[set] = (s.freeHeld[set] ?? 0) - free;
  const boughtHeld = s.packs[set] - (s.freeHeld[set] + free);
  if (n - free > 0 && boughtHeld > 0) s.packCost[set] = Math.max(0, round2((s.packCost[set] ?? 0) * (1 - (n - free) / boughtHeld)));
  s.packs[set] -= n;
  earn(s, amt, 'sealed');
  return amt;
}

export function buyLicense(s: GameState, set: SetId): boolean {
  const def = SET_BY_ID[set];
  if (hasLicense(s, set) || s.cash < def.license) return false;
  const idx = ALL_SETS.indexOf(set);
  if (idx > 0 && !hasLicense(s, ALL_SETS[idx - 1])) return false;
  spend(s, def.license, 'licenses');
  s.licenses.push(set);
  notify(s, 'info', `${def.name} license acquired!`);
  refreshSingles(s);
  checkAchievements(s);
  return true;
}

// ---------------------------------------------------------------- selling

function book(s: GameState, cat: string, amt: number) {
  s.stats.ledger[cat] = round2((s.stats.ledger[cat] ?? 0) + amt);
}

function spend(s: GameState, amt: number, cat: string) {
  s.cash = round2(s.cash - amt);
  s.stats.spent = round2(s.stats.spent + amt);
  book(s, cat, -amt);
}

function earn(s: GameState, amt: number, cat: string) {
  s.cash = round2(s.cash + amt);
  s.stats.earned = round2(s.stats.earned + amt);
  book(s, cat, amt);
}

function pressure(s: GameState, cardId: string, delta: number) {
  const d = (s.demand[cardId] ?? 1) * (1 + delta);
  s.demand[cardId] = clamp(d, 0.5, 1.6);
}

function removeCard(s: GameState, uid: number) {
  const i = s.cards.findIndex((c) => c.uid === uid);
  if (i >= 0) s.cards.splice(i, 1);
  s.display = s.display.map((d) => (d === uid ? null : d));
}

/** Sells binder cards to the dealer. Returns cash received. */
export function sellCards(s: GameState, insts: CardInst[], bulk = false): number {
  let total = 0;
  const gone = new Set<number>();
  for (const inst of insts) {
    if (inst.status !== 'binder' || gone.has(inst.uid)) continue;
    total += dealerPrice(s, inst);
    pressure(s, inst.cardId, -C.DEMAND_SELL);
    gone.add(inst.uid);
    if (bulk) s.stats.bulkSold++;
  }
  if (gone.size) s.cards = s.cards.filter((c) => !gone.has(c.uid));
  total = round2(total);
  earn(s, total, bulk ? 'bulk' : 'dealer');
  if (!bulk) s.stats.sales += gone.size;
  if (total > s.stats.biggestSale && insts.length === 1) s.stats.biggestSale = total;
  checkAchievements(s);
  return total;
}

export function isBulkable(c: CardInst): boolean {
  const r = card(c).rarity;
  return (r === 'C' || r === 'U') && c.variety === 'std' && c.grade === undefined && !c.fav && c.status === 'binder';
}

/**
 * Duplicate Standard, ungraded, non-kept commons and uncommons. Always keeps at
 * least one copy of each card (the oldest). `onlyUids` limits the result to those cards.
 */
export function bulkCandidates(s: GameState, onlyUids?: number[]): CardInst[] {
  const copies = new Map<string, number>();
  for (const c of s.cards) if (c.status === 'binder') copies.set(c.cardId, (copies.get(c.cardId) ?? 0) + 1);
  const only = onlyUids ? new Set(onlyUids) : null;
  const out: CardInst[] = [];
  // sell unlimited copies before 1st Editions, newest first
  const order = s.cards.map((c, i) => [c, i] as [CardInst, number]).sort((a, b) => Number(a[0].first) - Number(b[0].first) || b[1] - a[1]);
  for (const [c] of order) {
    if (only && !only.has(c.uid)) continue;
    if (!isBulkable(c)) continue;
    const n = copies.get(c.cardId)!;
    if (n > 1) { out.push(c); copies.set(c.cardId, n - 1); }
  }
  return out;
}

export function listCard(s: GameState, uid: number, price: number): boolean {
  const inst = s.cards.find((c) => c.uid === uid);
  if (!inst || inst.status !== 'binder' || s.listings.length >= listingSlots(s) || !Number.isFinite(price) || price <= 0) return false;
  inst.status = 'listed';
  s.listings.push({ uid, price: round2(Math.max(0.01, price)), at: s.now });
  return true;
}

export function cancelListing(s: GameState, uid: number) {
  const i = s.listings.findIndex((l) => l.uid === uid);
  if (i < 0) return;
  s.listings.splice(i, 1);
  const inst = s.cards.find((c) => c.uid === uid);
  if (inst) inst.status = 'binder';
}

/** Expected seconds to sell at a given price ratio (price / value). */
export function listingSeconds(ratio: number): number {
  return Math.max(4, C.LISTING_BASE_SECONDS * Math.exp((ratio - 1) * C.LISTING_STEEPNESS));
}

export function listingFeeRate() { return C.LISTING_FEE; }

// ---------------------------------------------------------------- grading

export function submitGrading(s: GameState, uid: number, grader: GraderId): boolean {
  const inst = s.cards.find((c) => c.uid === uid);
  if (!inst || inst.status !== 'binder' || inst.grade !== undefined) return false;
  if (s.grading.length >= gradingSlots(s)) return false;
  if (!hasLicense(s, C.GRADERS[grader].needs)) return false;
  const fee = gradingFee(s, inst, grader);
  if (s.cash < fee) return false;
  spend(s, fee, 'grading');
  inst.status = 'grading';
  const secs = C.GRADERS[grader].seconds;
  s.grading.push({ uid, grader, doneAt: s.now + secs * 1000, fee });
  return true;
}

/** Reveal a finished grading submission. Returns the card with its grade. */
export function crackSlab(s: GameState, uid: number): CardInst | null {
  const i = s.grading.findIndex((g) => g.uid === uid && g.doneAt <= s.now);
  if (i < 0) return null;
  const sub = s.grading[i];
  s.grading.splice(i, 1);
  const inst = s.cards.find((c) => c.uid === uid);
  if (!inst) return null;
  inst.grade = inst.tg;
  inst.grader = sub.grader;
  inst.status = 'binder';
  s.stats.graded++;
  if (inst.grade >= 10) s.stats.tens++;
  checkAchievements(s);
  return inst;
}

// ---------------------------------------------------------------- display

export function setDisplay(s: GameState, slot: number, uid: number | null): boolean {
  if (slot < 0 || slot >= displaySlots(s)) return false;
  const next = uid === null ? null : s.cards.find((c) => c.uid === uid);
  if (uid !== null && (!next || next.status !== 'binder')) return false;
  const old = s.display[slot];
  if (old !== null && old !== undefined) {
    const o = s.cards.find((c) => c.uid === old);
    if (o) o.status = 'binder';
  }
  s.display[slot] = null;
  if (next) {
    next.status = 'display';
    s.display[slot] = next.uid;
  }
  checkAchievements(s);
  return true;
}

// ---------------------------------------------------------------- requests & singles

const COLLECTORS = ['Old Man Jenkins', 'Rail Fan Rita', 'Conductor Cole', 'Penny the Picker', 'Baron von Brake', 'Signalman Sid', 'Trainspotter Tess', 'Dr. Gauge', 'Captain Caboose', 'Lady Locomotive', 'Big Wheel Bob', 'Whistle Wendy'];

function unlockedCards(s: GameState): CardDef[] {
  return CARDS.filter((c) => hasLicense(s, c.set));
}

function makeRequest(s: GameState, r: Rng): Request {
  const pool = unlockedCards(s);
  const weights: Record<Rarity, number> = { C: 1, U: 1.5, R: 3, SR: 2, UR: 0.6, SEC: 0.15 };
  // favour the newest set a little so requests stay relevant
  const tierOf = (set: SetId) => s.licenses.indexOf(set);
  const topTier = s.licenses.length - 1;
  const setWeight = (set: SetId) => [1, 0.5, 0.15, 0.05, 0.02][topTier - tierOf(set)] ?? 0.02;
  const def = r.weighted(pool.map((c) => [c, weights[c.rarity] * setWeight(c.set)] as [CardDef, number]));
  const needVariety = def.rarity !== 'C' && r.chance(0.25);
  // only ask for graded copies of cards worth grading
  const gradeable = C.RARITY_VALUE[def.rarity] >= C.RARITY_VALUE.R;
  const minGrade = gradeable && r.chance(0.25) ? r.pick([8, 8, 9, 9, 9.5]) : 0;
  const hyp = { cardId: def.id, variety: (needVariety ? 'holo' : 'std') as Variety, first: false, grade: minGrade || undefined, grader: 'plat' as GraderId };
  const v = baseValue(def) * itemMult(hyp) * s.hype[def.set];
  const fee = minGrade ? C.GRADERS.plat.flat + C.GRADERS.plat.pct * v : 0;
  let pay = v * r.range(1.6, 2.3) + fee * 1.5 + SET_BY_ID[def.set].packPrice * r.range(0.1, 0.3);
  if (eventActive(s, 'convention')) pay *= 1.5;
  return {
    id: s.nextId++,
    cardId: def.id,
    needVariety,
    minGrade,
    pay: round2(Math.max(pay, 1)),
    expiresAt: s.now + r.range(6, 10) * 60_000,
    who: r.pick(COLLECTORS),
  };
}

function fillRequests(s: GameState) {
  const want = C.REQUEST_COUNT + (eventActive(s, 'convention') ? 2 : 0);
  withRng(s, (r) => {
    s.requests = s.requests.filter((q) => q.expiresAt > s.now);
    while (s.requests.length < want) s.requests.push(makeRequest(s, r));
  });
}

export function requestMatches(req: Request, inst: CardInst): boolean {
  if (inst.cardId !== req.cardId) return false;
  if (inst.status !== 'binder') return false;
  if (req.needVariety && inst.variety === 'std') return false;
  if (req.minGrade && (inst.grade === undefined || inst.grade < req.minGrade)) return false;
  return true;
}

export function fulfilRequest(s: GameState, reqId: number, uid: number): boolean {
  const req = s.requests.find((q) => q.id === reqId);
  const inst = s.cards.find((c) => c.uid === uid);
  if (!req || !inst || !requestMatches(req, inst)) return false;
  removeCard(s, uid);
  earn(s, req.pay, 'requests');
  s.requests = s.requests.filter((q) => q.id !== reqId);
  s.stats.requests++;
  notify(s, 'request', `${req.who} paid you`, req.pay);
  fillRequests(s);
  checkAchievements(s);
  return true;
}

export function refreshSingles(s: GameState) {
  withRng(s, (r) => {
    const pool = unlockedCards(s);
    const weights: Record<Rarity, number> = { C: 1, U: 2, R: 4, SR: 2.5, UR: 0.7, SEC: 0.2 };
    s.singles = [];
    const n = 6;
    for (let i = 0; i < n; i++) {
      const def = r.weighted(pool.map((c) => [c, weights[c.rarity]] as [CardDef, number]));
      s.singles.push({ id: s.nextId++, cardId: def.id, variety: r.chance(0.2) ? 'holo' : 'std', tg: rollGrade(r), z: r.normal() });
    }
  });
  s.nextSinglesAt = s.now + C.SINGLES_ROTATE_MS;
}

export function singlePrice(s: GameState, single: Single): number {
  return round2(value(s, { cardId: single.cardId, variety: single.variety, first: false }) * C.SINGLES_MARKUP);
}

export function buySingle(s: GameState, id: number): CardInst | null {
  const i = s.singles.findIndex((x) => x.id === id);
  if (i < 0) return null;
  const single = s.singles[i];
  const price = singlePrice(s, single);
  if (s.cash < price) return null;
  spend(s, price, 'singles');
  s.singles.splice(i, 1);
  pressure(s, single.cardId, C.DEMAND_BUY);
  const inst: CardInst = { uid: s.nextUid++, cardId: single.cardId, variety: single.variety, first: false, tg: single.tg, z: single.z, status: 'binder', at: s.now };
  s.cards.push(inst);
  s.seen[single.cardId] = true;
  checkAchievements(s);
  return inst;
}

// ---------------------------------------------------------------- bounties & upgrades

export function setProgress(s: GameState, set: SetId): { owned: number; total: number; ownedIds: Set<string> } {
  const ownedIds = new Set<string>();
  for (const c of s.cards) {
    const def = card(c);
    if (def.set === set && def.num <= BASE_COUNT) ownedIds.add(def.id);
  }
  return { owned: ownedIds.size, total: BASE_COUNT, ownedIds };
}

export function bountyAmount(set: SetId) { return SET_BY_ID[set].packPrice * 3 * BASE_COUNT; }

export function claimBounty(s: GameState, set: SetId): boolean {
  if (s.bounties.includes(set)) return false;
  if (setProgress(s, set).owned < BASE_COUNT) return false;
  s.bounties.push(set);
  earn(s, bountyAmount(set), 'bounties');
  notify(s, 'milestone', `${SET_BY_ID[set].name} complete! Bounty paid`, bountyAmount(set));
  checkAchievements(s);
  return true;
}

export function upgradeCost(s: GameState, id: UpgradeId): number | null {
  const lvl = s.upgrades[id];
  const costs = C.UPGRADES[id].costs;
  return lvl < costs.length ? costs[lvl] : null;
}

export function buyUpgrade(s: GameState, id: UpgradeId): boolean {
  const cost = upgradeCost(s, id);
  if (cost === null || s.cash < cost) return false;
  spend(s, cost, 'upgrades');
  s.upgrades[id]++;
  if (id === 'display') s.display.push(null);
  return true;
}

export function claimFreePack(s: GameState): boolean {
  if (s.freePacks <= 0) return false;
  if (s.freePacks >= C.FREE_PACK_MAX) s.nextFreeAt = s.now + C.FREE_PACK_MS;
  s.freePacks--;
  const fs = freePackSet(s);
  s.packs[fs]++;
  s.freeHeld[fs] = (s.freeHeld[fs] ?? 0) + 1;
  return true;
}

/** Free packs come from your newest licensed set. */
export function freePackSet(s: GameState): SetId {
  return s.licenses[s.licenses.length - 1];
}

export function isBroke(s: GameState): boolean {
  if (s.cash >= SET_BY_ID.iron.packPrice) return false;
  if (ALL_SETS.some((id) => s.packs[id] > 0) || s.freePacks > 0) return false;
  if (s.listings.length || s.grading.length) return false;
  return netWorth(s) < 5;
}

export function claimCharity(s: GameState): boolean {
  if (!isBroke(s)) return false;
  s.packs.iron += 1;
  s.freeHeld.iron = (s.freeHeld.iron ?? 0) + 1;
  notify(s, 'free', 'A kind shopkeeper slipped you a free pack');
  return true;
}

// ---------------------------------------------------------------- achievements

interface Achievement { id: string; name: string; desc: string; reward: number; test: (s: GameState) => boolean }
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'rip1', name: 'First Rip', desc: 'Open your first pack', reward: 5, test: (s) => s.stats.packsOpened >= 1 },
  { id: 'rip100', name: 'Pack Rat', desc: 'Open 100 packs', reward: 250, test: (s) => s.stats.packsOpened >= 100 },
  { id: 'rip1000', name: 'Rip Machine', desc: 'Open 1,000 packs', reward: 10000, test: (s) => s.stats.packsOpened >= 1000 },
  { id: 'holo', name: 'Shiny!', desc: 'Pull a Holo card', reward: 10, test: (s) => s.cards.some((c) => c.variety === 'holo') },
  { id: 'sr', name: 'Super Find', desc: 'Pull a Super Rare', reward: 15, test: (s) => s.cards.some((c) => card(c).rarity === 'SR') },
  { id: 'ur', name: 'Chase Card', desc: 'Pull an Ultra Rare', reward: 50, test: (s) => s.cards.some((c) => card(c).rarity === 'UR') },
  { id: 'sec', name: 'Secret Service', desc: 'Pull a Secret Rare', reward: 100, test: (s) => s.cards.some((c) => card(c).rarity === 'SEC') },
  { id: 'gold', name: 'Gold Rush', desc: 'Own a Gold card', reward: 40, test: (s) => s.cards.some((c) => c.variety === 'gold') },
  { id: 'misprint', name: 'Happy Accident', desc: 'Own a Misprint', reward: 75, test: (s) => s.cards.some((c) => c.variety === 'misprint') },
  { id: 'grade1', name: 'Slabbed', desc: 'Get a card graded', reward: 10, test: (s) => s.stats.graded >= 1 },
  { id: 'gem', name: 'Gem Mint', desc: 'Get a perfect 10', reward: 150, test: (s) => s.stats.tens >= 1 },
  { id: 'req1', name: 'Customer Service', desc: 'Complete a collector request', reward: 20, test: (s) => s.stats.requests >= 1 },
  { id: 'req25', name: 'Trusted Dealer', desc: 'Complete 25 collector requests', reward: 5000, test: (s) => s.stats.requests >= 25 },
  { id: 'bounty1', name: 'Completionist', desc: 'Complete a set', reward: 100, test: (s) => s.bounties.length >= 1 },
  { id: 'bounty5', name: 'Master Collector', desc: 'Complete every set', reward: 100000, test: (s) => s.bounties.length >= 5 },
  { id: 'license5', name: 'All Aboard', desc: 'Own every license', reward: 25000, test: (s) => s.licenses.length >= 5 },
  { id: 'display', name: 'Curator', desc: 'Fill every display slot', reward: 100, test: (s) => s.display.length > 0 && s.display.every((d) => d !== null) },
  { id: 'bigsale', name: 'Big Ticket', desc: 'Sell a single card for $10,000+', reward: 2000, test: (s) => s.stats.biggestSale >= 10000 },
];

export function checkAchievements(s: GameState) {
  for (const a of ACHIEVEMENTS) {
    if (s.achievements.includes(a.id)) continue;
    if (a.test(s)) {
      s.achievements.push(a.id);
      earn(s, a.reward, 'achievements');
      notify(s, 'achievement', `Achievement: ${a.name}`, a.reward);
    }
  }
  const nw = netWorth(s);
  let top = 0;
  for (const m of C.MILESTONES) {
    if (nw >= m && !s.milestones.includes(m)) { s.milestones.push(m); top = m; }
  }
  if (top) notify(s, 'milestone', top >= 1_000_000 ? 'RAIL BARON! Net worth $1,000,000' : `Net worth passed ${fmtMoney(top)}!`);
}

// ---------------------------------------------------------------- time

function marketTick(s: GameState, r: Rng) {
  const e = s.event;
  for (const set of ALL_SETS) {
    let h = s.hype[set];
    let target = 1;
    let pull = C.HYPE_REVERT;
    if (e && e.set === set && (e.kind === 'boom' || e.kind === 'crash') && s.now >= e.startAt && s.now < e.endAt) {
      target = e.target!;
      pull = 0.45;
    }
    h += (target - h) * pull + r.normal() * C.HYPE_NOISE;
    h = clamp(h, C.HYPE_MIN, C.HYPE_MAX);
    s.hype[set] = Math.round(h * 1000) / 1000;
    const hist = s.hypeHist[set];
    hist.push(s.hype[set]);
    if (hist.length > 40) hist.splice(0, hist.length - 40);
  }
  for (const set of ALL_SETS) s.sealedDemand[set] = Math.min(1, (s.sealedDemand[set] ?? 1) + C.DEMAND_RECOVER * 2);
  for (const id of Object.keys(s.demand)) {
    const d = s.demand[id];
    const nd = d < 1 ? Math.min(1, d + C.DEMAND_RECOVER) : Math.max(1, d - C.DEMAND_RECOVER);
    if (nd === 1) delete s.demand[id]; else s.demand[id] = nd;
  }
}

const EVENT_TEXT: Record<EventKind, (set?: string) => string> = {
  boom: (set) => `${set} is trending! Prices climbing`,
  crash: (set) => `Collectors are dumping ${set}! Prices falling`,
  holo: () => 'Holo Craze! Holo cards worth 50% more',
  gradeRush: () => 'Grading Rush! All grading fees halved',
  convention: () => 'Collector Convention! More requests, +50% payouts',
  sale: () => 'Dealer Sale! Booster boxes 20% off',
};

export function eventText(e: MarketEvent): string {
  return EVENT_TEXT[e.kind](e.set ? SET_BY_ID[e.set].name : undefined);
}

function scheduleEvent(s: GameState, r: Rng) {
  // new players get a friendly first event and no crashes in their first 20 minutes
  const fresh = s.now - s.createdAt < 20 * 60_000;
  const kinds: [EventKind, number][] = fresh
    ? [['boom', 3], ['holo', 1], ['convention', 1.2], ['sale', 1]]
    : [['boom', 3], ['crash', 2.5], ['holo', 1], ['gradeRush', 1], ['convention', 1.2], ['sale', 1]];
  const kind = r.weighted(kinds);
  const startAt = s.now + 60_000;
  const ev: MarketEvent = { kind, startAt, endAt: startAt + r.range(3, 5) * 60_000 };
  if (kind === 'boom' || kind === 'crash') {
    ev.set = r.pick(s.licenses);
    const h = s.hype[ev.set];
    ev.target = kind === 'boom' ? Math.min(C.HYPE_MAX, Math.max(h, 1) + r.range(0.3, 0.5)) : Math.max(C.HYPE_MIN, Math.min(h, 1) - r.range(0.3, 0.4));
  }
  s.event = ev;
  s.nextEventAt = ev.endAt + r.range(2, 4) * 60_000;
  notify(s, 'event', 'Coming up: ' + eventText(ev));
}

/**
 * Advances the simulation to `now`. Handles market ticks, events, listings,
 * grading timers, display income and free packs. Large gaps (offline time)
 * are capped.
 */
/** Moves every timer by `ms` (used to skip capped offline time or undo a clock rollback). */
function shiftTimers(s: GameState, ms: number) {
  s.lastMarketTick += ms;
  s.nextEventAt += ms;
  s.nextSinglesAt += ms;
  s.nextFreeAt += ms;
  if (s.event) { s.event.startAt += ms; s.event.endAt += ms; }
  for (const q of s.requests) q.expiresAt += ms;
  for (const g of s.grading) g.doneAt += ms;
  for (const l of s.listings) l.at += ms;
  s.now += ms;
}

export function advance(s: GameState, now: number, active = true) {
  let dtMs = now - s.now;
  if (dtMs < -5000) {
    // Device clock went backwards: no time passes. Timers are not pulled back, so
    // winding the clock forward and back again never gains anything.
    s.now = now;
    s.lastMarketTick = Math.min(s.lastMarketTick, now);
    for (const l of s.listings) l.at = Math.min(l.at, now);
    // ...but never leave a timer further away than its natural length
    for (const g of s.grading) g.doneAt = Math.min(g.doneAt, now + C.GRADERS[g.grader].seconds * 1000);
    s.nextFreeAt = Math.min(s.nextFreeAt, now + C.FREE_PACK_MS);
    s.nextSinglesAt = Math.min(s.nextSinglesAt, now + C.SINGLES_ROTATE_MS);
    s.nextEventAt = Math.min(s.nextEventAt, now + 6 * 60_000);
    for (const q of s.requests) q.expiresAt = Math.min(q.expiresAt, now + 10 * 60_000);
    if (s.event && s.event.startAt > now + 60_000) s.event = null;
    else if (s.event) s.event.endAt = Math.min(s.event.endAt, now + 5 * 60_000);
    return;
  }
  if (dtMs <= 0) return;
  const capped = Math.min(dtMs, C.OFFLINE_CAP_MS);
  // shift timers so offline time beyond the cap is skipped entirely
  if (dtMs > capped) {
    shiftTimers(s, dtMs - capped);
    dtMs = capped;
  }
  if (active) s.stats.playMs += Math.min(dtMs, 5000);
  const target = s.now + dtMs;
  withRng(s, (r) => {
    // step in chunks so market ticks and sales interleave sensibly
    while (s.now < target) {
      const nextTick = s.lastMarketTick + C.MARKET_TICK_MS;
      const stepTo = Math.min(target, nextTick);
      const dt = (stepTo - s.now) / 1000;
      s.now = stepTo;
      stepContinuous(s, r, dt);
      if (s.now >= nextTick) {
        s.lastMarketTick = nextTick;
        marketTick(s, r);
      }
      if (s.event && s.now >= s.event.endAt) s.event = null;
      if (!s.event && s.now >= s.nextEventAt) scheduleEvent(s, r);
    }
  });
  if (s.requests.some((q) => q.expiresAt <= s.now) || s.requests.length < C.REQUEST_COUNT + (eventActive(s, 'convention') ? 2 : 0)) fillRequests(s);
  if (s.now >= s.nextSinglesAt) refreshSingles(s);
  while (s.freePacks < C.FREE_PACK_MAX && s.now >= s.nextFreeAt) {
    s.freePacks++;
    s.nextFreeAt += C.FREE_PACK_MS;
    if (s.freePacks === 1) notify(s, 'free', 'A free pack is ready in the Shop');
  }
  if (s.freePacks >= C.FREE_PACK_MAX && s.nextFreeAt < s.now) s.nextFreeAt = s.now + C.FREE_PACK_MS;
  checkAchievements(s);
}

function stepContinuous(s: GameState, r: Rng, dt: number) {
  // listings
  for (const l of [...s.listings]) {
    const inst = s.cards.find((c) => c.uid === l.uid);
    if (!inst) { s.listings = s.listings.filter((x) => x !== l); continue; }
    if (s.now - l.at < 3000) continue;
    const ratio = l.price / Math.max(0.01, value(s, inst));
    const p = 1 - Math.exp(-dt / listingSeconds(ratio));
    if (r.chance(p)) {
      s.listings = s.listings.filter((x) => x !== l);
      const net = round2(l.price * (1 - C.LISTING_FEE));
      pressure(s, inst.cardId, -C.DEMAND_SELL);
      removeCard(s, inst.uid);
      earn(s, net, 'listings');
      s.stats.sales++;
      if (net > s.stats.biggestSale) s.stats.biggestSale = net;
      notify(s, 'sale', `Sold ${card(inst).name}`, net);
    }
  }
  // grading notices
  for (const g of s.grading) {
    if (g.doneAt <= s.now && !(g as any).told) {
      (g as any).told = true;
      const inst = s.cards.find((c) => c.uid === g.uid);
      if (inst) notify(s, 'grade', `${card(inst).name} is back from grading`);
    }
  }
  // display income
  let inc = 0;
  for (const uid of s.display) {
    if (uid === null) continue;
    const inst = s.cards.find((c) => c.uid === uid);
    if (inst) inc += displayRate(s, inst) * (dt / 3600);
  }
  if (inc > 0) {
    s.cash += inc;
    s.stats.earned += inc;
    s.stats.displayEarned += inc;
    s.stats.ledger.display = (s.stats.ledger.display ?? 0) + inc;
  }
}

// ---------------------------------------------------------------- misc

export function round2(n: number) { return Math.round(n * 100) / 100; }
export function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)); }

export function fmtMoney(n: number, compact = false): string {
  const neg = n < 0;
  n = Math.abs(n);
  let out: string;
  if (compact && n >= 1e6) out = '$' + (n / 1e6).toFixed(n >= 1e7 ? 1 : 2) + 'M';
  else if (compact && n >= 1e4) out = '$' + (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'k';
  else if (n >= 1000) out = '$' + Math.round(n).toLocaleString('en-US');
  else if (n >= 100) out = '$' + n.toFixed(0);
  else out = '$' + n.toFixed(2);
  return (neg ? '-' : '') + out;
}

export function migrate(raw: any): GameState | null {
  if (!raw || typeof raw !== 'object' || raw.version !== SAVE_VERSION || !Array.isArray(raw.cards)) return null;
  const s = raw as GameState;
  s.sealedDemand ??= zeroBySet(1);
  s.packCost ??= zeroBySet(0);
  s.freeHeld ??= zeroBySet(0);
  if (!s.tutorialBits) {
    // older saves stored the tutorial as a step counter
    s.tutorial = s.tutorial >= 5 ? 0b11111 : (1 << s.tutorial) - 1;
    s.tutorialBits = true;
  }
  return s;
}
