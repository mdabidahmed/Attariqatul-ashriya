/**
 * Chooses *which* items a session drills, and in what order.
 *
 * Priority runs weak → due → new → resting, so mistakes come back fast and
 * mastered words stay out of the way. The chosen items are then interleaved:
 * consecutive questions deliberately switch mode and lesson, because mixed
 * practice retains better than drilling one block at a time.
 */

import { recognitionIndex } from './items'
import { PRODUCTION_MODE, RECOGNITION_MODE } from './modes'
import { isDue, isKnown, isNew, isWeak, progressFor } from './scheduler'
import type { ModeId, ProgressMap, QuizItem, SessionFocus } from './types'
import { createRng, shuffle, type Rng } from './rng'

export interface ComposeOptions {
  items: readonly QuizItem[]
  progress: ProgressMap
  lessonIds: readonly number[]
  modes: readonly ModeId[]
  count: number | 'all'
  focus: SessionFocus
  seed: number | string
  now: number
}

export interface ComposeResult {
  items: QuizItem[]
  /** Why each slot was picked, for the "what this session covers" line. */
  breakdown: { weak: number; due: number; fresh: number; resting: number }
  /** Production items held back until their recognition twin is known. */
  gatedByRecognition: number
}

/**
 * Production (English → Arabic) is only offered once the same word has been
 * recognised (Arabic → English) to box 2. The gate applies only when both
 * directions are selected: a student who deliberately picks production alone
 * should get it.
 */
function buildGate(
  items: readonly QuizItem[],
  progress: ProgressMap,
  modes: readonly ModeId[],
  now: number,
): (item: QuizItem) => boolean {
  const bothDirections = modes.includes(RECOGNITION_MODE) && modes.includes(PRODUCTION_MODE)
  if (!bothDirections) return () => true

  const recognition = recognitionIndex(items)
  return (item: QuizItem): boolean => {
    if (item.mode !== PRODUCTION_MODE) return true
    const twin = recognition.get(item.conceptId)
    if (!twin) return true
    return isKnown(progressFor(progress, twin.id, now))
  }
}

type Bucket = 'weak' | 'due' | 'fresh' | 'resting'

function bucketOf(item: QuizItem, progress: ProgressMap, now: number): Bucket {
  const state = progressFor(progress, item.id, now)
  if (isWeak(state)) return 'weak'
  if (isNew(state)) return 'fresh'
  if (isDue(state, now)) return 'due'
  return 'resting'
}

/**
 * Orders items so neighbours differ in mode and lesson where possible, while
 * staying deterministic for a given seed.
 */
export function interleave(items: readonly QuizItem[], rng: Rng): QuizItem[] {
  const pool = shuffle(items, rng)
  const out: QuizItem[] = []

  while (pool.length > 0) {
    const previous = out[out.length - 1]
    let index = -1

    if (previous) {
      index = pool.findIndex((item) => item.mode !== previous.mode && item.lessonId !== previous.lessonId)
      if (index === -1) index = pool.findIndex((item) => item.mode !== previous.mode)
      if (index === -1) index = pool.findIndex((item) => item.lessonId !== previous.lessonId)
    }
    if (index === -1) index = 0

    const [picked] = pool.splice(index, 1)
    if (picked) out.push(picked)
  }

  return out
}

export function composeSession(options: ComposeOptions): ComposeResult {
  const { items, progress, lessonIds, modes, count, focus, seed, now } = options
  const rng = createRng(seed)

  const lessonSet = new Set(lessonIds)
  const modeSet = new Set(modes)
  const gate = buildGate(items, progress, modes, now)

  let gatedByRecognition = 0
  const eligible: QuizItem[] = []
  for (const item of items) {
    if (!lessonSet.has(item.lessonId)) continue
    if (!modeSet.has(item.mode)) continue
    if (!gate(item)) {
      gatedByRecognition += 1
      continue
    }
    eligible.push(item)
  }

  const buckets: Record<Bucket, QuizItem[]> = { weak: [], due: [], fresh: [], resting: [] }
  for (const item of eligible) {
    buckets[bucketOf(item, progress, now)].push(item)
  }

  // Within "fresh", words the student has already flipped through in the Learn
  // pass come first — they are no longer cold.
  buckets.fresh = shuffle(buckets.fresh, rng).sort((a, b) => {
    const left = progressFor(progress, a.id, now).introduced ? 0 : 1
    const right = progressFor(progress, b.id, now).introduced ? 0 : 1
    return left - right
  })
  buckets.weak = shuffle(buckets.weak, rng)
  buckets.due = shuffle(buckets.due, rng)
  buckets.resting = shuffle(buckets.resting, rng)

  const limit = count === 'all' ? eligible.length : Math.max(1, count)

  const chosen: QuizItem[] = []
  const taken = new Set<string>()
  const breakdown = { weak: 0, due: 0, fresh: 0, resting: 0 }

  const take = (bucket: Bucket, budget: number): void => {
    let used = 0
    for (const item of buckets[bucket]) {
      if (chosen.length >= limit || used >= budget) return
      if (taken.has(item.id)) continue
      taken.add(item.id)
      chosen.push(item)
      breakdown[bucket] += 1
      used += 1
    }
  }

  if (focus === 'weak') {
    // A pure review session: only what was missed or has come round again.
    take('weak', limit)
    take('due', limit)
    return { items: interleave(chosen, rng), breakdown, gatedByRecognition }
  }

  // How much of a session may be brand-new material. A `lesson` session comes
  // straight off the flashcard pass, where new words are the whole point;
  // `mixed` is the most conservative.
  const freshShare = focus === 'mixed' ? 0.4 : focus === 'next' ? 0.65 : 1
  const freshCap = freshShare >= 1 ? limit : Math.max(4, Math.round(limit * freshShare))

  /*
   * A `next` session also reserves a slice for new material. Without it, a
   * student who fluffed a whole lesson would face a backlog larger than any
   * session and would never reach the next lesson at all: review would crowd
   * out progress indefinitely.
   */
  const freshFloor =
    focus === 'next' ? Math.min(buckets.fresh.length, Math.max(1, Math.round(limit * 0.3))) : 0
  const reviewBudget = limit - freshFloor

  take('weak', reviewBudget)
  take('due', reviewBudget - breakdown.weak)
  take('fresh', freshCap)
  take('resting', limit)
  // Anything still short: reopen the review buckets, then the rest.
  take('weak', limit)
  take('due', limit)
  take('fresh', limit)

  return { items: interleave(chosen, rng), breakdown, gatedByRecognition }
}
