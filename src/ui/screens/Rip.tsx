import { SETS, type SetId } from '../../engine/data';
import * as G from '../../engine/game';
import { CardFace, PackArt } from '../Card';
import { buzz, sfx } from '../sfx';
import { useStore } from '../store';
import { Empty, Money } from '../widgets';

export function Rip() {
  const game = useStore((s) => s.game);
  const act = useStore((s) => s.act);
  const setOpening = useStore((s) => s.setOpening);
  const setTab = useStore((s) => s.setTab);
  const owned = SETS.filter((s) => game.packs[s.id] > 0);
  const push = useStore((s) => s.push);
  const recent = game.cards
    .filter((c) => c.variety !== 'std' || ['R', 'SR', 'UR', 'SEC'].includes(G.card(c).rarity))
    .slice(-60).sort((a, b) => b.uid - a.uid).slice(0, 8);
  const recentStrip = recent.length > 0 && (
    <>
      <h4 className="section">Recent hits</h4>
      <div className="recent-strip">
        {recent.map((c) => (
          <button key={c.uid} className="plain" onClick={() => push({ kind: 'card', uid: c.uid })}>
            <CardFace look={c} size="sm" />
            <Money v={G.value(game, c)} />
          </button>
        ))}
      </div>
    </>
  );

  const open = (set: SetId) => {
    const res = act((g) => G.openPack(g, set));
    if (res) { sfx.whoosh(); buzz(10); setOpening({ set, results: [res], quick: false }); }
  };
  const openAll = (set: SetId) => {
    const results = act((g) => {
      const out: G.PackResult[] = [];
      while (g.packs[set] > 0) { const r = G.openPack(g, set); if (r) out.push(r); }
      return out;
    });
    if (results.length) setOpening({ set, results, quick: true });
  };

  if (!owned.length) {
    return (
      <div className="screen rip">
        <Empty icon="📦" title="No packs to open">Buy packs in the Shop, or claim your free pack.</Empty>
        <button className="btn primary wide" onClick={() => setTab('shop')}>Go to Shop</button>
        {recentStrip}
      </div>
    );
  }
  return (
    <div className="screen rip">
      {owned.map((set) => {
        const n = game.packs[set.id];
        return (
          <div key={set.id} className="rip-set">
            <div className="rip-stack" onClick={() => open(set.id)}>
              {Array.from({ length: Math.min(n, 4) }, (_, i) => (
                <div key={i} className="rip-stack-pack" style={{ transform: `translate(${i * 6}px, ${i * -6}px) rotate(${(i - 1.5) * 2.5}deg)`, zIndex: 4 - i }}>
                  <PackArt set={set.id} size="md" />
                </div>
              )).reverse()}
              <div className="rip-count">×{n}</div>
            </div>
            <div className="rip-actions">
              <b>{set.name}</b>
              <small className="muted">Sealed value <Money v={G.sealedResale(game, set.id) * n} /></small>
              <button className="btn primary big" onClick={() => open(set.id)}>Rip one open</button>
              {n > 1 && <button className="btn" onClick={() => openAll(set.id)}>Quick-open all {n}</button>}
            </div>
          </div>
        );
      })}
      {recentStrip}
    </div>
  );
}
