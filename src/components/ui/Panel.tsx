import type { ReactNode } from 'react'

interface PanelProps {
  children: ReactNode
  /** `sunk` tints the panel for content nested inside another panel. */
  tone?: 'plain' | 'sunk'
  className?: string
  labelledBy?: string
}

/**
 * The quiet white card the whole app is built from: a hairline border and a
 * generous radius rather than a shadow, so nothing competes with the one
 * filled hero on the screen.
 */
export default function Panel({ children, tone = 'plain', className, labelledBy }: PanelProps) {
  return (
    <section
      className={`panel ${tone === 'sunk' ? 'panel--sunk' : ''} ${className ?? ''}`}
      aria-labelledby={labelledBy}
    >
      {children}
    </section>
  )
}
