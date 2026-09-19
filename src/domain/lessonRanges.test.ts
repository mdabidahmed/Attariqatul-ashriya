import { describe, expect, it } from 'vitest'

import {
  buildSearchIndex,
  describeSelection,
  lessonIdsInRange,
  searchLessons,
  summariseSelection,
} from './lessonRanges'
import { validateBook } from './validateBook'
import { makeSyntheticBook } from '../testing/syntheticBook'

const { book } = validateBook(makeSyntheticBook(75))
const { lessons } = book

describe('summariseSelection', () => {
  it('collapses runs into ranges', () => {
    expect(summariseSelection([1, 2, 3, 4, 5])).toBe('1\u20135')
    expect(summariseSelection([1, 2, 3, 7, 9, 10, 11])).toBe('1\u20133, 7, 9\u201311')
    expect(summariseSelection([42])).toBe('42')
  })

  it('does not care about order or duplicates', () => {
    expect(summariseSelection([5, 1, 3, 2, 4])).toBe('1\u20135')
    expect(summariseSelection([3, 3, 1, 2, 2])).toBe('1\u20133')
  })

  it('says so when nothing is selected', () => {
    expect(summariseSelection([])).toBe('none')
  })

  it('stays short for a whole-book selection', () => {
    const everything = lessons.map((lesson) => lesson.id)
    expect(summariseSelection(everything)).toBe(`1\u2013${lessons.length}`)
  })
})

describe('describeSelection', () => {
  it('always separates the count from the ranges', () => {
    // The regression this guards: adjacent spans with no separator rendered
    // "1 of 75 selected11" once the spacing rule went missing.
    expect(describeSelection([11], 75)).toBe('1 of 75 lessons \u00b7 11')
    expect(describeSelection([1, 2, 3], 75)).toBe('3 of 75 lessons \u00b7 1\u20133')
    for (const ids of [[1], [11], [1, 2], [5, 9, 40], [70, 71, 72]]) {
      const text = describeSelection(ids, 75)
      expect(text, text).toContain(' \u00b7 ')
      expect(text, text).not.toMatch(/\d{3,}/)
    }
  })

  it('reads sensibly with nothing selected', () => {
    expect(describeSelection([], 75)).toBe('No lessons selected \u00b7 75 available')
  })

  it('counts each lesson once', () => {
    expect(describeSelection([4, 4, 4], 75)).toBe('1 of 75 lessons \u00b7 4')
  })

  it('pluralises on the total, so a single selection still reads naturally', () => {
    expect(describeSelection([3], 75)).toBe('1 of 75 lessons \u00b7 3')
    expect(describeSelection([1], 1)).toBe('1 of 1 lesson \u00b7 1')
  })

  it('collapses a whole-book selection', () => {
    const everything = lessons.map((lesson) => lesson.id)
    expect(describeSelection(everything, lessons.length)).toBe(
      `${lessons.length} of ${lessons.length} lessons \u00b7 1\u2013${lessons.length}`,
    )
  })

  it('is a single string, so no styling is needed to keep it readable', () => {
    expect(typeof describeSelection([1, 2], 75)).toBe('string')
  })
})

describe('lessonIdsInRange', () => {
  it('is inclusive and order-insensitive', () => {
    expect(lessonIdsInRange(lessons, 3, 6)).toEqual([3, 4, 5, 6])
    expect(lessonIdsInRange(lessons, 6, 3)).toEqual([3, 4, 5, 6])
  })

  it('clamps to the lessons that exist', () => {
    expect(lessonIdsInRange(lessons, 0, 2)).toEqual([1, 2])
    expect(lessonIdsInRange(lessons, 74, 900)).toEqual([74, 75])
    expect(lessonIdsInRange(lessons, 900, 999)).toEqual([])
  })

  it('selects a single lesson when both ends match', () => {
    expect(lessonIdsInRange(lessons, 20, 20)).toEqual([20])
  })
})

describe('searchLessons', () => {
  const index = buildSearchIndex(lessons)

  it('returns everything for an empty query', () => {
    expect(searchLessons(index, '')).toHaveLength(lessons.length)
    expect(searchLessons(index, '   ')).toHaveLength(lessons.length)
  })

  it('matches on lesson number', () => {
    const found = searchLessons(index, '54')
    expect(found.some((lesson) => lesson.id === 54)).toBe(true)
    expect(found.length).toBeLessThan(lessons.length)
  })

  it('matches on topic text, case-insensitively', () => {
    const colours = searchLessons(index, 'colours')
    expect(colours.length).toBeGreaterThan(0)
    for (const lesson of colours) expect(lesson.topicEn.toLowerCase()).toContain('colours')

    expect(searchLessons(index, 'COUNTING').length).toBeGreaterThan(0)
    expect(searchLessons(index, 'days of the week').length).toBeGreaterThan(0)
  })

  it('finds the dictation lessons by topic', () => {
    const found = searchLessons(index, 'dictation')
    expect(found.length).toBeGreaterThan(1)
    for (const lesson of found) expect(lesson.topicEn).toContain('Dictation')
  })

  it('matches an Arabic topic typed without harakat', () => {
    // Many topics in the real book are Arabic, e.g. "(هذا) (ما هذا؟)".
    const withArabicTopic = { ...lessons[0]!, id: 900, topicEn: '(هٰذَا) (مَا هٰذَا؟)' }
    const arabicIndex = buildSearchIndex([withArabicTopic])

    expect(searchLessons(arabicIndex, 'هذا')).toHaveLength(1)
    expect(searchLessons(arabicIndex, 'هٰذَا')).toHaveLength(1)
    expect(searchLessons(arabicIndex, 'كتاب')).toHaveLength(0)
  })

  it('returns nothing for a query that matches no lesson', () => {
    expect(searchLessons(index, 'zzzzz-no-such-topic')).toEqual([])
  })

  it('stays fast across many keystrokes', () => {
    const started = performance.now()
    for (const query of ['c', 'co', 'col', 'colo', 'colou', 'colour', 'colours']) {
      searchLessons(index, query)
    }
    const elapsed = performance.now() - started
    expect(elapsed, `took ${elapsed.toFixed(1)}ms`).toBeLessThan(50)
  })
})
