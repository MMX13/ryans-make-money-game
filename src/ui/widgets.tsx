import { useEffect, useRef, useState, type ReactNode } from 'react';
import { fmtMoney } from '../engine/game';
import { useStore } from './store';

export function Money({ v, compact, className }: { v: number; compact?: boolean; className?: string }) {
  return <span className={'money ' + (className ?? '')}>{fmtMoney(v, compact)}</span>;
}

export function CountUp({ value, className, duration = 500, compact }: { value: number; className?: string; duration?: number; compact?: boolean }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const loop = () => {
      const p = Math.min(1, (performance.now() - start) / duration);
      setShown(value * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className={'money ' + (className ?? '')}>{fmtMoney(shown, compact)}</span>;
}

/** Smoothly animates towards a changing value (for the header cash). */
export function Rolling({ value, compact }: { value: number; compact?: boolean }) {
  const [shown, setShown] = useState(value);
  const cur = useRef(value);
  useEffect(() => {
    const from = cur.current;
    if (Math.abs(value - from) < 0.005) return;
    const start = performance.now();
    let raf = 0;
    const loop = () => {
      const p = Math.min(1, (performance.now() - start) / 450);
      cur.current = from + (value - from) * (1 - (1 - p) ** 3);
      setShown(cur.current);
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{fmtMoney(shown, compact)}</>;
}

export function Sparkline({ data, w = 90, h = 28, color }: { data: number[]; w?: number; h?: number; color?: string }) {
  if (data.length < 2) data = [data[0] ?? 1, data[0] ?? 1];
  const min = Math.min(...data, 0.95), max = Math.max(...data, 1.05);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min)) * (h - 4) - 2}`);
  const up = data[data.length - 1] >= data[0];
  const c = color ?? (up ? 'var(--pos)' : 'var(--neg)');
  const baseY = h - ((1 - min) / (max - min)) * (h - 4) - 2;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="spark">
      <line x1={0} x2={w} y1={baseY} y2={baseY} stroke="currentColor" strokeOpacity={0.2} strokeDasharray="2 3" />
      <polyline points={`0,${h} ${pts.join(' ')} ${w},${h}`} fill={c} fillOpacity={0.12} stroke="none" />
      <polyline points={pts.join(' ')} fill="none" stroke={c} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return <div className={'progress ' + (className ?? '')}><div style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} /></div>;
}

export function useNow(interval = 250) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), interval); return () => clearInterval(id); }, [interval]);
  return now;
}

export function fmtTime(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  if (s >= 60) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return `${s}s`;
}

export function Sheet({ title, children, onClose, className }: { title?: ReactNode; children: ReactNode; onClose?: () => void; className?: string }) {
  const pop = useStore((s) => s.pop);
  const close = onClose ?? pop;
  return (
    <div className="sheet-wrap" onClick={close}>
      <div className={'sheet ' + (className ?? '')} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab" />
        <div className="sheet-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={close} aria-label="Close">✕</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <b>{title}</b>
      {children && <p>{children}</p>}
    </div>
  );
}

const ICONS: Record<string, ReactNode> = {
  shop: <path d="M4 9l1.5-5h13L20 9M4 9h16M4 9v11h16V9M9 20v-6h6v6M4 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 2 3s2-1.3 2-3c0 1.7 1.3 3 3 3s3-1.3 3-3" />,
  rip: <path d="M7 3h10l1 3-1 1 1 1-1 1v12H7V9L6 8l1-1-1-1zM7 9h10M10 13h4" />,
  binder: <path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11M9 7h6" />,
  market: <path d="M4 19h16M6 16l4-5 3 3 5-7M15 7h3v3" />,
  grading: <path d="M7 3h10v18H7zM9 6h6v3H9zM10 13l1.5 1.5L15 11" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  upgrades: <path d="M12 20V5M6 11l6-6 6 6M5 20h14" />,
  display: <path d="M3 5h18v14H3zM7 9h4v6H7zM13 9h4v6h-4z" />,
  trophy: <path d="M8 4h8v5a4 4 0 01-8 0zM8 6H4a3 3 0 003 4M16 6h4a3 3 0 01-3 4M12 13v4M8 20h8M9 17h6" />,
  stats: <path d="M5 20V11M10 20V5M15 20v-7M20 20V8" />,
  help: <path d="M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9a2.5 2.5 0 115 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01" />,
  settings: <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />,
};

export function Icon({ name, size = 24 }: { name: keyof typeof ICONS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

export function TrendArrow({ v }: { v: number }) {
  const pct = (v - 1) * 100;
  const cls = pct > 1 ? 'pos' : pct < -1 ? 'neg' : 'flat';
  return <span className={'trend ' + cls}>{pct > 1 ? '▲' : pct < -1 ? '▼' : '■'} {Math.abs(pct).toFixed(0)}%</span>;
}
