'use client';

import { useState, type ReactNode } from 'react';

/**
 * Wraps any chart/graph with a "Focus view" button that expands it to fill
 * the whole screen (same wrapper element, just re-styled via CSS — no
 * remount, so Chart.js/canvas instances inside keep their state and just
 * resize through their own ResizeObserver).
 */
export default function FocusableChart({ title, children }: { title: string; children: ReactNode }) {
  const [focused, setFocused] = useState(false);

  return (
    <div className={`focusable-chart${focused ? ' is-focused' : ''}`}>
      <div className="focusable-chart-bar">
        {focused && <span className="focusable-chart-ttl">{title}</span>}
        <button
          type="button"
          className={focused ? 'focusable-chart-close' : 'focusable-chart-btn'}
          onClick={() => setFocused(f => !f)}
        >
          {focused ? '× Close' : '⤢ Expand full screen'}
        </button>
      </div>
      <div className="focusable-chart-body">
        {children}
      </div>
    </div>
  );
}
