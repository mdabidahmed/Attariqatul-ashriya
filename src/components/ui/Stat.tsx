import type { ReactNode } from 'react'

interface StatProps {
  label: string
  value: ReactNode
  /** A small qualifier riding on the figure's baseline: "/75", "best 11". */
  note?: ReactNode
}

/** A large figure over a small muted caption. */
export default function Stat({ label, value, note }: StatProps) {
  return (
    <div className="stat">
      <dt className="stat__label">{label}</dt>
      <dd className="stat__value">
        {value}
        {note === undefined ? null : <span className="stat__note">{note}</span>}
      </dd>
    </div>
  )
}
