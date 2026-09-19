import type { ReactNode } from 'react'

export type StatTone = 'accent' | 'good' | 'warn' | 'bad'

interface StatProps {
  label: string
  value: ReactNode
  /** A small qualifier riding on the figure's baseline: "/75", "best 11". */
  note?: ReactNode
  /** A small glyph in a coloured chip, so the strip reads as a row of
      distinct things at a glance rather than four identical numbers. */
  icon?: ReactNode
  tone?: StatTone
}

/** A coloured icon chip over a large figure and a small muted caption. */
export default function Stat({ label, value, note, icon, tone = 'accent' }: StatProps) {
  return (
    <div className={`stat stat--${tone}`}>
      {icon ? (
        <span className="stat__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="stat__body">
        <dt className="stat__label">{label}</dt>
        <dd className="stat__value">
          {value}
          {note === undefined ? null : <span className="stat__note">{note}</span>}
        </dd>
      </span>
    </div>
  )
}
