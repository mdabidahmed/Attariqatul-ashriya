/**
 * Precomputed views over the whole item bank.
 *
 * With 75 lessons the bank is ~6,500 items, so anything the UI asks per render
 * has to be O(1) or O(lesson). In particular "how many questions can these
 * lessons produce?" must not run the real distractor search, which is
 * O(items x pool); it is answered analytically here instead.
 */

import type { Lesson, ModeId, QuizItem } from './types'

function poolKey(mode: ModeId, answerLang: string): string {
  return `${mode}|${answerLang}`
}

/**
 * Per-pool bookkeeping that makes answerability an O(1) lookup.
 *
 * An item can become a question when its pool offers at least three other
 * distinct answers. Two things disqualify a candidate answer: it matches the
 * item's own answer, or it only ever appears opposite the item's own prompt
 * (synonyms and alternative glosses, which must never be each other's wrong
 * answers).
 */
interface PoolIndex {
  items: QuizItem[]
  distinctAnswers: number
  /** answerKey -> the prompt keys it appears with. */
  promptsByAnswer: Map<string, Set<string>>
  /** promptKey -> how many answer keys appear only with that prompt. */
  exclusiveByPrompt: Map<string, number>
}

function buildPoolIndex(items: QuizItem[]): PoolIndex {
  const promptsByAnswer = new Map<string, Set<string>>()
  for (const item of items) {
    const prompts = promptsByAnswer.get(item.answerKey)
    if (prompts) prompts.add(item.promptKey)
    else promptsByAnswer.set(item.answerKey, new Set([item.promptKey]))
  }

  const exclusiveByPrompt = new Map<string, number>()
  for (const prompts of promptsByAnswer.values()) {
    if (prompts.size !== 1) continue
    const only = [...prompts][0] as string
    exclusiveByPrompt.set(only, (exclusiveByPrompt.get(only) ?? 0) + 1)
  }

  return { items, distinctAnswers: promptsByAnswer.size, promptsByAnswer, exclusiveByPrompt }
}

/** How many distinct answers this pool can offer as distractors for `item`. */
function usableDistractors(pool: PoolIndex, item: QuizItem): number {
  let blocked = pool.exclusiveByPrompt.get(item.promptKey) ?? 0
  const ownPrompts = pool.promptsByAnswer.get(item.answerKey)
  // The item's own answer is already excluded by the -1 below; do not also
  // count it among the answers blocked by its prompt.
  if (ownPrompts && ownPrompts.size === 1 && ownPrompts.has(item.promptKey)) blocked -= 1
  return pool.distinctAnswers - 1 - blocked
}

export const MIN_DISTRACTORS = 3

export interface BookIndex {
  items: QuizItem[]
  /** Items that can actually become a four-option question. */
  answerable: QuizItem[]
  byLesson: Map<number, QuizItem[]>
  answerableByLesson: Map<number, QuizItem[]>
  /** `lessonId|mode` -> answerable count, for the picker's per-mode figures. */
  answerableByLessonMode: Map<string, number>
  /** Lessons that can produce at least one question. */
  quizzableLessonIds: Set<number>
  /** Lessons with content but nothing quizzable: dictation and the like. */
  referenceLessonIds: Set<number>
}

export function buildBookIndex(lessons: readonly Lesson[], items: QuizItem[]): BookIndex {
  const pools = new Map<string, QuizItem[]>()
  for (const item of items) {
    const key = poolKey(item.mode, item.answer.lang)
    const bucket = pools.get(key)
    if (bucket) bucket.push(item)
    else pools.set(key, [item])
  }

  const poolIndexes = new Map<string, PoolIndex>()
  for (const [key, bucket] of pools) poolIndexes.set(key, buildPoolIndex(bucket))

  const answerable: QuizItem[] = []
  const byLesson = new Map<number, QuizItem[]>()
  const answerableByLesson = new Map<number, QuizItem[]>()
  const answerableByLessonMode = new Map<string, number>()

  for (const item of items) {
    const all = byLesson.get(item.lessonId)
    if (all) all.push(item)
    else byLesson.set(item.lessonId, [item])

    const pool = poolIndexes.get(poolKey(item.mode, item.answer.lang))
    if (!pool || usableDistractors(pool, item) < MIN_DISTRACTORS) continue

    answerable.push(item)
    const ok = answerableByLesson.get(item.lessonId)
    if (ok) ok.push(item)
    else answerableByLesson.set(item.lessonId, [item])

    const modeKey = `${item.lessonId}|${item.mode}`
    answerableByLessonMode.set(modeKey, (answerableByLessonMode.get(modeKey) ?? 0) + 1)
  }

  const quizzableLessonIds = new Set(answerableByLesson.keys())
  const referenceLessonIds = new Set<number>()
  for (const lesson of lessons) {
    if (!quizzableLessonIds.has(lesson.id)) referenceLessonIds.add(lesson.id)
  }

  return {
    items,
    answerable,
    byLesson,
    answerableByLesson,
    answerableByLessonMode,
    quizzableLessonIds,
    referenceLessonIds,
  }
}

/** Answerable questions the given lessons and modes can produce. */
export function countAvailable(
  index: BookIndex,
  lessonIds: readonly number[],
  modes: readonly ModeId[],
): number {
  let total = 0
  for (const lessonId of lessonIds) {
    for (const mode of modes) {
      total += index.answerableByLessonMode.get(`${lessonId}|${mode}`) ?? 0
    }
  }
  return total
}

/** Per-mode answerable counts for a lesson selection. */
export function countByMode(
  index: BookIndex,
  lessonIds: readonly number[],
  modes: readonly ModeId[],
): Partial<Record<ModeId, number>> {
  const counts: Partial<Record<ModeId, number>> = {}
  for (const mode of modes) {
    let total = 0
    for (const lessonId of lessonIds) {
      total += index.answerableByLessonMode.get(`${lessonId}|${mode}`) ?? 0
    }
    counts[mode] = total
  }
  return counts
}
