import { CARD_BY_ID, SETS } from '../../engine/data';
import { RARITY_NAME, VARIETY_NAME } from '../../engine/config';
import * as G from '../../engine/game';
import { CardFace, RARITY_COLOR } from '../Card';
import { describeRatio } from '../sheets/CardSheet';
import { buzz, sfx } from '../sfx';
import { useStore } from '../store';
import { Empty, Money, Progress, Sparkline, TrendArrow, fmtTime, useNow } from '../widgets';

/** The cheapest matching copy that the player hasn't marked to keep. */
export function bestMatch(game: G.GameState, q: G.Request): G.CardInst | undefined {
  return game.cards.filter((c) => !c.fav && G.requestMatches(q, c)).sort((a, b) => G.value(game, a) - G.value(game, b))[0];
}

export function Market() {
  const game = useStore((s) => s.game);
  const act = useStore((s) => s.act);
  const push = useStore((s) => s.push);
  const now = useNow(500);
  const e = game.event;
  return (
    <div className="screen market">
      {e && (
        <div className={'event-card ' + (now < e.startAt ? 'soon' : 'live') + ' ev-' + e.kind}>
          <small>{now < e.startAt ? `Starting in ${fmtTime(e.startAt - now)}` : `Live · ends in ${fmtTime(e.endAt - now)}`}</small>
          <b>{G.eventText(e)}</b>
        </div>
      )}

      <h4 className="section">Hype index <small className="muted">· prices move every minute</small></h4>
      <div className="hype-board">
        {SETS.filter((s) => game.licenses.includes(s.id)).map((s) => (
          <div key={s.id} className="hype-row">
            <span className="hype-name">{s.emblem} {s.name}</span>
            <Sparkline data={game.hypeHist[s.id]} w={80} h={24} />
            <TrendArrow v={game.hype[s.id]} />
          </div>
        ))}
      </div>

      <h4 className="section">Collector requests</h4>
      <div className="requests">
        {game.requests.map((q) => {
          const def = CARD_BY_ID[q.cardId];
          const match = bestMatch(game, q);
          const owned = game.cards.some((c) => c.cardId === q.cardId);
          return (
            <div key={q.id} className="request">
              <button className="req-card" onClick={() => push({ kind: 'cardDef', cardId: q.cardId })}><CardFace look={{ cardId: q.cardId, variety: q.needVariety ? 'holo' : 'std' }} size="xs" /></button>
              <div className="grow">
                <small className="muted">{q.who} wants</small>
                <b>{def.name}</b>
                <small style={{ color: RARITY_COLOR[def.rarity] }}>
                  {RARITY_NAME[def.rarity]}{q.needVariety ? ' · any Holo or better' : ''}{q.minGrade ? ` · graded ${q.minGrade}+` : ''}
                </small>
                <small className="muted">Expires in {fmtTime(q.expiresAt - now)}</small>
              </div>
              <div className="req-pay">
                <Money v={q.pay} className="pos" />
                {match ? (
                  <button className="btn gold tiny" onClick={() => { act((g) => G.fulfilRequest(g, q.id, match.uid)); sfx.bigCoin(); buzz([20, 30, 40]); }}>Deliver</button>
                ) : <small className="muted">{!owned ? 'Not owned' : q.minGrade ? `Needs ${q.minGrade}+ slab` : q.needVariety ? 'Needs Holo+' : 'Not available'}</small>}
              </div>
            </div>
          );
        })}
      </div>

      <h4 className="section">My listings <small className="muted">· {G.usedListingSlots(game)}/{G.listingSlots(game)} slots</small></h4>
      {G.usedListingSlots(game) === 0 ? (
        <p className="muted small">List cards from your Binder to sell them for more than the dealer pays.</p>
      ) : (
        <div className="listings">
          {game.lots.map((lot) => {
            const first = game.cards.find((c) => c.uid === lot.uids[0]);
            return (
              <div key={lot.id} className="listing">
                {first ? <CardFace look={first} size="xs" /> : null}
                <div className="grow">
                  <b>Lot of {lot.uids.length} cards</b>
                  <small className="muted">Sells to a dealer network, usually within a minute</small>
                  <Progress value={Math.min(0.95, (now - lot.at) / 45000)} className="thin" />
                </div>
                <div className="right">
                  <Money v={lot.price} />
                  <button className="btn tiny ghost" onClick={() => act((g) => G.cancelLot(g, lot.id))}>Cancel</button>
                </div>
              </div>
            );
          })}
          {game.listings.map((l) => {
            const inst = game.cards.find((c) => c.uid === l.uid);
            if (!inst) return null;
            const v = G.value(game, inst);
            const ratio = l.price / v;
            const exp = G.listingSeconds(ratio) * 1000;
            return (
              <div key={l.uid} className="listing" onClick={() => push({ kind: 'card', uid: l.uid })}>
                <CardFace look={inst} size="xs" />
                <div className="grow">
                  <b>{G.card(inst).name}</b>
                  <small className={ratio > 1.15 ? 'neg' : 'muted'}>{describeRatio(ratio)} · value <Money v={v} /></small>
                  <Progress value={Math.min(0.95, (now - l.at) / exp)} className="thin" />
                </div>
                <Money v={l.price} />
              </div>
            );
          })}
        </div>
      )}

      <h4 className="section">Singles for sale <small className="muted">· restock in {fmtTime(game.nextSinglesAt - now)}</small></h4>
      {game.singles.length === 0 ? <Empty icon="🛒" title="Sold out">New stock arrives soon.</Empty> : (
        <div className="singles">
          {game.singles.map((sg) => {
            const price = G.singlePrice(game, sg);
            const def = CARD_BY_ID[sg.cardId];
            const owned = game.cards.some((c) => c.cardId === sg.cardId);
            return (
              <div key={sg.id} className="single">
                <button className="plain" onClick={() => push({ kind: 'cardDef', cardId: sg.cardId })}><CardFace look={{ cardId: sg.cardId, variety: sg.variety }} size="sm" /></button>
                <small className="single-name">{def.name}{sg.variety !== 'std' ? ` · ${VARIETY_NAME[sg.variety]}` : ''}</small>
                {!owned && <small className="badge need">Need</small>}
                <button className="btn tiny" disabled={game.cash < price} onClick={() => { if (act((g) => G.buySingle(g, sg.id))) { sfx.coin(); buzz(10); } }}>
                  Buy <Money v={price} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
