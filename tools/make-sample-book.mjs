/**
 * Writes a synthetic 75-lesson book to a JSON file, for browser testing and
 * profiling before the extracted data is complete.
 *
 *   node tools/make-sample-book.mjs [outputPath] [lessonCount]
 *
 * It deliberately refuses to write `data/lessons.json`, which belongs to the
 * extraction process.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createServer } from 'vite'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const target = path.resolve(repoRoot, process.argv[2] ?? 'data/lessons.sample-75.json')
const lessonCount = Number.parseInt(process.argv[3] ?? '75', 10)

if (path.basename(target) === 'lessons.json') {
  console.error('Refusing to overwrite data/lessons.json — that file is owned by the extraction process.')
  process.exit(1)
}
if (!Number.isFinite(lessonCount) || lessonCount < 1) {
  console.error(`Not a usable lesson count: ${process.argv[3]}`)
  process.exit(1)
}

// Vite loads the TypeScript generator, so the source stays extensionless and
// shared with the Vitest suite without adding a transpiler dependency.
const server = await createServer({
  configFile: false,
  root: repoRoot,
  logLevel: 'warn',
  server: { middlewareMode: true },
  appType: 'custom',
})
let makeSyntheticBook
try {
  ;({ makeSyntheticBook } = await server.ssrLoadModule('/src/testing/syntheticBook.ts'))
} finally {
  await server.close()
}

const book = makeSyntheticBook(lessonCount)
fs.mkdirSync(path.dirname(target), { recursive: true })
fs.writeFileSync(target, `${JSON.stringify(book, null, 2)}\n`, 'utf8')

const entries = book.lessons.reduce(
  (total, lesson) =>
    total +
    lesson.vocabulary.length +
    lesson.sentences.length +
    lesson.qaPairs.length +
    lesson.translateToArabic.length +
    lesson.translateToEnglish.length,
  0,
)
const kilobytes = (fs.statSync(target).size / 1024).toFixed(0)
console.log(`Wrote ${book.lessons.length} lessons, ${entries} entries, ${kilobytes}kB to ${target}`)
