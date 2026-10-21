# Rail Riches — Game Design (v2)

A phone-first browser game about getting rich from collectible train cards.
Start with $20, rip packs, hunt rare varieties and 1st Editions, grade your best
pulls, ride the market and work your way up to a **$1,000,000 net worth**
("Rail Baron"). Play continues afterwards.

v2 incorporates an external design review (pacing, exploits, clarity).

## Pillars

1. **Ripping packs feels great.** Tear, auto-fanned commons, a suspenseful hit
   slot (glow, fake-out upgrades, hold-to-reveal), foil shimmer, sound, haptics.
2. **Distinct ways to make money**, each with its own skill:
   flipping (dealer vs listing), grading gambles, collector requests,
   hype speculation on sealed product, set completion bounties, and a capped
   display case.
3. **Readable economy.** Each set has one *hype index* that moves every minute
   and is shown as a chart. Events are announced in advance.
4. **Pacing targets:** $1k ≈ 10 min, $10k ≈ 45 min, $100k ≈ 2 h,
   $1M ≈ 3.5–4.5 h of active play. Verified with a bot simulation (`npm run sim`).

## Screens (bottom tab bar)

| Tab | Purpose |
| --- | --- |
| **Shop** | Buy packs and booster boxes, buy set licenses, claim free packs, odds table. |
| **Rip** | Unopened packs; open one, or "Open all" quick mode. |
| **Binder** | Collection by set, completion and bounty, card detail (sell, grade, display, list). |
| **Market** | Hype charts and news, active listings, collector requests, buy singles, bulk sell. |
| **Grading** | Submit cards, track timers, crack open returned slabs. |

Header: cash, net worth, menu (Upgrades, Display Case, Achievements, Stats,
Settings).

## Sets & licenses

| Set | Theme | Pack | License |
| --- | --- | --- | --- |
| Iron Horses | Steam | $5 | free |
| Diesel Dynasty | Diesel | $25 | $400 |
| Electric Avenue | Electric | $120 | $2,000 |
| Bullet Dreams | High-speed | $600 | $10,000 |
| Maglev Futures | Maglev & future | $3,000 | $50,000 |

Higher tiers return a little more (value boost ×1.00 / 1.04 / 1.08 / 1.12 / 1.16).

Booster box = 12 packs at 8% off.

Each set has 24 cards: 12 Common, 5 Uncommon, 3 Rare, 2 Super Rare, 2 Ultra
Rare, plus one **Secret Rare** (#25/24). Every card is a real locomotive (or a
famous concept), with a fact on the back.

### Pack (5 cards)

- Slots 1–3: Common (6% chance to upgrade to Uncommon).
- Slot 4: Uncommon.
- Slot 5 (hit): Rare 73.75%, Super Rare 22%, Ultra Rare 3.5%, Secret 0.75%.
- **Pity:** an Ultra Rare or better is guaranteed within 40 packs of a set.
- **God pack:** 1 in 500 packs, every card is SR or better.
- A pack never contains two copies of the same card.
- **First session:** your third pack ever has a guaranteed Super Rare.
- **1st Edition print run:** the first 30 packs you open of each set are
  1st Edition (shown on a counter in the Shop). Cards in them carry a 1st
  stamp worth ×1.5.

### Varieties (one per card)

| Variety | Chance | Value |
| --- | --- | --- |
| Standard | rest | ×1 |
| Holo | 8% | ×2.5 |
| Full Art | 15% of SR+ | ×3 |
| Gold | 0.6% | ×10 |
| Misprint | 0.2% | ×15 |

Gold and Misprint cards have a base value floor of 20% of the pack price, so even a Gold common is a real hit.

## Value

`value = base × variety × edition × grade × hype × demand`

- `base`: rarity × pack price × per-card popularity (0.8–1.25).
- `hype`: per-set index in [0.6, 1.7], mean-reverting walk, ticks every 60 s.
- `demand`: per-card, drops 4% each time you sell a copy, recovers 1%/tick;
  rises 4% each time you buy a single.

### Grading

Every card has a hidden true grade, drawn from: 10 (3%), 9.5 (10%), 9 (25%),
8 (35%), 7 (17%), 6 or less (10%). The player sees an **estimate range**
("Est. 8.5–9.5") from a noisy reading, which the Loupe upgrade sharpens.

| Grade | 10 | 9.5 | 9 | 8 | 7 | ≤6 |
| --- | --- | --- | --- | --- | --- | --- |
| Mult | ×5 | ×2.5 | ×1.6 | ×1.1 | ×0.85 | ×0.6 |

Services:

- **Platinum Grade:** fee $3 + 4% of raw value, 30 s.
- **Golden Spike Authority:** fee $25 + 10% of raw value, 90 s, slabs worth ×1.3
  more. Unlocks with the Electric license.

Grading is worth it only on cards with a good estimate. Blind grading averages
about ×1.3 minus fees.

## Selling & buying

- **Dealer (instant):** 55% of value. Haggling upgrade adds 4% per level, up to 75%.
- **Listing:** you choose a price, from 80% to 150% of value. Sale time scales
  with price/value (at value: 10–45 s; 130%+: rare). 8% fee. 3 slots to start,
  upgradeable.
- **Bulk:** sell all Standard commons and uncommons in one tap at dealer rate.
- **Singles:** the market stocks a few cards per set at 105% of value (stock
  rotates every few minutes). Useful for completing sets and filling requests.
- **Sealed:** packs resell at 75% of the pack price × the lower of current and
  10-minute average hype, minus sealed demand pressure (3% per pack sold,
  recovering each tick). Always below the cheapest box price, so there's no
  instant arbitrage; profit only comes from buying in a real dip.

## Other income

- **Collector requests:** 3 open at a time, rotating every ~6 min. Each asks for
  a specific card, sometimes with a minimum grade or variety, and pays 150–220%
  of its value plus a cash tip.
- **Display case:** 2 slots, upgradeable to 8. Each displayed card earns 2% of
  its value per hour, capped per slot at the cap for your highest license
  ($20 / $100 / $500 / $2,500 / $12,000 per hour). Offline earnings are capped at 2 h.
- **Set bounties:** owning all 24 base cards of a set pays 3 × pack price × 24
  once.
- **Free pack:** one pack of your newest licensed set every 20 min, stockpiling up to 3.
  "On the house" starter pack whenever cash plus assets is under $5.
- **Achievements** pay small cash rewards.

## Market events

One at a time, announced 60 s ahead, lasting 3–5 min. The first event comes at
8 min, and there are no crashes in a player's first 20 minutes:
- Set boom or crash (hype ±30–50%)
- Holo Craze (Holo variety ×1.5)
- Grading Rush (grading fees halved)
- Collector Convention (request payouts +50%, more requests)
- Dealer Sale (box discount 20%)

## Upgrades

Haggling, Listing Slots, Display Slots, Loupe (sharper estimates), Grading
Slots (concurrent submissions, starts at 2), Auto-Bulk (auto-sells Standard
commons after each rip).

## Net worth

Cash + dealer value of cards + resale value of sealed product. Valuing at
dealer price prevents fake wealth from price spikes.

## Pack summaries

Packs remember what you paid (cost basis per set), so a free pack shows as pure
profit and a box shows its real discount.

## Tech

Vite + React + TypeScript, Zustand, localStorage saves (versioned). Pure TS
engine with Vitest tests and a bot simulation for balance. Procedural SVG art,
WebAudio SFX, vibration haptics. PWA, GitHub Pages deploy.
