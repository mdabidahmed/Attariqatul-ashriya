import type { ReactNode } from 'react'

interface RowsProps {
  children: ReactNode
  /** Boxed lists get a border and scroll; plain ones sit inside a panel. */
  variant?: 'plain' | 'boxed'
  /** Dimmed while a filtered list is catching up with the input. */
  pending?: boolean
  className?: string
}

export default function Rows({ children, variant = 'plain', pending = false, className }: RowsProps) {
  return (
    <ul
      className={`rows ${variant === 'boxed' ? 'rows--boxed' : ''} ${
        pending ? 'rows--pending' : ''
      } ${className ?? ''}`}
    >
      {children}
    </ul>
  )
}
