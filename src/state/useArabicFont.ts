import { useCallback, useEffect, useState } from 'react'

import { parseArabicFont, type ArabicFontId } from '../domain/arabicFont'
import { readRaw, writeRaw } from './storage'

const KEY = 'arabicFont'

export interface ArabicFontApi {
  /** The committed face: what the app is using and what is persisted. */
  font: ArabicFontId
  /** Commits a face. Staging happens in the settings modal, not here. */
  setFont: (font: ArabicFontId) => void
}

/**
 * Owns the committed Arabic face, reflects it on `<html data-arabic-font>` —
 * which is what swaps the font stack and its vertical rhythm — and persists
 * it. Pending changes are the settings modal's business; anything that reaches
 * this hook is a commitment.
 */
export function useArabicFont(): ArabicFontApi {
  const [font, setFontState] = useState<ArabicFontId>(() => parseArabicFont(readRaw(KEY)))

  useEffect(() => {
    document.documentElement.dataset.arabicFont = font
    writeRaw(KEY, font)
  }, [font])

  const setFont = useCallback((next: ArabicFontId) => {
    setFontState(parseArabicFont(next))
  }, [])

  return { font, setFont }
}
