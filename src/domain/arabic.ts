/**
 * Arabic text helpers.
 *
 * Two strings count as "the same answer" when they differ only in vowelling,
 * so a distractor can never be a harakat-only variant of the correct answer.
 * Every comparison and de-duplication in the app goes through `normalize`.
 */

import type { Lang } from './types'

// Harakat, tanween, sukun, shadda, superscript alef and the Quranic marks.
const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g
const TATWEEL = /\u0640/g
// Zero-width characters and bidi controls: invisible, but they break equality.
const INVISIBLE = /[\u061C\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g
// آ أ إ ٱ ٲ ٳ ٵ all collapse to bare alef.
const ALIF_VARIANTS = /[\u0622\u0623\u0625\u0671\u0672\u0673\u0675]/g
const WHITESPACE = /\s+/g
const ARABIC_RANGE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

const PUNCTUATION = new Set<string>([
  ...'.,;:!?"\'`()[]{}<>/\\|*_=+~^&%$#@',
  '\u060C', // ،
  '\u061B', // ؛
  '\u061F', // ؟
  '\u066A',
  '\u066B',
  '\u066C',
  '\u06D4', // ۔
  '\u00AB',
  '\u00BB',
  '\u2018',
  '\u2019',
  '\u201C',
  '\u201D',
  '\u2013',
  '\u2014',
  '\u2026',
  '-',
])

function stripPunctuation(text: string): string {
  let out = ''
  for (const char of text) {
    if (!PUNCTUATION.has(char)) out += char
  }
  return out
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Removes harakat and tatweel while keeping the letters exactly as written. */
export function stripDiacritics(text: unknown): string {
  const input = asString(text)
  if (!input) return ''
  return input.normalize('NFC').replace(DIACRITICS, '').replace(TATWEEL, '')
}

/** True when the string contains at least one Arabic-script character. */
export function containsArabic(text: unknown): boolean {
  const input = asString(text)
  return input.length > 0 && ARABIC_RANGE.test(input)
}

/**
 * Comparison key for Arabic: unvowelled, tatweel-free, alef forms unified,
 * punctuation and whitespace ignored.
 */
export function normalizeArabic(text: unknown): string {
  const input = asString(text)
  if (!input) return ''
  const withoutMarks = stripDiacritics(input).replace(INVISIBLE, '')
  const unified = withoutMarks.replace(ALIF_VARIANTS, '\u0627')
  return stripPunctuation(unified).replace(WHITESPACE, ' ').trim()
}

/** Comparison key for English: case-, punctuation- and whitespace-insensitive. */
export function normalizeEnglish(text: unknown): string {
  const input = asString(text)
  if (!input) return ''
  const cleaned = stripPunctuation(input.normalize('NFC').replace(INVISIBLE, ''))
  return cleaned.replace(WHITESPACE, ' ').trim().toLowerCase()
}

/** Normalises by declared language, falling back to script detection. */
export function normalize(text: unknown, lang?: Lang): string {
  if (lang === 'ar') return normalizeArabic(text)
  if (lang === 'en') return normalizeEnglish(text)
  return containsArabic(text) ? normalizeArabic(text) : normalizeEnglish(text)
}

/** True when two strings are the same answer once vowelling is ignored. */
export function isSameAnswer(a: unknown, b: unknown, lang?: Lang): boolean {
  const left = normalize(a, lang)
  return left.length > 0 && left === normalize(b, lang)
}

/** Length used when matching a distractor to the shape of the correct answer. */
export function comparableLength(text: string, lang: Lang): number {
  return normalize(text, lang).length
}

/**
 * True when `haystack` contains `needle` as a whole word, ignoring harakat.
 * Used to find the book sentence that demonstrates a vocabulary word.
 */
export function containsWord(haystack: string, needle: string, lang: Lang): boolean {
  const target = normalize(needle, lang)
  if (target.length < 2) return false
  const words = normalize(haystack, lang).split(' ')
  return words.some((word) => word === target || stripArabicArticle(word) === stripArabicArticle(target))
}

/** Drops a leading definite article so الْقَلَمُ matches قَلَمٌ. */
function stripArabicArticle(word: string): string {
  return word.startsWith('\u0627\u0644') && word.length > 3 ? word.slice(2) : word
}

export interface ScriptRun {
  text: string
  script: 'ar' | 'en'
}

const LATIN_LETTER = /[A-Za-z]/

/**
 * Splits mixed text into Arabic and Latin runs.
 *
 * `containsArabic` answers "is there any Arabic in here?", and using that to
 * pick one font for the whole string is what made a topic like
 * "Absent pronouns (ه) (ها)" render its English words at Arabic display size.
 * Segmenting lets each run keep its own face and size.
 *
 * Characters that belong to neither script — spaces, parentheses, digits,
 * punctuation — are buffered and attached to whichever run comes next, so
 * "(ه)" stays together rather than fragmenting into three runs.
 */
export function segmentByScript(text: unknown): ScriptRun[] {
  const input = asString(text)
  if (!input) return []

  const runs: ScriptRun[] = []
  let current: ScriptRun | null = null
  let buffer = ''

  const push = (): void => {
    if (!current) return
    const trimmed = current.text.trim()
    if (trimmed) runs.push({ text: trimmed, script: current.script })
    current = null
  }

  for (const char of input) {
    const script: 'ar' | 'en' | null = ARABIC_RANGE.test(char) ? 'ar' : LATIN_LETTER.test(char) ? 'en' : null

    if (script === null) {
      buffer += char
      continue
    }
    if (current && current.script === script) {
      current.text += buffer + char
    } else if (current) {
      /*
       * Script is changing, so the buffered neutrals have to be split. An
       * opening bracket belongs to what follows it; everything before that —
       * closing brackets, punctuation, spaces — belongs to the run just
       * ended. Handing the whole buffer to one side tore "(ه)" apart, leaving
       * its closing bracket on the English run.
       */
      const opener = buffer.search(/[([{\u2039\u00ab]/)
      const head = opener === -1 ? buffer : buffer.slice(0, opener)
      const tail = opener === -1 ? '' : buffer.slice(opener)
      current.text += head
      push()
      current = { script, text: tail + char }
    } else {
      current = { script, text: buffer + char }
    }
    buffer = ''
  }

  if (current) current.text += buffer
  push()

  // No strong characters at all: treat the whole thing as Latin.
  if (runs.length === 0) {
    const trimmed = input.trim()
    return trimmed ? [{ text: trimmed, script: 'en' }] : []
  }
  return runs
}
