import { Component, type ReactNode } from 'react';
import { saveNow, useStore } from './store';

/** Last line of defence: show a way back instead of a blank screen. The save is untouched. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch() { saveNow(useStore.getState().game); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crash">
        <div className="crash-card">
          <div className="crash-icon">🚧</div>
          <h2>Signal failure!</h2>
          <p>Something went wrong on the line. Your progress is saved.</p>
          <button className="btn primary wide" onClick={() => { useStore.setState({ opening: null, sheets: [], revealing: false }); this.setState({ error: null }); }}>Back to the game</button>
          <button className="btn ghost wide" onClick={() => location.reload()}>Reload</button>
          <small className="muted">{String(this.state.error.message).slice(0, 140)}</small>
        </div>
      </div>
    );
  }
}
