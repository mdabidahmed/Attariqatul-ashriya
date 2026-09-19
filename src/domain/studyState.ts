/**
 * The persisted study record: per-item schedules, a daily streak and lifetime
 * totals. Pure functions only — the React layer just stores what comes back.
 */

import { dayKey, daysBetween, grade, markIntroduced, newItemProgress, progressFor } from './scheduler'
import type { ItemProgress, LeitnerBox, ProgressMap, StreakState, StudyState } from './types'

/**
 * Version 2 stores each item as a compact tuple with second-resolution
 * timestamps instead of an object with millisecond ones. At 75 lessons the
 * bank is several thousand items, and the object form cost roughly twice as
 * much localStorage for no benefit. Version 1 records are migrated, not
 * discarded.
 */
export const STUDY_STATE_VERSION = 2

/** Keeps localStorage bounded; the streak only needs recent history. */
const MAX_DAYS_KEPT = 120

export function emptyStudyState(): StudyState {
  return {
    items: {},
    streak: { lastDay: null, current: 0, best: 0, days: {} },
    lifetime: { seen: 0, correct: 0, sessions: 0 },
  }
}

// ------------------------------------------------------------- validation

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function int(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : fallback
}

const SECOND = 1000

/** `[box, dueSec, seen, correct, streak, lastSeenSec, introducedSec]` */
type ItemTuple = number[]

const toSeconds = (ms: number): number => Math.round(ms / SECOND)

function encodeItemProgress(progress: ItemProgress): ItemTuple {
  const tuple: ItemTuple = [
    progress.box,
    toSeconds(progress.due),
    progress.seen,
    progress.correct,
    progress.streak,
    toSeconds(progress.lastSeen),
    progress.introduced === null ? 0 : toSeconds(progress.introduced),
  ]
  // Trailing zeros carry no information, and most records have several.
  while (tuple.length > 1 && tuple[tuple.length - 1] === 0) tuple.pop()
  return tuple
}

function decodeItemTuple(value: unknown): ItemProgress | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const at = (position: number): number => int(value[position])
  const seen = at(2)
  const introduced = at(6)
  return {
    box: Math.min(5, at(0)) as LeitnerBox,
    due: at(1) * SECOND,
    seen,
    correct: Math.min(seen, at(3)),
    streak: at(4),
    lastSeen: at(5) * SECOND,
    introduced: introduced > 0 ? introduced * SECOND : null,
  }
}

/** Reads the version 1 object form, so existing progress survives the upgrade. */
function decodeLegacyItem(value: unknown): ItemProgress | null {
  if (!isRecord(value)) return null
  const seen = int(value.seen)
  return {
    box: Math.min(5, int(value.box)) as LeitnerBox,
    due: int(value.due),
    seen,
    correct: Math.min(seen, int(value.correct)),
    streak: int(value.streak),
    lastSeen: int(value.lastSeen),
    introduced:
      typeof value.introduced === 'number' && Number.isFinite(value.introduced) ? value.introduced : null,
  }
}

function readStreak(value: unknown): StreakState {
  const empty = emptyStudyState().streak
  if (!isRecord(value)) return empty

  const days: Record<string, { seen: number; correct: number }> = {}
  if (isRecord(value.days)) {
    for (const [key, entry] of Object.entries(value.days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !isRecord(entry)) continue
      days[key] = { seen: int(entry.seen), correct: int(entry.correct) }
    }
  }

  const lastDay =
    typeof value.lastDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.lastDay) ? value.lastDay : null
  const current = int(value.current)
  return { lastDay, current, best: Math.max(current, int(value.best)), days }
}

/**
 * Rebuilds a study record from untrusted JSON, dropping anything unusable.
 * Never throws: a corrupt record degrades to a fresh one.
 */
export function parseStudyState(value: unknown): StudyState {
  if (!isRecord(value)) return emptyStudyState()
  const version = int(value.version)
  // Version 1 used objects and millisecond timestamps; anything else is from a
  // future build and is not worth guessing at.
  const decodeItem =
    version === STUDY_STATE_VERSION ? decodeItemTuple : version === 1 ? decodeLegacyItem : null
  if (!decodeItem) return emptyStudyState()

  const items: ProgressMap = {}
  if (isRecord(value.items)) {
    for (const [itemId, entry] of Object.entries(value.items)) {
      const parsed = decodeItem(entry)
      if (parsed && itemId.length > 0) items[itemId] = parsed
    }
  }

  const lifetime = isRecord(value.lifetime) ? value.lifetime : {}
  const seen = int(lifetime.seen)
  return {
    items,
    streak: readStreak(value.streak),
    lifetime: { seen, correct: Math.min(seen, int(lifetime.correct)), sessions: int(lifetime.sessions) },
  }
}

/** The JSON actually written to localStorage. */
export function serialiseStudyState(state: StudyState): unknown {
  const items: Record<string, ItemTuple> = {}
  for (const [itemId, progress] of Object.entries(state.items)) {
    items[itemId] = encodeItemProgress(progress)
  }
  return { version: STUDY_STATE_VERSION, items, streak: state.streak, lifetime: state.lifetime }
}

// ---------------------------------------------------------------- updates

function pruneDays(
  days: Record<string, { seen: number; correct: number }>,
): Record<string, { seen: number; correct: number }> {
  const keys = Object.keys(days).sort()
  if (keys.length <= MAX_DAYS_KEPT) return days
  const keep = keys.slice(keys.length - MAX_DAYS_KEPT)
  const out: Record<string, { seen: number; correct: number }> = {}
  for (const key of keep) {
    const entry = days[key]
    if (entry) out[key] = entry
  }
  return out
}

/**
 * Advances the streak for a session finished at `now`. Practising twice in one
 * day does not double-count; a one-day gap continues the run; a longer gap
 * starts a new one.
 */
export function bumpStreak(streak: StreakState, seen: number, correct: number, now: number): StreakState {
  const today = dayKey(now)
  const previous = streak.days[today] ?? { seen: 0, correct: 0 }
  const days = pruneDays({
    ...streak.days,
    [today]: { seen: previous.seen + seen, correct: previous.correct + correct },
  })

  if (streak.lastDay === today) {
    return { ...streak, days }
  }

  const gap = streak.lastDay ? daysBetween(streak.lastDay, today) : null
  const current = gap === 1 ? streak.current + 1 : 1
  return { lastDay: today, current, best: Math.max(streak.best, current), days }
}

export interface SessionOutcome {
  itemId: string
  correct: boolean
}

/** Folds a finished session into the study record. */
export function applySession(
  state: StudyState,
  outcomes: readonly SessionOutcome[],
  now: number,
): StudyState {
  if (outcomes.length === 0) return state

  const items: ProgressMap = { ...state.items }
  let correct = 0
  for (const outcome of outcomes) {
    items[outcome.itemId] = grade(progressFor(items, outcome.itemId, now), outcome.correct, now)
    if (outcome.correct) correct += 1
  }

  return {
    items,
    streak: bumpStreak(state.streak, outcomes.length, correct, now),
    lifetime: {
      seen: state.lifetime.seen + outcomes.length,
      correct: state.lifetime.correct + correct,
      sessions: state.lifetime.sessions + 1,
    },
  }
}

/** Records that the student has seen these words in the flashcard Learn pass. */
export function applyIntroduced(state: StudyState, itemIds: readonly string[], now: number): StudyState {
  if (itemIds.length === 0) return state
  const items: ProgressMap = { ...state.items }
  for (const itemId of itemIds) {
    items[itemId] = markIntroduced(items[itemId] ?? newItemProgress(now), now)
  }
  return { ...state, items }
}

/** True when the student has already practised today. */
export function practisedToday(streak: StreakState, now: number): boolean {
  return streak.lastDay === dayKey(now)
}
