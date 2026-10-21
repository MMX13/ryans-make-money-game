import { useEffect, useRef, useState } from 'react';
import { MILESTONES } from '../engine/config';
import { SETS } from '../engine/data';
import * as G from '../engine/game';
import { Burst, PackOpening } from './PackOpening';
import { Binder } from './screens/Binder';
import { Grading } from './screens/Grading';
import { Market } from './screens/Market';
import { Rip } from './screens/Rip';
import { Shop } from './screens/Shop';
import { CardDefSheet, CardSheet } from './sheets/CardSheet';
import { AchievementsSheet, AwaySheet, DisplaySheet, HelpSheet, MenuSheet, OddsSheet, PickDisplaySheet, SettingsSheet, StatsSheet, UpgradesSheet } from './sheets/MenuSheets';
import { buzz, sfx } from './sfx';
import { useStore, type Sheet, type Tab } from './store';
import { Icon, Money, Progress, Rolling } from './widgets';

const TABS: [Tab, string][] = [['shop', 'Shop'], ['rip', 'Rip'], ['binder', 'Binder'], ['market', 'Market'], ['grading', 'Grading']];

export function App() {
  const tab = useStore((s) => s.tab);
  const opening = useStore((s) => s.opening);
  const sheets = useStore((s) => s.sheets);
  const reduced = useStore((s) => s.game.settings.reducedMotion);
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => { mainRef.current?.scrollTo(0, 0); }, [tab]);
  return (
    <div className={'app' + (reduced ? ' reduced' : '')}>
      <Header />
      <main ref={mainRef} className="main">
        {tab === 'shop' && <Shop />}
        {tab === 'rip' && <Rip />}
        {tab === 'binder' && <Binder />}
        {tab === 'market' && <Market />}
        {tab === 'grading' && <Grading />}
      </main>
      <Coach />
      <Nav />
      <Toasts />
      {sheets.map((s, i) => <SheetView key={(s as any)?._k ?? i} sheet={s} />)}
      {opening && <PackOpening />}
    </div>
  );
}

function SheetView({ sheet }: { sheet: Sheet }) {
  if (!sheet) return null;
  switch (sheet.kind) {
    case 'card': return <CardSheet uid={sheet.uid} />;
    case 'cardDef': return <CardDefSheet cardId={sheet.cardId} />;
    case 'menu': return <MenuSheet />;
    case 'upgrades': return <UpgradesSheet />;
    case 'display': return <DisplaySheet />;
    case 'pickDisplay': return <PickDisplaySheet slot={sheet.slot} />;
    case 'achievements': return <AchievementsSheet />;
    case 'stats': return <StatsSheet />;
    case 'settings': return <SettingsSheet />;
    case 'help': return <HelpSheet />;
    case 'odds': return <OddsSheet set={sheet.set} />;
    case 'away': return <AwaySheet lines={sheet.lines} />;
    case 'victory': return <Victory />;
    default: return null;
  }
}

function Header() {
  const cash = useStore((s) => s.game.cash);
  const nw = useStore((s) => G.netWorth(s.game));
  const push = useStore((s) => s.push);
  const next = MILESTONES.find((m) => nw < m);
  const prev = [0, ...MILESTONES].filter((m) => m <= nw).pop() ?? 0;
  return (
    <header className="header">
      <div className="hdr-cash">
        <small>Cash</small>
        <b><Rolling value={cash} compact={cash >= 1e5} /></b>
      </div>
      <div className="hdr-nw">
        <small>Net worth {next ? <span className="muted">→ {G.fmtMoney(next, true)}</span> : '· Rail Baron'}</small>
        <b><Rolling value={nw} compact={nw >= 1e5} /></b>
        <Progress value={next ? (nw - prev) / (next - prev) : 1} className="thin gold" />
      </div>
      <button className="icon-btn menu-btn" aria-label="Menu" onClick={() => { sfx.click(); push({ kind: 'menu' }); }}><Icon name="menu" /></button>
    </header>
  );
}

function Nav() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const game = useStore((s) => s.game);
  const packs = SETS.reduce((a, s) => a + game.packs[s.id], 0);
  const ready = game.grading.filter((g) => g.doneAt <= game.now).length;
  const deliverable = game.requests.filter((q) => game.cards.some((c) => G.requestMatches(q, c))).length;
  const badges: Partial<Record<Tab, number | string>> = {
    shop: game.freePacks > 0 ? '!' : 0,
    rip: packs,
    market: deliverable,
    grading: ready,
  };
  return (
    <nav className="nav">
      {TABS.map(([id, label]) => (
        <button key={id} className={'nav-btn' + (tab === id ? ' on' : '')} onClick={() => { if (tab !== id) { sfx.tab(); buzz(5); setTab(id); } }}>
          <Icon name={id} />
          <span>{label}</span>
          {!!badges[id] && <i className="nav-badge">{badges[id]}</i>}
        </button>
      ))}
    </nav>
  );
}

function Toasts() {
  const notices = useStore((s) => s.game.notices);
  const act = useStore((s) => s.act);
  const opening = useStore((s) => !!s.opening || s.revealing || s.sheets.some((x) => x?.kind === 'victory'));
  const sheetOpen = useStore((s) => s.sheets.length > 0);
  const seen = useRef(new Set<number>());
  const [visible, setVisible] = useState<G.Notice[]>([]);
  const [celeb, setCeleb] = useState<string | null>(null);
  useEffect(() => { if (!celeb) return; const t = setTimeout(() => setCeleb(null), 2600); return () => clearTimeout(t); }, [celeb]);
  useEffect(() => {
    for (const n of notices) {
      if (seen.current.has(n.id)) continue;
      if (opening) continue; // shown once the reveal is done
      seen.current.add(n.id);
      setVisible((v) => [...v.slice(-2), n]);
      if (n.kind === 'sale' || n.kind === 'request') sfx.coin();
      if (n.kind === 'achievement') sfx.bigCoin();
      if (n.kind === 'milestone') { sfx.fanfare(); buzz([50, 50, 100]); }
      if (n.kind === 'milestone' && n.text.startsWith('RAIL BARON')) setTimeout(() => useStore.getState().push({ kind: 'victory' }), 600);
      else if (n.kind === 'milestone' && n.text.startsWith('Net worth')) setCeleb(n.text);
      const ttl = n.kind === 'milestone' ? 5000 : 3200;
      setTimeout(() => setVisible((v) => v.filter((x) => x.id !== n.id)), ttl);
    }
    if (notices.some((x) => seen.current.has(x.id))) act((g) => { g.notices = g.notices.filter((x) => !seen.current.has(x.id)); });
  }, [notices, opening]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (opening) setVisible([]); }, [opening]);
  return (
    <>
    {celeb && (
      <div className="celebrate" onClick={() => setCeleb(null)}>
        <Burst rarity="UR" />
        <div className="celebrate-text"><small>Milestone</small><b>{celeb.replace('Net worth passed ', '')}</b><span>net worth</span></div>
      </div>
    )}
    <div className={'toasts' + (sheetOpen ? ' top' : '')}>
      {visible.map((n) => (
        <div key={n.id} className={'toast t-' + n.kind}>
          <span>{n.text}</span>
          {n.amount !== undefined && <Money v={n.amount} className="pos" />}
        </div>
      ))}
    </div>
    </>
  );
}

interface Tip { tab: Tab | null; text: string; done: (g: G.GameState) => boolean; go?: Tab; when?: (g: G.GameState) => boolean }
const TIPS: Tip[] = [
  { tab: 'shop', text: 'Welcome, tycoon! You start with $20. Claim your free pack, or buy one.', done: (g) => g.stats.packsOpened > 0 || SETS.some((s) => g.packs[s.id] > 0) },
  { tab: null, text: 'You have a pack! Tap Rip to tear it open.', go: 'rip', done: (g) => g.stats.packsOpened > 0, when: (g) => SETS.some((s) => g.packs[s.id] > 0) },
  { tab: 'binder', text: 'Tap a card to sell it. The marketplace pays far more than the dealer, but takes a little time.', done: (g) => g.listings.length > 0 || g.stats.sales > 0 },
  { tab: 'market', text: 'Collectors pay big for specific cards. Prices of each set rise and fall: buy in a dip, sell in a boom.', done: () => false },
  { tab: 'grading', text: 'Cards with a high condition estimate can grade as a 10, worth ×5. Low grades are worth less!', done: (g) => g.stats.graded > 0 },
];

function Coach() {
  const game = useStore((s) => s.game);
  const tab = useStore((s) => s.tab);
  const act = useStore((s) => s.act);
  const setTab = useStore((s) => s.setTab);
  const [hidden, setHidden] = useState<number[]>([]);
  // tips are done once their action happens, or when dismissed
  const doneMask = TIPS.map((t, i) => Boolean((game.tutorial >> i) & 1) || t.done(game));
  useEffect(() => {
    const mask = doneMask.reduce((m, d, i) => (d ? m | (1 << i) : m), 0);
    if ((mask | game.tutorial) !== game.tutorial) act((g) => { g.tutorial |= mask; });
  }, [doneMask.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const idx = TIPS.findIndex((t, i) => !doneMask[i] && !hidden.includes(i) && (!t.when || t.when(game)) && (t.tab === null ? tab !== t.go : t.tab === tab) && (i < 2 || doneMask[0]));
  if (idx < 0) return null;
  const tip = TIPS[idx];
  const dismiss = () => { setHidden([...hidden, idx]); if (idx >= 2) act((g) => { g.tutorial |= 1 << idx; }); };
  return (
    <div className="coach">
      <span>{tip.text}</span>
      <div className="coach-btns">
        {tip.go && <button className="btn tiny primary" onClick={() => setTab(tip.go!)}>Go</button>}
        <button className="btn tiny ghost" onClick={dismiss}>Got it</button>
      </div>
    </div>
  );
}

function Victory() {
  const game = useStore((s) => s.game);
  const pop = useStore((s) => s.pop);
  const mins = Math.floor(game.stats.playMs / 60000);
  return (
    <div className="victory" onClick={pop}>
      <div className="victory-card" onClick={(e) => e.stopPropagation()}>
        <div className="victory-crown">🚂</div>
        <h2>RAIL BARON</h2>
        <p>You built a <b>$1,000,000</b> train card empire.</p>
        <div className="stat-rows">
          <div><span className="muted">Play time</span><b>{Math.floor(mins / 60)}h {mins % 60}m</b></div>
          <div><span className="muted">Packs opened</span><b>{game.stats.packsOpened.toLocaleString()}</b></div>
          <div><span className="muted">Cards graded</span><b>{game.stats.graded}</b></div>
          <div><span className="muted">Biggest sale</span><b>{game.stats.biggestSale ? G.fmtMoney(game.stats.biggestSale) : '—'}</b></div>
          <div><span className="muted">Sets completed</span><b>{game.bounties.length}/5</b></div>
        </div>
        <p className="muted small">The rails go on forever. Keep collecting: can you complete every set?</p>
        <button className="btn gold wide" onClick={pop}>Keep playing</button>
      </div>
    </div>
  );
}

export { Money };
