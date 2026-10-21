import { memo, type JSX } from 'react';

export type LocoKind = 'steam' | 'tank' | 'bigsteam' | 'diesel' | 'switcher' | 'electric' | 'tram' | 'bullet' | 'maglev' | 'hyperloop';
export type SceneKind = 'mountains' | 'city' | 'hills' | 'coast' | 'desert' | 'forest' | 'snow' | 'night' | 'space';

export interface ArtSpec {
  loco: LocoKind;
  scene: SceneKind;
  body: string;
  accent: string;
  sky: [string, string];
  seed: number;
  number?: string;
}

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return (s >>> 0) / 4294967296;
  };
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  r = f(r); g = f(g); b = f(b);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function Scene({ spec, id }: { spec: ArtSpec; id: string }) {
  const r = rng(spec.seed);
  const [skyTop, skyBottom] = spec.sky;
  const far = shade(skyBottom, -0.35);
  const near = shade(skyBottom, -0.55);
  const els: JSX.Element[] = [];
  const sunX = 30 + r() * 140;
  const night = spec.scene === 'night' || spec.scene === 'space';
  els.push(<circle key="sun" cx={sunX} cy={30 + r() * 15} r={night ? 9 : 14} fill={night ? '#f4f1de' : '#ffe9a8'} opacity={night ? 0.9 : 0.85} />);
  if (night) {
    for (let i = 0; i < 26; i++) els.push(<circle key={'st' + i} cx={r() * 200} cy={r() * 70} r={r() * 0.9 + 0.3} fill="#fff" opacity={0.4 + r() * 0.6} />);
  }
  switch (spec.scene) {
    case 'mountains':
    case 'snow': {
      let d = 'M0 100 ';
      let x = 0;
      while (x < 200) { const w = 25 + r() * 35; d += `L${x + w / 2} ${35 + r() * 35} L${x + w} ${80 + r() * 10} `; x += w; }
      d += 'L200 100 Z';
      els.push(<path key="m1" d={d} fill={far} />);
      if (spec.scene === 'snow') els.push(<path key="m1s" d={d} fill="#fff" opacity={0.35} />);
      let d2 = 'M0 100 '; x = -10;
      while (x < 210) { const w = 30 + r() * 40; d2 += `L${x + w / 2} ${60 + r() * 25} L${x + w} ${92} `; x += w; }
      d2 += 'L200 100 Z';
      els.push(<path key="m2" d={d2} fill={near} />);
      break;
    }
    case 'city':
    case 'night': {
      let x = 0;
      while (x < 200) {
        const w = 8 + r() * 16, h = 20 + r() * 50;
        els.push(<rect key={'b' + x} x={x} y={100 - h} width={w} height={h} fill={night ? '#1d2238' : far} />);
        for (let wy = 100 - h + 4; wy < 96; wy += 6) for (let wx = x + 2; wx < x + w - 2; wx += 4)
          if (r() < (night ? 0.45 : 0.15)) els.push(<rect key={`w${wx}-${wy}`} x={wx} y={wy} width={1.6} height={2.4} fill={night ? '#ffd772' : '#fff'} opacity={night ? 0.9 : 0.35} />);
        x += w + 1;
      }
      break;
    }
    case 'hills':
    case 'forest': {
      els.push(<path key="h1" d={`M0 80 Q50 ${50 + r() * 20} 100 75 T200 70 L200 100 L0 100Z`} fill={far} />);
      els.push(<path key="h2" d={`M0 92 Q60 ${70 + r() * 10} 120 88 T200 85 L200 100 L0 100Z`} fill={near} />);
      if (spec.scene === 'forest') for (let i = 0; i < 22; i++) {
        const tx = r() * 200, th = 12 + r() * 16, ty = 98;
        els.push(<path key={'t' + i} d={`M${tx} ${ty - th} L${tx + th / 3} ${ty} L${tx - th / 3} ${ty}Z`} fill={shade(near, -0.25)} />);
      }
      break;
    }
    case 'coast': {
      els.push(<rect key="sea" x={0} y={72} width={200} height={28} fill={shade(skyBottom, -0.25)} />);
      for (let i = 0; i < 12; i++) els.push(<rect key={'wv' + i} x={r() * 190} y={75 + r() * 20} width={6 + r() * 10} height={0.8} fill="#fff" opacity={0.5} />);
      els.push(<path key="cliff" d="M140 100 L150 66 L172 60 L200 64 L200 100Z" fill={near} />);
      break;
    }
    case 'desert': {
      els.push(<path key="d1" d={`M0 85 Q40 70 90 82 T200 78 L200 100 L0 100Z`} fill={shade(skyBottom, -0.2)} />);
      els.push(<path key="mesa" d={`M${20 + r() * 40} 85 L${30 + r() * 40} 55 L${80 + r() * 20} 55 L${95 + r() * 20} 85Z`} fill={far} />);
      break;
    }
    case 'space': {
      els.push(<circle key="planet" cx={150} cy={50} r={26} fill={shade(spec.accent, -0.3)} opacity={0.8} />);
      els.push(<ellipse key="ring" cx={150} cy={50} rx={40} ry={7} fill="none" stroke={spec.accent} strokeWidth={1.5} opacity={0.7} />);
      break;
    }
  }
  return (
    <g>
      <defs>
        <linearGradient id={id + 'sky'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyTop} />
          <stop offset="1" stopColor={skyBottom} />
        </linearGradient>
      </defs>
      <rect width={200} height={140} fill={`url(#${id}sky)`} />
      {els}
    </g>
  );
}

function Track({ kind }: { kind: LocoKind }) {
  if (kind === 'maglev' || kind === 'hyperloop') {
    return (
      <g>
        <rect x={0} y={100} width={200} height={40} fill="#2a2d36" />
        <rect x={0} y={106} width={200} height={8} fill="#9aa3b5" />
        <rect x={0} y={114} width={200} height={3} fill="#5c6474" />
        {[20, 80, 140].map((x) => <rect key={x} x={x} y={117} width={14} height={23} fill="#4b5262" />)}
      </g>
    );
  }
  const sleepers = [];
  for (let x = -4; x < 204; x += 9) sleepers.push(<rect key={x} x={x} y={106} width={5} height={6} fill="#4a3426" />);
  return (
    <g>
      <rect x={0} y={100} width={200} height={40} fill="#5a5048" />
      <rect x={0} y={103} width={200} height={12} fill="#7a6d62" />
      {sleepers}
      <rect x={0} y={106} width={200} height={1.8} fill="#c9ccd1" />
      <rect x={0} y={110} width={200} height={1.4} fill="#9ea2a8" />
    </g>
  );
}

function Wheel({ x, y, r, color = '#24262b' }: { x: number; y: number; r: number; color?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={color} stroke="#0d0e10" strokeWidth={1} />
      <circle cx={x} cy={y} r={r * 0.72} fill="none" stroke="#8c9097" strokeWidth={0.8} />
      <line x1={x - r * 0.7} y1={y} x2={x + r * 0.7} y2={y} stroke="#8c9097" strokeWidth={0.6} />
      <line x1={x} y1={y - r * 0.7} x2={x} y2={y + r * 0.7} stroke="#8c9097" strokeWidth={0.6} />
      <circle cx={x} cy={y} r={r * 0.2} fill="#b6bac0" />
    </g>
  );
}

function Steam({ s, big, tank }: { s: ArtSpec; big?: boolean; tank?: boolean }) {
  const b = s.body, dark = shade(b, -0.45), light = shade(b, 0.25);
  const drivers = big ? [70, 88, 106, 124, 142, 160] : [92, 116, 140];
  const dr = big ? 8.5 : 11;
  const tenderX = tank ? -100 : 4;
  return (
    <g>
      {/* smoke */}
      <g opacity={0.55}>
        <circle cx={big ? 165 : 160} cy={28} r={8} fill="#e9e6e1" />
        <circle cx={big ? 150 : 145} cy={20} r={10} fill="#dedad4" />
        <circle cx={big ? 130 : 125} cy={14} r={12} fill="#d4d0ca" opacity={0.8} />
        <circle cx={big ? 105 : 100} cy={10} r={13} fill="#cfcac3" opacity={0.6} />
      </g>
      {!tank && (
        <g>
          <rect x={tenderX} y={56} width={34} height={36} rx={2} fill={b} />
          <rect x={tenderX} y={56} width={34} height={5} fill={dark} />
          <rect x={tenderX + 3} y={68} width={28} height={2} fill={s.accent} />
          <path d={`M${tenderX + 2} 56 Q${tenderX + 17} 46 ${tenderX + 32} 56Z`} fill="#1a1a1a" />
          <Wheel x={tenderX + 9} y={97} r={6} />
          <Wheel x={tenderX + 25} y={97} r={6} />
        </g>
      )}
      {/* cab */}
      <rect x={tank ? 20 : 40} y={42} width={30} height={50} fill={b} />
      <rect x={tank ? 17 : 37} y={37} width={36} height={6} rx={2} fill={dark} />
      <rect x={tank ? 26 : 46} y={49} width={14} height={13} rx={1.5} fill="#ffe7a1" opacity={0.9} />
      <rect x={tank ? 26 : 46} y={49} width={14} height={13} rx={1.5} fill="none" stroke={dark} strokeWidth={1.4} />
      {/* boiler */}
      <rect x={tank ? 48 : 68} y={big ? 54 : 56} width={tank ? 112 : 104} height={big ? 30 : 28} rx={12} fill={b} />
      <rect x={tank ? 48 : 68} y={big ? 54 : 56} width={tank ? 112 : 104} height={7} rx={3} fill={light} opacity={0.45} />
      {tank && <rect x={52} y={62} width={70} height={24} rx={2} fill={shade(b, -0.12)} />}
      {[90, 110, 130, 150].map((x) => <rect key={x} x={x} y={big ? 54 : 56} width={1.6} height={big ? 30 : 28} fill={dark} opacity={0.5} />)}
      <rect x={166} y={big ? 54 : 56} width={10} height={big ? 30 : 28} rx={4} fill="#2a2a2e" />
      <circle cx={176} cy={big ? 69 : 70} r={3.5} fill="#ffe38a" />
      {/* chimney + dome */}
      <rect x={152} y={big ? 38 : 40} width={10} height={18} fill="#2a2a2e" />
      <rect x={149} y={big ? 35 : 37} width={16} height={5} rx={1.5} fill="#2a2a2e" />
      <path d={`M116 ${big ? 55 : 57} a9 9 0 0 1 18 0Z`} fill={s.accent} />
      <path d={`M96 ${big ? 55 : 57} a6 6 0 0 1 12 0Z`} fill={dark} />
      {/* running board */}
      <rect x={tank ? 18 : 38} y={88} width={146} height={4} fill={dark} />
      <rect x={tank ? 18 : 38} y={88} width={146} height={1.4} fill={s.accent} />
      {/* wheels */}
      {drivers.map((x) => <Wheel key={x} x={x} y={big ? 99.5 : 97} r={dr} color={shade(s.accent, -0.55)} />)}
      <Wheel x={big ? 182 : 166} y={101} r={5} />
      {big && <Wheel x={52} y={101} r={5} />}
      <rect x={drivers[0] - 2} y={(big ? 99.5 : 97) + 2} width={drivers[drivers.length - 1] - drivers[0] + 4} height={2.2} rx={1} fill="#c7cbd1" />
      <path d="M176 90 L190 104 L172 104Z" fill={dark} />
      {s.number && <text x={tank ? 87 : 25} y={tank ? 79 : 84} fontSize={7} fontWeight={700} fill={s.accent} fontFamily="Georgia, serif" textAnchor="middle">{s.number}</text>}
    </g>
  );
}

function Diesel({ s, switcher }: { s: ArtSpec; switcher?: boolean }) {
  const b = s.body, dark = shade(b, -0.45), light = shade(b, 0.3);
  const x0 = switcher ? 30 : 6, x1 = switcher ? 170 : 192;
  const cabX = switcher ? 40 : 150;
  return (
    <g>
      <rect x={x0} y={56} width={x1 - x0} height={32} rx={2} fill={b} />
      <rect x={x0} y={56} width={x1 - x0} height={5} fill={light} opacity={0.4} />
      <rect x={x0} y={74} width={x1 - x0} height={5} fill={s.accent} />
      <rect x={cabX} y={38} width={34} height={22} rx={3} fill={b} />
      <rect x={cabX + 4} y={43} width={11} height={10} rx={1.5} fill="#bfe3ff" />
      <rect x={cabX + 18} y={43} width={11} height={10} rx={1.5} fill="#bfe3ff" />
      {!switcher && <path d={`M${x1 - 8} 38 Q${x1 + 2} 50 ${x1} 60 L${x1 - 8} 60Z`} fill={b} />}
      {Array.from({ length: switcher ? 7 : 12 }, (_, i) => (
        <rect key={i} x={(switcher ? 80 : 20) + i * 10} y={61} width={6} height={11} rx={1} fill={dark} opacity={0.55} />
      ))}
      <rect x={x0 - 2} y={88} width={x1 - x0 + 4} height={5} fill="#25272c" />
      {[x0 + 22, x1 - 32].map((bx) => (
        <g key={bx}>
          <rect x={bx - 18} y={91} width={40} height={8} rx={2} fill="#33363c" />
          <Wheel x={bx - 10} y={99} r={6.5} />
          <Wheel x={bx + 4} y={99} r={6.5} />
          {!switcher && <Wheel x={bx + 18} y={99} r={6.5} />}
        </g>
      ))}
      <circle cx={x1 - 2} cy={66} r={2.6} fill="#ffe38a" />
      {s.number && <text x={(x0 + x1) / 2 - (switcher ? -10 : 15)} y={70} fontSize={8} fontWeight={800} fill={light} fontFamily="Arial Black, sans-serif" textAnchor="middle">{s.number}</text>}
    </g>
  );
}

function Electric({ s, tram }: { s: ArtSpec; tram?: boolean }) {
  const b = s.body, dark = shade(b, -0.45), light = shade(b, 0.35);
  const x0 = tram ? 25 : 8, x1 = tram ? 175 : 192;
  return (
    <g>
      <line x1={0} y1={18} x2={200} y2={18} stroke="#222" strokeWidth={0.8} />
      {[40, 120].map((x) => <line key={x} x1={x} y1={10} x2={x} y2={18} stroke="#333" strokeWidth={0.6} />)}
      {/* pantograph */}
      <path d={`M${(x0 + x1) / 2 - 14} 44 L${(x0 + x1) / 2} 30 L${(x0 + x1) / 2 - 10} 18 L${(x0 + x1) / 2 + 12} 18`} fill="none" stroke="#2b2b2b" strokeWidth={1.4} />
      <path d={`M${x0 + 6} 48 Q${x0 + 2} 46 ${x0} 56 L${x0} 90 L${x1} 90 L${x1} 56 Q${x1 - 2} 46 ${x1 - 6} 48 Z`} fill={b} />
      <rect x={x0 + 4} y={44} width={x1 - x0 - 8} height={6} rx={3} fill={dark} />
      <rect x={x0} y={76} width={x1 - x0} height={6} fill={s.accent} />
      {Array.from({ length: tram ? 6 : 8 }, (_, i) => (
        <rect key={i} x={x0 + 14 + i * ((x1 - x0 - 28) / (tram ? 6 : 8))} y={56} width={(x1 - x0 - 28) / (tram ? 6 : 8) - 4} height={13} rx={2} fill="#cde9ff" opacity={0.92} />
      ))}
      <rect x={x0 + 2} y={56} width={8} height={13} rx={2} fill="#9fd2ff" />
      <rect x={x1 - 10} y={56} width={8} height={13} rx={2} fill="#9fd2ff" />
      <rect x={x0} y={56} width={x1 - x0} height={1.5} fill={light} opacity={0.5} />
      {[x0 + 28, x1 - 28].map((bx) => (
        <g key={bx}>
          <rect x={bx - 16} y={89} width={32} height={7} rx={2} fill="#2d3036" />
          <Wheel x={bx - 8} y={98} r={6} />
          <Wheel x={bx + 8} y={98} r={6} />
        </g>
      ))}
      <circle cx={x1 - 4} cy={84} r={2.2} fill="#ffe38a" />
      {s.number && <text x={(x0 + x1) / 2} y={87.5} fontSize={5.5} fontWeight={800} fill={dark} fontFamily="Arial, sans-serif" textAnchor="middle">{s.number}</text>}
    </g>
  );
}

function Bullet({ s }: { s: ArtSpec }) {
  const b = s.body, dark = shade(b, -0.5), light = shade(b, 0.4);
  return (
    <g>
      <line x1={0} y1={20} x2={200} y2={20} stroke="#222" strokeWidth={0.7} />
      <path d="M110 50 L118 34 L112 21 L126 21" fill="none" stroke="#2b2b2b" strokeWidth={1.2} />
      <path d="M-5 52 L130 52 Q170 52 196 84 Q198 92 188 94 L-5 94 Z" fill={b} />
      <path d="M-5 52 L130 52 Q170 52 196 84 L-5 84Z" fill={light} opacity={0.18} />
      <path d="M-5 76 L185 76 Q192 80 194 86 L-5 86 Z" fill={s.accent} />
      <path d="M-5 80 L188 80" stroke={shade(s.accent, 0.4)} strokeWidth={0.8} />
      <path d="M150 56 Q172 60 184 74 L160 74 Q150 66 150 56Z" fill="#1c2a3d" />
      <path d="M152 58 Q165 61 176 70" stroke="#7fb8ff" strokeWidth={0.8} fill="none" opacity={0.7} />
      {Array.from({ length: 13 }, (_, i) => <rect key={i} x={2 + i * 11} y={60} width={7} height={8} rx={2} fill="#1c2a3d" />)}
      <rect x={-5} y={92} width={200} height={6} fill={dark} />
      {[20, 34, 100, 114].map((x) => <Wheel key={x} x={x} y={100} r={4.5} />)}
      <circle cx={186} cy={88} r={2} fill="#fff6c8" />
      {s.number && <text x={70} y={72.5} fontSize={5} fontWeight={700} fill={dark} fontFamily="Arial, sans-serif" textAnchor="middle" opacity={0.8}>{s.number}</text>}
    </g>
  );
}

function Maglev({ s, hyper }: { s: ArtSpec; hyper?: boolean }) {
  const b = s.body, light = shade(b, 0.45), dark = shade(b, -0.5);
  return (
    <g>
      <defs>
        <linearGradient id={`glow${s.seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s.accent} stopOpacity={0.9} />
          <stop offset="1" stopColor={s.accent} stopOpacity={0} />
        </linearGradient>
      </defs>
      {hyper && <rect x={-5} y={42} width={210} height={60} rx={30} fill="#cfd6e4" opacity={0.25} stroke="#e8eef8" strokeOpacity={0.5} />}
      <rect x={0} y={94} width={200} height={12} fill={`url(#glow${s.seed})`} />
      <path d="M-5 58 L120 56 Q178 56 198 86 Q199 92 190 92 L-5 92 Z" fill={b} />
      <path d="M-5 58 L120 56 Q178 56 198 86 L-5 80Z" fill={light} opacity={0.3} />
      <path d="M-5 84 L196 84 L190 92 L-5 92Z" fill={dark} />
      <path d="M-5 80 L194 80" stroke={s.accent} strokeWidth={2} />
      <path d="M140 60 Q172 62 188 78 L150 78 Z" fill="#0f1a2c" />
      <path d="M-5 64 L130 64 L130 70 L-5 70Z" fill="#0f1a2c" opacity={0.9} />
      <path d="M-5 66 L128 66" stroke={s.accent} strokeWidth={0.6} opacity={0.7} />
      {s.number && <text x={60} y={89.5} fontSize={5} fontWeight={700} fill={s.accent} fontFamily="Arial, sans-serif" textAnchor="middle">{s.number}</text>}
    </g>
  );
}

export const TrainArt = memo(function TrainArt({ spec, className }: { spec: ArtSpec; className?: string }) {
  const id = 'a' + spec.seed.toString(36);
  let loco: JSX.Element;
  switch (spec.loco) {
    case 'steam': loco = <Steam s={spec} />; break;
    case 'tank': loco = <Steam s={spec} tank />; break;
    case 'bigsteam': loco = <Steam s={spec} big />; break;
    case 'diesel': loco = <Diesel s={spec} />; break;
    case 'switcher': loco = <Diesel s={spec} switcher />; break;
    case 'electric': loco = <Electric s={spec} />; break;
    case 'tram': loco = <Electric s={spec} tram />; break;
    case 'bullet': loco = <Bullet s={spec} />; break;
    case 'maglev': loco = <Maglev s={spec} />; break;
    case 'hyperloop': loco = <Maglev s={spec} hyper />; break;
  }
  return (
    <svg viewBox="0 0 200 140" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <Scene spec={spec} id={id} />
      <Track kind={spec.loco} />
      <g transform="translate(0,2)">{loco}</g>
    </svg>
  );
});



