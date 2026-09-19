/** Shared vocabulary for the whole domain layer. No React, no DOM. */

export type Lang = 'ar' | 'en'

/** The four quiz modes, ordered easiest to hardest. */
export type ModeId = 'vocabArToEn' | 'vocabEnToAr' | 'sentence' | 'qa'

export interface ModeInfo {
  id: ModeId
  labelEn: string
  shortLabel: string
  description: string
  /** Recognition modes are introduced before production modes. */
  kind: 'recognition' | 'production' | 'sentence' | 'qa'
}

export interface Phrase {
  text: string
  lang: Lang
}

// ------------------------------------------------------------------- book

export interface VocabEntry {
  en: string
  ar: string
}

export interface SentenceEntry {
  ar: string
  en: string
  group: string | null
  derived: boolean
}

export interface QaEntry {
  questionAr: string
  answerAr: string
  derived: boolean
}

export interface Lesson {
  id: number
  /** Position in the book, used for "nearby lesson" distractor preference. */
  order: number
  titleEn: string
  titleAr: string
  topicEn: string
  scanPages: number[]
  bookPages: number[]
  vocabulary: VocabEntry[]
  sentences: SentenceEntry[]
  qaPairs: QaEntry[]
  translateToArabic: VocabEntry[]
  translateToEnglish: VocabEntry[]
  notesEn: string[]
}

export interface BookMeta {
  titleEn: string
  titleAr: string
}

export interface Book {
  meta: BookMeta
  lessons: Lesson[]
}

/** A problem found while validating incoming lesson data. */
export interface ValidationIssue {
  severity: 'skipped' | 'repaired'
  where: string
  message: string
}

export interface ValidationResult {
  book: Book
  issues: ValidationIssue[]
}

// ------------------------------------------------------------------- items

export type ItemSource = 'vocabulary' | 'sentences' | 'qaPairs' | 'translateToArabic' | 'translateToEnglish'

/**
 * One drillable prompt/answer pair. Items are the unit of scheduling, so `id`
 * must stay stable across reloads and across rebuilds of the book data.
 */
export interface QuizItem {
  id: string
  /** Shared by both directions of the same vocabulary pair. */
  conceptId: string
  mode: ModeId
  lessonId: number
  lessonOrder: number
  lessonTitleEn: string
  lessonTitleAr: string
  lessonTopicEn: string
  bookPages: number[]
  prompt: Phrase
  answer: Phrase
  /** Harakat-insensitive comparison keys. */
  promptKey: string
  answerKey: string
  source: ItemSource
  derived: boolean
  group: string | null
  /** A sentence from the same lesson that uses this word, shown after an error. */
  example: SentenceEntry | null
}

// --------------------------------------------------------------- questions

export interface QuestionOption {
  id: string
  text: string
  lang: Lang
  isCorrect: boolean
}

export interface Question {
  id: string
  itemId: string
  conceptId: string
  mode: ModeId
  lessonId: number
  lessonTitleEn: string
  lessonTitleAr: string
  lessonTopicEn: string
  bookPages: number[]
  prompt: Phrase
  answer: Phrase
  options: QuestionOption[]
  correctIndex: number
  example: SentenceEntry | null
}

// -------------------------------------------------------------- scheduling

/** Leitner box 0 (new or lapsed) through 5 (mastered). */
export type LeitnerBox = 0 | 1 | 2 | 3 | 4 | 5

export interface ItemProgress {
  box: LeitnerBox
  /** Epoch ms when this item should next be practised. */
  due: number
  seen: number
  correct: number
  /** Consecutive correct answers. */
  streak: number
  lastSeen: number
  /** Set by the flashcard "Learn" pass, before the item is ever tested. */
  introduced: number | null
}

export type ProgressMap = Record<string, ItemProgress>

export interface DayRecord {
  seen: number
  correct: number
}

export interface StreakState {
  /** Local calendar day, `YYYY-MM-DD`. */
  lastDay: string | null
  current: number
  best: number
  days: Record<string, DayRecord>
}

export interface StudyState {
  items: ProgressMap
  streak: StreakState
  lifetime: { seen: number; correct: number; sessions: number }
}

// ----------------------------------------------------------------- session

export type SessionFocus = 'mixed' | 'weak' | 'lesson' | 'next'

export interface SessionSetup {
  lessonIds: number[]
  modes: ModeId[]
  count: number | 'all'
}

export interface AnswerRecord {
  questionId: string
  itemId: string
  chosenIndex: number
  correct: boolean
  answeredAt: number
}

export interface Session {
  questions: Question[]
  answers: (AnswerRecord | undefined)[]
  index: number
  setup: SessionSetup
  focus: SessionFocus
  seed: number
  startedAt: number
}
