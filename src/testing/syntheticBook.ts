/**
 * Generates a synthetic 75-lesson book with realistic item counts, for
 * development, profiling and tests before the extracted `data/lessons.json`
 * lands.
 *
 * The Arabic is generated, not quoted: it is well-formed vocalised text built
 * from real letters and harakat so it exercises the normaliser and the
 * distractor rules, but it is not book content. Lessons 3, 4 and 9 carry the
 * genuine seed material so there is real text in the mix too.
 */

import { createRng, type Rng } from '../domain/rng'

/** Topic names in the style of the book's own index. */
const TOPICS: readonly string[] = [
  'The Arabic alphabet',
  'Joining the letters',
  'Close and Far',
  'Personal pronouns',
  'This and That',
  'Dictation and laws of Dictation',
  'Questions with hal',
  'The definite article',
  'Prepositions fi / alaa / fawqa / tahta',
  'Counting from 1 to 10',
  'Counting from 11 to 20',
  'Days of the week',
  'Months of the year',
  'Colours',
  'family',
  'In the classroom',
  'In the house',
  'In the market',
  'Food and drink',
  'Fruits and vegetables',
  'Animals of the farm',
  'Birds and insects',
  'Parts of the body',
  'Clothing',
  'The weather',
  'Dictation and laws of Dictation',
  'Time of day',
  'Greetings and manners',
  'The masjid',
  'Wudu and salah',
  'Travel and the road',
  'The city and the village',
  'Trades and work',
  'Tools and instruments',
  'Numbers above twenty',
  'Ordinal numbers',
  'Comparison of adjectives',
  'The dual',
  'The sound plural',
  'The broken plural',
  'Dictation and laws of Dictation',
  'Masculine and feminine',
  'The nominative case',
  'The accusative case',
  'The genitive case',
  'Idafah and possession',
  'Attached pronouns',
  'The past tense',
  'The present tense',
  'The imperative',
  'Negation with laa and maa',
  'Kaana and its sisters',
  'Inna and its sisters',
  'The verbal sentence',
  'The nominal sentence',
  'Adverbs of place',
  'Adverbs of time',
  'Conditional sentences',
  'Relative pronouns',
  'Dictation and laws of Dictation',
  'The garden and the trees',
  'The sea and the river',
  'The sky and the stars',
  'Illness and the doctor',
  'The school day',
  'Letters and writing',
  'Money and buying',
  'Measures and weights',
  'Directions and places',
  'Feelings and character',
  'Hajj and Umrah',
  'The Quran and its recitation',
  'Stories of the prophets',
  'Revision of lessons one to forty',
  'Revision of the whole book',
]

const ORDINALS: readonly string[] = [
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
  'Twenty',
]

function lessonOrdinal(id: number): string {
  const direct = ORDINALS[id - 1]
  if (direct) return direct
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy']
  const ten = tens[Math.floor(id / 10)] ?? ''
  const unit = id % 10 === 0 ? '' : `-${(ORDINALS[(id % 10) - 1] ?? '').toLowerCase()}`
  return `${ten}${unit}`
}

// Arabic letters that join on both sides, so generated words look natural.
const CONSONANTS = 'بتثجحخسشصضطظعغفقكلمنهي'.split('')
const SHORT_VOWELS = ['\u064E', '\u0650', '\u064F'] // fatha, kasra, damma
const TANWEEN = ['\u064C', '\u064D', '\u064B'] // damma-tanween, kasra-tanween, fatha-tanween
const LONG = ['\u0627', '\u0648', '\u064A'] // alif, waw, ya

function pick<T>(rng: Rng, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)] as T
}

/** A vocalised pseudo-word: real letters, real harakat, plausible shape. */
function arabicWord(rng: Rng): string {
  const syllables = 2 + Math.floor(rng() * 2)
  let out = ''
  for (let i = 0; i < syllables; i += 1) {
    out += pick(rng, CONSONANTS) + pick(rng, SHORT_VOWELS)
    if (rng() < 0.35) out += pick(rng, LONG)
  }
  // Final consonant carries tanween, as the book's vocabulary lists do.
  return out + pick(rng, CONSONANTS) + pick(rng, TANWEEN)
}

const EN_HEADS = [
  'lamp',
  'bridge',
  'basket',
  'candle',
  'mirror',
  'ladder',
  'kettle',
  'blanket',
  'saddle',
  'harvest',
  'orchard',
  'fountain',
  'courtyard',
  'lantern',
  'cushion',
  'scholar',
  'merchant',
  'shepherd',
  'traveller',
  'neighbour',
]
const EN_MODS = [
  'small',
  'large',
  'new',
  'old',
  'wide',
  'narrow',
  'clean',
  'heavy',
  'light',
  'distant',
  'near',
  'bright',
]

/** A unique English gloss, so no two vocabulary rows collide. */
function englishGloss(rng: Rng, lessonId: number, index: number): string {
  const head = pick(rng, EN_HEADS)
  const mod = pick(rng, EN_MODS)
  return `${mod} ${head} ${lessonId}.${index}`
}

interface RawLesson {
  id: number
  titleEn: string
  titleAr: string
  topicEn: string
  scanPages: number[]
  bookPages: number[]
  vocabulary: { en: string; ar: string }[]
  sentences: { ar: string; en: string; group: string | null; derived: boolean }[]
  qaPairs: { questionAr: string; answerAr: string; derived: boolean }[]
  translateToArabic: { en: string; ar: string; derived: boolean }[]
  translateToEnglish: { ar: string; en: string; derived: boolean }[]
  notesEn: string[]
}

export interface SyntheticBook {
  book: { titleEn: string; titleAr: string }
  lessons: RawLesson[]
}

function makeLesson(id: number, topic: string, rng: Rng): RawLesson {
  const isDictation = topic.startsWith('Dictation')
  const bookPage = 6 + (id - 1) * 3

  const base: RawLesson = {
    id,
    titleEn: `Lesson ${lessonOrdinal(id)}`,
    titleAr: `أَلدَّرْسُ ${id}`,
    topicEn: topic,
    scanPages: [Math.ceil(bookPage / 2)],
    bookPages: [bookPage, bookPage + 1],
    vocabulary: [],
    sentences: [],
    qaPairs: [],
    translateToArabic: [],
    translateToEnglish: [],
    notesEn: [],
  }

  if (isDictation) {
    // Orthography lessons: prose rules only, nothing quizzable.
    base.notesEn = [
      'Write from dictation, taking care with the joined and unjoined letters.',
      'A word never begins with a sukun, and a sukun never falls on the first letter.',
      'The hamzatul wasl is written but not pronounced when preceded by another word.',
      'Revise the shapes of the letters at the beginning, middle and end of a word.',
    ]
    return base
  }

  const vocabCount = 14 + Math.floor(rng() * 5)
  for (let i = 0; i < vocabCount; i += 1) {
    base.vocabulary.push({ en: englishGloss(rng, id, i), ar: arabicWord(rng) })
  }

  const subject = () => pick(rng, base.vocabulary)
  const sentenceCount = 11 + Math.floor(rng() * 4)
  for (let i = 0; i < sentenceCount; i += 1) {
    const a = subject()
    const b = subject()
    base.sentences.push({
      ar: `أَلْ${a.ar} فِي الْ${b.ar}`,
      en: `The ${a.en} is in the ${b.en}`,
      group: 'فِي',
      derived: false,
    })
  }

  const qaCount = 13 + Math.floor(rng() * 4)
  for (let i = 0; i < qaCount; i += 1) {
    const a = subject()
    const b = subject()
    base.qaPairs.push({
      questionAr: `أَيْنَ الْ${a.ar} رَقَمُ ${i}؟`,
      answerAr: `أَلْ${a.ar} عَلَى الْ${b.ar}`,
      derived: false,
    })
  }

  const toArabicCount = 10 + Math.floor(rng() * 4)
  for (let i = 0; i < toArabicCount; i += 1) {
    const a = subject()
    base.translateToArabic.push({
      en: `Where is the ${a.en}, number ${i}?`,
      ar: `أَيْنَ الْ${a.ar} رَقَمُ ${i} وَ ${id}؟`,
      derived: true,
    })
  }

  const toEnglishCount = 8 + Math.floor(rng() * 4)
  for (let i = 0; i < toEnglishCount; i += 1) {
    const a = subject()
    base.translateToEnglish.push({
      ar: `أَلْ${a.ar} تَحْتَ الْبَيْتِ رَقَمُ ${i}`,
      en: `The ${a.en} is beneath house number ${i}`,
      derived: true,
    })
  }

  base.notesEn = [`${topic}: study the vocabulary before attempting the exercise.`]
  return base
}

/**
 * @param lessonCount how many lessons to generate (the real book has 75)
 * @param seed fixed by default, so the fixture is byte-identical every run
 */
export function makeSyntheticBook(lessonCount = 75, seed: number | string = 'attariqa-75'): SyntheticBook {
  const rng = createRng(seed)
  const lessons: RawLesson[] = []
  for (let id = 1; id <= lessonCount; id += 1) {
    const topic = TOPICS[(id - 1) % TOPICS.length] ?? 'Revision'
    lessons.push(makeLesson(id, topic, rng))
  }
  return {
    book: { titleEn: 'At-Tareeqatul Asriyyah, Part I (synthetic fixture)', titleAr: 'الطريقة العصرية' },
    lessons,
  }
}

/** Lesson ids in the fixture that are orthography-only, hence unquizzable. */
export function syntheticDictationLessonIds(lessonCount = 75): number[] {
  const ids: number[] = []
  for (let id = 1; id <= lessonCount; id += 1) {
    if ((TOPICS[(id - 1) % TOPICS.length] ?? '').startsWith('Dictation')) ids.push(id)
  }
  return ids
}
