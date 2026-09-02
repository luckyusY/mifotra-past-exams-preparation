'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const DISMISS_KEY = 'mifotra_upsell_dismissed';
const DISMISS_DAYS = 7;

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_DAYS * 864e5;
  } catch {
    return false;
  }
}

/**
 * Shown once per week at most, and only after the visitor has actually engaged:
 * either they answered enough questions to be invested, or they are leaving.
 * A prompt that fires on arrival converts worse and annoys people who were
 * about to buy anyway.
 */
export default function UpsellModal({
  answeredCount = 0,
  triggerAfter = 8,
}: {
  answeredCount?: number;
  triggerAfter?: number;
}) {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!recentlyDismissed()) setArmed(true);
  }, []);

  // Milestone: they have answered enough to know whether this is useful.
  useEffect(() => {
    if (armed && answeredCount >= triggerAfter) setOpen(true);
  }, [armed, answeredCount, triggerAfter]);

  // Exit intent, desktop only - the pointer leaving upward means the tab strip.
  useEffect(() => {
    if (!armed) return;
    function onLeave(e: MouseEvent) {
      if (e.clientY <= 0) setOpen(true);
    }
    document.addEventListener('mouseout', onLeave);
    return () => document.removeEventListener('mouseout', onLeave);
  }, [armed]);

  function dismiss() {
    setOpen(false);
    setArmed(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode - the modal simply reappears next visit */
    }
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-back" onClick={dismiss} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upsell-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-x" onClick={dismiss} aria-label="Close">
          &times;
        </button>

        <span className="pill">Full question bank</span>
        <h2 id="upsell-title" style={{ margin: '.6rem 0 .4rem' }}>
          {answeredCount >= triggerAfter
            ? `${answeredCount} answered. There are 2,246 more.`
            : 'Before you go'}
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          The free bank is 200 questions. A bank of 1,000 more &mdash; with every answer
          explained &mdash; is 5,000 RWF, paid once.
        </p>

        <div className="price-row">
          <div>
            <div className="price">5,000 RWF</div>
            <div className="muted" style={{ fontSize: '.86rem' }}>
              MoMo Pay 232255
            </div>
          </div>
          <Link className="btn" href="/unlock" onClick={dismiss}>
            Get a code
          </Link>
        </div>

        <button className="btn ghost modal-later" onClick={dismiss}>
          Keep practising for free
        </button>
      </div>
    </div>
  );
}
