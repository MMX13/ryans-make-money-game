import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { CARD_BY_ID, SET_BY_ID, type Rarity } from '../engine/data';
import { RARITY_NAME, VARIETY_NAME } from '../engine/config';
import * as G from '../engine/game';
import { CardBack, CardFace, PackArt, RARITY_COLOR, Tilt } from './Card';
import { buzz, sfx } from './sfx';
import { useStore } from './store';
import { Money, CountUp } from './widgets';

type Phase = 'tear' | 'reveal' | 'summary';

const RANK: Record<Rarity, number> = { C: 0, U: 1, R: 2, SR: 3, UR: 4, SEC: 5 };

function isSpecial(pc: G.PulledCard) {
  return pc.inst.variety !== 'std' || RANK[CARD_BY_ID[pc.inst.cardId].rarity] >= 2;
}

export function PackOpening() {
  const opening = useStore((s) => s.opening)!;
  if (opening.quick) return <QuickSummary />;
  return <SingleOpening key={opening.results.length} />;
}

function SingleOpening() {
  const opening = useStore((s) => s.opening)!;
  const setOpening = useStore((s) => s.setOpening);
  const act = useStore((s) => s.act);
  const reduced = useStore((s) => s.game.settings.reducedMotion);
  const result = opening.results[opening.results.length - 1];
  const [phase, setPhase] = useState<Phase>('tear');
  const [torn, setTorn] = useState(false);
  const [idx, setIdx] = useState(0); // index of the top (current) card
  const [flipped, setFlipped] = useState(false);
  const [cracked, setCracked] = useState(false);
  const [charge, setCharge] = useState(0);
  const [burst, setBurst] = useState<Rarity | null>(null);
  const holdRef = useRef<{ raf: number; start: number } | null>(null);
  const justHeld = useRef(0);
  const cards = result.cards;
  const cur = cards[idx];
  const curDef = cur ? CARD_BY_ID[cur.inst.cardId] : null;
  const isHit = idx === 4 && !result.god;
  const realRarity = curDef?.rarity ?? 'C';
  const glowRarity: Rarity | null = !cur || flipped ? null
    : (isHit || result.god) && RANK[realRarity] >= 2 ? (result.fakeFrom && isHit && !cracked ? result.fakeFrom : realRarity)
    : cur.inst.variety === 'gold' || cur.inst.variety === 'misprint' ? 'UR'
    : cur.inst.variety !== 'std' ? 'R' : null;
  const bigHit = !!cur && (RANK[realRarity] >= 4 || cur.inst.variety === 'gold' || cur.inst.variety === 'misprint');
  const needsHold = !flipped && (realRarity === 'UR' || realRarity === 'SEC') && (!result.fakeFrom || !isHit || cracked);

  // tear
  const swipe = useRef<{ x: number; max: number } | null>(null);
  const doTear = () => {
    if (torn) return;
    setTorn(true);
    sfx.tear();
    buzz(30);
    setTimeout(() => setPhase('reveal'), reduced ? 150 : 650);
  };

  // auto-fan plain commons at the start of the reveal: flip, pause, move on
  const autoCard = phase === 'reveal' && idx < 3 && !!cur && !isSpecial(cur) && !result.god;
  useEffect(() => {
    if (!autoCard) return;
    const t = window.setTimeout(() => {
      if (!flipped) { sfx.flip(); setFlipped(true); } else advance();
    }, !flipped ? (idx === 0 ? 250 : 110) : (reduced ? 120 : 380));
    return () => clearTimeout(t);
  }, [autoCard, idx, flipped]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (phase !== 'reveal' || flipped || autoCard) return;
    if (glowRarity && RANK[glowRarity] >= 2) { sfx.glow(glowRarity); buzz(RANK[glowRarity] >= 4 ? [20, 40, 20] : 15); }
  }, [phase, idx, flipped, cracked]); // eslint-disable-line react-hooks/exhaustive-deps

  function advance() {
    setFlipped(false);
    setCracked(false);
    setBurst(null);
    setCharge(0);
    if (idx >= 4) { setPhase('summary'); return; }
    sfx.whoosh();
    setIdx(idx + 1);
  }

  function flip() {
    if (!cur || !curDef) return;
    setFlipped(true);
    const r = curDef.rarity;
    sfx.flip();
    if (RANK[r] >= 2 || cur.inst.variety !== 'std') {
      const special = cur.inst.variety === 'gold' || cur.inst.variety === 'misprint';
      const fx: Rarity = special && RANK[r] < 4 ? 'UR' : RANK[r] >= 2 ? r : 'R';
      setTimeout(() => {
        sfx.reveal(special ? fx : RANK[r] >= 2 ? r : 'U');
        setBurst(fx);
        buzz(RANK[r] >= 4 ? [60, 40, 90, 40, 140] : RANK[r] >= 3 ? [30, 30, 60] : 25);
      }, 180);
    }
  }

  function tapCard() {
    if (phase !== 'reveal' || !cur) return;
    // the click that ends a press-and-hold is not a tap
    if (justHeld.current) { justHeld.current = 0; return; }
    if (flipped) { advance(); return; }
    if (result.fakeFrom && isHit && !cracked) {
      setCracked(true);
      sfx.crack();
      buzz([40, 30, 40]);
      return;
    }
    if (needsHold) return;
    flip();
  }

  const holdStart = () => {
    if (!needsHold || holdRef.current) return;
    justHeld.current = 1;
    sfx.chargeStart();
    const start = performance.now();
    const loop = () => {
      const p = Math.min(1, (performance.now() - start) / 1300);
      setCharge(p);
      if (p >= 1) {
        holdRef.current = null;
        sfx.chargeStop();
        flip();
        return;
      }
      if (Math.random() < 0.15) buzz(8);
      holdRef.current = { raf: requestAnimationFrame(loop), start };
    };
    holdRef.current = { raf: requestAnimationFrame(loop), start };
  };
  const holdEnd = () => {
    if (!holdRef.current) return;
    cancelAnimationFrame(holdRef.current.raf);
    holdRef.current = null;
    sfx.chargeStop();
    setCharge(0);
  };
  useEffect(() => () => { if (holdRef.current) cancelAnimationFrame(holdRef.current.raf); sfx.chargeStop(); }, []);

  const set = SET_BY_ID[result.set];
  const game = useStore((s) => s.game);
  const packsLeft = game.packs[result.set];
  const dupes = phase === 'summary' ? G.bulkCandidates(game, cards.map((c) => c.inst.uid)) : [];
  const dupeValue = dupes.reduce((a, c) => a + G.dealerPrice(game, c), 0);

  const openNext = () => {
    const res = act((g) => G.openPack(g, result.set));
    if (res) setOpening({ ...opening, results: [...opening.results, res] });
  };
  const close = () => setOpening(null);

  if (phase === 'summary') {
    const best = [...cards].sort((a, b) => b.value - a.value)[0];
    const profit = result.total - result.paid;
    return (
      <div className="opening summary-phase" style={{ '--s1': set.color, '--s2': set.color2 } as CSSProperties}>
        <div className="sum-head">
          {result.god && <div className="god-banner">GOD PACK!</div>}
          <h2>{set.name}{result.first ? <span className="badge first-badge">1st Edition</span> : null}</h2>
          <div className="sum-total">
            <span>Pack value</span>
            <CountUp value={result.total} className={'big ' + (profit >= 0 ? 'pos' : '')} />
            <small>{result.paid > 0 ? <>You paid <Money v={result.paid} /> · </> : 'Free pack · '}{profit >= 0 ? <span className="pos">+<Money v={profit} /> profit</span> : <span className="muted">−<Money v={-profit} /></span>}</small>
          </div>
        </div>
        <div className="sum-grid">
          {cards.map((pc, i) => (
            <div key={pc.inst.uid} className={'sum-card' + (pc === best ? ' best' : '')} style={{ animationDelay: `${i * 60}ms` }}>
              <CardFace look={pc.inst} size="sm" />
              <div className="sum-meta">
                {pc.isNew && <span className="badge new">NEW</span>}
                {pc.autoSold ? <span className="muted">auto-sold</span> : <Money v={pc.value} />}
              </div>
            </div>
          ))}
        </div>
        <div className="sum-actions">
          {dupes.length > 0 && (
            <button className="btn ghost" onClick={() => { const got = act((g) => G.sellCards(g, G.bulkCandidates(g, cards.map((c) => c.inst.uid)), true)); sfx.coin(); void got; }}>
              Sell {dupes.length} duplicate{dupes.length > 1 ? 's' : ''} · <Money v={dupeValue} />
            </button>
          )}
          <div className="row">
            <button className="btn" onClick={close}>Done</button>
            {packsLeft > 0 && <button className="btn primary" onClick={openNext}>Open next <span className="pill">{packsLeft}</span></button>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`opening ${reduced ? 'reduced' : ''}`} style={{ '--s1': set.color, '--s2': set.color2 } as CSSProperties}>
      <div className="opening-bg" />
      {burst && <Burst rarity={burst} key={idx} />}
      <div className="opening-top">
        <span className="muted">{set.name}{result.first ? ' · 1st Edition' : ''}</span>
        {phase === 'reveal' && <button className="btn tiny ghost" onClick={() => setPhase('summary')}>Skip ›</button>}
      </div>

      {phase === 'tear' && (
        <div
          className={'tear-zone' + (torn ? ' torn' : '')}
          onPointerDown={(e) => { swipe.current = { x: e.clientX, max: 0 }; }}
          onPointerMove={(e) => {
            if (!swipe.current) return;
            const d = Math.abs(e.clientX - swipe.current.x);
            swipe.current.max = Math.max(swipe.current.max, d);
            (e.currentTarget as HTMLElement).style.setProperty('--tear', String(Math.min(1, d / 140)));
            if (d > 140) doTear();
          }}
          onPointerUp={() => { if (swipe.current && swipe.current.max < 12) doTear(); swipe.current = null; }}
        >
          <div className="tear-pack">
            <PackArt set={result.set} size="lg" />
            <div className="tear-strip" />
          </div>
          {!torn && <div className="hint pulse">Swipe across or tap to tear open</div>}
        </div>
      )}

      {phase === 'reveal' && cur && curDef && (
        <div className="reveal-zone">
          <div className="card-stage">
          <div className="stack-shadow">
            {cards.slice(idx + 1).map((pc, i) => (
              <div key={pc.inst.uid} className="stack-under" style={{ transform: `translate(${(i + 1) * 3}px, ${(i + 1) * -4}px)`, zIndex: -i }}>
                <CardBack size="lg" />
              </div>
            ))}
          </div>
          <div
            className={`flip-card ${flipped ? 'flipped' : ''} ${needsHold && !flipped ? 'holdable' : ''} ${cracked ? 'cracked' : ''} ${flipped && bigHit ? 'big-hit' : ''} hit-${realRarity}`}
            style={{ '--charge': charge } as CSSProperties}
            onClick={tapCard}
            onPointerDown={holdStart}
            onPointerUp={holdEnd}
            onPointerLeave={holdEnd}
            onPointerCancel={holdEnd}
          >
            <div className="flip-inner" style={{ transform: `rotateY(${flipped ? 180 : 0}deg)${!flipped && charge > 0 ? ` scale(${1 + charge * 0.06})` : ''}` }}>
              <div className="flip-back" style={!flipped && charge > 0 ? { animation: `shake ${0.25 - charge * 0.18}s infinite` } : undefined}>
                <CardBack size="lg" glow={glowRarity} />
                {needsHold && !flipped && (
                  <svg className="charge-ring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" style={{ strokeDashoffset: 289 * (1 - charge) }} /></svg>
                )}
              </div>
              <div className="flip-front">
                <Tilt><CardFace look={cur.inst} size="lg" /></Tilt>
              </div>
            </div>
          </div>
          </div>
          <div className="reveal-info">
            {flipped ? (
              <div className="reveal-text pop">
                <div className="rv-name">{curDef.name}</div>
                <div className="rv-tags">
                  <span className="tag" style={{ color: RARITY_COLOR[curDef.rarity] }}>{RARITY_NAME[curDef.rarity]}</span>
                  {cur.inst.variety !== 'std' && <span className="tag shiny">{VARIETY_NAME[cur.inst.variety]}</span>}
                  {cur.inst.first && <span className="tag first">1st Edition</span>}
                  {cur.isNew && <span className="tag new">NEW</span>}
                </div>
                <CountUp value={cur.value} className="rv-value" duration={bigHit ? 1600 : RANK[curDef.rarity] >= 3 ? 900 : 400} />
                {bigHit && <div className="float-cash" key={cur.inst.uid}>+<Money v={cur.value} /></div>}
              </div>
            ) : (
              <div className="hint">
                {result.fakeFrom && isHit && !cracked ? 'Something feels different… tap'
                  : needsHold ? 'Press and hold to reveal!'
                  : glowRarity ? 'Ooh, it’s glowing… tap to flip'
                  : 'Tap to flip'}
              </div>
            )}
          </div>
          <div className="tray">
            {cards.map((pc, i) => (
              <div key={pc.inst.uid} className={'tray-slot' + (i < idx || (i === idx && flipped) ? ' filled' : '')}>
                {(i < idx || (i === idx && flipped)) ? <CardFace look={pc.inst} size="xs" /> : <CardBack size="xs" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Burst({ rarity }: { rarity: Rarity }) {
  const n = { C: 0, U: 8, R: 16, SR: 28, UR: 48, SEC: 70 }[rarity];
  const parts = useMemo(() => Array.from({ length: n }, (_, i) => ({
    a: (i / n) * 360 + Math.random() * 20,
    d: 120 + Math.random() * 220,
    s: 4 + Math.random() * 8,
    t: 600 + Math.random() * 700,
    c: rarity === 'SEC' ? `hsl(${Math.random() * 360} 90% 65%)` : RARITY_COLOR[rarity],
  })), [n, rarity]);
  return (
    <div className={`burst b-${rarity}`} style={{ '--rc': RARITY_COLOR[rarity] } as CSSProperties}>
      {RANK[rarity] >= 3 && <div className="rays" />}
      {RANK[rarity] >= 4 && <div className="flash" />}
      {parts.map((p, i) => (
        <i key={i} style={{ '--a': `${p.a}deg`, '--d': `${p.d}px`, '--t': `${p.t}ms`, width: p.s, height: p.s, background: p.c } as CSSProperties} />
      ))}
    </div>
  );
}

function QuickSummary() {
  const opening = useStore((s) => s.opening)!;
  const setOpening = useStore((s) => s.setOpening);
  const game = useStore((s) => s.game);
  const all = opening.results.flatMap((r) => r.cards);
  const total = opening.results.reduce((a, r) => a + r.total, 0);
  const cost = opening.results.reduce((a, r) => a + r.paid, 0);
  const newCount = all.filter((pc) => pc.isNew).length;
  const dupes = G.bulkCandidates(game, all.map((pc) => pc.inst.uid));
  const dupeValue = dupes.reduce((a, c) => a + G.dealerPrice(game, c), 0);
  const act = useStore((s) => s.act);
  const hits = all.filter(isSpecial).sort((a, b) => b.value - a.value);
  const counts: Record<Rarity, number> = { C: 0, U: 0, R: 0, SR: 0, UR: 0, SEC: 0 };
  for (const pc of all) counts[CARD_BY_ID[pc.inst.cardId].rarity]++;
  const bigHit = hits.find((h) => RANK[CARD_BY_ID[h.inst.cardId].rarity] >= 4);
  const gods = opening.results.filter((r) => r.god).length;
  const autoSold = opening.results.reduce((a, r) => a + r.autoSoldTotal, 0);
  useEffect(() => {
    if (bigHit) { sfx.reveal(CARD_BY_ID[bigHit.inst.cardId].rarity); buzz([60, 40, 90]); } else sfx.reveal('R');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const set = SET_BY_ID[opening.set];
  return (
    <div className="opening summary-phase" style={{ '--s1': set.color, '--s2': set.color2 } as CSSProperties}>
      {bigHit && <Burst rarity={CARD_BY_ID[bigHit.inst.cardId].rarity} />}
      <div className="sum-head">
        {gods > 0 && <div className="god-banner">GOD PACK!</div>}
        <h2>Opened {opening.results.length} {set.name} packs</h2>
        <div className="sum-total">
          <span>Total value</span>
          <CountUp value={total} className={'big ' + (total >= cost ? 'pos' : '')} duration={900} />
          <small>You paid <Money v={cost} /> · {total >= cost ? <span className="pos">+<Money v={total - cost} /> profit</span> : <span className="muted">−<Money v={cost - total} /></span>}{autoSold > 0 ? <> · auto-sold <Money v={autoSold} /></> : null}</small>
          {newCount > 0 && <small className="pos">{newCount} new card{newCount > 1 ? 's' : ''} for your binder!</small>}
        </div>
        <div className="rarity-counts">
          {(Object.keys(counts) as Rarity[]).filter((r) => counts[r]).map((r) => (
            <span key={r} style={{ color: RARITY_COLOR[r] }}>{counts[r]} {RARITY_NAME[r]}</span>
          ))}
        </div>
      </div>
      <div className="sum-grid hits">
        {hits.slice(0, 30).map((pc, i) => (
          <div key={pc.inst.uid} className={'sum-card' + (i === 0 ? ' best' : '')} style={{ animationDelay: `${Math.min(i, 12) * 50}ms` }}>
            <CardFace look={pc.inst} size="sm" />
            <div className="sum-meta">{pc.isNew && <span className="badge new">NEW</span>}<Money v={pc.value} /></div>
          </div>
        ))}
      </div>
      {hits.length > 30 && <p className="muted center">+{hits.length - 30} more in your Binder</p>}
      <div className="sum-actions">
        {dupes.length > 0 && (
          <button className="btn ghost" onClick={() => { act((g) => G.sellCards(g, G.bulkCandidates(g, all.map((pc) => pc.inst.uid)), true)); sfx.coin(); }}>
            Bulk-sell {dupes.length} duplicates · <Money v={dupeValue} />
          </button>
        )}
        <button className="btn primary" onClick={() => setOpening(null)}>Done</button>
      </div>
    </div>
  );
}
