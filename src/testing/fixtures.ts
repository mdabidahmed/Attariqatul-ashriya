/**
 * Test-only helpers. Kept out of `tsconfig.app.json` so the app bundle can
 * never reach for Node built-ins.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { validateBook } from '../domain/validateBook'
import type { Book, Lesson } from '../domain/types'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

export const SEED_PATH = path.join(repoRoot, 'data/lessons.seed.json')
export const LIVE_PATH = path.join(repoRoot, 'data/lessons.json')

export function readBookFile(filePath: string): Book | null {
  if (!fs.existsSync(filePath)) return null
  return validateBook(JSON.parse(fs.readFileSync(filePath, 'utf8'))).book
}

export function seedBook(): Book {
  const book = readBookFile(SEED_PATH)
  if (!book) throw new Error(`missing fixture: ${SEED_PATH}`)
  return book
}

/** The real extracted data, when the other process has written it. */
export function liveBook(): Book | null {
  return readBookFile(LIVE_PATH)
}

let counter = 0

/** A minimal lesson for edge-case tests. */
export function makeLesson(partial: Partial<Lesson> = {}): Lesson {
  counter += 1
  return {
    id: partial.id ?? counter,
    order: partial.order ?? 0,
    titleEn: partial.titleEn ?? `Lesson ${partial.id ?? counter}`,
    titleAr: partial.titleAr ?? '',
    topicEn: partial.topicEn ?? '',
    scanPages: partial.scanPages ?? [],
    bookPages: partial.bookPages ?? [],
    vocabulary: partial.vocabulary ?? [],
    sentences: partial.sentences ?? [],
    qaPairs: partial.qaPairs ?? [],
    translateToArabic: partial.translateToArabic ?? [],
    translateToEnglish: partial.translateToEnglish ?? [],
    notesEn: partial.notesEn ?? [],
  }
}
