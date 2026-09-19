import { describe, expect, it } from 'vitest'

import { segmentByScript } from './arabic'
import { lessonLabel, lessonName } from './plan'
import { validateBook } from './validateBook'
import { makeSyntheticBook } from '../testing/syntheticBook'

describe('lessonName', () => {
  it('uses numerals, not the book’s spelled-out wording', () => {
    expect(lessonName({ id: 1 })).toBe('Lesson 1')
    expect(lessonName({ id: 9 })).toBe('Lesson 9')
    expect(lessonName({ id: 43 })).toBe('Lesson 43')
    expect(lessonName({ id: 75 })).toBe('Lesson 75')
  })

  it('never echoes the printed title, which stays untouched in the data', () => {
    const { book } = validateBook(makeSyntheticBook(20))
    for (const lesson of book.lessons) {
      expect(lessonName(lesson)).toBe(`Lesson ${lesson.id}`)
      expect(lessonName(lesson)).not.toBe(lesson.titleEn)
      // The source field is still there for search to match "nine".
      expect(lesson.titleEn.length).toBeGreaterThan(0)
    }
  })

  it('composes the long label with the topic', () => {
    expect(lessonLabel({ id: 54, topicEn: 'Counting from 1 to 10' } as never)).toBe(
      'Lesson 54 \u00b7 Counting from 1 to 10',
    )
    expect(lessonLabel({ id: 54, topicEn: '' } as never)).toBe('Lesson 54')
  })
})

describe('segmentByScript', () => {
  it('splits a mixed topic so each script keeps its own run', () => {
    // The row that rendered "Absent pronouns" at Arabic display size.
    expect(segmentByScript('Absent pronouns (ه) (ها)')).toEqual([
      { text: 'Absent pronouns', script: 'en' },
      { text: '(ه) (ها)', script: 'ar' },
    ])
  })

  it('keeps bracket pairs intact whichever script comes first', () => {
    // The real book writes several topics Arabic-first. Handing the buffered
    // neutrals to one side left the closing bracket on the wrong run.
    expect(segmentByScript('(ه) (ها) Absent pronouns')).toEqual([
      { text: '(ه) (ها)', script: 'ar' },
      { text: 'Absent pronouns', script: 'en' },
    ])
    expect(segmentByScript('Absent pronouns (ه) (ها)')).toEqual([
      { text: 'Absent pronouns', script: 'en' },
      { text: '(ه) (ها)', script: 'ar' },
    ])
    for (const text of ['(ه) (ها) Absent pronouns', 'Absent pronouns (ه) (ها)']) {
      for (const run of segmentByScript(text)) {
        const opens = (run.text.match(/\(/g) ?? []).length
        const closes = (run.text.match(/\)/g) ?? []).length
        expect(opens, `${run.text} has balanced brackets`).toBe(closes)
      }
    }
  })

  it('leaves a single-script topic as one run', () => {
    expect(segmentByScript('Dictation and laws of Dictation')).toEqual([
      { text: 'Dictation and laws of Dictation', script: 'en' },
    ])
    expect(segmentByScript('(هذا) (ما هذا؟) (من هذا؟)')).toEqual([
      { text: '(هذا) (ما هذا؟) (من هذا؟)', script: 'ar' },
    ])
  })

  it('keeps bracketed Arabic together rather than fragmenting on punctuation', () => {
    const runs = segmentByScript('(أنا) (أنتَ) (هو)')
    expect(runs).toHaveLength(1)
    expect(runs[0]?.script).toBe('ar')
  })

  it('handles alternating scripts', () => {
    expect(segmentByScript('Big كبير Small صغير')).toEqual([
      { text: 'Big', script: 'en' },
      { text: 'كبير', script: 'ar' },
      { text: 'Small', script: 'en' },
      { text: 'صغير', script: 'ar' },
    ])
  })

  it('treats digits and punctuation as neutral', () => {
    expect(segmentByScript('Counting from 1 to 10')).toEqual([
      { text: 'Counting from 1 to 10', script: 'en' },
    ])
  })

  it('falls back to a Latin run when there is no strong script', () => {
    expect(segmentByScript('123 — (4)')).toEqual([{ text: '123 — (4)', script: 'en' }])
  })

  it('returns nothing for empty or unusable input', () => {
    for (const value of ['', '   ', null, undefined, 42, {}]) {
      expect(segmentByScript(value)).toEqual([])
    }
  })

  it('never loses or duplicates characters', () => {
    for (const text of [
      'Absent pronouns (ه) (ها)',
      '(هذا) (ذاك) (هذه) (تلك)',
      'Long, short and average',
      'Big كبير Small صغير',
    ]) {
      const joined = segmentByScript(text)
        .map((run) => run.text)
        .join(' ')
      const strip = (value: string) => value.replace(/\s+/g, '')
      expect(strip(joined)).toBe(strip(text))
    }
  })

  it('segments every topic in the real book without throwing', () => {
    const { book } = validateBook(makeSyntheticBook(75))
    for (const lesson of book.lessons) {
      const runs = segmentByScript(lesson.topicEn)
      expect(Array.isArray(runs)).toBe(true)
      for (const run of runs) {
        expect(run.text.trim()).toBe(run.text)
        expect(['ar', 'en']).toContain(run.script)
      }
    }
  })
})
