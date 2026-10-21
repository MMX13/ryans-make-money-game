import { useMemo, useState, type CSSProperties } from 'react';
import { GRADERS, gradeMult } from '../../engine/config';
import * as G from '../../engine/game';
import { CardBack, CardFace, Tilt, gradeLabel } from '../Card';
import { worthGrading } from '../sheets/CardSheet';
import { buzz, sfx } from '../sfx';
import { useStore } from '../store';
import { CountUp, Empty, Money, Progress, fmtTime, useNow } from '../widgets';

export function Grading() {
  const game = useStore((s) => s.game);
  const push = useStore((s) => s.push);
  const now = useNow(250);
  const [reveal, setReveal] = useState<{ inst: G.CardInst; before: number } | null>(null);
  const act = useStore((s) => s.act);
  const slots = G.gradingSlots(game);
  const rev = useStore((s) => s.rev);
  const candidates = useMemo(() => game.cards
    .filter((c) => c.status === 'binder' && c.grade === undefined)
    .map((c) => ({ c, v: G.value(game, c), est: G.gradeEstimate(game, c), worth: worthGrading(game, c) }))
    .filter((x) => x.v >= 1)
    .sort((a, b) => Number(b.worth) - Number(a.worth) || b.v - a.v)
    .slice(0, 40), [rev, game.lastMarketTick, game.upgrades.loupe]); // eslint-disable-line react-hooks/exhaustive-deps

  const crack = (uid: number) => {
    const inst0 = game.cards.find((c) => c.uid === uid)!;
    const before = G.value(game, { ...inst0, grade: undefined });
    const inst = act((g) => G.crackSlab(g, uid));
    if (inst) {
      sfx.crack();
      buzz(inst.grade! >= 9.5 ? [60, 40, 120] : 20);
      setTimeout(() => sfx.reveal(inst.grade! >= 10 ? 'SEC' : inst.grade! >= 9.5 ? 'UR' : inst.grade! >= 9 ? 'SR' : inst.grade! >= 8 ? 'R' : 'C'), 500);
      setReveal({ inst, before });
    }
  };

  return (
    <div className="screen grading">
      <div className="grade-slots">
        {Array.from({ length: slots }, (_, i) => {
          const sub = game.grading[i];
          if (!sub) return <div key={i} className="grade-slot empty"><span>Empty slot</span></div>;
          const inst = game.cards.find((c) => c.uid === sub.uid);
          if (!inst) return null;
          const total = GRADERS[sub.grader].seconds * 1000;
          const left = sub.doneAt - now;
          const ready = left <= 0;
          return (
            <div key={i} className={'grade-slot' + (ready ? ' ready' : '')}>
              <CardFace look={inst} size="xs" />
              <div className="grow">
                <b>{G.card(inst).name}</b>
                <small className="muted">{GRADERS[sub.grader].name}</small>
                {ready ? <small className="pos">Back from the grader!</small> : <Progress value={1 - left / total} className="thin" />}
              </div>
              {ready ? <button className="btn gold" onClick={() => crack(sub.uid)}>Crack it!</button> : <span className="timer">{fmtTime(left)}</span>}
            </div>
          );
        })}
      </div>
      <div className="grade-table">
        {[10, 9.5, 9, 8, 7, 6].map((g) => (
          <div key={g}><b>{g === 6 ? '≤6' : g}</b><small>×{gradeMult(g)}</small></div>
        ))}
      </div>
      <h4 className="section">Candidates <small className="muted">· best estimates first</small></h4>
      {!candidates.length ? <Empty icon="🔍" title="Nothing to grade">Pull some cards first. High estimates are worth grading.</Empty> : (
        <div className="card-list">
          {candidates.map(({ c, v, est, worth }) => (
            <button key={c.uid} className="list-row" onClick={() => push({ kind: 'card', uid: c.uid })}>
              <CardFace look={c} size="xs" />
              <span className="grow">
                <b>{G.card(c).name}</b>
                <small className={est[0] >= 9 ? 'pos' : est[1] < 8 ? 'neg' : 'muted'}>Est. {est[0]}–{est[1]}</small>
              </span>
              <span className="right">
                <Money v={v} />
                {worth && <small className="badge grade-badge">Grade?</small>}
              </span>
            </button>
          ))}
        </div>
      )}
      {reveal && <SlabReveal inst={reveal.inst} before={reveal.before} onClose={() => setReveal(null)} />}
    </div>
  );
}

function SlabReveal({ inst, before, onClose }: { inst: G.CardInst; before: number; onClose: () => void }) {
  const game = useStore((s) => s.game);
  const after = G.value(game, inst);
  const g = inst.grade!;
  const tier = g >= 10 ? 'gem' : g >= 9 ? 'good' : g >= 8 ? 'ok' : 'bad';
  return (
    <div className="slab-reveal" onClick={onClose}>
      <div className={'slab-stage t-' + tier}>
        <div className="slab-anim">
          <Tilt><CardFace look={inst} size="lg" /></Tilt>
        </div>
        <div className="slab-result">
          <div className="grade-big" style={{ '--d': '0.5s' } as CSSProperties}>{g}</div>
          <div className="grade-word">{gradeLabel(g)}</div>
          <div className="delta">
            <Money v={before} /> → <CountUp value={after} className={after >= before ? 'pos' : 'neg'} duration={1200} />
          </div>
          <small className="muted">Tap to continue</small>
        </div>
      </div>
      <div style={{ display: 'none' }}><CardBack /></div>
    </div>
  );
}
