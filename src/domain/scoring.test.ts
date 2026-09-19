import { describe, expect, it } from 'vitest'

import { buildItems } from './items'
import { MODE_IDS } from './modes'
import { buildQuestions } from './questions'
import { percentage, summarise } from './scoring'
import { composeSession } from './session'
import type { AnswerRecord, Session } from './types'
import { seedBook } from '../testing/fixtures'

const NOW = Date.parse('2026-03-10T09:00:00Z')

const book = seedBook()
const allItems = buildItems(book.lessons)

function makeSession(count: number): Session {
  const composed = composeSession({
    items: allItems,
    progress: {},
    lessonIds: book.lessons.map((lesson) => lesson.id),
    modes: MODE_IDS,
    count,
    focus: 'mixed',
    seed: 'scoring',
    now: NOW,
  })
  const { questions } = buildQuestions(composed.items, allItems, 'scoring')
  return {
    questions,
    answers: [],
    index: 0,
    setup: { lessonIds: book.lessons.map((lesson) => lesson.id), modes: [...MODE_IDS], count },
    focus: 'mixed',
    seed: 1,
    startedAt: NOW,
  }
}

/** Answers the first `answerCount` questions, getting every other one wrong. */
function answerAlternating(session: Session, answerCount: number): Session {
  const answers: (AnswerRecord | undefined)[] = []
  for (let index = 0; index < answerCount; index += 1) {
    const question = session.questions[index]
    if (!question) break
    const correct = index % 2 === 0
    const chosenIndex = correct
      ? question.correctIndex
      : (question.correctIndex + 1) % question.options.length
    answers[index] = {
      questionId: question.id,
      itemId: question.itemId,
      chosenIndex,
      correct,
      answeredAt: NOW + index,
    }
  }
  return { ...session, answers }
}

describe('percentage', () => {
  it('rounds and treats an empty quiz as zero', () => {
    expect(percentage(0, 0)).toBe(0)
    expect(percentage(1, 3)).toBe(33)
    expect(percentage(2, 3)).toBe(67)
    expect(percentage(10, 10)).toBe(100)
  })
})

describe('summarise', () => {
  it('scores a fully answered session', () => {
    const session = answerAlternating(makeSession(10), 10)
    const summary = summarise(session)

    expect(summary.total).toBe(10)
    expect(summary.correct).toBe(5)
    expect(summary.percent).toBe(50)
    expect(summary.unanswered).toBe(0)
    expect(summary.missed).toHaveLength(5)
    expect(summary.outcomes).toHaveLength(10)
  })

  it('records what the student actually chose for each miss', () => {
    const session = answerAlternating(makeSession(6), 6)
    for (const miss of summarise(session).missed) {
      expect(miss.chosen).not.toBeNull()
      expect(miss.chosen?.isCorrect).toBe(false)
    }
  })

  it('counts only answered questions and reports the rest as unanswered', () => {
    const session = answerAlternating(makeSession(10), 4)
    const summary = summarise(session)

    expect(summary.total).toBe(4)
    expect(summary.unanswered).toBe(6)
    expect(summary.correct).toBe(2)
  })

  it('breaks the score down by mode and by lesson, adding up to the total', () => {
    const session = answerAlternating(makeSession(20), 20)
    const summary = summarise(session)

    const modeTotal = summary.perMode.reduce((sum, row) => sum + row.total, 0)
    const lessonTotal = summary.perLesson.reduce((sum, row) => sum + row.total, 0)
    expect(modeTotal).toBe(summary.total)
    expect(lessonTotal).toBe(summary.total)

    const modeCorrect = summary.perMode.reduce((sum, row) => sum + row.correct, 0)
    expect(modeCorrect).toBe(summary.correct)
    expect(summary.perLesson.map((row) => row.lessonId)).toEqual(
      [...summary.perLesson.map((row) => row.lessonId)].sort((a, b) => a - b),
    )
  })

  it('handles a session nobody answered', () => {
    const summary = summarise(makeSession(5))
    expect(summary.total).toBe(0)
    expect(summary.percent).toBe(0)
    expect(summary.unanswered).toBe(5)
    expect(summary.missed).toEqual([])
    expect(summary.perMode).toEqual([])
  })

  it('emits one scheduler outcome per answer', () => {
    const session = answerAlternating(makeSession(8), 8)
    const summary = summarise(session)
    expect(summary.outcomes.filter((outcome) => outcome.correct)).toHaveLength(4)
    for (const outcome of summary.outcomes) {
      expect(outcome.itemId.length).toBeGreaterThan(0)
    }
  })
})
