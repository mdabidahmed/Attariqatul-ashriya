import { describe, expect, it } from 'vitest'

import { buildItems } from './items'
import {
  KNOWN_BOX,
  MAX_BOX,
  dayKey,
  daysBetween,
  grade,
  isDue,
  isKnown,
  isNew,
  isWeak,
  lessonMastery,
  markIntroduced,
  mastery,
  newItemProgress,
  poolCounts,
} from './scheduler'
import type { ProgressMap } from './types'
import { makeLesson } from '../testing/fixtures'

const NOW = Date.parse('2026-03-10T09:00:00Z')
const DAY = 24 * 60 * 60 * 1000

describe('grade', () => {
  it('promotes one box per correct answer and pushes the review further out', () => {
    let progress = newItemProgress(NOW)
    expect(progress.box).toBe(0)

    progress = grade(progress, true, NOW)
    expect(progress.box).toBe(1)
    expect(progress.due).toBe(NOW + DAY)
    expect(progress.streak).toBe(1)
    expect(progress.seen).toBe(1)
    expect(progress.correct).toBe(1)

    const first = progress.due
    progress = grade(progress, true, NOW)
    expect(progress.box).toBe(2)
    expect(progress.due).toBeGreaterThan(first)
  })

  it('caps at the top box', () => {
    let progress = newItemProgress(NOW)
    for (let i = 0; i < 12; i += 1) progress = grade(progress, true, NOW)
    expect(progress.box).toBe(MAX_BOX)
    expect(progress.streak).toBe(12)
  })

  it('sends a wrong answer straight back to box 0, due immediately', () => {
    let progress = newItemProgress(NOW)
    for (let i = 0; i < 4; i += 1) progress = grade(progress, true, NOW)
    expect(progress.box).toBe(4)

    progress = grade(progress, false, NOW)
    expect(progress.box).toBe(0)
    expect(progress.due).toBe(NOW)
    expect(progress.streak).toBe(0)
    expect(isWeak(progress)).toBe(true)
    expect(isDue(progress, NOW)).toBe(true)
  })

  it('keeps a missed item coming back until it is right', () => {
    let progress = newItemProgress(NOW)
    for (let i = 0; i < 3; i += 1) {
      progress = grade(progress, false, NOW + i)
      expect(isDue(progress, NOW + i)).toBe(true)
      expect(isWeak(progress)).toBe(true)
    }
    progress = grade(progress, true, NOW)
    expect(isWeak(progress)).toBe(false)
  })

  it('counts attempts even when the box does not move', () => {
    const progress = grade(grade(newItemProgress(NOW), false, NOW), false, NOW)
    expect(progress.seen).toBe(2)
    expect(progress.correct).toBe(0)
  })
})

describe('state predicates', () => {
  it('separates new, weak, due and resting items', () => {
    const fresh = newItemProgress(NOW)
    expect(isNew(fresh)).toBe(true)
    expect(isWeak(fresh)).toBe(false)
    expect(isDue(fresh, NOW)).toBe(false)

    const answered = grade(fresh, true, NOW)
    expect(isNew(answered)).toBe(false)
    expect(isDue(answered, NOW)).toBe(false)
    expect(isDue(answered, NOW + 2 * DAY)).toBe(true)
  })

  it('treats box 2 as known, which is what unlocks production', () => {
    let progress = newItemProgress(NOW)
    expect(isKnown(progress)).toBe(false)
    progress = grade(progress, true, NOW)
    expect(isKnown(progress)).toBe(false)
    progress = grade(progress, true, NOW)
    expect(progress.box).toBe(KNOWN_BOX)
    expect(isKnown(progress)).toBe(true)
  })

  it('reports mastery between 0 and 1', () => {
    expect(mastery(newItemProgress(NOW))).toBe(0)
    let progress = newItemProgress(NOW)
    for (let i = 0; i < MAX_BOX; i += 1) progress = grade(progress, true, NOW)
    expect(mastery(progress)).toBe(1)
  })
})

describe('markIntroduced', () => {
  it('records the first pre-exposure only', () => {
    const first = markIntroduced(newItemProgress(NOW), NOW)
    expect(first.introduced).toBe(NOW)
    expect(markIntroduced(first, NOW + DAY).introduced).toBe(NOW)
  })
})

describe('lesson roll-ups', () => {
  const items = buildItems([
    makeLesson({
      id: 9,
      order: 0,
      vocabulary: [
        { en: 'In', ar: 'فِي' },
        { en: 'Pocket', ar: 'جَيْبٌ' },
        { en: 'Roof', ar: 'سَطْحٌ' },
      ],
    }),
  ])

  it('starts at zero mastery and counts everything as fresh', () => {
    const empty: ProgressMap = {}
    const roll = lessonMastery(items, empty, 9, NOW)
    expect(roll.total).toBe(items.length)
    expect(roll.fraction).toBe(0)
    expect(roll.started).toBe(0)
    expect(poolCounts(items, empty, NOW).fresh).toBe(items.length)
  })

  it('tracks weak, due and mastered counts as answers come in', () => {
    const first = items[0]!
    const second = items[1]!
    let progress: ProgressMap = {}

    progress = { ...progress, [first.id]: grade(newItemProgress(NOW), false, NOW) }
    let mastered = newItemProgress(NOW)
    for (let i = 0; i < 4; i += 1) mastered = grade(mastered, true, NOW)
    progress = { ...progress, [second.id]: mastered }

    const roll = lessonMastery(items, progress, 9, NOW)
    expect(roll.started).toBe(2)
    expect(roll.weak).toBe(1)
    expect(roll.mastered).toBe(1)
    expect(roll.fraction).toBeGreaterThan(0)
    expect(roll.fraction).toBeLessThan(1)

    const counts = poolCounts(items, progress, NOW)
    expect(counts.weak).toBe(1)
    expect(counts.resting).toBe(1)
    expect(counts.fresh).toBe(items.length - 2)
  })
})

describe('day helpers', () => {
  it('formats a local calendar day', () => {
    expect(dayKey(Date.parse('2026-03-10T12:00:00'))).toBe('2026-03-10')
    expect(dayKey(Date.parse('2026-01-02T00:30:00'))).toBe('2026-01-02')
  })

  it('measures whole days between keys', () => {
    expect(daysBetween('2026-03-09', '2026-03-10')).toBe(1)
    expect(daysBetween('2026-03-10', '2026-03-10')).toBe(0)
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1)
    expect(daysBetween('nonsense', '2026-03-10')).toBeNull()
  })
})
