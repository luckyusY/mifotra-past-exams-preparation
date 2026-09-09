'use client';

import { useLayoutMode } from '../useLayoutMode';

/** Admin tables want more room than the reading column allows. */
export default function AdminMode() {
  useLayoutMode('wide');
  return null;
}
