import { memo, useRef, type CSSProperties, type ReactNode, type PointerEvent } from 'react';
import { TrainArt } from '../art/TrainArt';
import { CARD_BY_ID, SET_BY_ID, cardNumber, type CardDef, type Rarity, type SetId } from '../engine/data';
import { GRADERS, RARITY_NAME, type GraderId, type Variety } from '../engine/config';

export const RARITY_SYMBOL: Record<Rarity, string> = { C: '●', U: '◆', R: '★', SR: '★★', UR: '★★★', SEC: '✦' };
export const RARITY_COLOR: Record<Rarity, string> = { C: '#a7adb5', U: '#4fc98a', R: '#4aa3ff', SR: '#b56cff', UR: '#ffc93c', SEC: '#ff5fd2' };

const TIER: Record<Rarity, number> = { C: 0, U: 1, R: 2, SR: 3, UR: 4, SEC: 5 };

/** Art description for a card definition. */
export function artSpec(def: CardDef) {
  return {
    loco: def.loco, scene: def.scene, body: def.body, accent: def.accent, sky: def.sky,
    seed: hashSeed(def.id), number: cardNumber(def), tier: TIER[def.rarity],
    livery: def.name.includes('Warbonnet') ? ('warbonnet' as const) : undefined,
  };
}

const LOCO_TYPE: Record<string, string> = {
  steam: 'Steam Locomotive', tank: 'Tank Engine', bigsteam: 'Articulated Steam', streamsteam: 'Streamlined Steam', diesel: 'Diesel Locomotive',
  cabunit: 'Diesel Streamliner', hst: 'High-Speed Power Car', crocodile: 'Electric "Crocodile"', gg1: 'Streamlined Electric', roundnose: 'High-Speed Train', urbanmaglev: 'Urban Maglev',
  switcher: 'Diesel Shunter', electric: 'Electric Locomotive', tram: 'Electric Railcar', bullet: 'High-Speed Train',
  maglev: 'Maglev', hyperloop: 'Vactrain Concept',
};

export interface CardLook {
  cardId: string;
  variety?: Variety;
  first?: boolean;
  grade?: number;
  grader?: GraderId;
}

export function gradeLabel(g: number): string {
  if (g >= 10) return 'GEM MINT';
  if (g >= 9.5) return 'MINT+';
  if (g >= 9) return 'MINT';
  if (g >= 8) return 'NM-MT';
  if (g >= 7) return 'NEAR MINT';
  if (g >= 6) return 'EX-MT';
  if (g >= 5) return 'EXCELLENT';
  return 'VG';
}

/** Interactive tilt + foil tracking for big cards. */
export function Tilt({ children, className, strength = 14 }: { children: ReactNode; className?: string; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--rx', `${(0.5 - y) * strength}deg`);
    el.style.setProperty('--ry', `${(x - 0.5) * strength}deg`);
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
    el.classList.add('tilting');
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.classList.remove('tilting');
  };
  return (
    <div ref={ref} className={'tilt ' + (className ?? '')} onPointerMove={move} onPointerLeave={leave} onPointerUp={leave} onPointerCancel={leave}>
      {children}
    </div>
  );
}

export const CardFace = memo(function CardFace({ look, size = 'md', showFact = false }: { look: CardLook; size?: 'xs' | 'sm' | 'md' | 'lg'; showFact?: boolean }) {
  const def: CardDef = CARD_BY_ID[look.cardId];
  const set = SET_BY_ID[def.set];
  const v = look.variety ?? 'std';
  const style = { '--rc': RARITY_COLOR[def.rarity], '--s1': set.color, '--s2': set.color2 } as CSSProperties;
  const cls = `card size-${size} r-${def.rarity} v-${v}${look.first ? ' first' : ''}`;
  const spec = artSpec(def);
  const numLabel = def.num > 24 ? `${def.num}/24` : `${String(def.num).padStart(2, '0')}/24`;
  const face = (
    <div className={cls} style={style}>
      <div className="card-frame">
        <div className="card-art">
          <TrainArt spec={spec} className="art-svg" />
          {v === 'misprint' && <TrainArt spec={spec} className="art-svg ghost" />}
        </div>
        <div className="card-top">
          <span className="card-name">{def.name}</span>
          <span className="card-gem">{RARITY_SYMBOL[def.rarity]}</span>
        </div>
        <div className="card-type">{LOCO_TYPE[def.loco]}</div>
        {size !== 'xs' && <div className={'card-fact' + (showFact ? ' full' : '')}>{def.fact}</div>}
        <div className="card-foot">
          <span>{set.emblem} {set.short}</span>
          <span>{numLabel}</span>
          <span className="card-rar">{v !== 'std' ? labelVariety(v) : RARITY_NAME[def.rarity]}</span>
        </div>
      </div>
      {v !== 'std' && <div className="foil" />}
      {(def.rarity === 'UR' || def.rarity === 'SEC' || v === 'gold') && <div className="sparkles" />}
      {look.first && <div className="stamp-first"><span>1st</span></div>}
      {v === 'misprint' && <div className="misprint-tag">ERROR</div>}
    </div>
  );
  if (look.grade === undefined) return face;
  return <Slab grade={look.grade} grader={look.grader ?? 'plat'} name={def.name} size={size} variety={v} first={look.first}>{face}</Slab>;
});

function labelVariety(v: Variety) {
  return { std: '', holo: 'Holo', full: 'Full Art', gold: 'Gold', misprint: 'Misprint' }[v];
}

export function Slab({ grade, grader, name, children, size, variety, first }: { grade: number; grader: GraderId; name: string; children: ReactNode; size: string; variety: Variety; first?: boolean }) {
  const g = GRADERS[grader];
  return (
    <div className={`slab size-${size} grader-${grader}${grade >= 10 ? ' gem' : ''}`}>
      <div className="slab-label">
        <div className="slab-left">
          <b>{g.short}</b>
          <span>{name}{first ? ' · 1st Ed' : ''}{variety !== 'std' ? ' · ' + labelVariety(variety) : ''}</span>
        </div>
        <div className="slab-grade">
          <small>{gradeLabel(grade)}</small>
          <b>{grade}</b>
        </div>
      </div>
      <div className="slab-well">{children}</div>
    </div>
  );
}

export function CardBack({ size = 'md', glow, className }: { size?: string; glow?: Rarity | null; className?: string }) {
  return (
    <div className={`card-back size-${size} ${glow ? 'glow g-' + glow : ''} ${className ?? ''}`} style={glow ? ({ '--rc': RARITY_COLOR[glow] } as CSSProperties) : undefined}>
      <div className="back-inner">
        <div className="back-rails" />
        <div className="back-logo">
          <div className="back-wheel">
            <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="3" /><circle cx="20" cy="20" r="4" fill="currentColor" />{[0, 45, 90, 135].map((a) => <line key={a} x1="20" y1="3" x2="20" y2="37" stroke="currentColor" strokeWidth="2" transform={`rotate(${a} 20 20)`} />)}</svg>
          </div>
          <div className="back-title">RAIL<br />RICHES</div>
        </div>
      </div>
    </div>
  );
}

export function PackArt({ set, size = 'md', className, onClick }: { set: SetId; size?: 'sm' | 'md' | 'lg'; className?: string; onClick?: () => void }) {
  const def = SET_BY_ID[set];
  const hero = Object.values(CARD_BY_ID).find((c) => c.set === set && c.rarity === 'UR')!;
  const spec = artSpec(hero);
  return (
    <div className={`pack pack-${set} size-${size} ${className ?? ''}`} style={{ '--s1': def.color, '--s2': def.color2 } as CSSProperties} onClick={onClick}>
      <div className="pack-crimp top" />
      <div className="pack-body">
        <div className="pack-brand">RAIL RICHES</div>
        <div className="pack-window"><TrainArt spec={spec} className="art-svg" /></div>
        <div className="pack-set">{def.name}</div>
        <div className="pack-sub">{def.emblem} 5 CARDS</div>
        <div className="pack-shine" />
      </div>
      <div className="pack-crimp bottom" />
    </div>
  );
}

const seeds = new Map<string, number>();
export function hashSeed(id: string): number {
  let v = seeds.get(id);
  if (v === undefined) {
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
    v = h >>> 0;
    seeds.set(id, v);
  }
  return v;
}
