import { SETS, type SetId } from '../../engine/data';
import { BOX_SIZE, FIRST_EDITION_PACKS, FREE_PACK_MAX } from '../../engine/config';
import * as G from '../../engine/game';
import { PackArt } from '../Card';
import { buzz, sfx } from '../sfx';
import { useStore } from '../store';
import { Money, Sparkline, TrendArrow, fmtTime, useNow } from '../widgets';

export function Shop() {
  const game = useStore((s) => s.game);
  const act = useStore((s) => s.act);
  const push = useStore((s) => s.push);
  const setTab = useStore((s) => s.setTab);
  const now = useNow(1000);
  const nextLicense = SETS.find((s) => !game.licenses.includes(s.id));
  const freeSet = G.freePackSet(game);

  const buy = (set: SetId, n: number, box = false) => {
    const ok = act((g) => G.buyPacks(g, set, n, box));
    if (ok) { sfx.coin(); buzz(10); } else { sfx.error(); buzz([10, 40, 10]); }
  };

  return (
    <div className="screen shop">
      <div className="free-card">
        <div>
          <b>Free pack</b>
          <small>
            {game.freePacks > 0 ? `${game.freePacks} ready · ${SETS.find((x) => x.id === freeSet)!.name}` : `Next in ${fmtTime(game.nextFreeAt - now)}`}
            {game.freePacks > 0 && game.freePacks < FREE_PACK_MAX ? ` · next in ${fmtTime(game.nextFreeAt - now)}` : ''}
          </small>
        </div>
        <button
          className="btn primary"
          disabled={game.freePacks <= 0}
          onClick={() => { if (act(G.claimFreePack)) { sfx.coin(); buzz(15); } }}
        >Claim</button>
      </div>
      {G.isBroke(game) && (
        <div className="free-card charity">
          <div><b>Down on your luck?</b><small>The shopkeeper offers a pack on the house.</small></div>
          <button className="btn primary" onClick={() => { act(G.claimCharity); sfx.coin(); }}>Accept</button>
        </div>
      )}
      {SETS.map((set) => {
        const owned = game.licenses.includes(set.id);
        if (!owned) {
          if (set.id !== nextLicense?.id) {
            return (
              <div key={set.id} className="set-row locked-far">
                <div className="lock-icon">🔒</div>
                <div><b>{set.name}</b><small>Requires the previous license</small></div>
              </div>
            );
          }
          const afford = game.cash >= set.license;
          return (
            <div key={set.id} className="set-row locked">
              <PackArt set={set.id} size="sm" className="dim" />
              <div className="set-info">
                <b>{set.name}</b>
                <small>{set.theme}</small>
                <small>Packs {G.fmtMoney(set.packPrice)} · bigger risks, bigger hits</small>
                <button className="btn gold" disabled={!afford} onClick={() => { if (act((g) => G.buyLicense(g, set.id))) { sfx.fanfare(); buzz([40, 30, 80]); } }}>
                  Buy license · <Money v={set.license} />
                </button>
                {!afford && <small className="muted">You need {G.fmtMoney(set.license - game.cash)} more</small>}
              </div>
            </div>
          );
        }
        const price = G.packPrice(game, set.id);
        const box = G.boxPrice(game, set.id);
        const firstLeft = Math.max(0, FIRST_EDITION_PACKS - game.opened[set.id]);
        const canBuy = (n: number) => game.cash >= price * n;
        return (
          <div key={set.id} className="set-row">
            <PackArt set={set.id} size="sm" onClick={() => push({ kind: 'odds', set: set.id })} />
            <div className="set-info">
              <div className="set-title">
                <b>{set.name}</b>
                <button className="link" onClick={() => push({ kind: 'odds', set: set.id })}>Odds</button>
              </div>
              <div className="price-line">
                <span className="price"><Money v={price} /></span>
                <TrendArrow v={game.hype[set.id]} />
                <Sparkline data={game.hypeHist[set.id]} w={64} h={20} />
              </div>
              {firstLeft > 0
                ? <small className="first-left">✦ {firstLeft} 1st Edition packs left</small>
                : <small className="muted">Unlimited print run</small>}
              {G.eventActive(game, 'boom', set.id) && <small className="pos">Trending now</small>}
              {G.eventActive(game, 'crash', set.id) && <small className="neg">Prices crashing</small>}
              <div className="buy-row">
                <button className="btn" disabled={!canBuy(1)} onClick={() => buy(set.id, 1)}>×1</button>
                <button className="btn" disabled={!canBuy(5)} onClick={() => buy(set.id, 5)}>×5</button>
                <button className="btn primary" disabled={game.cash < box} onClick={() => buy(set.id, BOX_SIZE, true)}>
                  Box ×{BOX_SIZE} <small><Money v={box} compact /></small>
                </button>
              </div>
              {game.packs[set.id] > 0 && (
                <div className="owned-line">
                  <button className="link" onClick={() => setTab('rip')}>{game.packs[set.id]} unopened ›</button>
                  <button className="link muted" onClick={() => { const got = act((g) => G.sellSealed(g, set.id, 1)); if (got) sfx.coin(); }}>
                    Sell sealed <Money v={G.sealedResale(game, set.id)} />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
      {G.eventActive(game, 'sale') && <div className="banner pos">Dealer Sale on now: booster boxes are 20% off!</div>}
    </div>
  );
}
