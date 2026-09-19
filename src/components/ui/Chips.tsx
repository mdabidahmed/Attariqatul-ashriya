import type { ReactNode } from 'react'

/**
 * A row of metadata pills.
 *
 * Centring matters: a flex row stretches its children to the tallest one, and
 * a single Arabic pill — whose line box is far taller than Spectral's — would
 * otherwise inflate every pill beside it.
 */
export default function Chips({ children }: { children: ReactNode }) {
  return <div className="chips">{children}</div>
}
