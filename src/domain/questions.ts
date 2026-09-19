/**
 * Turns chosen items into four-option questions.
 *
 * Distractors come from the same mode and the same answer language, preferring
 * the same lesson, then nearby lessons, then the whole book, so the wrong
 * options stay plausible. A question is skipped rather than padded with junk
 * when fewer than three valid distractors exist.
 */

import { comparableLength } from './arabic'
import { LONG_ANSWER_MODES } from './modes'
import { createRng, shuffle, type Rng } from './rng'
import type { ModeId, Question, QuestionOption, QuizItem } from './types'

export const OPTIONS_PER_QUESTION = 4
export const DISTRACTORS_PER_QUESTION = OPTIONS_PER_QUESTION - 1

/** Lesson-order distances tried in turn when looking for distractors. */
const DISTRACTOR_TIERS: readonly number[] = [0, 2, 5, Number.POSITIVE_INFINITY]

function poolKey(mode: ModeId, answerLang: string): string {
  return `${mode}|${answerLang}`
}

/** Groups every item in the book into `mode|answerLang` distractor pools. */
export function buildPools(items: readonly QuizItem[]): Map<string, QuizItem[]> {
  const pools = new Map<string, QuizItem[]>()
  for (const item of items) {
    const key = poolKey(item.mode, item.answer.lang)
    const bucket = pools.get(key)
    if (bucket) bucket.push(item)
    else pools.set(key, [item])
  }
  return pools
}

/**
 * Orders candidates so the most plausible distractors come first: random for
 * single words, closest-in-length first for sentences and Q&A. The closest
 * candidates are shuffled among themselves, so one item does not always draw
 * exactly the same three wrong options.
 */
function rankCandidates(candidates: QuizItem[], item: QuizItem, rng: Rng, needed: number): QuizItem[] {
  const randomised = shuffle(candidates, rng)
  if (!LONG_ANSWER_MODES.has(item.mode)) return randomised

  const target = comparableLength(item.answer.text, item.answer.lang)
  const byLength = randomised
    .map((candidate) => ({
      candidate,
      distance: Math.abs(comparableLength(candidate.answer.text, candidate.answer.lang) - target),
    }))
    // Array.prototype.sort is stable, so equal distances keep the random order.
    .sort((a, b) => a.distance - b.distance)
    .map((scored) => scored.candidate)

  const shortlistSize = Math.max(needed * 3, 6)
  return [...shuffle(byLength.slice(0, shortlistSize), rng), ...byLength.slice(shortlistSize)]
}

/**
 * @returns exactly `needed` distractors, or null when the pool cannot supply
 * enough distinct answers.
 */
export function pickDistractors(
  item: QuizItem,
  pool: readonly QuizItem[],
  rng: Rng,
  needed: number = DISTRACTORS_PER_QUESTION,
): QuizItem[] | null {
  const used = new Set<string>([item.answerKey])
  const chosen: QuizItem[] = []

  for (const maxDistance of DISTRACTOR_TIERS) {
    if (chosen.length >= needed) break

    const candidates = pool.filter(
      (candidate) =>
        candidate.id !== item.id &&
        !used.has(candidate.answerKey) &&
        // Two entries sharing a prompt are alternative answers to the same
        // question (synonyms, or "Boy" and "Child" both glossing طفل), so one
        // must never be offered as a wrong answer to the other.
        candidate.promptKey !== item.promptKey &&
        Math.abs(candidate.lessonOrder - item.lessonOrder) <= maxDistance,
    )
    if (candidates.length === 0) continue

    for (const candidate of rankCandidates(candidates, item, rng, needed)) {
      if (chosen.length >= needed) break
      if (used.has(candidate.answerKey)) continue
      used.add(candidate.answerKey)
      chosen.push(candidate)
    }
  }

  return chosen.length >= needed ? chosen : null
}

function toQuestion(item: QuizItem, distractors: readonly QuizItem[], rng: Rng, index: number): Question {
  const draft = shuffle(
    [
      { text: item.answer.text, lang: item.answer.lang, isCorrect: true },
      ...distractors.map((distractor) => ({
        text: distractor.answer.text,
        lang: distractor.answer.lang,
        isCorrect: false,
      })),
    ],
    rng,
  )

  const options: QuestionOption[] = draft.map((option, position) => ({
    ...option,
    id: `q${index}-o${position}`,
  }))

  return {
    id: `q${index}`,
    itemId: item.id,
    conceptId: item.conceptId,
    mode: item.mode,
    lessonId: item.lessonId,
    lessonTitleEn: item.lessonTitleEn,
    lessonTitleAr: item.lessonTitleAr,
    lessonTopicEn: item.lessonTopicEn,
    bookPages: item.bookPages,
    prompt: item.prompt,
    answer: item.answer,
    options,
    correctIndex: options.findIndex((option) => option.isCorrect),
    example: item.example,
  }
}

export interface BuildQuestionsResult {
  questions: Question[]
  /** Items dropped because the book could not supply three distractors. */
  skipped: number
}

/**
 * @param selected items to ask about, in the order they should be asked
 * @param allItems every item in the book, used as the distractor pool
 */
export function buildQuestions(
  selected: readonly QuizItem[],
  allItems: readonly QuizItem[],
  seed: number | string,
): BuildQuestionsResult {
  const pools = buildPools(allItems)
  const rng = createRng(seed)
  const questions: Question[] = []
  let skipped = 0

  for (const item of selected) {
    const pool = pools.get(poolKey(item.mode, item.answer.lang)) ?? []
    const distractors = pickDistractors(item, pool, rng)
    if (!distractors) {
      skipped += 1
      continue
    }
    questions.push(toQuestion(item, distractors, rng, questions.length))
  }

  return { questions, skipped }
}

/** Re-shuffles existing questions for a "drill what you missed" round. */
export function reshuffleQuestions(questions: readonly Question[], seed: number | string): Question[] {
  const rng = createRng(seed)
  return shuffle(questions, rng).map((question, index) => {
    const options = shuffle(question.options, rng).map((option, position) => ({
      ...option,
      id: `q${index}-o${position}`,
    }))
    return {
      ...question,
      id: `q${index}`,
      options,
      correctIndex: options.findIndex((option) => option.isCorrect),
    }
  })
}

/** How many of these items could actually become questions. */
export function countAnswerable(items: readonly QuizItem[], allItems: readonly QuizItem[]): number {
  return buildQuestions(items, allItems, 'availability').questions.length
}
