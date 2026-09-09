'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type Role = 'loading' | 'anon' | 'buyer' | 'admin';

export type SessionState = {
  role: Role;
  bankId: number | null;
  /** True once we know, so components can avoid flashing the wrong thing. */
  ready: boolean;
  /** Anyone who already has access should never be sold to again. */
  showOffers: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<SessionState>({
  role: 'loading',
  bankId: null,
  ready: false,
  showOffers: false,
  signOut: async () => {},
});

export const useSession = () => useContext(Ctx);

/**
 * One fetch of /api/session for the whole tree.
 *
 * Every surface that sells - the nav CTA, the upsell cards, the modal, the
 * WhatsApp bubble - previously decided on its own, which meant none of them
 * decided at all: an admin and a paying customer both got "Unlock full bank".
 * Pitching the product to someone who already owns it is the fastest way to
 * look like software that does not know who its users are.
 *
 * `showOffers` is the single answer to "should this person be sold to", so a
 * new surface cannot get it wrong by forgetting a case.
 */
export default function SessionProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>('loading');
  const [bankId, setBankId] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/session')
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setRole(d.role === 'admin' ? 'admin' : d.role === 'buyer' ? 'buyer' : 'anon');
        setBankId(typeof d.bankId === 'number' ? d.bankId : null);
      })
      // A failed probe must not hide the offers - an anonymous visitor is the
      // safe assumption, and the paywall itself is enforced server-side anyway.
      .catch(() => alive && setRole('anon'));
    return () => {
      alive = false;
    };
  }, []);

  async function signOut() {
    await fetch('/api/admin/login', { method: 'DELETE' }).catch(() => {});
    setRole('anon');
    setBankId(null);
  }

  const ready = role !== 'loading';

  return (
    <Ctx.Provider
      value={{
        role,
        bankId,
        ready,
        // Offers are for people without access. While the role is still unknown
        // we show them, because hiding then revealing reads as a glitch and
        // most visitors are anonymous.
        showOffers: role === 'anon' || role === 'loading',
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
