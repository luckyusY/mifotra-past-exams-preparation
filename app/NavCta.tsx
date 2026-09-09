'use client';

import Link from 'next/link';
import { LayoutDashboard, Lock, BookOpen } from 'lucide-react';
import { useSession } from './SessionProvider';

/**
 * The header's primary action, which is different depending on who is looking.
 *
 * An admin wants the dashboard. A customer wants the bank they already paid
 * for. Only someone without access should be asked to buy - showing them all
 * "Unlock full bank" was the tell that nothing in the app knew who its user was.
 */
export default function NavCta() {
  const { role } = useSession();

  if (role === 'admin') {
    return (
      <Link href="/admin" className="nav-cta">
        <LayoutDashboard size={15} aria-hidden="true" />
        Dashboard
      </Link>
    );
  }

  if (role === 'buyer') {
    return (
      <Link href="/unlock" className="nav-cta">
        <BookOpen size={15} aria-hidden="true" />
        My questions
      </Link>
    );
  }

  // Anonymous, and also while the role is still unknown: the offer is the
  // default because most visitors are buyers-to-be.
  return (
    <Link href="/unlock" className="nav-cta">
      <Lock size={15} aria-hidden="true" />
      Unlock full bank
    </Link>
  );
}
