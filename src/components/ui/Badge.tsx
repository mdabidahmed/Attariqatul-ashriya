import type { ReactNode } from 'react'

/** A static label inside a row — not a control, unlike a chip in a header. */
export default function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>
}
