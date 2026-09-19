import { describe, expect, it } from 'vitest'

import {
  ARABIC_FONTS,
  DEFAULT_ARABIC_FONT,
  arabicFontOption,
  commitDraft,
  discardDraft,
  isDirty,
  isNastaliq,
  openDraft,
  parseArabicFont,
  stageArabicFont,
} from './arabicFont'

describe('parseArabicFont', () => {
  it('accepts every offered face', () => {
    for (const option of ARABIC_FONTS) {
      expect(parseArabicFont(option.id)).toBe(option.id)
    }
  })

  it('falls back to Amiri on anything unusable', () => {
    for (const value of [null, undefined, '', 'helvetica', 42, {}, [], true]) {
      expect(parseArabicFont(value)).toBe(DEFAULT_ARABIC_FONT)
    }
    expect(DEFAULT_ARABIC_FONT).toBe('amiri')
  })

  it('survives a JSON round trip, which is how it is persisted', () => {
    for (const option of ARABIC_FONTS) {
      expect(parseArabicFont(JSON.parse(JSON.stringify(option.id)))).toBe(option.id)
    }
    // A record written by an older or hand-edited build.
    expect(parseArabicFont(JSON.parse('"nope"'))).toBe(DEFAULT_ARABIC_FONT)
  })
})

describe('font metadata', () => {
  it('knows which faces need the taller line rhythm', () => {
    expect(isNastaliq('amiri')).toBe(false)
    expect(isNastaliq('indopak')).toBe(true)
    expect(isNastaliq('nastaliq')).toBe(true)
  })

  it('always returns an option, even for a bad id', () => {
    expect(arabicFontOption('indopak').label).toBe('IndoPak Nastaleeq')
    expect(arabicFontOption('amiri').script).toBe('Naskh')
  })
})

describe('staging a settings change', () => {
  it('opens clean, matching what is already in effect', () => {
    const draft = openDraft('indopak')
    expect(draft).toEqual({ committed: 'indopak', pending: 'indopak' })
    expect(isDirty(draft)).toBe(false)
  })

  it('repairs a corrupt committed value when opening', () => {
    expect(openDraft('garbage' as never)).toEqual({ committed: 'amiri', pending: 'amiri' })
  })

  it('marks itself dirty once a different face is staged', () => {
    const draft = stageArabicFont(openDraft('amiri'), 'nastaliq')
    expect(draft.pending).toBe('nastaliq')
    // The crucial part: the app is still on the old font until Save.
    expect(draft.committed).toBe('amiri')
    expect(isDirty(draft)).toBe(true)
  })

  it('settles again when staged back to the committed face', () => {
    const draft = stageArabicFont(stageArabicFont(openDraft('amiri'), 'indopak'), 'amiri')
    expect(isDirty(draft)).toBe(false)
    expect(draft.pending).toBe('amiri')
  })

  it('commits the pending choice', () => {
    const committed = commitDraft(stageArabicFont(openDraft('amiri'), 'indopak'))
    expect(committed).toEqual({ committed: 'indopak', pending: 'indopak' })
    expect(isDirty(committed)).toBe(false)
  })

  it('discards the pending choice and keeps the committed one', () => {
    const staged = stageArabicFont(openDraft('amiri'), 'nastaliq')
    const discarded = discardDraft(staged)
    expect(discarded).toEqual({ committed: 'amiri', pending: 'amiri' })
    expect(isDirty(discarded)).toBe(false)
  })

  it('leaves nothing behind after discarding, however many changes were staged', () => {
    let draft = openDraft('indopak')
    for (const id of ['amiri', 'nastaliq', 'amiri', 'nastaliq'] as const) {
      draft = stageArabicFont(draft, id)
    }
    expect(draft.committed).toBe('indopak')
    expect(discardDraft(draft).committed).toBe('indopak')
    expect(discardDraft(draft).pending).toBe('indopak')
  })

  it('reopening after a discard shows the committed face, not the abandoned one', () => {
    const abandoned = discardDraft(stageArabicFont(openDraft('amiri'), 'nastaliq'))
    const reopened = openDraft(abandoned.committed)
    expect(reopened.pending).toBe('amiri')
    expect(isDirty(reopened)).toBe(false)
  })

  it('never mutates the draft it was given', () => {
    const draft = openDraft('amiri')
    const frozen = Object.freeze({ ...draft })
    expect(() => stageArabicFont(frozen, 'indopak')).not.toThrow()
    expect(frozen.pending).toBe('amiri')
    expect(commitDraft(frozen)).not.toBe(frozen)
    expect(discardDraft(frozen)).not.toBe(frozen)
  })

  it('ignores an invalid staged value rather than breaking the draft', () => {
    const draft = stageArabicFont(openDraft('indopak'), 'not-a-font' as never)
    expect(draft.pending).toBe('amiri')
    expect(draft.committed).toBe('indopak')
  })
})
