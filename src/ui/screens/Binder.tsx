import { useMemo, useState } from 'react';
import { CARDS_BY_SET, SETS, SET_BY_ID, type Rarity } from '../../engine/data';
import { RARITY_NAME } from '../../engine/config';
import * as G from '../../engine/game';
import { CardFace, RARITY_COLOR, RARITY_SYMBOL, artSpec } from '../Card';
import { TrainArt } from '../../art/TrainArt';
import { worthGrading } from '../sheets/CardSheet';
import { buzz, sfx } from '../sfx';
import { useStore } from '../store';
import { Empty, Money, Progress } from '../widgets';

type View = 'set' | 'all';
type Filter = 'all' | 'hits' | 'graded' | 'grade' | 'special';

export function Binder() {
  const game = useStore((s) => s.game);
  const act = useStore((s) => s.act);
  const push = useStore((s) => s.push);
  const setId = useStore((s) => s.binderSet);
  const setBinderSet = useStore((s) => s.setBinderSet);
  const [view, setView] = useState<View>('set');
  const [filter, setFilter] = useState<Filter>('all');
  const rev = useStore((s) => s.rev);
  const { bulk, bulkValue, lot, lotValue } = useMemo(() => {
    const bulk = G.bulkCandidates(game);
    const lot = G.lotCandidates(game);
    return { bulk, bulkValue: bulk.reduce((a, c) => a + G.dealerPrice(game, c), 0), lot, lotValue: G.lotPrice(game, lot) };
  }, [rev, game.lastMarketTick]); // eslint-disable-line react-hooks/exhaustive-deps
  const slotFree = G.usedListingSlots(game) < G.listingSlots(game);

  return (
    <div className="screen binder">
      <div className="seg">
        <button className={view === 'set' ? 'on' : ''} onClick={() => setView('set')}>Sets</button>
        <button className={view === 'all' ? 'on' : ''} onClick={() => setView('all')}>All cards <span className="pill">{game.cards.length}</span></button>
      </div>
      {bulk.length > 0 && (
        <button className="btn wide bulk-btn" onClick={() => { act((g) => G.sellCards(g, G.bulkCandidates(g), true)); sfx.coin(); buzz(15); }}>
          Bulk-sell {bulk.length} duplicate commons · <Money v={bulkValue} />
        </button>
      )}
      {lot.length >= 2 && (
        <button className="btn wide lot-btn" disabled={!slotFree} onClick={() => { if (act((g) => G.listLot(g))) { sfx.click(); buzz(10); } }}>
          {slotFree ? <>List {lot.length} spare Rares &amp; holos as a lot · <Money v={lotValue} /></> : 'Lot ready, but all listing slots are busy'}
        </button>
      )}
      {view === 'set' ? <SetView setId={setId} onSet={setBinderSet} /> : <AllView filter={filter} setFilter={setFilter} />}
      {view === 'set' && <p className="muted center small">Tap a card to see your copies. Bulk-selling always keeps one copy of each card.</p>}
      {void push}
    </div>
  );
}

function SetView({ setId, onSet }: { setId: G.PackResult['set']; onSet: (s: G.PackResult['set']) => void }) {
  const game = useStore((s) => s.game);
  const act = useStore((s) => s.act);
  const push = useStore((s) => s.push);
  const prog = G.setProgress(game, setId);
  const cards = CARDS_BY_SET[setId];
  const claimed = game.bounties.includes(setId);
  const rev = useStore((s) => s.rev);
  const bestByCard = useMemo(() => {
    const m = new Map<string, { inst: G.CardInst; n: number; v: number }>();
    for (const c of game.cards) {
      const v = G.value(game, c);
      const e = m.get(c.cardId);
      if (!e) m.set(c.cardId, { inst: c, n: 1, v });
      else { e.n++; if (v > e.v) { e.inst = c; e.v = v; } }
    }
    return m;
  }, [rev, game.lastMarketTick]); // eslint-disable-line react-hooks/exhaustive-deps
  const visibleSets = SETS.filter((s) => game.licenses.includes(s.id) || game.cards.some((c) => G.card(c).set === s.id));
  return (
    <>
      <div className="chips">
        {visibleSets.map((s) => (
          <button key={s.id} className={'chip' + (s.id === setId ? ' on' : '')} onClick={() => onSet(s.id)} style={{ '--s1': s.color } as React.CSSProperties}>
            {s.emblem} {s.name} <small>{G.setProgress(game, s.id).owned}/24</small>
          </button>
        ))}
      </div>
      <div className="set-progress">
        <div className="row between">
          <b>{SET_BY_ID[setId].name}</b>
          <span>{prog.owned}/24</span>
        </div>
        <Progress value={prog.owned / 24} />
        {claimed ? (
          <small className="pos">Set complete, bounty claimed ✓</small>
        ) : prog.owned >= 24 ? (
          <button className="btn gold wide" onClick={() => { if (act((g) => G.claimBounty(g, setId))) { sfx.fanfare(); buzz([40, 30, 90]); } }}>
            Claim set bounty · <Money v={G.bountyAmount(setId)} />
          </button>
        ) : (
          <small className="muted">Collect all 24 to earn a <Money v={G.bountyAmount(setId)} /> bounty. The secret rare is a bonus.</small>
        )}
      </div>
      <div className="binder-grid">
        {cards.map((def) => {
          const e = bestByCard.get(def.id);
          return (
            <button key={def.id} className={'binder-slot' + (e ? ' have' : '')} onClick={() => push(e && e.n === 1 ? { kind: 'card', uid: e.inst.uid } : { kind: 'cardDef', cardId: def.id })}>
              {e ? (
                <>
                  <CardFace look={e.inst} size="sm" />
                  {e.n > 1 && <span className="count">×{e.n}</span>}
                </>
              ) : (
                <div className="silhouette sm" style={{ '--rc': RARITY_COLOR[def.rarity] } as React.CSSProperties}>
                  <TrainArt spec={artSpec(def)} className="sil-art" />
                  <span>#{def.num}</span>
                  <b>{game.seen[def.id] ? def.name : def.rarity === 'SEC' ? '???' : def.name}</b>
                  <small>{RARITY_SYMBOL[def.rarity]}</small>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

const RANK: Record<Rarity, number> = { C: 0, U: 1, R: 2, SR: 3, UR: 4, SEC: 5 };

function AllView({ filter, setFilter }: { filter: Filter; setFilter: (f: Filter) => void }) {
  const game = useStore((s) => s.game);
  const push = useStore((s) => s.push);
  const rev = useStore((s) => s.rev);
  const list = useMemo(() => {
    let cs = game.cards;
    if (filter === 'hits') cs = cs.filter((c) => RANK[G.card(c).rarity] >= 2);
    if (filter === 'graded') cs = cs.filter((c) => c.grade !== undefined);
    if (filter === 'special') cs = cs.filter((c) => c.variety !== 'std' || c.first);
    if (filter === 'grade') cs = cs.filter((c) => c.status === 'binder' && worthGrading(game, c));
    return cs.map((c) => ({ c, v: G.value(game, c) })).sort((a, b) => b.v - a.v).slice(0, 200);
  }, [rev, game.lastMarketTick, filter]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = useMemo(() => game.cards.reduce((a, c) => a + G.value(game, c), 0), [rev, game.lastMarketTick]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <div className="chips">
        {([['all', 'All'], ['hits', 'Rare+'], ['special', 'Holo & 1st'], ['graded', 'Slabs'], ['grade', 'To grade']] as [Filter, string][]).map(([f, l]) => (
          <button key={f} className={'chip' + (filter === f ? ' on' : '')} onClick={() => setFilter(f)}>{l}</button>
        ))}
      </div>
      <p className="muted small">Collection market value <Money v={total} /></p>
      {!list.length ? <Empty icon="🗂️" title="Nothing here yet">Open some packs to fill your binder.</Empty> : (
        <div className="card-list">
          {list.map(({ c, v }) => {
            const def = G.card(c);
            return (
              <button key={c.uid} className="list-row" onClick={() => push({ kind: 'card', uid: c.uid })}>
                <CardFace look={c} size="xs" />
                <span className="grow">
                  <b>{def.name}</b>
                  <small style={{ color: RARITY_COLOR[def.rarity] }}>{RARITY_NAME[def.rarity]}{c.variety !== 'std' ? ' · ' + c.variety.replace('full', 'full art') : ''}{c.first ? ' · 1st' : ''}{c.grade !== undefined ? ' · ' + c.grade : ''}</small>
                  {c.status !== 'binder' && <small className="muted">{c.status === 'listed' ? 'Listed' : c.status === 'grading' ? 'At grader' : 'On display'}</small>}
                </span>
                <span className="right">
                  <Money v={v} />
                  {c.status === 'binder' && worthGrading(game, c) && <small className="badge grade-badge">Grade?</small>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
