import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { startLoop, useStore } from './ui/store';
import * as G from './engine/game';
import './styles.css';

startLoop();
if (location.search.includes('debug')) (window as any).__rr = { useStore, G };
createRoot(document.getElementById('root')!).render(<App />);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline support is optional */ });
  });
}
