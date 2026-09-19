import type { ReactNode } from 'react'

/**
 * Two columns until one row genuinely fits. Measured across a width sweep:
 * four columns at 560px leave 112px per stat, which is cramped; at 680px they
 * get 142px and read properly.
 */
export default function StatStrip({ children }: { children: ReactNode }) {
  return <dl className="stats">{children}</dl>
}
