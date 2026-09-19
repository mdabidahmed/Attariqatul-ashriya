import { useMemo } from 'react'

import { segmentByScript } from '../domain/arabic'

interface TopicLabelProps {
  text: string
  className?: string
}

/**
 * A lesson topic, which may mix scripts — several in this book read like
 * "Absent pronouns (ه) (ها)".
 *
 * Each run gets its own face and size, so the English words are not rendered
 * at Arabic display size. The whole label stays on one line and truncates:
 * in a 75-row list a consistent, scannable row matters more than showing
 * every topic in full.
 */
export default function TopicLabel({ text, className }: TopicLabelProps) {
  const runs = useMemo(() => segmentByScript(text), [text])
  if (runs.length === 0) return null

  return (
    <span className={['topic', className].filter(Boolean).join(' ')} title={text}>
      {runs.map((run, position) => (
        <span
          key={`${run.script}-${position}-${run.text}`}
          className={`topic__run topic__run--${run.script}`}
          dir={run.script === 'ar' ? 'rtl' : 'ltr'}
          lang={run.script}
        >
          {run.text}
        </span>
      ))}
    </span>
  )
}
