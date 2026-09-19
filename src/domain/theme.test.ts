import { describe, expect, it } from 'vitest'

import { DEFAULT_THEME, THEMES, parseTheme, themeOption } from './theme'

describe('parseTheme', () => {
  it('accepts every offered theme', () => {
    for (const option of THEMES) {
      expect(parseTheme(option.id)).toBe(option.id)
    }
  })

  it('falls back to System on anything unusable', () => {
    for (const value of [null, undefined, '', 'blue', 42, {}, [], true]) {
      expect(parseTheme(value)).toBe(DEFAULT_THEME)
    }
    expect(DEFAULT_THEME).toBe('system')
  })

  it('survives a JSON round trip, which is how it is persisted', () => {
    for (const option of THEMES) {
      expect(parseTheme(JSON.parse(JSON.stringify(option.id)))).toBe(option.id)
    }
    expect(parseTheme(JSON.parse('"nope"'))).toBe(DEFAULT_THEME)
  })
})

describe('theme metadata', () => {
  it('always returns an option, even for a bad id', () => {
    expect(themeOption('dark').label).toBe('Dark')
    expect(themeOption('nope' as never).id).toBe('system')
  })
})
