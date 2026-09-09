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

export function useLayoutMode(mode: LayoutMode) {
  useEffect(() => {
    const root = document.documentElement;
    if (mode) root.dataset.mode = mode;
    else delete root.dataset.mode;

    // Leaving the page mid-exam must not strand the rest of the site in focus
    // mode - the nav would stay hidden with no way to bring it back.
    return () => {
      delete root.dataset.mode;
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
