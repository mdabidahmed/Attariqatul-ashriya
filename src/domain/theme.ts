/** The colour theme preference: system, always light, or always dark. */

export type ThemeId = 'system' | 'light' | 'dark'

export interface ThemeOption {
  id: ThemeId
  label: string
  note: string
}

export const THEMES: readonly ThemeOption[] = [
  { id: 'system', label: 'System', note: "Follows this device's own light or dark setting." },
  { id: 'light', label: 'Light', note: 'Always light, regardless of the device.' },
  { id: 'dark', label: 'Dark', note: 'Always dark, regardless of the device.' },
]

export const DEFAULT_THEME: ThemeId = 'system'

/** Never throws: an unknown or corrupt stored value falls back to the default. */
export function parseTheme(value: unknown): ThemeId {
  return THEMES.some((option) => option.id === value) ? (value as ThemeId) : DEFAULT_THEME
}

export function themeOption(id: ThemeId): ThemeOption {
  return THEMES.find((option) => option.id === id) ?? (THEMES[0] as ThemeOption)
}
