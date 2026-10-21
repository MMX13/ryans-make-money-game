import { create } from 'zustand';
import * as G from '../engine/game';

const SAVE_KEY = 'rail-riches-save-v1';

export type Tab = 'shop' | 'rip' | 'binder' | 'market' | 'grading';
export type Sheet =
  | { kind: 'card'; uid: number }
  | { kind: 'cardDef'; cardId: string }
  | { kind: 'menu' }
  | { kind: 'upgrades' }
  | { kind: 'display' }
  | { kind: 'achievements' }
  | { kind: 'stats' }
  | { kind: 'settings' }
  | { kind: 'help' }
  | { kind: 'odds'; set: G.PackResult['set'] }
  | { kind: 'pickDisplay'; slot: number }
  | { kind: 'fulfil'; reqId: number }
  | { kind: 'away'; lines: string[] }
  | { kind: 'victory' }
  | null;

export interface Opening { set: G.PackResult['set']; results: G.PackResult[]; quick: boolean }

interface Store {
  game: G.GameState;
  tab: Tab;
  sheets: Sheet[];
  /** Bumped whenever the card collection may have changed (for memoising expensive views). */
  rev: number;
  /** A reveal (pack or slab) is on screen: hold back toasts so they don't spoil it. */
  revealing: boolean;
  opening: Opening | null;
  binderSet: G.PackResult['set'];
  /** Apply a mutation to a copy of the game state. Returns whatever fn returns. */
  act: <T>(fn: (s: G.GameState) => T) => T;
  setTab: (t: Tab) => void;
  push: (s: Sheet) => void;
  pop: () => void;
  closeAll: () => void;
  setOpening: (o: Opening | null) => void;
  setBinderSet: (s: G.PackResult['set']) => void;
  reset: () => void;
}

function load(): { game: G.GameState; away: string[] | null } {
  const now = Date.now();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const g = G.migrate(JSON.parse(raw));
      if (g) {
        const before = { cash: g.cash, sales: g.stats.sales, display: g.stats.displayEarned, ledger: { ...g.stats.ledger } };
        const gap = now - g.now;
        G.advance(g, now, false);
        g.notices = [];
        const lines: string[] = [];
        if (gap > 60_000) {
          const sold = g.stats.sales - before.sales;
          const listed = (g.stats.ledger.listings ?? 0) - (before.ledger.listings ?? 0);
          const disp = g.stats.displayEarned - before.display;
          if (sold > 0) lines.push(`Sold ${sold} listing${sold > 1 ? 's' : ''} for ${G.fmtMoney(listed)}`);
          if (disp > 0.01) lines.push(`Display case earned ${G.fmtMoney(disp)}`);
          const ready = g.grading.filter((x) => x.doneAt <= g.now).length;
          if (ready) lines.push(`${ready} card${ready > 1 ? 's are' : ' is'} back from grading`);
          if (g.freePacks > 0) lines.push(`${g.freePacks} free pack${g.freePacks > 1 ? 's' : ''} waiting in the Shop`);
        }
        return { game: g, away: lines.length ? lines : null };
      }
    }
  } catch {
    /* unreadable save: handled below */
  }
  // Never silently overwrite a save we could not read: keep a backup copy.
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) localStorage.setItem(`${SAVE_KEY}-backup-${now}`, raw);
  } catch { /* storage blocked */ }
  return { game: G.newGame(now), away: null };
}

/** Cards are flat objects, so copying them shallowly is a full copy and much cheaper than structuredClone. */
function cloneGame(g: G.GameState): G.GameState {
  const { cards, ...rest } = g;
  const copy = structuredClone(rest) as G.GameState;
  copy.cards = cards.map((c) => ({ ...c }));
  return copy;
}

/** Cheaper copy for the 1s tick: `advance` never mutates card objects, only the array. */
function cloneForTick(g: G.GameState): G.GameState {
  const { cards, ...rest } = g;
  const copy = structuredClone(rest) as G.GameState;
  copy.cards = cards.slice();
  return copy;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saveWarned = false;
export function saveNow(game: G.GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game));
    saveWarned = false;
  } catch {
    if (!saveWarned) {
      saveWarned = true;
      useStore.getState().act((g) => G.notify(g, 'info', 'Could not save! Storage is full: bulk-sell some cards.'));
    }
  }
}
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; saveNow(useStore.getState().game); }, 5000);
}
let sheetKey = 0;

const initial = load();

export const useStore = create<Store>((set, get) => ({
  game: initial.game,
  tab: 'shop',
  sheets: initial.away ? [{ kind: 'away', lines: initial.away }] : [],
  opening: null,
  binderSet: 'iron',
  rev: 0,
  revealing: false,
  act: (fn) => {
    const copy = cloneGame(get().game);
    // bring the clock up to date first, so time-based progress is never skipped
    G.advance(copy, Date.now(), document.visibilityState === 'visible');
    const out = fn(copy);
    set({ game: copy, rev: get().rev + 1 });
    scheduleSave();
    return out;
  },
  setTab: (tab) => set({ tab, sheets: [] }),
  push: (sheet) => set({ sheets: [...get().sheets, { ...sheet!, _k: ++sheetKey } as unknown as Sheet] }),
  pop: () => set({ sheets: get().sheets.slice(0, -1) }),
  closeAll: () => set({ sheets: [] }),
  setOpening: (opening) => set({ opening }),
  setBinderSet: (binderSet) => set({ binderSet }),
  reset: () => {
    localStorage.removeItem(SAVE_KEY);
    set({ game: G.newGame(Date.now()), sheets: [], opening: null, tab: 'shop' });
  },
}));

export function startLoop() {
  const tick = () => {
    const st = useStore.getState();
    const copy = cloneForTick(st.game);
    const n = copy.cards.length;
    G.advance(copy, Date.now(), document.visibilityState === 'visible');
    useStore.setState({ game: copy, rev: copy.cards.length !== n ? st.rev + 1 : st.rev });
    scheduleSave();
  };
  const id = setInterval(tick, 1000);
  const onHide = () => { if (document.visibilityState === 'hidden') saveNow(useStore.getState().game); };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', () => saveNow(useStore.getState().game));
  return () => { clearInterval(id); document.removeEventListener('visibilitychange', onHide); };
}

export const useGame = <T,>(sel: (g: G.GameState) => T) => useStore((s) => sel(s.game));
