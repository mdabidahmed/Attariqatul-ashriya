import type { ReactNode } from 'react'

interface SectionHeadProps {
  title: string
  /** A quieter figure beside the label: "11 of 75". */
  count?: ReactNode
  /** One small outline control, right-aligned on the label's line. */
  action?: ReactNode
  id?: string
  as?: 'h1' | 'h2' | 'h3'
}

/**
 * Small-caps, letterspaced section label. It names a region without competing
 * with the content inside it, which is why it is set at 14px rather than as a
 * heading-sized title.
 */
export default function SectionHead({ title, count, action, id, as: Tag = 'h2' }: SectionHeadProps) {
  return (
    <div className="section__head">
      <Tag className="section__title" id={id}>
        {title}
        {count === undefined ? null : <span className="section__count">{count}</span>}
      </Tag>
      {action}
    </div>
  )
}
