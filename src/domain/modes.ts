import type { ModeId, ModeInfo } from './types'

/**
 * Ordered easiest to hardest. Recognition (Arabic → English) is introduced
 * before production (English → Arabic) for the same word.
 */
export const MODES: readonly ModeInfo[] = [
  {
    id: 'vocabArToEn',
    labelEn: 'Arabic \u2192 English',
    shortLabel: 'Recognise',
    description: 'See an Arabic word, pick its meaning. The gentlest way in.',
    kind: 'recognition',
  },
  {
    id: 'vocabEnToAr',
    labelEn: 'English \u2192 Arabic',
    shortLabel: 'Produce',
    description: 'See an English word, pick the Arabic. Unlocks once you know the word.',
    kind: 'production',
  },
  {
    id: 'sentence',
    labelEn: 'Sentence translation',
    shortLabel: 'Sentences',
    description: 'Translate a full sentence from the lesson, in either direction.',
    kind: 'sentence',
  },
  {
    id: 'qa',
    labelEn: 'Arabic question \u0026 answer',
    shortLabel: 'Q\u0026A',
    description: 'Read an Arabic question, choose the correct Arabic reply.',
    kind: 'qa',
  },
]

export const MODE_IDS: readonly ModeId[] = MODES.map((mode) => mode.id)

const MODE_BY_ID = new Map<ModeId, ModeInfo>(MODES.map((mode) => [mode.id, mode]))

export function modeInfo(id: ModeId): ModeInfo | undefined {
  return MODE_BY_ID.get(id)
}

export function modeLabel(id: ModeId): string {
  return MODE_BY_ID.get(id)?.labelEn ?? id
}

/** Modes whose answers are sentences, where distractor length should match. */
export const LONG_ANSWER_MODES: ReadonlySet<ModeId> = new Set<ModeId>(['sentence', 'qa'])

export const RECOGNITION_MODE: ModeId = 'vocabArToEn'
export const PRODUCTION_MODE: ModeId = 'vocabEnToAr'
