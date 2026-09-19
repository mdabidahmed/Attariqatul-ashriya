import type { ReactNode } from 'react'

export type NoticeTone = 'info' | 'warn' | 'error'

interface NoticeProps {
  tone?: NoticeTone
  title?: string
  icon?: string
  children?: ReactNode
  action?: ReactNode
}

const DEFAULT_ICONS: Record<NoticeTone, string> = {
  info: 'i',
  warn: '!',
  error: '!',
}

export default function Notice({ tone = 'info', title, icon, children, action }: NoticeProps) {
  return (
    <div className={`notice notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span className="notice__icon" aria-hidden="true">
        {icon ?? DEFAULT_ICONS[tone]}
      </span>
      <div className="notice__body">
        {title ? <p className="notice__title">{title}</p> : null}
        {children}
      </div>
      {action ? <div className="notice__action">{action}</div> : null}
    </div>
  )
}
