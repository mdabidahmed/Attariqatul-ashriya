import { describe, expect, it } from 'vitest'

import { DEFAULT_TITLE_EN, InvalidBookError, lessonEntryCount, validateBook } from './validateBook'

describe('validateBook', () => {
  it('accepts a well-formed payload untouched', () => {
    const { book, issues } = validateBook({
      book: { titleEn: 'Part I', titleAr: 'الطريقة' },
      lessons: [
        {
          id: 9,
          titleEn: 'Lesson Nine',
          titleAr: 'أَلدَّرْسُ التَّاسِعُ',
          bookPages: [34, 35],
          vocabulary: [{ en: 'In', ar: 'فِي' }],
        },
      ],
    })

    expect(issues).toEqual([])
    expect(book.meta.titleEn).toBe('Part I')
    expect(book.lessons).toHaveLength(1)
    expect(book.lessons[0]?.bookPages).toEqual([34, 35])
    expect(book.lessons[0]?.vocabulary).toEqual([{ en: 'In', ar: 'فِي' }])
  })

  it('fills in missing book metadata', () => {
    const { book } = validateBook({ lessons: [{ id: 1, vocabulary: [{ en: 'In', ar: 'فِي' }] }] })
    expect(book.meta.titleEn).toBe(DEFAULT_TITLE_EN)
    expect(book.meta.titleAr.length).toBeGreaterThan(0)
  })

  it('skips malformed lessons and names them in the issues', () => {
    const { book, issues } = validateBook({
      lessons: [
        { id: 1, vocabulary: [{ en: 'In', ar: 'فِي' }] },
        null,
        'nonsense',
        { id: 3, titleEn: 'Empty lesson' },
      ],
    })

    expect(book.lessons.map((lesson) => lesson.id)).toEqual([1])
    expect(issues).toHaveLength(3)
    expect(issues.filter((issue) => issue.severity === 'skipped')).toHaveLength(3)
    expect(issues.some((issue) => issue.where === 'Lesson 3')).toBe(true)
  })

  it('drops half-written entries but keeps the lesson, and reports the repair', () => {
    const { book, issues } = validateBook({
      lessons: [
        {
          id: 9,
          vocabulary: [{ en: 'In', ar: 'فِي' }, { en: 'Only English' }, null, { ar: 'فَقَطْ' }],
          sentences: 'not an array',
          qaPairs: [{ questionAr: 'أَيْنَ الْقَلَمُ؟' }],
          translateToArabic: [{ en: '   ', ar: '   ' }],
          notesEn: [1, 'a real note', null],
        },
      ],
    })

    const lesson = book.lessons[0]
    expect(lesson?.vocabulary).toHaveLength(1)
    expect(lesson?.sentences).toEqual([])
    expect(lesson?.qaPairs).toEqual([])
    expect(lesson?.notesEn).toEqual(['a real note'])
    expect(issues.every((issue) => issue.severity === 'repaired')).toBe(true)
    expect(issues.some((issue) => issue.message.includes('vocabulary'))).toBe(true)
  })

  it('numbers a lesson by position when its id is missing', () => {
    const { book, issues } = validateBook({
      lessons: [{ titleEn: 'No id', vocabulary: [{ en: 'In', ar: 'فِي' }] }],
    })
    expect(book.lessons[0]?.id).toBe(1)
    expect(issues.some((issue) => issue.message.includes('numbered 1 by position'))).toBe(true)
  })

  it('sorts lessons by id and renumbers order', () => {
    const { book } = validateBook({
      lessons: [
        { id: 9, vocabulary: [{ en: 'In', ar: 'فِي' }] },
        { id: 3, vocabulary: [{ en: 'That', ar: 'ذٰلِكَ' }] },
      ],
    })
    expect(book.lessons.map((lesson) => lesson.id)).toEqual([3, 9])
    expect(book.lessons.map((lesson) => lesson.order)).toEqual([0, 1])
  })

  it('throws only when nothing usable is left', () => {
    expect(() => validateBook(null)).toThrow(InvalidBookError)
    expect(() => validateBook({})).toThrow(InvalidBookError)
    expect(() => validateBook({ lessons: 'nope' })).toThrow(InvalidBookError)
    expect(() => validateBook({ lessons: [] })).toThrow(InvalidBookError)
    expect(() => validateBook({ lessons: [{ id: 1 }] })).toThrow(InvalidBookError)
  })
})

describe('lessonEntryCount', () => {
  it('adds up every section', () => {
    const { book } = validateBook({
      lessons: [
        {
          id: 1,
          vocabulary: [{ en: 'In', ar: 'فِي' }],
          sentences: [{ ar: 'أَلْقَلَمُ فِي الْجَيْبِ', en: 'The pen is in the pocket' }],
          qaPairs: [{ questionAr: 'أَيْنَ الْقَلَمُ؟', answerAr: 'أَلْقَلَمُ فِي الْجَيْبِ' }],
        },
      ],
    })
    expect(lessonEntryCount(book.lessons[0]!)).toBe(3)
  })
})
