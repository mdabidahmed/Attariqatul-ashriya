import type { ReactNode } from 'react'

import type { ThemeApi } from '../../state/useTheme'
import Sidebar, { type NavTarget } from './Sidebar'
import Topbar from './Topbar'

interface AppShellProps {
  active: NavTarget
  bookTitleEn: string
  bookTitleAr: string
  onNavigate: (target: NavTarget) => void
  onOpenSettings: () => void
  onSearch: (query: string) => void
  themeApi: ThemeApi
  notices?: ReactNode
  children: ReactNode
}

/**
 * The two-column dashboard frame: a persistent sidebar, a topbar, and
 * whatever page is active. Only wraps the "browsing" screens — the quiz and
 * flashcard screens keep their own distraction-free, full-viewport layout
 * and never render this.
 */
export default function AppShell({
  active,
  bookTitleEn,
  bookTitleAr,
  onNavigate,
  onOpenSettings,
  onSearch,
  themeApi,
  notices,
  children,
}: AppShellProps) {
  return (
    <div className="shell">
      <Sidebar
        active={active}
        bookTitleEn={bookTitleEn}
        bookTitleAr={bookTitleAr}
        onNavigate={onNavigate}
        onOpenSettings={onOpenSettings}
      />
      <div className="shell__main">
        <Topbar onSearch={onSearch} themeApi={themeApi} onOpenSettings={onOpenSettings} />
        <main className="shell__content">
          {notices}
          {children}
        </main>
      </div>
    </div>
  )
}
