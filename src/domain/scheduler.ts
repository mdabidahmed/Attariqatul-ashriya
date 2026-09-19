/**
 * Leitner-box spaced repetition.
 *
 * A wrong answer drops an item straight back to box 0, where it is due
 * immediately and will keep coming back until it is answered right. Each
 * correct answer promotes it one box and pushes the next review further out,
 * so words the student knows stop consuming session slots.
 */

import type { ItemProgress, LeitnerBox, ProgressMap, QuizItem } from './types'

const DAY_MS = 24 * 60 * 60 * 1000

/** Days until the next review for each box. Box 0 is due immediately. */
const INTERVAL_DAYS: readonly number[] = [0, 1, 3, 7, 16, 35]

export const MAX_BOX: LeitnerBox = 5

/** An item is treated as "known" from box 2 — enough to unlock production. */
export const KNOWN_BOX: LeitnerBox = 2

export function newItemProgress(now: number): ItemProgress {
  return { box: 0, due: now, seen: 0, correct: 0, streak: 0, lastSeen: 0, introduced: null }
}

export function progressFor(map: ProgressMap, itemId: string, now: number): ItemProgress {
  return map[itemId] ?? newItemProgress(now)
}

function clampBox(value: number): LeitnerBox {
  if (value < 0) return 0
  if (value > MAX_BOX) return MAX_BOX
  return value as LeitnerBox
}

function intervalFor(box: LeitnerBox): number {
  return (INTERVAL_DAYS[box] ?? 0) * DAY_MS
}

/** Applies one answer to an item's schedule. Pure — returns a new record. */
export function grade(current: ItemProgress, correct: boolean, now: number): ItemProgress {
  const box = correct ? clampBox(current.box + 1) : 0
  return {
    box,
    // Box 0 is due now so a missed word reappears within the same session.
    due: now + intervalFor(box),
    seen: current.seen + 1,
    correct: current.correct + (correct ? 1 : 0),
    streak: correct ? current.streak + 1 : 0,
    lastSeen: now,
    introduced: current.introduced,
  }
}

/** Marks an item as pre-exposed by the flashcard Learn pass. */
export function markIntroduced(current: ItemProgress, now: number): ItemProgress {
  return { ...current, introduced: current.introduced ?? now }
}

export function isKnown(progress: ItemProgress): boolean {
  return progress.box >= KNOWN_BOX
}

export function isNew(progress: ItemProgress): boolean {
  return progress.seen === 0
}

/** Seen before but currently back in box 0: the student got it wrong. */
export function isWeak(progress: ItemProgress): boolean {
  return progress.seen > 0 && progress.box === 0
}

export function isDue(progress: ItemProgress, now: number): boolean {
  return progress.seen > 0 && progress.due <= now
}

/** 0 for unseen, 1 for fully mastered. Used by the per-lesson meters. */
export function mastery(progress: ItemProgress): number {
  return progress.box / MAX_BOX
}

export interface LessonMastery {
  lessonId: number
  /** Mean mastery over every item in the lesson, counting unseen as 0. */
  fraction: number
  total: number
  started: number
  mastered: number
  weak: number
  due: number
}

export function lessonMastery(
  items: readonly QuizItem[],
  map: ProgressMap,
  lessonId: number,
  now: number,
): LessonMastery {
  const lessonItems = items.filter((item) => item.lessonId === lessonId)
  let sum = 0
  let started = 0
  let mastered = 0
  let weak = 0
  let due = 0

  for (const item of lessonItems) {
    const progress = progressFor(map, item.id, now)
    sum += mastery(progress)
    if (progress.seen > 0) started += 1
    if (progress.box >= 4) mastered += 1
    if (isWeak(progress)) weak += 1
    if (isDue(progress, now)) due += 1
  }

  return {
    lessonId,
    fraction: lessonItems.length > 0 ? sum / lessonItems.length : 0,
    total: lessonItems.length,
    started,
    mastered,
    weak,
    due,
  }
}

/**
 * Rolls up every lesson in one pass over the bank.
 *
 * The per-lesson variant above filters the whole item list, which is fine for
 * one lesson but becomes O(lessons x items) across 75 of them.
 */
export function lessonMasteryAll(
  byLesson: ReadonlyMap<number, QuizItem[]>,
  map: ProgressMap,
  now: number,
): Map<number, LessonMastery> {
  const out = new Map<number, LessonMastery>()

  for (const [lessonId, lessonItems] of byLesson) {
    let sum = 0
    let started = 0
    let mastered = 0
    let weak = 0
    let due = 0

    for (const item of lessonItems) {
      const progress = progressFor(map, item.id, now)
      sum += mastery(progress)
      if (progress.seen > 0) started += 1
      if (progress.box >= 4) mastered += 1
      if (isWeak(progress)) weak += 1
      if (isDue(progress, now)) due += 1
    }

    out.set(lessonId, {
      lessonId,
      fraction: lessonItems.length > 0 ? sum / lessonItems.length : 0,
      total: lessonItems.length,
      started,
      mastered,
      weak,
      due,
    })
  }

  return out
}

export interface PoolCounts {
  weak: number
  due: number
  fresh: number
  resting: number
}

/** How the selectable items break down, for the start-screen buttons. */
export function poolCounts(items: readonly QuizItem[], map: ProgressMap, now: number): PoolCounts {
  const counts: PoolCounts = { weak: 0, due: 0, fresh: 0, resting: 0 }
  for (const item of items) {
    const progress = progressFor(map, item.id, now)
    if (isWeak(progress)) counts.weak += 1
    else if (isNew(progress)) counts.fresh += 1
    else if (isDue(progress, now)) counts.due += 1
    else counts.resting += 1
  }
  return counts
}

/** Local calendar day key, `YYYY-MM-DD`. */
export function dayKey(timestamp: number): string {
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Days between two day keys, or null when either is unparseable. */
export function daysBetween(fromKey: string, toKey: string): number | null {
  const from = Date.parse(`${fromKey}T00:00:00`)
  const to = Date.parse(`${toKey}T00:00:00`)
  if (Number.isNaN(from) || Number.isNaN(to)) return null
  return Math.round((to - from) / DAY_MS)
}
