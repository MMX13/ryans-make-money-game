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
  | null;

export interface Opening { set: G.PackResult['set']; results: G.PackResult[]; quick: boolean }

interface Store {
  game: G.GameState;
  tab: Tab;
  sheets: Sheet[];
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
    /* corrupted save: start fresh */
  }
  return { game: G.newGame(now), away: null };
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
export function saveNow(game: G.GameState) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(game)); } catch { /* storage full or blocked */ }
}
function scheduleSave(game: G.GameState) {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; saveNow(useStore.getState().game); }, 1500);
  void game;
}

const initial = load();

export const useStore = create<Store>((set, get) => ({
  game: initial.game,
  tab: 'shop',
  sheets: initial.away ? [{ kind: 'away', lines: initial.away }] : [],
  opening: null,
  binderSet: 'iron',
  act: (fn) => {
    const copy = structuredClone(get().game);
    copy.now = Math.max(copy.now, Date.now() - 1);
    const out = fn(copy);
    set({ game: copy });
    scheduleSave(copy);
    return out;
  },
  setTab: (tab) => set({ tab, sheets: [] }),
  push: (sheet) => set({ sheets: [...get().sheets, sheet] }),
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
    st.act((g) => G.advance(g, Date.now(), document.visibilityState === 'visible'));
  };
  const id = setInterval(tick, 1000);
  const onHide = () => { if (document.visibilityState === 'hidden') saveNow(useStore.getState().game); };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', () => saveNow(useStore.getState().game));
  return () => { clearInterval(id); document.removeEventListener('visibilitychange', onHide); };
}

export const useGame = <T,>(sel: (g: G.GameState) => T) => useStore((s) => sel(s.game));
