'use client';

import { useEffect } from 'react';

/**
 * Layout modes.
 *
 * The page furniture that helps someone browsing - site nav, footer, a floating
 * WhatsApp bubble - is a liability once they are sitting a timed exam. The real
 * MIFOTRA platform gives a candidate one screen with the question, the clock
 * and the navigator, and the practice should feel the same.
 *
 * Rather than duplicate the layout per route, a mode is stamped on the root
 * element and CSS decides what to show. The shell stays one static tree, and a
 * page can opt into a different presentation without becoming dynamic.
 *
 *   focus - a timed exam is running: nothing but the exam
 *   wide  - dense admin tables that want more than the reading column
 */
export type LayoutMode = 'focus' | 'wide' | null;

/**
 * Claims are stacked rather than assigned.
 *
 * Two components can be mounted at once and want different things - the admin
 * practice page asks for `wide`, and the exam it launches asks for `focus`.
 * With a plain assignment the last writer won and, worse, the first to unmount
 * cleared the mode outright, dropping the admin page back to a reading column
 * while it was still open. A stack means the strongest active claim applies and
 * releasing one restores whatever is still asking.
 */
const PRIORITY: Record<Exclude<LayoutMode, null>, number> = { wide: 1, focus: 2 };
const claims = new Map<symbol, Exclude<LayoutMode, null>>();

function apply() {
  const root = document.documentElement;
  let winner: Exclude<LayoutMode, null> | null = null;
  for (const mode of claims.values()) {
    if (!winner || PRIORITY[mode] > PRIORITY[winner]) winner = mode;
  }
  if (winner) root.dataset.mode = winner;
  else delete root.dataset.mode;
}

export function useLayoutMode(mode: LayoutMode) {
  useEffect(() => {
    if (!mode) return;
    const id = Symbol('layout-mode');
    claims.set(id, mode);
    apply();
    return () => {
      claims.delete(id);
      apply();
    };
  }, [mode]);
}

/** Native fullscreen, for candidates who want the real thing. */
export async function toggleFullscreen(): Promise<boolean> {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return false;
    }
    await document.documentElement.requestFullscreen();
    return true;
  } catch {
    // Denied, or unsupported (iOS Safari has no element fullscreen). Focus mode
    // already does most of the work, so this failing is not worth surfacing.
    return Boolean(document.fullscreenElement);
  }
}
