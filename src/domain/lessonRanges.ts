/** Helpers for describing and searching a large lesson selection. */

import { normalize } from './arabic'
import type { Lesson } from './types'

/**
 * Collapses a selection into ranges: `[1..20, 34, 51, 52]` becomes
 * "1–20, 34, 51–52". At 75 lessons this is the only readable way to show
 * what is selected.
 */
export function summariseSelection(ids: readonly number[]): string {
  if (ids.length === 0) return 'none'
  const sorted = [...new Set(ids)].sort((a, b) => a - b)
  const parts: string[] = []
  let start = sorted[0] as number
  let previous = start

  for (let i = 1; i <= sorted.length; i += 1) {
    const current = sorted[i]
    if (current !== undefined && current === previous + 1) {
      previous = current
      continue
    }
    parts.push(start === previous ? String(start) : `${start}\u2013${previous}`)
    if (current === undefined) break
    start = current
    previous = current
  }
  return parts.join(', ')
}

/**
 * The whole selection summary as one string, separators included.
 *
 * This used to be assembled from adjacent spans that relied on a flex gap for
 * spacing, so when the rule went missing the line rendered as
 * "1 of 75 selected11". Building the text here means it is correct with no CSS
 * at all, and can be tested.
 */
export function describeSelection(selectedIds: readonly number[], total: number): string {
  const count = new Set(selectedIds).size
  if (count === 0) return `No lessons selected \u00b7 ${total} available`
  // Pluralised on the total, not the count: "1 of 75 lessons", not "1 of 75 lesson".
  const noun = total === 1 ? 'lesson' : 'lessons'
  return `${count} of ${total} ${noun} \u00b7 ${summariseSelection(selectedIds)}`
}

/** Lesson ids within an inclusive range, in book order. */
export function lessonIdsInRange(lessons: readonly Lesson[], from: number, to: number): number[] {
  const low = Math.min(from, to)
  const high = Math.max(from, to)
  return lessons.filter((lesson) => lesson.id >= low && lesson.id <= high).map((lesson) => lesson.id)
}

export interface SearchableLesson {
  lesson: Lesson
  haystack: string
}

/**
 * Precomputes the search text for each lesson once, so typing in the picker
 * does not re-normalise 75 Arabic topics on every keystroke. Topics are
 * indexed both as written and harakat-stripped, since many of this book's
 * topics are Arabic.
 */
export function buildSearchIndex(lessons: readonly Lesson[]): SearchableLesson[] {
  return lessons.map((lesson) => ({
    lesson,
    haystack: [
      String(lesson.id),
      lesson.titleEn.toLowerCase(),
      lesson.topicEn.toLowerCase(),
      normalize(lesson.topicEn),
    ].join(' \u0000 '),
  }))
}

/** Filters the index by a free-text query over lesson number, title and topic. */
export function searchLessons(index: readonly SearchableLesson[], query: string): Lesson[] {
  const trimmed = query.trim()
  if (!trimmed) return index.map((entry) => entry.lesson)

  const needleEn = trimmed.toLowerCase()
  const needleAr = normalize(trimmed)
  return index
    .filter(
      (entry) =>
        entry.haystack.includes(needleEn) || (needleAr.length > 0 && entry.haystack.includes(needleAr)),
    )
    .map((entry) => entry.lesson)
}
