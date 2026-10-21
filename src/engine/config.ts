import type { Rarity, SetId } from './data';

/** All balance numbers live here so the simulation can tune them in one place. */

export const START_CASH = 20;

/** Base card value as a fraction of the set's pack price. */
export const RARITY_VALUE: Record<Rarity, number> = {
  C: 0.012,
  U: 0.045,
  R: 0.29,
  SR: 0.87,
  UR: 4.25,
  SEC: 13.5,
};

export const RARITY_NAME: Record<Rarity, string> = {
  C: 'Common', U: 'Uncommon', R: 'Rare', SR: 'Super Rare', UR: 'Ultra Rare', SEC: 'Secret Rare',
};

export const RARITY_ORDER: Rarity[] = ['C', 'U', 'R', 'SR', 'UR', 'SEC'];

export const HIT_ODDS: [Rarity, number][] = [
  ['R', 0.7375],
  ['SR', 0.22],
  ['UR', 0.035],
  ['SEC', 0.0075],
];
export const COMMON_UPGRADE = 0.06;
export const PITY_PACKS = 40;
export const GOD_PACK = 1 / 500;
export const FAKEOUT = 0.03;
export const FIRST_EDITION_PACKS = 30;
export const FIRST_EDITION_MULT = 1.5;

export type Variety = 'std' | 'holo' | 'full' | 'gold' | 'misprint';
export const VARIETY_MULT: Record<Variety, number> = { std: 1, holo: 2, full: 3, gold: 10, misprint: 15 };
export const VARIETY_NAME: Record<Variety, string> = { std: 'Standard', holo: 'Holo', full: 'Full Art', gold: 'Gold', misprint: 'Misprint' };
export const VARIETY_ODDS = { misprint: 0.002, gold: 0.006, fullOfSR: 0.15, holo: 0.12 };

/** True grade distribution. */
export const GRADE_DIST: [number, number][] = [
  [10, 0.03],
  [9.5, 0.1],
  [9, 0.25],
  [8, 0.35],
  [7, 0.17],
  [6, 0.05],
  [5, 0.03],
  [4, 0.02],
];
export function gradeMult(g: number): number {
  if (g >= 10) return 5;
  if (g >= 9.5) return 2.5;
  if (g >= 9) return 1.6;
  if (g >= 8) return 1.1;
  if (g >= 7) return 0.85;
  return 0.6;
}
export const MAX_ITEM_MULT = 100;

export type GraderId = 'plat' | 'gold';
export const GRADERS: Record<GraderId, { name: string; short: string; flat: number; pct: number; seconds: number; bonus: number; needs: SetId }> = {
  plat: { name: 'Platinum Grade', short: 'PG', flat: 3, pct: 0.04, seconds: 30, bonus: 1, needs: 'iron' },
  gold: { name: 'Golden Spike Authority', short: 'GSA', flat: 25, pct: 0.1, seconds: 90, bonus: 1.3, needs: 'electric' },
};

export const DEALER_BASE = 0.55;
export const DEALER_PER_HAGGLE = 0.04;
export const LISTING_FEE = 0.08;
export const LISTING_BASE_SECONDS = 22;
export const LISTING_STEEPNESS = 6;
export const SINGLES_MARKUP = 1.05;
export const SEALED_RESALE = 0.85;
export const BOX_SIZE = 12;
export const BOX_DISCOUNT = 0.08;

export const HYPE_MIN = 0.6;
export const HYPE_MAX = 1.7;
export const MARKET_TICK_MS = 60_000;
export const HYPE_REVERT = 0.08;
export const HYPE_NOISE = 0.045;
export const DEMAND_SELL = 0.04;
export const DEMAND_BUY = 0.04;
export const DEMAND_RECOVER = 0.01;

export const FREE_PACK_MS = 20 * 60_000;
export const FREE_PACK_MAX = 3;
export const OFFLINE_CAP_MS = 2 * 3600_000;

export const DISPLAY_PCT_PER_HOUR = 0.02;
export const DISPLAY_CAP_BY_SET: Record<SetId, number> = { iron: 20, diesel: 100, electric: 500, bullet: 2500, maglev: 12000 };

export const REQUEST_COUNT = 3;
export const REQUEST_ROTATE_MS = 6 * 60_000;
export const SINGLES_ROTATE_MS = 4 * 60_000;

export type UpgradeId = 'haggle' | 'listings' | 'display' | 'loupe' | 'gradeSlots' | 'autoBulk';
export const UPGRADES: Record<UpgradeId, { name: string; desc: (lvl: number) => string; costs: number[]; icon: string }> = {
  haggle: { name: 'Haggling', icon: '🤝', desc: (l) => `Dealer pays ${Math.round((DEALER_BASE + DEALER_PER_HAGGLE * l) * 100)}% of value`, costs: [150, 1000, 6000, 30000, 150000] },
  listings: { name: 'Listing Slots', icon: '🏷️', desc: (l) => `${3 + l} marketplace listings at once`, costs: [100, 600, 3000, 15000, 75000] },
  display: { name: 'Display Case', icon: '🖼️', desc: (l) => `${2 + l} display slots`, costs: [200, 1200, 6000, 25000, 100000, 300000] },
  loupe: { name: 'Jeweler\'s Loupe', icon: '🔍', desc: (l) => ['Rough condition estimates', 'Better condition estimates', 'Sharp condition estimates', 'Near-perfect condition estimates'][l], costs: [300, 4000, 40000] },
  gradeSlots: { name: 'Grading Slots', icon: '📦', desc: (l) => `${2 + l} cards at the grader at once`, costs: [250, 2000, 12000, 60000] },
  autoBulk: { name: 'Auto-Bulk', icon: '🧹', desc: (l) => (l ? 'Standard commons are sold automatically after each rip' : 'Automatically sell Standard commons after each rip'), costs: [500] },
};
export const LOUPE_SIGMA = [0.9, 0.6, 0.35, 0.15];

export const MILESTONES = [1_000, 10_000, 100_000, 1_000_000];
