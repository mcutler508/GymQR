'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Dismiss the Recharts tooltip when the user taps anywhere outside the chart
 * container. Recharts clears its active tooltip whenever the chart receives a
 * `mouseleave`, so we synthesize that event from a document-level pointer
 * listener. Stable across Recharts versions — no controlled-tooltip rewiring.
 */
export function useDismissChartOnOutside(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    function handler(event: Event) {
      const node = ref.current;
      if (!node) return;
      if (node.contains(event.target as Node)) return;
      const wrapper = node.querySelector('.recharts-wrapper');
      if (wrapper) {
        wrapper.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      }
    }
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [ref]);
}
