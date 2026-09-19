import type { ReactNode } from 'react'

interface ChipProps {
  children: ReactNode
  /** `accent` names the kind of thing, `quiet` carries a caveat. */
  tone?: 'plain' | 'accent' | 'quiet'
}

export default function Chip({ children, tone = 'plain' }: ChipProps) {
  return <span className={`chip ${tone === 'plain' ? '' : `chip--${tone}`}`}>{children}</span>
}
