import { describe, expect, it } from 'vitest'

import { buildItems } from './items'
import { MODE_IDS } from './modes'
import { createRng } from './rng'
import { grade, newItemProgress } from './scheduler'
import { composeSession, interleave } from './session'
import type { ModeId, ProgressMap, QuizItem } from './types'
import { makeLesson, seedBook } from '../testing/fixtures'

const NOW = Date.parse('2026-03-10T09:00:00Z')
const DAY = 24 * 60 * 60 * 1000

const book = seedBook()
const allItems = buildItems(book.lessons)
const allLessonIds = book.lessons.map((lesson) => lesson.id)

function compose(overrides: Partial<Parameters<typeof composeSession>[0]> = {}) {
  return composeSession({
    items: allItems,
    progress: {},
    lessonIds: allLessonIds,
    modes: MODE_IDS,
    count: 20,
    focus: 'mixed',
    seed: 'session-test',
    now: NOW,
    ...overrides,
  })
}

function correctTimes(itemId: string, times: number, progress: ProgressMap = {}): ProgressMap {
  let state = progress[itemId] ?? newItemProgress(NOW)
  for (let i = 0; i < times; i += 1) state = grade(state, true, NOW)
  return { ...progress, [itemId]: state }
}

describe('composeSession', () => {
  it('respects the requested count, lessons and modes', () => {
    const lessonId = allLessonIds[0]!
    const result = compose({ count: 12, lessonIds: [lessonId], modes: ['vocabArToEn'] })

    expect(result.items).toHaveLength(12)
    for (const item of result.items) {
      expect(item.lessonId).toBe(lessonId)
      expect(item.mode).toBe('vocabArToEn')
    }
  })

  it('returns every eligible item for count "all"', () => {
    const result = compose({ count: 'all', modes: ['qa'] })
    const eligible = allItems.filter((item) => item.mode === 'qa')
    expect(result.items).toHaveLength(eligible.length)
  })

  it('is deterministic for a fixed seed and varies across seeds', () => {
    const ids = (seed: string) => compose({ seed }).items.map((item) => item.id)
    expect(ids('same')).toEqual(ids('same'))
    expect(ids('one')).not.toEqual(ids('two'))
  })

  it('puts missed items first in the next session', () => {
    const target = allItems.find((item) => item.mode === 'qa')!
    const progress: ProgressMap = { [target.id]: grade(newItemProgress(NOW), false, NOW) }

    const result = compose({ progress, count: 10 })
    expect(result.items.map((item) => item.id)).toContain(target.id)
    expect(result.breakdown.weak).toBe(1)
  })

  it('stops offering items that are not due yet', () => {
    // Mark everything as freshly answered correctly: nothing is due today.
    let progress: ProgressMap = {}
    for (const item of allItems) progress = correctTimes(item.id, 3, progress)

    const soon = compose({ progress, count: 10, now: NOW })
    expect(soon.breakdown.weak).toBe(0)
    expect(soon.breakdown.due).toBe(0)
    expect(soon.breakdown.fresh).toBe(0)
    // Only resting filler is left, so the session is still finishable.
    expect(soon.breakdown.resting).toBe(10)

    const later = compose({ progress, count: 10, now: NOW + 30 * DAY })
    expect(later.breakdown.due).toBeGreaterThan(0)
  })

  it('fills a first-ever session with new material, since nothing else exists', () => {
    const result = compose({ count: 20, focus: 'mixed' })
    expect(result.items).toHaveLength(20)
    expect(result.breakdown.fresh).toBe(20)
  })

  it('caps new material at part of the session once there is review work to do', () => {
    // Answer two thirds of the book correctly, so most items are resting.
    let progress: ProgressMap = {}
    allItems.slice(0, Math.floor(allItems.length * 0.66)).forEach((item) => {
      progress = correctTimes(item.id, 1, progress)
    })

    const result = compose({ progress, count: 20, focus: 'mixed' })
    expect(result.items).toHaveLength(20)
    expect(result.breakdown.fresh).toBeLessThanOrEqual(8)
    expect(result.breakdown.fresh).toBeGreaterThan(0)
    expect(result.breakdown.resting).toBeGreaterThan(0)
  })

  it('draws only from weak and due items when focus is "weak"', () => {
    const weakItems = allItems.filter((item) => item.mode === 'sentence').slice(0, 5)
    let progress: ProgressMap = {}
    for (const item of weakItems) {
      progress = { ...progress, [item.id]: grade(newItemProgress(NOW), false, NOW) }
    }

    const result = compose({ progress, focus: 'weak', count: 'all' })
    expect(result.items).toHaveLength(weakItems.length)
    expect(new Set(result.items.map((item) => item.id))).toEqual(new Set(weakItems.map((item) => item.id)))
    expect(result.breakdown.fresh).toBe(0)
    expect(result.breakdown.resting).toBe(0)
  })

  it('returns nothing rather than inventing work when nothing matches', () => {
    expect(compose({ lessonIds: [], count: 'all' }).items).toHaveLength(0)
    expect(compose({ modes: [], count: 'all' }).items).toHaveLength(0)
    expect(compose({ items: [], count: 'all' }).items).toHaveLength(0)
  })
})

describe('recognition before production', () => {
  const lesson = makeLesson({
    id: 1,
    order: 0,
    vocabulary: [
      { en: 'In', ar: 'فِي' },
      { en: 'Pocket', ar: 'جَيْبٌ' },
      { en: 'Roof', ar: 'سَطْحٌ' },
      { en: 'Sky', ar: 'سَمَاءٌ' },
    ],
  })
  const items = buildItems([lesson])
  const bothModes: ModeId[] = ['vocabArToEn', 'vocabEnToAr']

  const composeLocal = (progress: ProgressMap, modes: ModeId[]) =>
    composeSession({
      items,
      progress,
      lessonIds: [1],
      modes,
      count: 'all',
      focus: 'mixed',
      seed: 'gate',
      now: NOW,
    })

  it('holds production back while the word is unknown', () => {
    const result = composeLocal({}, bothModes)
    expect(result.items.every((item) => item.mode === 'vocabArToEn')).toBe(true)
    expect(result.gatedByRecognition).toBe(4)
  })

  it('unlocks production once recognition reaches the known box', () => {
    const recognition = items.find((item) => item.mode === 'vocabArToEn' && item.answer.text === 'In')!
    const production = items.find((item) => item.mode === 'vocabEnToAr' && item.prompt.text === 'In')!

    const result = composeLocal(correctTimes(recognition.id, 2), bothModes)
    expect(result.items.map((item) => item.id)).toContain(production.id)
    expect(result.gatedByRecognition).toBe(3)
  })

  it('does not gate when the student asked for production only', () => {
    const result = composeLocal({}, ['vocabEnToAr'])
    expect(result.items.every((item) => item.mode === 'vocabEnToAr')).toBe(true)
    expect(result.gatedByRecognition).toBe(0)
  })
})

describe('interleave', () => {
  it('avoids consecutive questions from the same mode and lesson', () => {
    const items = buildItems(book.lessons)
    const subset = items.slice(0, 60)
    const ordered = interleave(subset, createRng('interleave'))

    let sameMode = 0
    for (let i = 1; i < ordered.length; i += 1) {
      if (ordered[i]!.mode === ordered[i - 1]!.mode) sameMode += 1
    }
    // Blocked practice would run at nearly 100%; interleaving keeps it low.
    expect(sameMode / ordered.length).toBeLessThan(0.25)
  })

  it('keeps every item exactly once', () => {
    const items = buildItems(book.lessons).slice(0, 25)
    const ordered = interleave(items, createRng('keep'))
    expect(ordered).toHaveLength(items.length)
    expect(new Set(ordered.map((item) => item.id)).size).toBe(items.length)
  })

  it('handles a single item and an empty list', () => {
    const items: QuizItem[] = buildItems(book.lessons).slice(0, 1)
    expect(interleave(items, createRng('one'))).toHaveLength(1)
    expect(interleave([], createRng('none'))).toHaveLength(0)
  })
})
