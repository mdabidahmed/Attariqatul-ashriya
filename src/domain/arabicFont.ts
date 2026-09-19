/**
 * The Arabic face preference, and the staging rules behind the settings modal.
 *
 * Settings stage rather than apply instantly: the modal previews the pending
 * choice, but the app-wide font only changes when Save is pressed. Cancel,
 * Escape and a backdrop click all leave the committed font untouched. That is
 * easy to get subtly wrong, so the rules live here where they can be tested
 * without a browser.
 */

export type ArabicFontId = 'amiri' | 'indopak' | 'nastaliq'

export interface ArabicFontOption {
  id: ArabicFontId
  label: string
  script: 'Naskh' | 'Nastaliq'
  note: string
}

/**
 * Amiri is the default deliberately: it is a Naskh face, it matches how the
 * textbook is typeset, and it keeps harakat unambiguous at small sizes. The
 * Nastaliq faces are offered because they were asked for, but they are harder
 * to read quickly when vocalised.
 */
export const ARABIC_FONTS: readonly ArabicFontOption[] = [
  {
    id: 'amiri',
    label: 'Amiri',
    script: 'Naskh',
    note: 'Matches the textbook. Clearest harakat — recommended for drilling.',
  },
  {
    id: 'indopak',
    label: 'IndoPak Nastaleeq',
    script: 'Nastaliq',
    note: 'The IndoPak Quranic style. Beautiful, but slanted and slower to read.',
  },
  {
    id: 'nastaliq',
    label: 'Noto Nastaliq Urdu',
    script: 'Nastaliq',
    note: 'Urdu calligraphic style. Tall lines, lighter harakat.',
  },
]

export const DEFAULT_ARABIC_FONT: ArabicFontId = 'amiri'

/** Never throws: an unknown or corrupt stored value falls back to the default. */
export function parseArabicFont(value: unknown): ArabicFontId {
  return ARABIC_FONTS.some((option) => option.id === value) ? (value as ArabicFontId) : DEFAULT_ARABIC_FONT
}

export function arabicFontOption(id: ArabicFontId): ArabicFontOption {
  return ARABIC_FONTS.find((option) => option.id === id) ?? (ARABIC_FONTS[0] as ArabicFontOption)
}

/** True for the faces needing the taller line rhythm to clear their harakat. */
export function isNastaliq(id: ArabicFontId): boolean {
  return arabicFontOption(id).script === 'Nastaliq'
}

// ------------------------------------------------------------- staging

export interface SettingsDraft {
  /** What the app is actually using, and what a dismissal returns to. */
  committed: ArabicFontId
  /** What the modal is previewing. */
  pending: ArabicFontId
}

/** Opens a draft that matches what is already in effect. */
export function openDraft(committed: ArabicFontId): SettingsDraft {
  const safe = parseArabicFont(committed)
  return { committed: safe, pending: safe }
}

export function stageArabicFont(draft: SettingsDraft, id: ArabicFontId): SettingsDraft {
  return { ...draft, pending: parseArabicFont(id) }
}

/** Whether Save has anything to do. */
export function isDirty(draft: SettingsDraft): boolean {
  return draft.pending !== draft.committed
}

/** The value to persist and apply. */
export function commitDraft(draft: SettingsDraft): SettingsDraft {
  return { committed: draft.pending, pending: draft.pending }
}

/** Throws the pending change away. Used by Cancel, Escape and the backdrop. */
export function discardDraft(draft: SettingsDraft): SettingsDraft {
  return { committed: draft.committed, pending: draft.committed }
}
