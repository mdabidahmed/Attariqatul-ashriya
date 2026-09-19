import { useState, type FormEvent } from 'react'

import type { ThemeApi } from '../../state/useTheme'
import Tooltip from '../ui/Tooltip'
import { MoonIcon, SearchIcon, SunIcon } from './icons'

interface TopbarProps {
  onSearch: (query: string) => void
  themeApi: ThemeApi
  onOpenSettings: () => void
}

/**
 * Search plus quick theme controls. Search is a plain form: submitting (or
 * pressing Enter) hands the query up to `App`, which opens the Lessons page
 * pre-filtered — there is no separate results dropdown to keep in sync with
 * that page's own list.
 *
 * The sun/moon pair is a shortcut for the two settings someone reaches for
 * most; "System" is still only in Settings, which the avatar also opens.
 * Highlighting reads `resolvedTheme`, not `theme` itself: with "System"
 * selected, `theme` is neither `light` nor `dark`, and highlighting off
 * that literal value left both buttons looking unselected even though one
 * of them was plainly the one in effect.
 */
export default function Topbar({ onSearch, themeApi, onOpenSettings }: TopbarProps) {
  const [query, setQuery] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSearch(query)
  }

  return (
    <header className="topbar">
      <form className="topbar__search" role="search" onSubmit={handleSubmit}>
        <SearchIcon size={16} />
        <input
          type="search"
          placeholder="Search lessons, topics…"
          aria-label="Search lessons, topics"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </form>

      <div className="topbar__actions">
        <div className="theme-toggle" role="group" aria-label="Theme">
          <Tooltip label="Light theme">
            <button
              type="button"
              className={`theme-toggle__item ${themeApi.resolvedTheme === 'light' ? 'theme-toggle__item--on' : ''}`}
              aria-pressed={themeApi.resolvedTheme === 'light'}
              aria-label="Light theme"
              onClick={() => themeApi.setTheme('light')}
            >
              <SunIcon />
            </button>
          </Tooltip>
          <Tooltip label="Dark theme">
            <button
              type="button"
              className={`theme-toggle__item ${themeApi.resolvedTheme === 'dark' ? 'theme-toggle__item--on' : ''}`}
              aria-pressed={themeApi.resolvedTheme === 'dark'}
              aria-label="Dark theme"
              onClick={() => themeApi.setTheme('dark')}
            >
              <MoonIcon />
            </button>
          </Tooltip>
        </div>

        <Tooltip label="Settings">
          <button type="button" className="avatar-button" aria-label="Settings" onClick={onOpenSettings}>
            A
          </button>
        </Tooltip>
      </div>
    </header>
  )
}
