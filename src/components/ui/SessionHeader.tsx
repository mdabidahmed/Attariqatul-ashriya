import type { ReactNode } from 'react'

import Meter from '../Meter'

interface SessionHeaderProps {
  /** "Question 3 of 20" or "Card 3 of 20". */
  counter: ReactNode
  /** The score, the exit button: whatever rides at the end of the line. */
  trailing?: ReactNode
  value: number
  max: number
  meterLabel: string
  /** Mode and lesson pills. */
  chips?: ReactNode
}

/**
 * The header both timed screens share: a counter, one progress bar and a row
 * of pills. The quiz and the flashcards are two halves of one flow, so they
 * cannot look like two different products.
 */
export default function SessionHeader({
  counter,
  trailing,
  value,
  max,
  meterLabel,
  chips,
}: SessionHeaderProps) {
  return (
    <header className="session">
      <div className="session__status">
        <h1 className="session__counter">{counter}</h1>
        {trailing ? <div className="session__trailing">{trailing}</div> : null}
      </div>
      <Meter value={value} max={max} label={meterLabel} />
      {chips}
    </header>
  )
}
