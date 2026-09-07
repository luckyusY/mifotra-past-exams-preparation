'use client';

import { useEffect, useState } from 'react';

/**
 * Sign in once per session instead of retyping the password on every admin
 * page. The password is exchanged for an HttpOnly cookie, so nothing on the
 * page can read it back afterwards.
 *
 * Children render only once signed in, which means the panels below no longer
 * carry a password field or thread it through every fetch.
 */
export default function AdminGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'checking' | 'out' | 'in'>('checking');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/login')
      .then((r) => r.json())
      .then((d) => setState(d.signedIn ? 'in' : 'out'))
      .catch(() => setState('out'));
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        setError((await res.json()).error ?? 'Wrong password.');
        return;
      }
      setPw('');
      setState('in');
    } catch {
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch('/api/admin/login', { method: 'DELETE' }).catch(() => {});
    setState('out');
  }

  if (state === 'checking') {
    return <p className="muted">Checking session...</p>;
  }

  if (state === 'out') {
    return (
      <form onSubmit={signIn} className="card" style={{ maxWidth: 380 }}>
        <label htmlFor="admin-pw" style={{ fontWeight: 600, display: 'block', marginBottom: '.4rem' }}>
          Admin password
        </label>
        <input
          id="admin-pw"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoFocus
          autoComplete="current-password"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'admin-pw-error' : undefined}
        />
        {error && (
          <div className="notice bad" id="admin-pw-error" role="alert" style={{ marginTop: '.7rem' }}>
            {error}
          </div>
        )}
        <div className="navrow">
          <button className="btn" disabled={busy || !pw}>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
        <p className="muted" style={{ fontSize: '.85rem', marginBottom: 0 }}>
          Stays signed in for 8 hours.
        </p>
      </form>
    );
  }

  return (
    <>
      <div className="admin-bar">
        <span className="muted">Signed in</span>
        <button className="btn ghost" onClick={signOut} style={{ padding: '.3rem .7rem', fontSize: '.85rem' }}>
          Sign out
        </button>
      </div>
      {children}
    </>
  );
}
