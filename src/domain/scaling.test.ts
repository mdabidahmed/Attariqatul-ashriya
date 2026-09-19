/**
 * Behaviour and performance at the real size of the book: 75 lessons and
 * several thousand items. These run against the synthetic fixture so they do
 * not depend on the extraction process having finished.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import { normalize } from './arabic'
import { buildBookIndex, countAvailable, countByMode, type BookIndex } from './bookIndex'
import { buildItems } from './items'
import { MODE_IDS } from './modes'
import { buildStudyPlan, firstQuizzableLessonId, lessonLabel } from './plan'
import { OPTIONS_PER_QUESTION, buildQuestions } from './questions'
import { grade, lessonMasteryAll, newItemProgress } from './scheduler'
import { composeSession } from './session'
import { applySession, emptyStudyState, parseStudyState, serialiseStudyState } from './studyState'
import type { Book, ProgressMap, QuizItem } from './types'
import { validateBook } from './validateBook'
import { makeSyntheticBook, syntheticDictationLessonIds } from '../testing/syntheticBook'

const NOW = Date.parse('2026-04-01T09:00:00Z')
const LESSON_COUNT = 75

/**
 * Builds a progress map by mutation. Spreading into a new object per item is
 * quadratic, which at 6,000 items is slower than anything being tested.
 */
function progressWith(items: readonly QuizItem[], grades: readonly boolean[]): ProgressMap {
  const map: ProgressMap = {}
  items.forEach((item, position) => {
    let state = newItemProgress(NOW)
    for (const correct of grades) state = grade(state, correct, NOW)
    void position
    map[item.id] = state
  })
  return map
}

let book: Book
let items: QuizItem[]
let index: BookIndex

beforeAll(() => {
  book = validateBook(makeSyntheticBook(LESSON_COUNT)).book
  items = buildItems(book.lessons)
  index = buildBookIndex(book.lessons, items)
})

describe('the fixture is realistically large', () => {
  it('has 75 lessons and thousands of items', () => {
    expect(book.lessons).toHaveLength(LESSON_COUNT)
    expect(items.length).toBeGreaterThan(4000)
    const perLesson = [...index.byLesson.values()].map((list) => list.length)
    expect(Math.min(...perLesson)).toBeGreaterThan(60)
    expect(Math.max(...perLesson)).toBeLessThan(140)
  })

  it('keeps the dictation lessons but marks them unquizzable', () => {
    const dictationIds = syntheticDictationLessonIds(LESSON_COUNT)
    expect(dictationIds.length).toBeGreaterThan(0)
    for (const id of dictationIds) {
      const lesson = book.lessons.find((entry) => entry.id === id)
      expect(lesson, `lesson ${id} must survive validation`).toBeDefined()
      expect(lesson?.notesEn.length).toBeGreaterThan(0)
      expect(index.quizzableLessonIds.has(id)).toBe(false)
      expect(index.referenceLessonIds.has(id)).toBe(true)
      expect(index.answerableByLesson.get(id)).toBeUndefined()
    }
  })

  it('gives every lesson a topic', () => {
    for (const lesson of book.lessons) {
      expect(lesson.topicEn.length, `lesson ${lesson.id}`).toBeGreaterThan(0)
      expect(lessonLabel(lesson)).toContain(lesson.topicEn)
    }
  })
})

describe('the index agrees with the real question builder', () => {
  it('counts exactly the items that can become questions', () => {
    // The index answers availability analytically; this pins it to the truth.
    const { questions, skipped } = buildQuestions(items, items, 'index-check')
    expect(questions).toHaveLength(index.answerable.length)
    expect(skipped).toBe(items.length - index.answerable.length)

    const builtIds = new Set(questions.map((question) => question.itemId))
    for (const item of index.answerable) expect(builtIds.has(item.id), item.id).toBe(true)
  })

  it('adds per-lesson and per-mode counts up to the whole bank', () => {
    const lessonIds = book.lessons.map((lesson) => lesson.id)
    expect(countAvailable(index, lessonIds, MODE_IDS)).toBe(index.answerable.length)

    const byMode = countByMode(index, lessonIds, MODE_IDS)
    const summed = MODE_IDS.reduce((total, mode) => total + (byMode[mode] ?? 0), 0)
    expect(summed).toBe(index.answerable.length)
  })

  it('reports zero for a reference-only lesson', () => {
    const dictationId = syntheticDictationLessonIds(LESSON_COUNT)[0] as number
    expect(countAvailable(index, [dictationId], MODE_IDS)).toBe(0)
    expect(countAvailable(index, [], MODE_IDS)).toBe(0)
  })
})

describe('session composition stays fast and local at scale', () => {
  it('builds a 20-question session well inside a frame budget', () => {
    const started = performance.now()
    const composed = composeSession({
      items: index.answerable,
      progress: {},
      lessonIds: book.lessons.map((lesson) => lesson.id),
      modes: MODE_IDS,
      count: 20,
      focus: 'mixed',
      seed: 'perf',
      now: NOW,
    })
    const { questions } = buildQuestions(composed.items, items, 'perf')
    const elapsed = performance.now() - started

    expect(questions).toHaveLength(20)
    // Generous for CI, but it would be seconds if availability were computed
    // by running the distractor search over the whole bank.
    expect(elapsed, `took ${elapsed.toFixed(0)}ms`).toBeLessThan(600)
  })

  it('keeps distractors in context rather than raiding the whole book', () => {
    const lessonIds = book.lessons.map((lesson) => lesson.id)
    const composed = composeSession({
      items: index.answerable,
      progress: {},
      lessonIds,
      modes: MODE_IDS,
      count: 60,
      focus: 'mixed',
      seed: 'context',
      now: NOW,
    })
    const { questions } = buildQuestions(composed.items, items, 'context')

    const answerToLesson = new Map<string, Set<number>>()
    for (const item of items) {
      const key = `${item.mode}|${item.answerKey}`
      const set = answerToLesson.get(key)
      if (set) set.add(item.lessonId)
      else answerToLesson.set(key, new Set([item.lessonId]))
    }

    let sameLesson = 0
    let total = 0
    for (const question of questions) {
      for (const option of question.options) {
        if (option.isCorrect) continue
        total += 1
        const lessons = answerToLesson.get(`${question.mode}|${normalize(option.text, option.lang)}`)
        if (lessons?.has(question.lessonId)) sameLesson += 1
      }
    }

    expect(total).toBeGreaterThan(100)
    // With 6,000 candidates available the tiered search must still stay home.
    expect(sameLesson / total, `${sameLesson}/${total} distractors from the same lesson`).toBeGreaterThan(0.9)
  })

  it('rolls up all 75 lessons in one pass', () => {
    const progress = progressWith(index.answerable.slice(0, 400), [true])

    const started = performance.now()
    const rolled = lessonMasteryAll(index.byLesson, progress, NOW)
    const elapsed = performance.now() - started

    expect(rolled.size).toBe(index.byLesson.size)
    expect(elapsed, `took ${elapsed.toFixed(0)}ms`).toBeLessThan(120)

    const totals = [...rolled.values()].reduce((sum, row) => sum + row.total, 0)
    expect(totals).toBe(items.length)
  })
})

describe('what a brand-new student is pointed at', () => {
  it('starts at the first quizzable lesson, not all 75', () => {
    const plan = buildStudyPlan(book.lessons, index, {}, NOW)
    const firstQuizzable = firstQuizzableLessonId(book.lessons, index)

    expect(plan.nextLessonId).toBe(firstQuizzable)
    expect(plan.startedLessonIds).toEqual([])
    expect(plan.focusLessonIds).toEqual([firstQuizzable])
    expect(plan.due).toBe(0)
    expect(plan.weak).toBe(0)
  })

  it('never proposes a reference-only lesson as the next one', () => {
    const dictationIds = new Set(syntheticDictationLessonIds(LESSON_COUNT))
    const progress: ProgressMap = {}

    // Work forward through the book and check the pointer skips dictation.
    for (let step = 0; step < 12; step += 1) {
      const plan = buildStudyPlan(book.lessons, index, progress, NOW)
      if (plan.nextLessonId === null) break
      expect(dictationIds.has(plan.nextLessonId)).toBe(false)
      for (const item of index.answerableByLesson.get(plan.nextLessonId) ?? []) {
        progress[item.id] = grade(newItemProgress(NOW), true, NOW)
      }
    }
  })

  it('mixes the next lesson with review from lessons already started', () => {
    const firstId = firstQuizzableLessonId(book.lessons, index) as number
    const progress = progressWith(index.answerableByLesson.get(firstId) ?? [], [false])

    const plan = buildStudyPlan(book.lessons, index, progress, NOW)
    expect(plan.startedLessonIds).toContain(firstId)
    expect(plan.nextLessonId).not.toBe(firstId)
    expect(plan.focusLessonIds).toContain(firstId)
    expect(plan.focusLessonIds).toContain(plan.nextLessonId)
    expect(plan.weak).toBeGreaterThan(0)

    const composed = composeSession({
      items: index.answerable,
      progress,
      lessonIds: plan.focusLessonIds,
      modes: MODE_IDS,
      count: 20,
      focus: 'next',
      seed: 'graded',
      now: NOW,
    })
    // The lapsed items from lesson one come back before new material.
    expect(composed.breakdown.weak).toBeGreaterThan(0)
    expect(composed.breakdown.fresh).toBeGreaterThan(0)
    const touchedLessons = new Set(composed.items.map((item) => item.lessonId))
    expect(touchedLessons.size).toBeGreaterThan(1)
  })

  it('reports the book as finished only when nothing is new or due', () => {
    const progress = progressWith(index.answerable, [true, true, true])
    const plan = buildStudyPlan(book.lessons, index, progress, NOW)
    expect(plan.nextLessonId).toBeNull()
    expect(plan.fresh).toBe(0)
    expect(plan.due).toBe(0)
    expect(plan.focusLessonIds.length).toBeGreaterThan(0)
  })
})

describe('localStorage stays small enough', () => {
  it('keeps a fully practised book well under the 5MB quota', () => {
    const outcomes = index.answerable.map((item, position) => ({
      itemId: item.id,
      correct: position % 3 !== 0,
    }))
    const state = applySession(emptyStudyState(), outcomes, NOW)
    expect(Object.keys(state.items)).toHaveLength(index.answerable.length)

    const encoded = JSON.stringify(serialiseStudyState(state))
    const kilobytes = encoded.length / 1024
    // 5MB is the usual per-origin budget; this is the worst realistic case.
    expect(kilobytes, `${kilobytes.toFixed(0)}kB for ${index.answerable.length} items`).toBeLessThan(500)

    // And the compact form must survive a round trip unchanged.
    expect(parseStudyState(JSON.parse(encoded))).toEqual(state)
  })

  it('serialises the whole book quickly enough to do on session end', () => {
    const outcomes = index.answerable.map((item) => ({ itemId: item.id, correct: true }))
    const state = applySession(emptyStudyState(), outcomes, NOW)

    const started = performance.now()
    const encoded = JSON.stringify(serialiseStudyState(state))
    parseStudyState(JSON.parse(encoded))
    const elapsed = performance.now() - started

    expect(elapsed, `took ${elapsed.toFixed(0)}ms`).toBeLessThan(250)
  })
})

describe('reference-only lessons never dead-end', () => {
  it('produces no session for a dictation lesson, so the UI must not offer one', () => {
    const dictationId = syntheticDictationLessonIds(LESSON_COUNT)[0] as number
    const composed = composeSession({
      items: index.answerable,
      progress: {},
      lessonIds: [dictationId],
      modes: MODE_IDS,
      count: 20,
      focus: 'lesson',
      seed: 'dead-end',
      now: NOW,
    })
    expect(composed.items).toHaveLength(0)
    expect(buildQuestions(composed.items, items, 'dead-end').questions).toHaveLength(0)
    // Which is exactly why it is in referenceLessonIds and not quizzable.
    expect(index.referenceLessonIds.has(dictationId)).toBe(true)
  })

  it('leaves a reference lesson out of mastery roll-ups rather than showing 0%', () => {
    const dictationId = syntheticDictationLessonIds(LESSON_COUNT)[0] as number
    const rolled = lessonMasteryAll(index.byLesson, {}, NOW)
    // No items at all, so there is no row to report a percentage for.
    expect(rolled.has(dictationId)).toBe(false)
  })

  it('still lets every other lesson be practised on its own', () => {
    const quizzable = [...index.quizzableLessonIds]
    expect(quizzable.length).toBeGreaterThan(60)
    for (const lessonId of quizzable.slice(0, 20)) {
      const composed = composeSession({
        items: index.answerable,
        progress: {},
        lessonIds: [lessonId],
        modes: MODE_IDS,
        count: 10,
        focus: 'lesson',
        seed: lessonId,
        now: NOW,
      })
      const { questions } = buildQuestions(composed.items, items, lessonId)
      expect(questions.length, `lesson ${lessonId}`).toBeGreaterThan(0)
      for (const question of questions) {
        expect(question.options).toHaveLength(OPTIONS_PER_QUESTION)
      }
    }
  })
})
