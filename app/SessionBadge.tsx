'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, KeyRound, LogOut } from 'lucide-react';
import { useSession } from './SessionProvider';

/** Who the visitor is, in the header. Renders nothing for anonymous visitors. */
export default function SessionBadge() {
  const { role, bankId, signOut } = useSession();
  const router = useRouter();

  if (role === 'loading' || role === 'anon') return null;

  if (role === 'admin') {
    return (
      <span className="session-badge is-admin">
        <ShieldCheck size={14} aria-hidden="true" />
        <Link href="/admin">Admin</Link>
        <button
          onClick={async () => {
            await signOut();
            router.refresh();
          }}
          title="Sign out"
        >
          <LogOut size={13} aria-hidden="true" />
          <span className="sr-only-sm">Sign out</span>
        </button>
      </span>
    );
  }

  return (
    <span className="session-badge">
      <KeyRound size={14} aria-hidden="true" />
      <Link href="/unlock">Bank {bankId} unlocked</Link>
    </span>
  );
}
