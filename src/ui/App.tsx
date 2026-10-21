import { useEffect, useRef, useState } from 'react';
import { MILESTONES } from '../engine/config';
import { SETS } from '../engine/data';
import * as G from '../engine/game';
import { PackOpening } from './PackOpening';
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
        <b><Rolling value={cash} /></b>
      </div>
      <div className="hdr-nw">
        <small>Net worth {next ? <span className="muted">→ {G.fmtMoney(next, true)}</span> : '· Rail Baron'}</small>
        <b><Rolling value={nw} compact={nw >= 1e5} /></b>
        <Progress value={next ? (Math.log10(Math.max(nw, 1)) - Math.log10(Math.max(prev, 1))) / (Math.log10(next) - Math.log10(Math.max(prev, 1))) : 1} className="thin gold" />
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
  const opening = useStore((s) => s.opening);
  const seen = useRef(new Set<number>());
  const [visible, setVisible] = useState<G.Notice[]>([]);
  useEffect(() => {
    for (const n of notices) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      setVisible((v) => [...v.slice(-2), n]);
      if (n.kind === 'sale' || n.kind === 'request') sfx.coin();
      if (n.kind === 'achievement') sfx.bigCoin();
      if (n.kind === 'milestone') { sfx.fanfare(); buzz([50, 50, 100]); }
      if (n.kind === 'milestone' && n.text.startsWith('RAIL BARON')) setTimeout(() => useStore.getState().push({ kind: 'victory' }), 600);
      const ttl = n.kind === 'milestone' ? 5000 : 3200;
      setTimeout(() => setVisible((v) => v.filter((x) => x.id !== n.id)), ttl);
    }
    if (notices.length) act((g) => { g.notices = g.notices.filter((x) => !seen.current.has(x.id)); });
  }, [notices]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={'toasts' + (opening ? ' over' : '')}>
      {visible.map((n) => (
        <div key={n.id} className={'toast t-' + n.kind}>
          <span>{n.text}</span>
          {n.amount !== undefined && <Money v={n.amount} className="pos" />}
        </div>
      ))}
    </div>
  );
}

function Coach() {
  const game = useStore((s) => s.game);
  const tab = useStore((s) => s.tab);
  const act = useStore((s) => s.act);
  const setTab = useStore((s) => s.setTab);
  useEffect(() => {
    if (game.tutorial <= 1 && game.stats.packsOpened > 0) act((g) => { g.tutorial = Math.max(g.tutorial, 2); });
  }, [game.tutorial, game.stats.packsOpened]); // eslint-disable-line react-hooks/exhaustive-deps
  if (game.tutorial >= 5) return null;
  const packs = SETS.reduce((a, s) => a + game.packs[s.id], 0);
  let msg: string | null = null;
  let go: Tab | null = null;
  let step = game.tutorial;
  if (step === 0) {
    if (game.stats.packsOpened > 0) step = 2;
    else if (packs > 0) step = 1;
  }
  if (step === 0) { msg = 'Welcome, tycoon! Start with $20. Claim your free pack, or buy one.'; go = tab === 'shop' ? null : 'shop'; }
  else if (step === 1) { msg = game.stats.packsOpened > 0 ? null : 'You have a pack! Head to Rip to tear it open.'; go = tab === 'rip' ? null : 'rip'; }
  else if (step === 2) { msg = 'Nice pulls! Hits sell best on the marketplace: open a card in your Binder and list it.'; go = tab === 'binder' ? null : 'binder'; }
  else if (step === 3) { msg = 'Check the Market for collector requests and price trends. Grade cards with high condition estimates.'; go = tab === 'market' ? null : 'market'; }
  else if (step === 4) { msg = 'Grow your net worth to $1,000,000. New licenses in the Shop unlock bigger sets. Good luck!'; }
  if (!msg) return null;
  const next = () => act((g) => { g.tutorial = Math.max(step, g.tutorial) + 1; });
  return (
    <div className="coach">
      <span>{msg}</span>
      <div className="coach-btns">
        {go && <button className="btn tiny primary" onClick={() => { setTab(go!); if (step >= 2) next(); }}>Show me</button>}
        <button className="btn tiny ghost" onClick={next}>{step >= 4 ? 'Let’s go!' : 'Got it'}</button>
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
          <div><span className="muted">Biggest sale</span><b>{G.fmtMoney(game.stats.biggestSale)}</b></div>
          <div><span className="muted">Sets completed</span><b>{game.bounties.length}/5</b></div>
        </div>
        <p className="muted small">The rails go on forever. Keep collecting: can you complete every set?</p>
        <button className="btn gold wide" onClick={pop}>Keep playing</button>
      </div>
    </div>
  );
}

export { Money };
