/** Turns a finished (or abandoned) session into everything the results screen needs. */

import type { AnswerRecord, ModeId, Question, QuestionOption, Session } from './types'

export interface Tally {
  correct: number
  total: number
}

export interface MissedAnswer {
  question: Question
  chosen: QuestionOption | null
}

export interface SessionSummary {
  total: number
  correct: number
  percent: number
  /** Questions in the session the student never reached. */
  unanswered: number
  perMode: { mode: ModeId; correct: number; total: number }[]
  perLesson: { lessonId: number; titleEn: string; topicEn: string; correct: number; total: number }[]
  missed: MissedAnswer[]
  /** Item ids and outcomes, for the scheduler. */
  outcomes: { itemId: string; correct: boolean }[]
}

export function percentage(correct: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((correct / total) * 100)
}

export function summarise(session: Session): SessionSummary {
  const answered: { question: Question; answer: AnswerRecord }[] = []
  session.questions.forEach((question, index) => {
    const answer = session.answers[index]
    if (answer) answered.push({ question, answer })
  })

  const modeMap = new Map<ModeId, Tally>()
  const lessonMap = new Map<number, Tally & { titleEn: string; topicEn: string }>()
  const missed: MissedAnswer[] = []
  const outcomes: { itemId: string; correct: boolean }[] = []

  for (const { question, answer } of answered) {
    const mode = modeMap.get(question.mode) ?? { correct: 0, total: 0 }
    mode.total += 1
    if (answer.correct) mode.correct += 1
    modeMap.set(question.mode, mode)

    const lesson = lessonMap.get(question.lessonId) ?? {
      correct: 0,
      total: 0,
      titleEn: question.lessonTitleEn,
      topicEn: question.lessonTopicEn,
    }
    lesson.total += 1
    if (answer.correct) lesson.correct += 1
    lessonMap.set(question.lessonId, lesson)

    outcomes.push({ itemId: question.itemId, correct: answer.correct })

    if (!answer.correct) {
      missed.push({ question, chosen: question.options[answer.chosenIndex] ?? null })
    }
  }

  const total = answered.length
  const correct = answered.filter(({ answer }) => answer.correct).length

  return {
    total,
    correct,
    percent: percentage(correct, total),
    unanswered: session.questions.length - total,
    perMode: [...modeMap.entries()].map(([mode, tally]) => ({ mode, ...tally })),
    perLesson: [...lessonMap.entries()]
      .map(([lessonId, tally]) => ({ lessonId, ...tally }))
      .sort((a, b) => a.lessonId - b.lessonId),
    missed,
    outcomes,
  }
}
