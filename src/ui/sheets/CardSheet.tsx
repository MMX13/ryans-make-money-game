import { useState } from 'react';
import { CARD_BY_ID, SET_BY_ID } from '../../engine/data';
import { GRADERS, LISTING_FEE, RARITY_NAME, VARIETY_NAME, gradeMult, type GraderId } from '../../engine/config';
import * as G from '../../engine/game';
import { CardFace, RARITY_COLOR, Tilt } from '../Card';
import { buzz, sfx } from '../sfx';
import { useStore } from '../store';
import { Money, Sheet, fmtTime, useNow } from '../widgets';

export function expectedGradeMult(lo: number, hi: number): number {
  // rough average of the multiplier across the estimate range
  const pts: number[] = [];
  for (let g = lo; g <= hi + 1e-9; g += 0.5) pts.push(gradeMult(g));
  return pts.reduce((a, b) => a + b, 0) / pts.length;
}

export function worthGrading(game: G.GameState, inst: G.CardInst): boolean {
  if (inst.grade !== undefined) return false;
  const [lo, hi] = G.gradeEstimate(game, inst);
  const v = G.value(game, inst);
  const fee = G.gradingFee(game, inst, 'plat');
  return expectedGradeMult(lo, hi) * v - fee > v * 1.15 && lo >= 8.5;
}

export function CardSheet({ uid }: { uid: number }) {
  const game = useStore((s) => s.game);
  const act = useStore((s) => s.act);
  const pop = useStore((s) => s.pop);
  const push = useStore((s) => s.push);
  const now = useNow(500);
  const inst = game.cards.find((c) => c.uid === uid);
  const [mode, setMode] = useState<'main' | 'list' | 'grade'>('main');
  const [ratio, setRatio] = useState(1);
  if (!inst) {
    return <Sheet title="Card"><p className="muted center">This card is no longer in your collection.</p></Sheet>;
  }
  const def = CARD_BY_ID[inst.cardId];
  const v = G.value(game, inst);
  const dealer = G.dealerPrice(game, inst);
  const [lo, hi] = G.gradeEstimate(game, inst);
  const listing = game.listings.find((l) => l.uid === uid);
  const sub = game.grading.find((g) => g.uid === uid);
  const matches = game.requests.filter((q) => G.requestMatches(q, inst));
  const freeSlot = game.display.findIndex((d) => d === null);

  const sell = () => {
    act((g) => G.sellCards(g, g.cards.filter((c) => c.uid === uid)));
    sfx.coin(); buzz(15); pop();
  };

  return (
    <Sheet title={<span style={{ color: RARITY_COLOR[def.rarity] }}>{RARITY_NAME[def.rarity]}{inst.variety !== 'std' ? ' · ' + VARIETY_NAME[inst.variety] : ''}</span>} className="card-sheet">
      <div className="cs-card"><Tilt><CardFace look={inst} size="lg" showFact /></Tilt></div>
      <div className="cs-stats">
        <div><small>Market value</small><b><Money v={v} /></b></div>
        <div><small>Dealer pays</small><b><Money v={dealer} /></b></div>
        <div>
          <small>{inst.grade !== undefined ? 'Grade' : 'Est. grade'}</small>
          <b>{inst.grade !== undefined ? `${GRADERS[inst.grader!].short} ${inst.grade}` : `${lo}–${hi}`}</b>
        </div>
      </div>
      <p className="cs-set muted">{SET_BY_ID[def.set].name} #{def.num} · {inst.first ? '1st Edition · ' : ''}{(game.demand[inst.cardId] ?? 1) < 0.97 ? 'Demand is soft (you sold copies recently)' : 'Pulled ' + new Date(inst.at).toLocaleDateString()}</p>

      {listing && (
        <div className="cs-box">
          <b>Listed for <Money v={listing.price} /></b>
          <small className="muted">{describeRatio(listing.price / v)} · expected to sell in ~{fmtTime(G.listingSeconds(listing.price / v) * 1000)}</small>
          <button className="btn" onClick={() => act((g) => G.cancelListing(g, uid))}>Cancel listing</button>
        </div>
      )}
      {sub && (
        <div className="cs-box">
          <b>At {GRADERS[sub.grader].name}</b>
          <small className="muted">{sub.doneAt > now ? `Back in ${fmtTime(sub.doneAt - now)}` : 'Ready to crack open in the Grading tab!'}</small>
        </div>
      )}
      {inst.status === 'display' && (
        <div className="cs-box">
          <b>In your display case</b>
          <small className="muted">Earning <Money v={G.displayRate(game, inst)} />/hour</small>
          <button className="btn" onClick={() => act((g) => G.setDisplay(g, g.display.indexOf(uid), null))}>Take out of display</button>
        </div>
      )}

      {inst.status === 'binder' && mode === 'main' && (
        <div className="cs-actions">
          {matches.map((q) => (
            <button key={q.id} className="btn gold wide" onClick={() => { act((g) => G.fulfilRequest(g, q.id, uid)); sfx.bigCoin(); buzz([20, 30, 40]); pop(); }}>
              Deliver to {q.who} · <Money v={q.pay} />
            </button>
          ))}
          <button className="btn primary wide" onClick={() => setMode('list')}>List on marketplace</button>
          <div className="row">
            <button className="btn" onClick={sell}>Sell to dealer · <Money v={dealer} /></button>
            {inst.grade === undefined && <button className="btn" onClick={() => setMode('grade')}>Grade…</button>}
          </div>
          <div className="row">
            <button className="btn ghost" disabled={freeSlot < 0} onClick={() => { act((g) => G.setDisplay(g, freeSlot, uid)); sfx.click(); }}>
              {freeSlot < 0 ? 'Display full' : `Display · ${G.fmtMoney(G.displayRate(game, inst))}/h`}
            </button>
            <button className="btn ghost" onClick={() => act((g) => { const c = g.cards.find((x) => x.uid === uid); if (c) c.fav = !c.fav; })}>
              {inst.fav ? '★ Kept' : '☆ Keep'}
            </button>
          </div>
          {inst.fav && <small className="muted center">Kept cards are never bulk-sold.</small>}
        </div>
      )}

      {inst.status === 'binder' && mode === 'list' && (
        <ListPanel v={v} ratio={ratio} setRatio={setRatio} slotsFree={G.listingSlots(game) - game.listings.length}
          onBack={() => setMode('main')}
          onList={() => {
            if (act((g) => G.listCard(g, uid, v * ratio))) { sfx.click(); buzz(10); pop(); }
            else sfx.error();
          }} />
      )}

      {inst.status === 'binder' && mode === 'grade' && (
        <GradePanel inst={inst} onBack={() => setMode('main')} onDone={() => pop()} onGo={() => { pop(); push({ kind: 'menu' }); }} />
      )}
    </Sheet>
  );
}

export function describeRatio(r: number) {
  if (r < 0.9) return 'Bargain price';
  if (r < 1.03) return 'Fair price';
  if (r < 1.15) return 'A bit pricey';
  if (r < 1.3) return 'Pricey';
  return 'Very optimistic';
}

function ListPanel({ v, ratio, setRatio, slotsFree, onList, onBack }: { v: number; ratio: number; setRatio: (r: number) => void; slotsFree: number; onList: () => void; onBack: () => void }) {
  const price = v * ratio;
  const secs = G.listingSeconds(ratio);
  return (
    <div className="cs-panel">
      <div className="list-price">
        <Money v={price} className="big" />
        <small>You receive <Money v={price * (1 - LISTING_FEE)} /> after the {Math.round(LISTING_FEE * 100)}% fee</small>
      </div>
      <input type="range" min={0.8} max={1.5} step={0.01} value={ratio} onChange={(e) => setRatio(Number(e.target.value))} className="slider" />
      <div className="slider-labels"><span>80%</span><span className={ratio > 1.15 ? 'neg' : ratio < 0.95 ? 'pos' : ''}>{describeRatio(ratio)} · ~{fmtTime(secs * 1000)}</span><span>150%</span></div>
      <div className="row">
        <button className="btn ghost" onClick={onBack}>Back</button>
        <button className="btn primary" disabled={slotsFree <= 0} onClick={onList}>{slotsFree > 0 ? 'List it' : 'No free listing slots'}</button>
      </div>
    </div>
  );
}

function GradePanel({ inst, onBack, onDone }: { inst: G.CardInst; onBack: () => void; onDone: () => void; onGo: () => void }) {
  const game = useStore((s) => s.game);
  const act = useStore((s) => s.act);
  const [lo, hi] = G.gradeEstimate(game, inst);
  const v = G.value(game, inst);
  const slotsFree = G.gradingSlots(game) - game.grading.length;
  return (
    <div className="cs-panel">
      <p className="muted small">Estimated condition <b>{lo}–{hi}</b>. A 10 is worth ×5, a 9 ×1.6, an 8 ×1.1, and a 7 or less is worth less than raw.</p>
      {(Object.keys(GRADERS) as GraderId[]).map((id) => {
        const g = GRADERS[id];
        const unlocked = G.hasLicense(game, g.needs);
        const fee = G.gradingFee(game, inst, id);
        const exp = expectedGradeMult(lo, hi) * g.bonus * v;
        return (
          <div key={id} className={'grader-opt' + (unlocked ? '' : ' locked')}>
            <div>
              <b>{g.name}</b>
              <small>{g.seconds}s turnaround{g.bonus > 1 ? ` · slabs worth ×${g.bonus}` : ''}</small>
              {unlocked ? <small>Expected slab value ≈ <Money v={exp} /></small> : <small>Needs the {SET_BY_ID[g.needs].name} license</small>}
            </div>
            <button className="btn primary" disabled={!unlocked || slotsFree <= 0 || game.cash < fee}
              onClick={() => { if (act((s) => G.submitGrading(s, inst.uid, id))) { sfx.slab(); buzz(15); onDone(); } else sfx.error(); }}>
              <Money v={fee} />
            </button>
          </div>
        );
      })}
      {slotsFree <= 0 && <small className="neg center">All grading slots are busy.</small>}
      <button className="btn ghost wide" onClick={onBack}>Back</button>
    </div>
  );
}

export function CardDefSheet({ cardId }: { cardId: string }) {
  const game = useStore((s) => s.game);
  const push = useStore((s) => s.push);
  const def = CARD_BY_ID[cardId];
  const copies = game.cards.filter((c) => c.cardId === cardId).sort((a, b) => G.value(game, b) - G.value(game, a));
  const best = copies[0];
  return (
    <Sheet title={`${def.name}`} className="card-sheet">
      <div className="cs-card">
        {best ? <Tilt><CardFace look={best} size="lg" showFact /></Tilt> : <div className="silhouette lg"><span>#{def.num}</span><b>{def.name}</b><small>{RARITY_NAME[def.rarity]}</small></div>}
      </div>
      <p className="muted center small">{def.fact}</p>
      <p className="center small">Raw Standard value ≈ <Money v={G.value(game, { cardId, variety: 'std', first: false })} /></p>
      {copies.length ? (
        <div className="copy-list">
          {copies.map((c) => (
            <button key={c.uid} className="copy-row" onClick={() => push({ kind: 'card', uid: c.uid })}>
              <CardFace look={c} size="xs" />
              <span className="grow">
                {VARIETY_NAME[c.variety]}{c.first ? ' · 1st' : ''}{c.grade !== undefined ? ` · ${GRADERS[c.grader!].short} ${c.grade}` : ''}
                <small className="muted">{c.status === 'binder' ? (c.fav ? 'Kept' : 'In binder') : c.status === 'listed' ? 'Listed' : c.status === 'grading' ? 'At grader' : 'On display'}</small>
              </span>
              <Money v={G.value(game, c)} />
            </button>
          ))}
        </div>
      ) : <p className="muted center">You don't own this card yet.</p>}
    </Sheet>
  );
}
