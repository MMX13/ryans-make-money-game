import { useState } from 'react';
import { CARDS_BY_SET, SET_BY_ID, type SetId } from '../../engine/data';
import * as C from '../../engine/config';
import * as G from '../../engine/game';
import { CardFace, RARITY_COLOR } from '../Card';
import { buzz, sfx } from '../sfx';
import { useStore } from '../store';
import { Empty, Icon, Money, Sheet } from '../widgets';

export function MenuSheet() {
  const push = useStore((s) => s.push);
  const pop = useStore((s) => s.pop);
  const game = useStore((s) => s.game);
  const items: [string, string, string, () => void][] = [
    ['upgrades', 'Upgrades', 'Better prices, more slots', () => push({ kind: 'upgrades' })],
    ['display', 'Display Case', `${game.display.filter((d) => d !== null).length}/${game.display.length} slots used`, () => push({ kind: 'display' })],
    ['trophy', 'Achievements', `${game.achievements.length}/${G.ACHIEVEMENTS.length} unlocked`, () => push({ kind: 'achievements' })],
    ['stats', 'Stats', 'Your tycoon career', () => push({ kind: 'stats' })],
    ['help', 'How to play', 'Ways to make money', () => push({ kind: 'help' })],
    ['settings', 'Settings', 'Sound, haptics, save', () => push({ kind: 'settings' })],
  ];
  return (
    <Sheet title="Menu">
      <div className="menu-list">
        {items.map(([icon, title, sub, fn]) => (
          <button key={title} className="menu-item" onClick={() => { sfx.click(); pop(); fn(); }}>
            <span className="menu-icon"><Icon name={icon} /></span>
            <span className="grow"><b>{title}</b><small className="muted">{sub}</small></span>
            <span className="muted">›</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

export function UpgradesSheet() {
  const game = useStore((s) => s.game);
  const act = useStore((s) => s.act);
  return (
    <Sheet title="Upgrades">
      <div className="upgrade-list">
        {(Object.keys(C.UPGRADES) as C.UpgradeId[]).map((id) => {
          const u = C.UPGRADES[id];
          const lvl = game.upgrades[id];
          const cost = G.upgradeCost(game, id);
          return (
            <div key={id} className="upgrade">
              <span className="menu-icon">{u.icon}</span>
              <div className="grow">
                <b>{u.name} <small className="muted">{cost === null ? 'MAX' : `Lv ${lvl}/${u.costs.length}`}</small></b>
                <small>{u.desc(lvl)}</small>
                {cost !== null && <small className="pos">Next: {u.desc(lvl + 1)}</small>}
              </div>
              {cost !== null && (
                <button className="btn primary" disabled={game.cash < cost} onClick={() => { if (act((g) => G.buyUpgrade(g, id))) { sfx.bigCoin(); buzz(20); } }}>
                  <Money v={cost} compact />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

export function DisplaySheet() {
  const game = useStore((s) => s.game);
  const push = useStore((s) => s.push);
  const act = useStore((s) => s.act);
  const total = game.display.reduce<number>((a, uid) => {
    const inst = game.cards.find((c) => c.uid === uid);
    return a + (inst ? G.displayRate(game, inst) : 0);
  }, 0);
  return (
    <Sheet title="Display Case">
      <p className="muted small">Visitors pay to see your best cards. Each card earns {C.DISPLAY_PCT_PER_HOUR * 100}% of its value per hour, up to <Money v={G.displayCap(game)} />/hour per slot (a higher license raises the cap). It keeps earning for up to 2 hours while you're away.</p>
      <div className="display-total">Earning <Money v={total} className="pos" />/hour</div>
      <div className="display-grid">
        {game.display.map((uid, i) => {
          const inst = game.cards.find((c) => c.uid === uid);
          return (
            <div key={i} className="display-slot">
              {inst ? (
                <>
                  <button className="plain" onClick={() => push({ kind: 'card', uid: inst.uid })}><CardFace look={inst} size="sm" /></button>
                  <small className="pos"><Money v={G.displayRate(game, inst)} />/h</small>
                  <button className="btn tiny ghost" onClick={() => act((g) => G.setDisplay(g, i, null))}>Remove</button>
                </>
              ) : (
                <button className="display-empty" onClick={() => push({ kind: 'pickDisplay', slot: i })}>+ Add card</button>
              )}
            </div>
          );
        })}
      </div>
      {G.upgradeCost(game, 'display') !== null && <p className="muted small center">Buy more slots in Upgrades.</p>}
    </Sheet>
  );
}

export function PickDisplaySheet({ slot }: { slot: number }) {
  const game = useStore((s) => s.game);
  const act = useStore((s) => s.act);
  const pop = useStore((s) => s.pop);
  const options = game.cards.filter((c) => c.status === 'binder').map((c) => ({ c, r: G.displayRate(game, c) })).sort((a, b) => b.r - a.r).slice(0, 30);
  return (
    <Sheet title="Choose a card to display">
      {!options.length ? <Empty icon="🖼️" title="No cards available" /> : (
        <div className="card-list">
          {options.map(({ c, r }) => (
            <button key={c.uid} className="list-row" onClick={() => { act((g) => G.setDisplay(g, slot, c.uid)); sfx.click(); pop(); }}>
              <CardFace look={c} size="xs" />
              <span className="grow"><b>{G.card(c).name}</b><small className="muted">Value <Money v={G.value(game, c)} /></small></span>
              <span className="pos"><Money v={r} />/h</span>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}

export function AchievementsSheet() {
  const game = useStore((s) => s.game);
  return (
    <Sheet title="Achievements">
      <div className="ach-list">
        {G.ACHIEVEMENTS.map((a) => {
          const done = game.achievements.includes(a.id);
          return (
            <div key={a.id} className={'ach' + (done ? ' done' : '')}>
              <span className="ach-icon">{done ? '🏆' : '🔒'}</span>
              <div className="grow"><b>{a.name}</b><small className="muted">{a.desc}</small></div>
              <Money v={a.reward} className={done ? 'pos' : 'muted'} />
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

const LEDGER_NAMES: Record<string, string> = {
  listings: 'Marketplace sales', dealer: 'Dealer sales', bulk: 'Bulk sales', requests: 'Collector requests',
  bounties: 'Set bounties', achievements: 'Achievements', display: 'Display case', sealed: 'Sealed resale',
  packs: 'Packs bought', licenses: 'Licenses', upgrades: 'Upgrades', grading: 'Grading fees', singles: 'Singles bought',
};

export function StatsSheet() {
  const game = useStore((s) => s.game);
  const st = game.stats;
  const mins = Math.floor(st.playMs / 60000);
  const rows: [string, string][] = [
    ['Net worth', G.fmtMoney(G.netWorth(game))],
    ['Play time', `${Math.floor(mins / 60)}h ${mins % 60}m`],
    ['Packs opened', st.packsOpened.toLocaleString()],
    ['Cards pulled', st.cardsPulled.toLocaleString()],
    ['Cards graded', `${st.graded} (${st.tens} perfect 10s)`],
    ['Requests completed', String(st.requests)],
    ['Biggest single sale', G.fmtMoney(st.biggestSale)],
  ];
  const ledger = Object.entries(st.ledger).sort((a, b) => b[1] - a[1]);
  return (
    <Sheet title="Stats">
      <div className="stat-rows">
        {rows.map(([k, v]) => <div key={k}><span className="muted">{k}</span><b>{v}</b></div>)}
      </div>
      {st.bestPull && (
        <div className="best-pull">
          <CardFace look={st.bestPull} size="sm" />
          <div><small className="muted">Best pull</small><b>{G.card(st.bestPull).name}</b><Money v={st.bestPull.value} className="pos" /><small className="muted">value when pulled</small></div>
        </div>
      )}
      <h4 className="section">Money in &amp; out</h4>
      <div className="stat-rows">
        {ledger.map(([k, v]) => <div key={k}><span className="muted">{LEDGER_NAMES[k] ?? k}</span><b className={v >= 0 ? 'pos' : 'neg'}>{v >= 0 ? '+' : ''}{G.fmtMoney(v)}</b></div>)}
      </div>
    </Sheet>
  );
}

export function SettingsSheet() {
  const game = useStore((s) => s.game);
  const act = useStore((s) => s.act);
  const reset = useStore((s) => s.reset);
  const [confirm, setConfirm] = useState(false);
  const toggle = (k: keyof G.GameState['settings']) => act((g) => { g.settings[k] = !g.settings[k]; });
  return (
    <Sheet title="Settings">
      <div className="settings">
        <label className="toggle"><span>Sound effects</span><input type="checkbox" checked={game.settings.sound} onChange={() => toggle('sound')} /></label>
        <label className="toggle"><span>Vibration</span><input type="checkbox" checked={game.settings.haptics} onChange={() => toggle('haptics')} /></label>
        <label className="toggle"><span>Reduced motion</span><input type="checkbox" checked={game.settings.reducedMotion} onChange={() => toggle('reducedMotion')} /></label>
      </div>
      <p className="muted small">Your progress is saved on this device automatically.</p>
      {!confirm ? (
        <button className="btn danger wide" onClick={() => setConfirm(true)}>Start a new game…</button>
      ) : (
        <div className="cs-box">
          <b>Erase everything and start over?</b>
          <div className="row">
            <button className="btn" onClick={() => setConfirm(false)}>Cancel</button>
            <button className="btn danger" onClick={() => { reset(); }}>Erase</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

export function HelpSheet() {
  return (
    <Sheet title="How to play">
      <div className="help">
        <p><b>Goal:</b> grow your net worth to <b>$1,000,000</b> and become a Rail Baron.</p>
        <h4>Ways to make money</h4>
        <ul>
          <li><b>Rip packs.</b> Every pack has one hit slot: Rare, Super Rare, Ultra Rare or the Secret Rare. Holo, Full Art, Gold and Misprint cards are worth several times more.</li>
          <li><b>1st Editions.</b> The first 30 packs you open of each set are 1st Edition, and every card in them is worth ×1.5.</li>
          <li><b>List, don't dump.</b> The dealer pays instantly but only {Math.round(C.DEALER_BASE * 100)}%. The marketplace pays full value minus an {C.LISTING_FEE * 100}% fee, and you can price high and wait.</li>
          <li><b>Grade the good ones.</b> Cards with high condition estimates can come back as a 10, worth ×5. Low grades are worth less than raw.</li>
          <li><b>Collector requests</b> pay well above market for specific cards.</li>
          <li><b>Ride the hype.</b> Each set's prices rise and fall. Buy packs in a dip, sell cards (or sealed packs) in a boom. Watch for events in the Market.</li>
          <li><b>Complete sets</b> for a big one-time bounty.</li>
          <li><b>Display</b> your best cards for steady income, even while you're away.</li>
          <li><b>Licenses</b> unlock pricier sets with much bigger hits.</li>
        </ul>
        <h4>Good to know</h4>
        <ul>
          <li>Selling lots of copies of one card softens its price for a while.</li>
          <li>Net worth counts your cards at dealer price.</li>
          <li>An Ultra Rare or better is guaranteed within {C.PITY_PACKS} packs of each set.</li>
        </ul>
      </div>
    </Sheet>
  );
}

export function OddsSheet({ set }: { set: SetId }) {
  const game = useStore((s) => s.game);
  const def = SET_BY_ID[set];
  const cards = CARDS_BY_SET[set];
  return (
    <Sheet title={`${def.name} odds`}>
      <p className="muted small">{def.theme}. 5 cards per pack: 3 Commons, 1 Uncommon and 1 hit.</p>
      <div className="odds">
        {C.HIT_ODDS.map(([r, p]) => (
          <div key={r}><span style={{ color: RARITY_COLOR[r] }}>{C.RARITY_NAME[r]}</span><b>{(p * 100).toFixed(p < 0.01 ? 2 : 1)}%</b></div>
        ))}
      </div>
      <div className="odds">
        <div><span>Holo</span><b>{C.VARIETY_ODDS.holo * 100}%</b></div>
        <div><span>Full Art (SR+)</span><b>{C.VARIETY_ODDS.fullOfSR * 100}%</b></div>
        <div><span>Gold</span><b>{C.VARIETY_ODDS.gold * 100}%</b></div>
        <div><span>Misprint</span><b>{C.VARIETY_ODDS.misprint * 100}%</b></div>
      </div>
      <p className="muted small">Pity: {game.pity[set]}/{C.PITY_PACKS} packs since your last Ultra Rare. Rumour has it 1 in 500 packs is a God Pack.</p>
      <h4 className="section">Chase cards</h4>
      <div className="chase-row">
        {cards.filter((c) => c.rarity === 'UR' || c.rarity === 'SEC' || c.rarity === 'SR').reverse().map((c) => (
          <div key={c.id} className="chase">
            <CardFace look={{ cardId: c.id, variety: c.rarity === 'SEC' ? 'gold' : 'holo' }} size="sm" />
            <small><Money v={G.value(game, { cardId: c.id, variety: 'std', first: false })} /></small>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

export function AwaySheet({ lines }: { lines: string[] }) {
  return (
    <Sheet title="Welcome back!">
      <ul className="away">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
      <p className="muted small">Progress while away is capped at 2 hours.</p>
    </Sheet>
  );
}
