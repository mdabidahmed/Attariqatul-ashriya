/**
 * Flattens the book into drillable items.
 *
 * An item is the unit of scheduling, so its `id` is derived from its content
 * and stays stable across reloads and across regenerations of the book data.
 * Vocabulary items also carry a `conceptId` shared by both directions, which
 * is what lets recognition gate production.
 */

import { normalize } from './arabic'
import { stableId } from './rng'
import type { ItemSource, Lang, Lesson, QuizItem, SentenceEntry } from './types'
import type { ModeId } from './types'

interface ItemDraft {
  mode: ModeId
  source: ItemSource
  promptText: string
  promptLang: Lang
  answerText: string
  answerLang: Lang
  derived: boolean
  group: string | null
  /** Arabic side of the underlying pair, used to look up an example sentence. */
  arabicSide: string
}

/**
 * Longest text usable as a quiz prompt or option.
 *
 * The extraction captures some of the book's reading passages as a single
 * "sentence" entry — the worst is 460 characters. Four paragraphs of that
 * length cannot be compared at a glance, and the correct one would stand out
 * by shape alone, so they are not quiz material at any screen size. About
 * 2.5% of items are dropped by this, and every one of them was unanswerable
 * in practice. They are still readable in the book itself.
 */
export const MAX_ITEM_CHARS = 120

function clean(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

interface ExampleCandidate {
  entry: SentenceEntry
  /** Normalised key of the whole sentence, to skip the word's own sentence. */
  key: string
  /** Every word in the sentence, normalised, plus article-stripped forms. */
  words: Set<string>
}

/**
 * Normalises each candidate sentence once per lesson.
 *
 * Doing this per vocabulary word instead meant re-normalising every sentence
 * in the lesson for every word in it, which dominated the cost of building the
 * bank at 75 lessons.
 */
function buildExampleCandidates(lesson: Lesson): ExampleCandidate[] {
  const sentences: SentenceEntry[] = [
    ...lesson.sentences,
    ...lesson.translateToArabic.map((entry) => ({ ar: entry.ar, en: entry.en, group: null, derived: true })),
    ...lesson.translateToEnglish.map((entry) => ({ ar: entry.ar, en: entry.en, group: null, derived: true })),
  ]

  return sentences.map((entry) => {
    const key = normalize(entry.ar, 'ar')
    const words = new Set<string>()
    for (const word of key.split(' ')) {
      if (!word) continue
      words.add(word)
      words.add(stripArabicArticle(word))
    }
    return { entry, key, words }
  })
}

/**
 * Finds a sentence in the lesson that uses this word, so a wrong answer can be
 * followed by the model sentence from the book.
 */
function findExample(candidates: readonly ExampleCandidate[], arabicWord: string): SentenceEntry | null {
  const target = normalize(arabicWord, 'ar')
  if (target.length < 2) return null
  const bare = stripArabicArticle(target)

  let best: SentenceEntry | null = null
  for (const candidate of candidates) {
    // Skip the word's own sentence: it would teach nothing new.
    if (candidate.key === target) continue
    if (!candidate.words.has(target) && !candidate.words.has(bare)) continue
    // Prefer the shortest match: short sentences show the pattern most clearly.
    if (!best || candidate.entry.ar.length < best.ar.length) best = candidate.entry
  }
  return best
}

/** Drops a leading definite article so الْقَلَمُ matches قَلَمٌ. */
function stripArabicArticle(word: string): string {
  return word.startsWith('\u0627\u0644') && word.length > 3 ? word.slice(2) : word
}

function toItem(lesson: Lesson, draft: ItemDraft, examples: readonly ExampleCandidate[]): QuizItem | null {
  const promptText = clean(draft.promptText)
  const answerText = clean(draft.answerText)
  if (!promptText || !answerText) return null
  if (promptText.length > MAX_ITEM_CHARS || answerText.length > MAX_ITEM_CHARS) return null

  const promptKey = normalize(promptText, draft.promptLang)
  const answerKey = normalize(answerText, draft.answerLang)
  if (!promptKey || !answerKey) return null
  // A prompt identical to its answer would be unanswerable.
  if (draft.promptLang === draft.answerLang && promptKey === answerKey) return null

  const conceptId = stableId(`${lesson.id}|${draft.source}|${normalize(draft.arabicSide, 'ar')}`)

  return {
    id: stableId(`${draft.mode}|${promptKey}|${answerKey}`),
    conceptId,
    mode: draft.mode,
    lessonId: lesson.id,
    lessonOrder: lesson.order,
    lessonTitleEn: lesson.titleEn,
    lessonTitleAr: lesson.titleAr,
    lessonTopicEn: lesson.topicEn,
    bookPages: lesson.bookPages,
    prompt: { text: promptText, lang: draft.promptLang },
    answer: { text: answerText, lang: draft.answerLang },
    promptKey,
    answerKey,
    source: draft.source,
    derived: draft.derived,
    group: draft.group,
    example:
      draft.mode === 'vocabArToEn' || draft.mode === 'vocabEnToAr'
        ? findExample(examples, draft.arabicSide)
        : null,
  }
}

/** Builds every item in the book, de-duplicated by content. */
export function buildItems(lessons: readonly Lesson[]): QuizItem[] {
  const items: QuizItem[] = []
  const seen = new Set<string>()

  let examples: ExampleCandidate[] = []
  const push = (lesson: Lesson, draft: ItemDraft): void => {
    const item = toItem(lesson, draft, examples)
    if (!item || seen.has(item.id)) return
    seen.add(item.id)
    items.push(item)
  }

  for (const lesson of lessons) {
    examples = buildExampleCandidates(lesson)
    for (const entry of lesson.vocabulary) {
      const shared = { source: 'vocabulary' as const, derived: false, group: null, arabicSide: entry.ar }
      push(lesson, {
        ...shared,
        mode: 'vocabArToEn',
        promptText: entry.ar,
        promptLang: 'ar',
        answerText: entry.en,
        answerLang: 'en',
      })
      push(lesson, {
        ...shared,
        mode: 'vocabEnToAr',
        promptText: entry.en,
        promptLang: 'en',
        answerText: entry.ar,
        answerLang: 'ar',
      })
    }

    // `translateTo*` have a printed direction; plain `sentences` work both ways.
    const sentenceSources: {
      ar: string
      en: string
      group: string | null
      derived: boolean
      source: ItemSource
      directions: ('enToAr' | 'arToEn')[]
    }[] = [
      ...lesson.translateToArabic.map((entry) => ({
        ar: entry.ar,
        en: entry.en,
        group: null,
        derived: true,
        source: 'translateToArabic' as const,
        directions: ['enToAr' as const],
      })),
      ...lesson.translateToEnglish.map((entry) => ({
        ar: entry.ar,
        en: entry.en,
        group: null,
        derived: true,
        source: 'translateToEnglish' as const,
        directions: ['arToEn' as const],
      })),
      ...lesson.sentences.map((entry) => ({
        ar: entry.ar,
        en: entry.en,
        group: entry.group,
        derived: entry.derived,
        source: 'sentences' as const,
        directions: ['enToAr' as const, 'arToEn' as const],
      })),
    ]

    for (const entry of sentenceSources) {
      for (const direction of entry.directions) {
        const shared = {
          mode: 'sentence' as const,
          source: entry.source,
          derived: entry.derived,
          group: entry.group,
          arabicSide: entry.ar,
        }
        if (direction === 'enToAr') {
          push(lesson, {
            ...shared,
            promptText: entry.en,
            promptLang: 'en',
            answerText: entry.ar,
            answerLang: 'ar',
          })
        } else {
          push(lesson, {
            ...shared,
            promptText: entry.ar,
            promptLang: 'ar',
            answerText: entry.en,
            answerLang: 'en',
          })
        }
      }
    }

    for (const entry of lesson.qaPairs) {
      push(lesson, {
        mode: 'qa',
        source: 'qaPairs',
        derived: entry.derived,
        group: null,
        arabicSide: entry.answerAr,
        promptText: entry.questionAr,
        promptLang: 'ar',
        answerText: entry.answerAr,
        answerLang: 'ar',
      })
    }
  }

  return items
}

/**
 * Maps each vocabulary concept to its recognition item, so the scheduler can
 * check whether the easier direction is known before offering the harder one.
 */
export function recognitionIndex(items: readonly QuizItem[]): Map<string, QuizItem> {
  const index = new Map<string, QuizItem>()
  for (const item of items) {
    if (item.mode === 'vocabArToEn') index.set(item.conceptId, item)
  }
  return index
}

/** New vocabulary of a lesson, in book order, for the flashcard Learn pass. */
export function lessonVocabularyItems(items: readonly QuizItem[], lessonId: number): QuizItem[] {
  return items.filter((item) => item.lessonId === lessonId && item.mode === 'vocabArToEn')
}
