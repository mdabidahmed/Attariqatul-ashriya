import { useEffect, useMemo, useState } from 'react'

import { MODE_IDS } from '../domain/modes'
import type { Lesson, ModeId, SessionSetup } from '../domain/types'
import { readRaw, writeRaw } from './storage'

const KEY = 'setup'

export const QUESTION_COUNTS: readonly (number | 'all')[] = [10, 20, 50, 'all']

export const DEFAULT_SETUP: SessionSetup = {
  lessonIds: [],
  modes: [...MODE_IDS],
  count: 20,
}

function parseSetup(value: unknown): SessionSetup {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return DEFAULT_SETUP
  const raw = value as Record<string, unknown>

  const lessonIds = Array.isArray(raw.lessonIds)
    ? [...new Set(raw.lessonIds.filter((id): id is number => typeof id === 'number' && Number.isFinite(id)))]
    : []
  const modes = Array.isArray(raw.modes)
    ? raw.modes.filter((mode): mode is ModeId => MODE_IDS.includes(mode as ModeId))
    : []
  const count = QUESTION_COUNTS.includes(raw.count as number | 'all')
    ? (raw.count as number | 'all')
    : DEFAULT_SETUP.count

  return {
    lessonIds,
    modes: modes.length > 0 ? modes : [...MODE_IDS],
    count,
  }
}

/**
 * Drops lessons that no longer exist.
 *
 * On a first run this deliberately selects only the first lesson rather than
 * all 75: the book is graded, and interleaving lesson seventy with lesson one
 * would be worse than useless for a beginner. The home screen's primary action
 * drives the graded path; this is only the starting point for the custom
 * selection.
 */
function reconcile(setup: SessionSetup, lessons: readonly Lesson[]): SessionSetup {
  const available = new Set(lessons.map((lesson) => lesson.id))
  const lessonIds = setup.lessonIds.filter((id) => available.has(id))
  if (lessonIds.length === setup.lessonIds.length && lessonIds.length > 0) return setup
  if (lessonIds.length > 0) return { ...setup, lessonIds }
  const first = lessons[0]
  return { ...setup, lessonIds: first ? [first.id] : [] }
}

export interface SetupApi {
  setup: SessionSetup
  setSetup: (next: SessionSetup) => void
}

/** The student's last-used session configuration, persisted between visits. */
export function useSetup(lessons: readonly Lesson[] | null): SetupApi {
  const [stored, setStored] = useState<SessionSetup>(() => parseSetup(readRaw(KEY)))

  // The effective setup is derived rather than synced into state, so the book
  // arriving cannot trigger a cascading render.
  const setup = useMemo(
    () => (lessons && lessons.length > 0 ? reconcile(stored, lessons) : stored),
    [lessons, stored],
  )

  useEffect(() => {
    writeRaw(KEY, setup)
  }, [setup])

  return { setup, setSetup: setStored }
}
