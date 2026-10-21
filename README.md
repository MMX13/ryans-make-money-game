# Rail Riches

A phone-first browser game about getting rich from collectible train cards.
Rip packs, hunt for Holo, Full Art, Gold, Misprint and 1st Edition cards,
grade your best pulls, ride the market and trade your way to a
**$1,000,000** net worth.

Play: https://mmx13.github.io/ryans-make-money-game/

Installable as an app. In Chrome on Android, tap **Install app**. On iOS Safari,
use **Share → Add to Home Screen**. It works offline, and progress is saved on
the device.

## Ways to make money

- **Packs**: five sets from $5 to $3,000 a pack. Each pack has one hit slot
  (Rare, Super Rare, Ultra Rare or Secret Rare), plus a pity timer and the
  occasional God Pack.
- **1st Editions**: the first 30 packs of each set are worth ×1.5.
- **Selling**: the dealer pays instantly at 55%, or list on the marketplace
  at your own price and wait.
- **Grading**: cards with high condition estimates can come back as a Gem Mint 10 (×5).
- **Collector requests**: specific cards wanted at premium prices.
- **Hype index**: each set's prices move; events are announced in advance.
- **Set bounties**, a **display case** that earns while you're away, upgrades
  and licenses.

See [docs/DESIGN.md](docs/DESIGN.md) for the full design and balance numbers.

## Development

```sh
npm install
npm run dev        # local dev server
npm test           # engine unit tests
npm run build      # production build to dist/
npm run sim        # balance simulation: pack EV and bot pacing to $1M
```

- `src/engine/`: pure TypeScript game logic (cards, packs, economy, market, grading).
  All balance numbers are in `config.ts`.
- `src/art/`: procedural SVG train art.
- `src/ui/`: React UI, sound (WebAudio) and haptics.
- `scripts/`: balance bot and Playwright screenshot scripts.

Adding `?debug` to the URL exposes `window.__rr` for testing.

## Deploying

Every push to `main` runs the tests and deploys to GitHub Pages
(`.github/workflows/deploy.yml`). Pages must be set to **GitHub Actions**
as its source.
