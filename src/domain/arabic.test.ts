import { describe, expect, it } from 'vitest'

import {
  containsArabic,
  containsWord,
  isSameAnswer,
  normalize,
  normalizeArabic,
  stripDiacritics,
} from './arabic'

describe('normalizeArabic', () => {
  it('collapses harakat-only variants to the same key', () => {
    expect(normalizeArabic('أَلْقَلَمُ فِي الْجَيْبِ')).toBe(normalizeArabic('القلم في الجيب'))
    expect(normalizeArabic('كِتَابٌ')).toBe(normalizeArabic('كتاب'))
    expect(normalizeArabic('تِلْمِيذٌ')).toBe(normalizeArabic('تِلْمِيذْ'))
    // Superscript alef, as printed in هٰذَا.
    expect(normalizeArabic('هٰذَا')).toBe(normalizeArabic('هذا'))
  })

  it('unifies alif forms, tatweel and invisible characters', () => {
    expect(normalizeArabic('أرض')).toBe(normalizeArabic('ارض'))
    expect(normalizeArabic('إسلام')).toBe(normalizeArabic('اسلام'))
    expect(normalizeArabic('آمن')).toBe(normalizeArabic('امن'))
    expect(normalizeArabic('كتـــاب')).toBe(normalizeArabic('كتاب'))
    expect(normalizeArabic('كتاب\u200f')).toBe(normalizeArabic('كتاب'))
    expect(normalizeArabic('  كتاب   جديد ')).toBe('كتاب جديد')
  })

  it('keeps genuinely different words apart', () => {
    expect(normalizeArabic('جَيْبٌ')).not.toBe(normalizeArabic('كِتَابٌ'))
    expect(normalizeArabic('فَوْقَ')).not.toBe(normalizeArabic('تَحْتَ'))
    // على (on) must not be merged with علي (Ali) by over-eager normalisation.
    expect(normalizeArabic('عَلَى')).not.toBe(normalizeArabic('عَلِيٌّ'))
    // Nor should ة and ه be folded together.
    expect(normalizeArabic('طِفْلَةٌ')).not.toBe(normalizeArabic('طِفْلَهْ'))
  })

  it('is safe on non-string and empty input', () => {
    for (const value of [null, undefined, 42, {}, [], '']) {
      expect(normalize(value, 'ar')).toBe('')
      expect(stripDiacritics(value)).toBe('')
      expect(containsArabic(value)).toBe(false)
    }
  })
})

describe('normalize for English', () => {
  it('ignores case and punctuation', () => {
    expect(normalize('The Pen!', 'en')).toBe(normalize('the pen', 'en'))
    expect(normalize('On/Upon', 'en')).toBe(normalize('onupon', 'en'))
  })

  it('keeps distinct glosses distinct', () => {
    expect(normalize('the pen', 'en')).not.toBe(normalize('the pencil', 'en'))
  })
})

describe('language detection', () => {
  it('picks the normaliser from the script when no language is given', () => {
    expect(normalize('كِتَابٌ')).toBe('كتاب')
    expect(normalize('Book')).toBe('book')
  })
})

describe('isSameAnswer', () => {
  it('treats vowelling differences as equal but blanks as unequal', () => {
    expect(isSameAnswer('أَلْأَرْضُ', 'الأرض', 'ar')).toBe(true)
    expect(isSameAnswer('', '', 'ar')).toBe(false)
    expect(isSameAnswer('جَيْبٌ', 'سَطْحٌ', 'ar')).toBe(false)
  })
})

describe('containsWord', () => {
  it('finds a vocabulary word inside a book sentence, article and harakat aside', () => {
    expect(containsWord('أَلْقَلَمُ فِي الْجَيْبِ', 'جَيْبٌ', 'ar')).toBe(true)
    expect(containsWord('أَلْعُصْفُورُ عَلَى الشَّجَرَةِ', 'عُصْفُورٌ', 'ar')).toBe(true)
    expect(containsWord('أَلسَّمَاءُ فَوْقَنَا', 'جَيْبٌ', 'ar')).toBe(false)
  })

  it('ignores one-letter targets that would match everywhere', () => {
    expect(containsWord('أَلْقَلَمُ فِي الْجَيْبِ', 'و', 'ar')).toBe(false)
  })
})
