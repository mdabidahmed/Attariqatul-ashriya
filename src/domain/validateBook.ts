/**
 * Runtime validation for `data/lessons.json`.
 *
 * The file comes from a separate extraction process and may be partial or
 * malformed. Nothing here throws except when the payload has no usable lesson
 * at all: bad entries are dropped and reported as issues so the UI can name
 * what was skipped instead of failing silently.
 */

import type {
  Book,
  Lesson,
  QaEntry,
  SentenceEntry,
  ValidationIssue,
  ValidationResult,
  VocabEntry,
} from './types'

export const DEFAULT_TITLE_EN = 'At-Tareeqatul Asriyyah, Part I'
export const DEFAULT_TITLE_AR =
  '\u0627\u0644\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u0639\u0635\u0631\u064a\u0629'

export class InvalidBookError extends Error {}

type Unknown = Record<string, unknown>

function isRecord(value: unknown): value is Unknown {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function numberList(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  const out: number[] = []
  for (const entry of value) {
    const parsed = typeof entry === 'number' ? entry : Number.parseInt(String(entry), 10)
    if (Number.isFinite(parsed)) out.push(parsed)
  }
  return out
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(str).filter((entry) => entry.length > 0)
}

interface SectionResult<T> {
  entries: T[]
  dropped: number
}

/** Reads a list of two-sided entries, dropping any that are missing a side. */
function readPairs(value: unknown, keyA: string, keyB: string): SectionResult<Record<string, unknown>> {
  if (value === undefined || value === null) return { entries: [], dropped: 0 }
  if (!Array.isArray(value)) return { entries: [], dropped: 1 }

  const entries: Record<string, unknown>[] = []
  let dropped = 0
  for (const raw of value) {
    if (!isRecord(raw)) {
      dropped += 1
      continue
    }
    const a = str(raw[keyA])
    const b = str(raw[keyB])
    if (!a || !b) {
      dropped += 1
      continue
    }
    entries.push({ [keyA]: a, [keyB]: b, group: str(raw.group) || null, derived: raw.derived === true })
  }
  return { entries, dropped }
}

function vocabList(value: unknown, issues: ValidationIssue[], where: string, field: string): VocabEntry[] {
  const { entries, dropped } = readPairs(value, 'en', 'ar')
  if (dropped > 0) {
    issues.push({
      severity: 'repaired',
      where,
      message: `${dropped} incomplete ${field} ${dropped === 1 ? 'entry' : 'entries'} skipped`,
    })
  }
  return entries.map((entry) => ({ en: entry.en as string, ar: entry.ar as string }))
}

function sentenceList(
  value: unknown,
  issues: ValidationIssue[],
  where: string,
  field: string,
): SentenceEntry[] {
  const { entries, dropped } = readPairs(value, 'ar', 'en')
  if (dropped > 0) {
    issues.push({
      severity: 'repaired',
      where,
      message: `${dropped} incomplete ${field} ${dropped === 1 ? 'entry' : 'entries'} skipped`,
    })
  }
  return entries.map((entry) => ({
    ar: entry.ar as string,
    en: entry.en as string,
    group: entry.group as string | null,
    derived: entry.derived as boolean,
  }))
}

function qaList(value: unknown, issues: ValidationIssue[], where: string): QaEntry[] {
  const { entries, dropped } = readPairs(value, 'questionAr', 'answerAr')
  if (dropped > 0) {
    issues.push({
      severity: 'repaired',
      where,
      message: `${dropped} incomplete qaPairs ${dropped === 1 ? 'entry' : 'entries'} skipped`,
    })
  }
  return entries.map((entry) => ({
    questionAr: entry.questionAr as string,
    answerAr: entry.answerAr as string,
    derived: entry.derived as boolean,
  }))
}

/** Total exercise entries in a lesson, for the start screen. */
export function lessonEntryCount(lesson: Lesson): number {
  return (
    lesson.vocabulary.length +
    lesson.sentences.length +
    lesson.qaPairs.length +
    lesson.translateToArabic.length +
    lesson.translateToEnglish.length
  )
}

function readLesson(raw: unknown, index: number, issues: ValidationIssue[]): Lesson | null {
  if (!isRecord(raw)) {
    issues.push({ severity: 'skipped', where: `lessons[${index}]`, message: 'not an object' })
    return null
  }

  const parsedId = typeof raw.id === 'number' ? raw.id : Number.parseInt(String(raw.id), 10)
  const id = Number.isFinite(parsedId) ? parsedId : index + 1
  if (!Number.isFinite(parsedId)) {
    issues.push({
      severity: 'repaired',
      where: `lessons[${index}]`,
      message: `missing id, numbered ${id} by position`,
    })
  }

  const where = `Lesson ${id}`
  const lesson: Lesson = {
    id,
    order: index,
    titleEn: str(raw.titleEn) || `Lesson ${id}`,
    titleAr: str(raw.titleAr),
    topicEn: str(raw.topicEn),
    scanPages: numberList(raw.scanPages),
    bookPages: numberList(raw.bookPages),
    vocabulary: vocabList(raw.vocabulary, issues, where, 'vocabulary'),
    sentences: sentenceList(raw.sentences, issues, where, 'sentences'),
    qaPairs: qaList(raw.qaPairs, issues, where),
    translateToArabic: vocabList(raw.translateToArabic, issues, where, 'translateToArabic'),
    translateToEnglish: vocabList(raw.translateToEnglish, issues, where, 'translateToEnglish'),
    notesEn: stringList(raw.notesEn),
  }

  // A lesson with no exercises but with notes is still worth keeping: the
  // book's "Dictation and laws of Dictation" lessons are prose rules, and the
  // app shows them as reference material instead of quizzing them.
  if (lessonEntryCount(lesson) === 0 && lesson.notesEn.length === 0) {
    issues.push({ severity: 'skipped', where, message: 'no exercise content and no notes' })
    return null
  }

  return lesson
}

/**
 * @throws {InvalidBookError} when the payload yields no usable lessons, which
 * is the only case where falling back to the seed data is the right answer.
 */
export function validateBook(raw: unknown): ValidationResult {
  if (!isRecord(raw)) {
    throw new InvalidBookError('lesson data must be a JSON object')
  }
  if (!Array.isArray(raw.lessons)) {
    throw new InvalidBookError('lesson data has no "lessons" array')
  }

  const issues: ValidationIssue[] = []
  const lessons: Lesson[] = []
  raw.lessons.forEach((entry, index) => {
    const lesson = readLesson(entry, index, issues)
    if (lesson) lessons.push(lesson)
  })

  if (lessons.length === 0) {
    throw new InvalidBookError('no lesson in the file has usable content')
  }

  lessons.sort((a, b) => a.id - b.id)
  const ordered = lessons.map((lesson, order) => ({ ...lesson, order }))

  const metaRaw = isRecord(raw.book) ? raw.book : {}
  const book: Book = {
    meta: {
      titleEn: str(metaRaw.titleEn) || DEFAULT_TITLE_EN,
      titleAr: str(metaRaw.titleAr) || DEFAULT_TITLE_AR,
    },
    lessons: ordered,
  }

  return { book, issues }
}
