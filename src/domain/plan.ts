/**
 * Decides what the student should practise next.
 *
 * The book is deliberately graded, so a new student must not be dropped into
 * all 75 lessons at once: the default is the earliest lesson they have not
 * started, mixed with whatever is genuinely due from the lessons they have.
 */

import type { BookIndex } from './bookIndex'
import { isDue, isNew, isWeak, progressFor } from './scheduler'
import type { Lesson, ProgressMap } from './types'

export interface StudyPlan {
  /** Earliest graded lesson with unseen material, or null when none is left. */
  nextLessonId: number | null
  /** Lessons with at least one item already practised, in book order. */
  startedLessonIds: number[]
  /** Lessons the default session will draw from: next plus anything started. */
  focusLessonIds: number[]
  weak: number
  due: number
  fresh: number
}

/**
 * @param lessons every lesson in the book, in order
 * @param index the precomputed item bank
 */
export function buildStudyPlan(
  lessons: readonly Lesson[],
  index: BookIndex,
  progress: ProgressMap,
  now: number,
): StudyPlan {
  const startedLessonIds: number[] = []
  let nextLessonId: number | null = null
  let weak = 0
  let due = 0
  let fresh = 0

  for (const lesson of lessons) {
    const items = index.answerableByLesson.get(lesson.id)
    if (!items || items.length === 0) continue

    let seenHere = 0
    let unseenHere = 0
    for (const item of items) {
      const state = progressFor(progress, item.id, now)
      if (isWeak(state)) weak += 1
      else if (isNew(state)) unseenHere += 1
      else if (isDue(state, now)) due += 1
      if (state.seen > 0) seenHere += 1
    }
    fresh += unseenHere

    if (seenHere > 0) startedLessonIds.push(lesson.id)
    // The first lesson still holding new material is the one to work on.
    if (nextLessonId === null && unseenHere > 0) nextLessonId = lesson.id
  }

  const focus = new Set(startedLessonIds)
  if (nextLessonId !== null) focus.add(nextLessonId)
  // Nothing new and nothing started: fall back to the first quizzable lesson.
  if (focus.size === 0) {
    const first = lessons.find((lesson) => index.quizzableLessonIds.has(lesson.id))
    if (first) focus.add(first.id)
  }

  return {
    nextLessonId,
    startedLessonIds,
    focusLessonIds: lessons.filter((lesson) => focus.has(lesson.id)).map((lesson) => lesson.id),
    weak,
    due,
    fresh,
  }
}

/** The first lesson a brand-new student should be pointed at. */
export function firstQuizzableLessonId(lessons: readonly Lesson[], index: BookIndex): number | null {
  return lessons.find((lesson) => index.quizzableLessonIds.has(lesson.id))?.id ?? null
}

/**
 * "Lesson 9", derived from the id rather than the book's printed wording.
 *
 * `titleEn` holds what the book prints ("Lesson Nine"), which is legitimate
 * source data and stays untouched in `data/lessons.json`. Numerals scan far
 * faster down a 75-row list and match the tile grid and the range inputs, so
 * every label in the UI comes from here.
 */
export function lessonName(lesson: { id: number }): string {
  return `Lesson ${lesson.id}`
}

/** "Lesson 9 · Prepositions fi / alaa" — used for tooltips and long labels. */
export function lessonLabel(lesson: Lesson): string {
  return lesson.topicEn ? `${lessonName(lesson)} \u00b7 ${lesson.topicEn}` : lessonName(lesson)
}
