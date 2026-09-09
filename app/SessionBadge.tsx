'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type State =
  | { kind: 'loading' }
  | { kind: 'anon' }
  | { kind: 'buyer'; bankId: number }
  | { kind: 'admin' };

/**
 * Shows who the visitor currently is.
 *
 * Both session cookies are HttpOnly - deliberately, so a page script cannot
 * read them - which means the state has to be asked for rather than inspected.
 * /api/session answers it without touching the database; reusing
 * /api/questions would have shipped a whole bank to render a badge.
 *
 * This is a client component so the header itself stays static and cacheable.
 * Making the whole layout dynamic to read a cookie would cost every page its
 * static rendering for a badge most visitors never see.
 */
export default function SessionBadge() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    fetch('/api/session')
      .then(async (res) => {
        if (!alive) return;
        const d = await res.json();
        if (d.role === 'admin') return setState({ kind: 'admin' });
        if (d.role === 'buyer') return setState({ kind: 'buyer', bankId: d.bankId });
        setState({ kind: 'anon' });
      })
      .catch(() => alive && setState({ kind: 'anon' }));
    return () => {
      alive = false;
    };
  }, []);

  async function signOut() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    setState({ kind: 'anon' });
    router.refresh();
  }

  if (state.kind === 'loading' || state.kind === 'anon') return null;

  if (state.kind === 'admin') {
    return (
      <span className="session-badge is-admin">
        <Link href="/admin">Admin</Link>
        <button onClick={signOut}>Sign out</button>
      </span>
    );
  }

  return (
    <span className="session-badge">
      <Link href="/unlock">Bank {state.bankId} unlocked</Link>
    </span>
  );
}
