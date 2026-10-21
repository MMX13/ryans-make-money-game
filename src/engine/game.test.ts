import { describe, expect, it } from 'vitest';
import { CARDS, SETS, CARDS_BY_SET } from './data';
import * as G from './game';

describe('card data', () => {
  it('has 25 cards per set with the right rarity mix', () => {
    for (const set of SETS) {
      const cards = CARDS_BY_SET[set.id];
      expect(cards).toHaveLength(25);
      const count = (r: string) => cards.filter((c) => c.rarity === r).length;
      expect([count('C'), count('U'), count('R'), count('SR'), count('UR'), count('SEC')]).toEqual([12, 5, 3, 2, 2, 1]);
      expect(cards[24].rarity).toBe('SEC');
    }
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(CARDS.length);
  });
});

describe('packs', () => {
  it('opens five cards, guarantees a SR in the third pack and tracks 1st editions', () => {
    const s = G.newGame(0, 99);
    s.packs.iron = 5;
    const results = [1, 2, 3].map(() => G.openPack(s, 'iron')!);
    for (const r of results) expect(r.cards).toHaveLength(5);
    expect(['SR', 'UR', 'SEC']).toContain(G.card(results[2].cards[4].inst).rarity);
    expect(results[0].first).toBe(true);
    expect(s.cards).toHaveLength(15);
  });

  it('pity guarantees an Ultra Rare or better within 40 packs', () => {
    const s = G.newGame(0, 7);
    for (let trial = 0; trial < 20; trial++) {
      let since = 0;
      for (let i = 0; i < 200; i++) {
        s.packs.iron = 1;
        const r = G.openPack(s, 'iron')!;
        const big = r.cards.some((c) => ['UR', 'SEC'].includes(G.card(c.inst).rarity));
        since = big ? 0 : since + 1;
        expect(since).toBeLessThan(40);
        s.cards.length = 0;
      }
    }
  });

  it('cannot open packs you do not have or buy without cash', () => {
    const s = G.newGame(0, 1);
    expect(G.openPack(s, 'iron')).toBeNull();
    s.cash = 1;
    expect(G.buyPacks(s, 'iron', 1)).toBe(false);
    expect(G.buyPacks(s, 'diesel', 1)).toBe(false);
  });
});

describe('economy', () => {
  it('sells, lists and grades', () => {
    const s = G.newGame(0, 3);
    s.cash = 1000;
    s.packs.iron = 3;
    for (let i = 0; i < 3; i++) G.openPack(s, 'iron');
    const [a, b, c] = s.cards;
    const before = s.cash;
    const got = G.sellCards(s, [a]);
    expect(got).toBeGreaterThan(0);
    expect(s.cash).toBeCloseTo(before + got, 2);
    expect(G.listCard(s, b.uid, G.value(s, b) * 0.5)).toBe(true);
    expect(G.submitGrading(s, c.uid, 'plat')).toBe(true);
    expect(G.submitGrading(s, c.uid, 'plat')).toBe(false);
    G.advance(s, 120_000);
    expect(s.listings).toHaveLength(0);
    expect(s.cards.find((x) => x.uid === b.uid)).toBeUndefined();
    const slab = G.crackSlab(s, c.uid)!;
    expect(slab.grade).toBe(c.tg);
    expect(slab.status).toBe('binder');
  });

  it('keeps one of each card when bulk selling', () => {
    const s = G.newGame(0, 5);
    s.packs.iron = 30;
    for (let i = 0; i < 30; i++) G.openPack(s, 'iron');
    G.sellCards(s, G.bulkCandidates(s), true);
    const commons = s.cards.filter((c) => G.card(c).rarity === 'C' && c.variety === 'std' && !c.first);
    const ids = commons.map((c) => c.cardId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('caps offline progress and stays serialisable', () => {
    const s = G.newGame(0, 11);
    G.advance(s, 10 * 3600_000);
    expect(s.freePacks).toBe(3);
    const copy = JSON.parse(JSON.stringify(s));
    expect(G.migrate(copy)).not.toBeNull();
    expect(G.netWorth(copy)).toBe(G.netWorth(s));
  });

  it('net worth values cards at dealer price', () => {
    const s = G.newGame(0, 2);
    s.packs.iron = 1;
    G.openPack(s, 'iron');
    const expected = s.cash + s.cards.reduce((a, c) => a + G.dealerPrice(s, c), 0) + s.packs.iron * G.sealedResale(s, 'iron');
    expect(G.netWorth(s)).toBeCloseTo(expected, 1);
  });
});
