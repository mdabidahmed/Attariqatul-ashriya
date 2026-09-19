/**
 * Loads the lesson data at runtime.
 *
 * `data/lessons.json` is written by a separate process and is deliberately not
 * bundled, so a reload picks up new content without a rebuild. Until it exists
 * (or if it cannot be parsed) the app falls back to `data/lessons.seed.json`
 * and says so.
 */

import { validateBook } from '../domain/validateBook'
import type { Book, ValidationIssue } from '../domain/types'

const base = (import.meta.env.BASE_URL || '/').replace(/\/*$/, '/')

export const LESSONS_URL = `${base}data/lessons.json`
export const SEED_URL = `${base}data/lessons.seed.json`

export type BookSource = 'live' | 'seed'

export interface BookLoaded {
  status: 'ready'
  source: BookSource
  book: Book
  issues: ValidationIssue[]
  url: string
  /** Why the live file was not used, when running on seed data. */
  fallbackReason: string | null
}

export interface BookFailed {
  status: 'error'
  reasons: string[]
}

export type BookLoadResult = BookLoaded | BookFailed

interface FetchOk {
  ok: true
  book: Book
  issues: ValidationIssue[]
}

interface FetchFailed {
  ok: false
  reason: string
}

async function fetchBook(url: string): Promise<FetchOk | FetchFailed> {
  let response: Response
  try {
    response = await fetch(url, { cache: 'no-store' })
  } catch (error) {
    return { ok: false, reason: `Could not reach ${url} (${(error as Error).message})` }
  }
  if (!response.ok) {
    return { ok: false, reason: `${url} returned HTTP ${response.status}` }
  }

  // Read text first: a dev-server SPA fallback would hand back HTML, and
  // naming that is far more useful than "Unexpected token <".
  const body = await response.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch (error) {
    return { ok: false, reason: `${url} is not valid JSON (${(error as Error).message})` }
  }

  try {
    const { book, issues } = validateBook(parsed)
    return { ok: true, book, issues }
  } catch (error) {
    return { ok: false, reason: `${url} does not match the lesson schema (${(error as Error).message})` }
  }
}

export async function loadBook(): Promise<BookLoadResult> {
  const live = await fetchBook(LESSONS_URL)
  if (live.ok) {
    return {
      status: 'ready',
      source: 'live',
      book: live.book,
      issues: live.issues,
      url: LESSONS_URL,
      fallbackReason: null,
    }
  }

  const seed = await fetchBook(SEED_URL)
  if (seed.ok) {
    return {
      status: 'ready',
      source: 'seed',
      book: seed.book,
      issues: seed.issues,
      url: SEED_URL,
      fallbackReason: live.reason,
    }
  }

  return { status: 'error', reasons: [live.reason, seed.reason] }
}
