'use client';

import { useEffect, useState } from 'react';
import { whatsappLink, PAYMENT_MESSAGE, WHATSAPP_DISPLAY } from './Contact';

/**
 * Floating WhatsApp bubble.
 *
 * Appears after a short scroll rather than immediately: a bubble that lands
 * before the visitor has seen anything reads as an interruption, and this one
 * has to survive on every page. It sits clear of the exam runner's Next button
 * on small screens, which is the one control people tap repeatedly.
 */
export default function WhatsAppBubble() {
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 260);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={'wa-wrap' + (shown ? ' is-shown' : '')}>
      {open && (
        <div className="wa-card" role="dialog" aria-label="Contact on WhatsApp">
          <button className="wa-close" onClick={() => setOpen(false)} aria-label="Close">
            &times;
          </button>
          <strong>Need an access code?</strong>
          <p className="muted">
            Pay 5,000 RWF to MoMo Pay <strong>232255</strong>, then send the reference here and
            you get your code.
          </p>
          <a
            className="btn wa-go"
            href={whatsappLink(PAYMENT_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            Open WhatsApp
          </a>
          <span className="muted wa-num">{WHATSAPP_DISPLAY}</span>
        </div>
      )}

      <button
        className="wa-bubble"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close WhatsApp panel' : 'Contact us on WhatsApp'}
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="26" height="26">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.43 12.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.48-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47 0 1.45 1.06 2.86 1.21 3.06.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35z" />
        </svg>
      </button>
    </div>
  );
}
