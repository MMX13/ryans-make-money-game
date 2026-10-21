# Rail Riches — Game Design (v1 draft)

A phone-first browser game about getting rich from collectible train cards.
You start with a little cash, rip packs, hunt for rare varieties and editions,
grade your best pulls, play the market, and grow into a card-trading tycoon.

Goal: reach **$1,000,000 net worth** ("Rail Baron"). Play can continue after.

## Pillars

1. **Ripping packs feels great.** Tactile tear, slow-roll reveal, rarity
   telegraphing, foil shimmer, sound and haptics. Every pack has a chance at a
   life-changing hit.
2. **Many ways to make money.** Flipping pulls, grading gambles, market
   trading, sealed speculation, collector requests, a passive display case,
   set completion rewards.
3. **Readable economy.** Every card has a visible market price that moves for
   understandable reasons (trends, events, scarcity, set rotation).
4. **Short sessions, real progress.** 30 s – 5 min sessions. Timers (grading,
   listings) resolve while away (capped).

## Screens (bottom tab bar, thumb reachable)

| Tab | Purpose |
| --- | --- |
| **Shop** | Buy packs and booster boxes for unlocked sets. Shows odds. Daily free pack. |
| **Rip** | Your unopened packs. Tap one to open it. "Open all" quick mode. |
| **Binder** | Collection by set, completion %, filters (rarity, variant, graded), card detail. |
| **Market** | Sell (instant to dealer or list for more), buy singles, watch prices, events news ticker, collector requests. |
| **Grading** | Submit cards, track submissions, crack open slabs on return (reveal moment). |

Header: cash, net worth, level/XP bar, menu button (Upgrades, Display Case,
Achievements, Stats, Settings).

## Cards

### Sets (unlock by player level)

| Set | Theme | Pack price | Cards | Unlock |
| --- | --- | --- | --- | --- |
| Iron Horses | Steam era | $4 | 24 | Lv 1 |
| Diesel Dynasty | Diesel workhorses | $9 | 24 | Lv 3 |
| Electric Avenue | Electric & commuter | $20 | 24 | Lv 6 |
| Bullet Dreams | High-speed rail | $45 | 24 | Lv 10 |
| Maglev Futures | Prototype & future | $120 | 24 | Lv 15 |

Each set: 12 Common, 6 Uncommon, 3 Rare, 2 Super Rare, 1 Ultra Rare (the
chase card). Plus one **Secret Rare** (#25/24) per set.

### Pack contents (5 cards)

- Slots 1–3: Common (5% upgrade to Uncommon)
- Slot 4: Uncommon (reverse-holo eligible)
- Slot 5 "hit slot": Rare 72%, Super Rare 20%, Ultra Rare 6.5%, Secret 1.5%

### Varieties (rolled per card, multiply value)

| Variety | Chance | Multiplier |
| --- | --- | --- |
| Standard | rest | ×1 |
| Reverse Holo | 15% (slot 4 & commons) | ×2.5 |
| Holo | 30% of hit slot rares | ×2 |
| Full Art | 8% of Super Rare+ | ×3 |
| Gold Rush | 0.8% any card | ×12 |
| Misprint (error card) | 0.25% any card | ×20 |

### Editions

- **1st Edition** stamp: 8% of cards while a set is "in its first print run",
  ×3 value. Sets leave first print after the player opens N packs of it or
  after a game-time window. Shown as a gold "1st" stamp.
- **Serial-numbered** /99: only on Ultra/Secret rares, 5% of those, ×4.
- Unlimited: default.

### Condition & grading

Each pulled card has a hidden condition score 1.0–10.0 (skewed high; packs are
fresh but not perfect). Players see four **inspection hints** (Centering,
Corners, Edges, Surface) with fuzzy words ("Sharp", "Slight wear") that
correlate with the true score.

Grading companies:

| Service | Cost | Time | Accuracy | Notes |
| --- | --- | --- | --- | --- |
| Rusty Rails Grading | $5 | 2 min | noisy | cheap, lower multipliers |
| Platinum Grade | $25 | 5 min | accurate | standard |
| Golden Spike Authority | $100 | 10 min | precise | top multipliers, Lv 8 |

Grade multipliers (Platinum): 10 ×8, 9.5 ×4, 9 ×2.5, 8 ×1.5, 7 ×1.1,
≤6 ×0.7. Rusty Rails ×0.6 of those; Golden Spike ×1.4. Express option (+100%
cost, half time).

Returning slabs get a reveal: the grade label flips in.

## Economy

### Prices

`price = base(rarity, card popularity) × variety × edition × grade × trend`

- `trend` per card: mean-reverting random walk (±3%/tick), ticks every 30 s
  real time.
- **Market events** (one active at a time, 3–6 min): "Steam Nostalgia Week
  (+40% steam cards)", "Influencer opened a Maglev box (+25% Maglev)",
  "Collector dumps Diesel collection (−30% Diesel)", "Grading backlog (grading
  times ×2)", "Holo Craze (holos +50%)".
- Supply pressure: cards the player sells a lot of drop a little in price
  (prevents infinite flipping of one card).

### Selling

- **Dealer (instant):** 55% of market (+5% per Haggling upgrade, max 80%).
- **Marketplace listing:** set your price; 8% fee. Sells after a delay driven
  by price ÷ market (at market: 30–120 s; 20% over: rarely; under: fast).
  Limited listing slots (upgradeable).
- **Bulk:** commons/uncommons sold by the lot at fixed bulk rate.

### Buying

- Packs & booster boxes (box = 20 packs at 10% discount) in the Shop.
- Singles from the marketplace at ~110% market — lets players snipe set
  completion or speculate on trending cards.

### Other income

- **Collector Requests:** NPC collectors post requests ("Want: any Holo Big
  Boy, grade 8+, pays $240"). Rotate every few minutes. Pay a premium over
  market.
- **Display Case:** slots that show off cards; each displayed card earns
  0.2% of its value per minute (passive, also offline up to 4 h).
- **Set Completion:** completing a set (all 24 base cards in any variety)
  pays a bounty and gives +XP, permanent +5% dealer price for that set.
- **Sealed speculation:** sealed booster boxes appreciate once a set goes out
  of print (sets rotate out of the shop at higher levels — packs then only
  available as sealed product on the marketplace at rising prices).
- **Daily free pack** and achievement cash rewards.

### Anti-softlock

Free pack every 4 hours (stockpiles up to 2). Bulk sales always pay something.

### Expected value targets

- Pack EV at dealer price: ~60–70% of pack price (losing).
- Pack EV at full market: ~95–110% (break-even if you list everything).
- Skill (grading the right cards, listing smartly, requests, events) turns the
  edge positive: target ~1.3–1.6× return on good play.
- Higher-tier sets have higher variance and slightly better EV.

## Progression

XP from opening packs, selling, grading, requests. Levels unlock sets,
grading services, upgrades.

Upgrades (cash sinks):
- Haggling (dealer %), Listing Slots, Display Case Slots, Grading Express
  discount, Auto-Bulk (auto sells commons after a rip), Lucky Sleeves (small
  boost to hit-slot odds, capped).

Milestones: $1k, $10k, $100k, $1M net worth with celebrations.

## Pack opening flow

1. Pack fills screen. Drag along the top seam (or tap) to tear. Foil crinkle
   sound + vibration.
2. Cards slide out face-down in a stack. Tap to flip the top card. Commons
   first, hit card last.
3. The hit card's back glows the rarity colour before flipping (rare blue,
   super purple, ultra gold, secret rainbow). Ultra/secret shake and need a
   hold-to-reveal.
4. Flip: 3D rotate, rarity burst particles, value pops in. "NEW" badge on
   first copy. Holo/gold cards shimmer with finger movement/device tilt.
5. Summary: grid of pulls, pack value vs cost, quick actions (Sell commons,
   Open next).

## Tech

- Vite + React + TypeScript, Zustand state, localStorage saves with
  versioning and migration.
- Engine (pure TS, unit tested): RNG, pack generation, pricing, market sim,
  grading, offline catch-up.
- All art procedural SVG (no external assets). WebAudio synthesized SFX.
- PWA (installable, offline). GitHub Pages deploy via Actions.
