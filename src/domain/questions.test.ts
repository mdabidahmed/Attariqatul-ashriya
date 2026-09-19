import { beforeAll, describe, expect, it } from 'vitest'

import { normalize } from './arabic'
import { MAX_ITEM_CHARS, buildItems } from './items'
import { MODE_IDS } from './modes'
import { OPTIONS_PER_QUESTION, buildQuestions, reshuffleQuestions } from './questions'
import { createRng, shuffle } from './rng'
import type { Book, Question, QuizItem } from './types'
import { liveBook, makeLesson, seedBook } from '../testing/fixtures'

function allQuestions(
  book: Book,
  seed: number | string = 'test',
): { items: QuizItem[]; questions: Question[] } {
  const items = buildItems(book.lessons)
  const { questions } = buildQuestions(items, items, seed)
  return { items, questions }
}

const datasets: { name: string; book: Book }[] = [{ name: 'seed data', book: seedBook() }]
const live = liveBook()
if (live) datasets.push({ name: 'extracted lessons.json', book: live })

describe.each(datasets)('$name', ({ book }) => {
  let items: QuizItem[]
  let questions: Question[]

  beforeAll(() => {
    const built = allQuestions(book)
    items = built.items
    questions = built.questions
  })

  it('produces a non-empty question bank', () => {
    expect(items.length).toBeGreaterThan(0)
    expect(questions.length).toBeGreaterThan(0)
  })

  it('gives every question exactly four options', () => {
    for (const question of questions) {
      expect(question.options, question.id).toHaveLength(OPTIONS_PER_QUESTION)
    }
  })

  it('marks exactly one option correct, and correctIndex agrees', () => {
    for (const question of questions) {
      const correct = question.options.filter((option) => option.isCorrect)
      expect(correct, question.id).toHaveLength(1)
      expect(question.options[question.correctIndex]?.isCorrect, question.id).toBe(true)
      expect(question.options[question.correctIndex]?.text, question.id).toBe(question.answer.text)
    }
  })

  it('never lets two options collide after harakat stripping', () => {
    for (const question of questions) {
      const keys = question.options.map((option) => normalize(option.text, option.lang))
      expect(new Set(keys).size, `${question.id}: ${keys.join(' | ')}`).toBe(keys.length)
      for (const key of keys) expect(key.length, question.id).toBeGreaterThan(0)
    }
  })

  it('never offers a distractor that is a diacritic-only variant of the answer', () => {
    for (const question of questions) {
      const answerKey = normalize(question.answer.text, question.answer.lang)
      const clashes = question.options.filter(
        (option) => !option.isCorrect && normalize(option.text, option.lang) === answerKey,
      )
      expect(clashes, question.id).toHaveLength(0)
    }
  })

  it('keeps all options in the answer language, and the prompt out of them', () => {
    for (const question of questions) {
      for (const option of question.options) {
        expect(option.lang, question.id).toBe(question.answer.lang)
      }
      if (question.prompt.lang === question.answer.lang) {
        expect(normalize(question.prompt.text, question.prompt.lang), question.id).not.toBe(
          normalize(question.answer.text, question.answer.lang),
        )
      }
    }
  })

  it('covers every mode the book has enough data for', () => {
    for (const mode of MODE_IDS) {
      const modeItems = items.filter((item) => item.mode === mode)
      if (modeItems.length < OPTIONS_PER_QUESTION) continue
      expect(
        questions.some((question) => question.mode === mode),
        `mode ${mode} has ${modeItems.length} items but produced no questions`,
      ).toBe(true)
    }
  })

  it('is deterministic for a fixed seed and different across seeds', () => {
    const fingerprint = (list: Question[]) =>
      list.map((question) => [question.itemId, question.correctIndex, question.options.map((o) => o.text)])

    expect(fingerprint(allQuestions(book, 'fixed').questions)).toEqual(
      fingerprint(allQuestions(book, 'fixed').questions),
    )
    expect(fingerprint(allQuestions(book, 'alpha').questions)).not.toEqual(
      fingerprint(allQuestions(book, 'beta').questions),
    )
  })

  it('spreads the correct answer across all four positions', () => {
    const counts = new Array<number>(OPTIONS_PER_QUESTION).fill(0)
    let total = 0
    // A fresh sample per seed rather than the whole bank each time: the same
    // statistical question, but it stays fast on a 75-lesson book.
    for (let seed = 0; seed < 40; seed += 1) {
      const sample = shuffle(items, createRng(`spread-${seed}`)).slice(0, 25)
      for (const question of buildQuestions(sample, items, seed).questions) {
        counts[question.correctIndex] = (counts[question.correctIndex] ?? 0) + 1
        total += 1
      }
    }

    expect(total).toBeGreaterThan(500)
    const expected = total / OPTIONS_PER_QUESTION
    counts.forEach((count, position) => {
      const ratio = count / expected
      expect(
        ratio,
        `position ${position} holds ${count} of ${total} answers (expected about ${Math.round(expected)})`,
      ).toBeGreaterThan(0.85)
      expect(ratio).toBeLessThan(1.15)
    })
  })

  it('attaches a book example sentence to most vocabulary items', () => {
    const vocab = items.filter((item) => item.mode === 'vocabArToEn')
    const withExample = vocab.filter((item) => item.example !== null)
    expect(vocab.length).toBeGreaterThan(0)
    expect(withExample.length).toBeGreaterThan(0)
    for (const item of withExample) {
      expect(item.example?.ar.length).toBeGreaterThan(0)
      expect(item.example?.en.length).toBeGreaterThan(0)
    }
  })
})

describe('too little data to form a question', () => {
  it('skips rather than padding when there are fewer than three distractors', () => {
    const items = buildItems([
      makeLesson({
        id: 1,
        vocabulary: [
          { en: 'One', ar: 'وَاحِدٌ' },
          { en: 'Two', ar: 'اِثْنَانِ' },
        ],
      }),
    ])
    const { questions, skipped } = buildQuestions(items, items, 1)
    expect(questions).toHaveLength(0)
    expect(skipped).toBe(items.length)
  })

  it('returns nothing for a lesson with no sections at all', () => {
    const items = buildItems([makeLesson({ id: 1 }), makeLesson({ id: 2 })])
    expect(items).toHaveLength(0)
    expect(buildQuestions(items, items, 1).questions).toHaveLength(0)
  })

  it('builds a question as soon as a fourth distinct answer exists', () => {
    const items = buildItems([
      makeLesson({
        id: 1,
        vocabulary: [
          { en: 'Pen', ar: 'قَلَمٌ' },
          { en: 'Book', ar: 'كِتَابٌ' },
          { en: 'Door', ar: 'بَابٌ' },
          { en: 'Pocket', ar: 'جَيْبٌ' },
        ],
      }),
    ])
    const { questions } = buildQuestions(items, items, 1)
    expect(questions.length).toBeGreaterThan(0)
    for (const question of questions) {
      expect(question.options).toHaveLength(OPTIONS_PER_QUESTION)
    }
  })

  it('never uses a synonym of the prompt as a distractor', () => {
    // "Boy" and "Child" both gloss طفل: neither may be a wrong answer to the other.
    const items = buildItems([
      makeLesson({
        id: 1,
        vocabulary: [
          { en: 'Boy', ar: 'طِفْلٌ' },
          { en: 'Child', ar: 'طِفْلٌ' },
          { en: 'Pen', ar: 'قَلَمٌ' },
          { en: 'Book', ar: 'كِتَابٌ' },
          { en: 'Door', ar: 'بَابٌ' },
        ],
      }),
    ])
    const { questions } = buildQuestions(items, items, 5)
    const childQuestions = questions.filter(
      (question) => question.mode === 'vocabArToEn' && normalize(question.prompt.text, 'ar') === 'طفل',
    )
    expect(childQuestions.length).toBeGreaterThan(0)
    for (const question of childQuestions) {
      const wrong = question.options.filter((option) => !option.isCorrect).map((option) => option.text)
      expect(wrong).not.toContain('Boy')
      expect(wrong).not.toContain('Child')
    }
  })
})

describe('option length, so four of them fit one screen', () => {
  it('keeps every prompt and option within the scannable limit', () => {
    for (const { book } of datasets) {
      for (const item of buildItems(book.lessons)) {
        expect(item.prompt.text.length, `${item.id} prompt`).toBeLessThanOrEqual(MAX_ITEM_CHARS)
        expect(item.answer.text.length, `${item.id} answer`).toBeLessThanOrEqual(MAX_ITEM_CHARS)
      }
    }
  })

  it('drops a reading passage that was captured as one sentence', () => {
    const passage = 'وَالْمَرْأَةُ هِيَ الْبِنْتُ وَالْأُخْتُ وَالْأُمُّ وَالزَّوْجَةُ '.repeat(8)
    expect(passage.length).toBeGreaterThan(MAX_ITEM_CHARS)

    const items = buildItems([
      makeLesson({
        id: 1,
        sentences: [
          {
            ar: passage,
            en: 'A whole paragraph of English to match.'.repeat(5),
            group: null,
            derived: false,
          },
          { ar: 'أَلْقَلَمُ فِي الْجَيْبِ', en: 'The pen is in the pocket', group: null, derived: false },
        ],
      }),
    ])

    expect(items.some((item) => item.answer.text === passage)).toBe(false)
    expect(items.some((item) => item.answer.text === 'The pen is in the pocket')).toBe(true)
  })

  it('keeps a long-but-reasonable sentence', () => {
    const sentence = 'أَلْخَطِيبُ عَلَى الْمِنْبَرِ وَالْمُسْلِمُونَ فِي الْمَسْجِدِ'
    expect(sentence.length).toBeLessThanOrEqual(MAX_ITEM_CHARS)

    const items = buildItems([
      makeLesson({
        id: 1,
        sentences: [{ ar: sentence, en: 'The preacher is on the pulpit', group: null, derived: false }],
      }),
    ])
    expect(items.some((item) => item.answer.text === sentence)).toBe(true)
  })
})

describe('reshuffleQuestions', () => {
  it('keeps exactly one correct option and re-points correctIndex', () => {
    const { questions } = allQuestions(seedBook())
    const subset = questions.slice(0, 8)
    const reshuffled = reshuffleQuestions(subset, 99)

    expect(reshuffled).toHaveLength(subset.length)
    for (const question of reshuffled) {
      expect(question.options).toHaveLength(OPTIONS_PER_QUESTION)
      expect(question.options.filter((option) => option.isCorrect)).toHaveLength(1)
      expect(question.options[question.correctIndex]?.isCorrect).toBe(true)
    }
    expect(new Set(reshuffled.map((q) => q.itemId))).toEqual(new Set(subset.map((q) => q.itemId)))
  })
})
