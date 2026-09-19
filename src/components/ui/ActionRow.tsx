import type { ReactNode } from 'react'

interface ActionRowProps {
  children: ReactNode
  /**
   * `lead` puts a narrow control before a growing primary — one row with an
   * obvious primary, rather than three buttons on three alignments.
   */
  layout?: 'wrap' | 'lead'
}

export default function ActionRow({ children, layout = 'wrap' }: ActionRowProps) {
  return <div className={`action-row ${layout === 'lead' ? 'action-row--lead' : ''}`}>{children}</div>
}
