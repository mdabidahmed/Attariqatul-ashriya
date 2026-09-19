import { describe, expect, it } from 'vitest'

import { isWeak, progressFor } from './scheduler'
import {
  STUDY_STATE_VERSION,
  applyIntroduced,
  applySession,
  bumpStreak,
  emptyStudyState,
  parseStudyState,
  practisedToday,
  serialiseStudyState,
} from './studyState'

const DAY = 24 * 60 * 60 * 1000
const MONDAY = Date.parse('2026-03-09T10:00:00')
const TUESDAY = MONDAY + DAY
const WEDNESDAY = MONDAY + 2 * DAY
const FRIDAY = MONDAY + 4 * DAY

describe('applySession', () => {
  it('schedules each answered item and updates lifetime totals', () => {
    const state = applySession(
      emptyStudyState(),
      [
        { itemId: 'a', correct: true },
        { itemId: 'b', correct: false },
        { itemId: 'c', correct: true },
      ],
      MONDAY,
    )

    expect(state.lifetime).toEqual({ seen: 3, correct: 2, sessions: 1 })
    expect(progressFor(state.items, 'a', MONDAY).box).toBe(1)
    expect(progressFor(state.items, 'b', MONDAY).box).toBe(0)
    expect(isWeak(progressFor(state.items, 'b', MONDAY))).toBe(true)
  })

  it('accumulates across sessions without losing earlier progress', () => {
    let state = applySession(emptyStudyState(), [{ itemId: 'a', correct: true }], MONDAY)
    state = applySession(state, [{ itemId: 'a', correct: true }], TUESDAY)

    expect(progressFor(state.items, 'a', TUESDAY).box).toBe(2)
    expect(state.lifetime.sessions).toBe(2)
    expect(state.lifetime.seen).toBe(2)
  })

  it('ignores an empty session', () => {
    const before = emptyStudyState()
    expect(applySession(before, [], MONDAY)).toBe(before)
  })
})

describe('bumpStreak', () => {
  it('starts at one on the first day', () => {
    const streak = bumpStreak(emptyStudyState().streak, 10, 8, MONDAY)
    expect(streak.current).toBe(1)
    expect(streak.best).toBe(1)
    expect(streak.lastDay).toBe('2026-03-09')
    expect(streak.days['2026-03-09']).toEqual({ seen: 10, correct: 8 })
  })

  it('does not double-count two sessions in the same day', () => {
    let streak = bumpStreak(emptyStudyState().streak, 10, 8, MONDAY)
    streak = bumpStreak(streak, 5, 5, MONDAY + 3600_000)

    expect(streak.current).toBe(1)
    expect(streak.days['2026-03-09']).toEqual({ seen: 15, correct: 13 })
  })

  it('extends across consecutive days', () => {
    let streak = bumpStreak(emptyStudyState().streak, 1, 1, MONDAY)
    streak = bumpStreak(streak, 1, 1, TUESDAY)
    streak = bumpStreak(streak, 1, 1, WEDNESDAY)

    expect(streak.current).toBe(3)
    expect(streak.best).toBe(3)
  })

  it('restarts after a missed day but remembers the best run', () => {
    let streak = bumpStreak(emptyStudyState().streak, 1, 1, MONDAY)
    streak = bumpStreak(streak, 1, 1, TUESDAY)
    streak = bumpStreak(streak, 1, 1, FRIDAY)

    expect(streak.current).toBe(1)
    expect(streak.best).toBe(2)
  })
})

describe('practisedToday', () => {
  it('is true only on the recorded day', () => {
    const streak = bumpStreak(emptyStudyState().streak, 1, 1, MONDAY)
    expect(practisedToday(streak, MONDAY)).toBe(true)
    expect(practisedToday(streak, TUESDAY)).toBe(false)
  })
})

describe('applyIntroduced', () => {
  it('marks new words as pre-exposed without claiming they are known', () => {
    const state = applyIntroduced(emptyStudyState(), ['a', 'b'], MONDAY)
    expect(progressFor(state.items, 'a', MONDAY).introduced).toBe(MONDAY)
    expect(progressFor(state.items, 'a', MONDAY).seen).toBe(0)
    expect(progressFor(state.items, 'a', MONDAY).box).toBe(0)
  })

  it('keeps the first exposure time and ignores an empty list', () => {
    const first = applyIntroduced(emptyStudyState(), ['a'], MONDAY)
    expect(applyIntroduced(first, ['a'], TUESDAY).items['a']?.introduced).toBe(MONDAY)
    expect(applyIntroduced(first, [], TUESDAY)).toBe(first)
  })
})

describe('parseStudyState', () => {
  it('round-trips a real record', () => {
    const state = applySession(emptyStudyState(), [{ itemId: 'a', correct: true }], MONDAY)
    const parsed = parseStudyState(JSON.parse(JSON.stringify(serialiseStudyState(state))))
    expect(parsed).toEqual(state)
  })

  it('falls back to empty on junk, wrong shapes and old versions', () => {
    const empty = emptyStudyState()
    expect(parseStudyState(null)).toEqual(empty)
    expect(parseStudyState('nonsense')).toEqual(empty)
    expect(parseStudyState([])).toEqual(empty)
    expect(parseStudyState({})).toEqual(empty)
    expect(parseStudyState({ version: 99, items: { a: [3] } })).toEqual(empty)
  })

  it('repairs individual fields instead of discarding the whole record', () => {
    const parsed = parseStudyState({
      version: STUDY_STATE_VERSION,
      items: {
        // [box, dueSec, seen, correct, streak, lastSeenSec, introducedSec]
        good: [3, 10, 5, 4, 2, 9],
        clamped: [99, 0, 2, 40],
        negative: [-4, -1, -1, -1],
        truncated: [2],
        broken: 'not an array',
        empty: [],
      },
      streak: {
        lastDay: 'not-a-day',
        current: 3,
        best: 1,
        days: { bad: {}, '2026-03-09': { seen: 4, correct: 3 } },
      },
      lifetime: { seen: 10, correct: 99, sessions: 2 },
    })

    expect(parsed.items.good?.box).toBe(3)
    expect(parsed.items.good?.due).toBe(10_000)
    expect(parsed.items.good?.introduced).toBeNull()
    expect(parsed.items.clamped?.box).toBe(5)
    expect(parsed.items.clamped?.correct).toBe(2)
    expect(parsed.items.negative?.box).toBe(0)
    expect(parsed.items.truncated?.box).toBe(2)
    expect(parsed.items.truncated?.seen).toBe(0)
    expect(parsed.items.broken).toBeUndefined()
    expect(parsed.items.empty).toBeUndefined()
    expect(parsed.streak.lastDay).toBeNull()
    expect(parsed.streak.best).toBe(3)
    expect(parsed.streak.days['bad']).toBeUndefined()
    expect(parsed.streak.days['2026-03-09']).toEqual({ seen: 4, correct: 3 })
    // Lifetime correct can never exceed lifetime seen.
    expect(parsed.lifetime.correct).toBe(10)
  })

  it('migrates a version 1 record rather than throwing the progress away', () => {
    const parsed = parseStudyState({
      version: 1,
      items: {
        kept: {
          box: 4,
          due: 1_800_000_000_000,
          seen: 9,
          correct: 7,
          streak: 3,
          lastSeen: 1_700_000_000_000,
          introduced: null,
        },
        seenOnly: {
          box: 0,
          due: 0,
          seen: 0,
          correct: 0,
          streak: 0,
          lastSeen: 0,
          introduced: 1_700_000_000_000,
        },
      },
      streak: {
        lastDay: '2026-03-09',
        current: 4,
        best: 6,
        days: { '2026-03-09': { seen: 20, correct: 15 } },
      },
      lifetime: { seen: 200, correct: 150, sessions: 11 },
    })

    expect(parsed.items.kept?.box).toBe(4)
    expect(parsed.items.kept?.due).toBe(1_800_000_000_000)
    expect(parsed.items.kept?.correct).toBe(7)
    expect(parsed.items.seenOnly?.introduced).toBe(1_700_000_000_000)
    expect(parsed.streak.current).toBe(4)
    expect(parsed.lifetime).toEqual({ seen: 200, correct: 150, sessions: 11 })
  })
})

describe('serialiseStudyState', () => {
  it('stores each item as a compact tuple with trailing zeros trimmed', () => {
    const state = applySession(emptyStudyState(), [{ itemId: 'a', correct: true }], MONDAY)
    const encoded = serialiseStudyState(state) as { version: number; items: Record<string, number[]> }

    expect(encoded.version).toBe(2)
    const tuple = encoded.items.a
    expect(Array.isArray(tuple)).toBe(true)
    // box, due, seen, correct, streak, lastSeen; introduced is null so dropped.
    expect(tuple).toHaveLength(6)
    // Seconds rather than milliseconds: three fewer digits per timestamp.
    expect(tuple?.[1]).toBe(Math.round((state.items.a?.due ?? 0) / 1000))
  })

  it('is markedly smaller than the version 1 object form', () => {
    const outcomes = Array.from({ length: 500 }, (_, i) => ({ itemId: `item-${i}`, correct: i % 2 === 0 }))
    const state = applySession(emptyStudyState(), outcomes, MONDAY)

    const compact = JSON.stringify(serialiseStudyState(state)).length
    const legacy = JSON.stringify({ version: 1, ...state }).length
    expect(compact).toBeLessThan(legacy * 0.6)
  })
})
