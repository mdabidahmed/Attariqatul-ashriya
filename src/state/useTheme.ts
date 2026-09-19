import { useCallback, useEffect, useState } from 'react'

import { parseTheme, type ThemeId } from '../domain/theme'
import { readRaw, writeRaw } from './storage'

const KEY = 'theme'

export interface ThemeApi {
  /** The committed preference: what is persisted and what the modal opens on. */
  theme: ThemeId
  /**
   * The concrete `light`/`dark` actually in effect right now — `theme`
   * itself is `system` half the time, which isn't something a two-way
   * quick-toggle can highlight.
   */
  resolvedTheme: 'light' | 'dark'
  /** Commits a preference. Staging happens in the settings modal, not here. */
  setTheme: (theme: ThemeId) => void
}

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Owns the committed theme preference and reflects it on `<html data-theme>`,
 * which `tokens.css` reads for its whole dark palette. There is no CSS-only
 * fallback: `data-theme` is always resolved to a concrete `light` or `dark`
 * here (never left as `system`), so the stylesheet only has one case to
 * handle. `index.html` carries a tiny inline script that does this same
 * resolution before the app mounts, so the first paint never flashes the
 * wrong theme.
 */
export function useTheme(): ThemeApi {
  const [theme, setThemeState] = useState<ThemeId>(() => parseTheme(readRaw(KEY)))
  // Only meaningful while `theme` is "system" — the device's own current
  // setting, kept as its own state because it changes from outside React
  // (a media query event), unlike the other branch below.
  const [systemPrefersDark, setSystemPrefersDark] = useState(prefersDark)

  useEffect(() => {
    writeRaw(KEY, theme)

    if (theme !== 'system') {
      document.documentElement.dataset.theme = theme
      return
    }

    // Following the device: resolve now, and keep resolving as its setting
    // changes while this preference stays "System".
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      document.documentElement.dataset.theme = media.matches ? 'dark' : 'light'
      setSystemPrefersDark(media.matches)
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(parseTheme(next))
  }, [])

  // Derived at render time rather than mirrored into its own state: the
  // non-"system" case needs no effect at all, it's just `theme` itself.
  const resolvedTheme: 'light' | 'dark' =
    theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme

  return { theme, resolvedTheme, setTheme }
}
