import type { ReactNode } from 'react'

import TopicLabel from '../TopicLabel'

interface RowProps {
  as?: 'li' | 'div' | 'label'
  /** A checkbox or index that leads the row. */
  lead?: ReactNode
  title?: ReactNode
  badge?: ReactNode
  /** A lesson topic, which may mix scripts; truncated horizontally. */
  topic?: string | null
  /** Trailing cells: a meter, a figure, a count. */
  children?: ReactNode
  /** Small controls, right-aligned. */
  actions?: ReactNode
  selected?: boolean
  className?: string
}

/**
 * One line, always.
 *
 * Every list in the app — lessons in progress, the picker, the results
 * breakdown, a glossary — is the same row: the topic is the part that gives
 * way, so a 75-row list stays uniform and scannable.
 *
 * The height floor comes from `min-height` and a shared line-height, never
 * from a pinned `height` with hidden overflow: that shears the descenders off
 * Arabic, which has happened twice here already.
 */
export default function Row({
  as: Tag = 'li',
  lead,
  title,
  badge,
  topic,
  children,
  actions,
  selected = false,
  className,
}: RowProps) {
  return (
    <Tag className={`row ${selected ? 'row--on' : ''} ${className ?? ''}`}>
      {lead}
      {title === undefined && !topic ? null : (
        <span className="row__name">
          {title === undefined ? null : <span className="row__title">{title}</span>}
          {badge}
          {topic ? <TopicLabel className="row__topic" text={topic} /> : null}
        </span>
      )}
      {children}
      {actions ? <span className="row__actions">{actions}</span> : null}
    </Tag>
  )
}
