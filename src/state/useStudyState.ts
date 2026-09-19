import { useCallback, useEffect, useState } from 'react'

import {
  applyIntroduced,
  applySession,
  emptyStudyState,
  parseStudyState,
  serialiseStudyState,
  type SessionOutcome,
} from '../domain/studyState'
import type { StudyState } from '../domain/types'
import { readRaw, writeRaw } from './storage'

const KEY = 'study'

export interface StudyStateApi {
  study: StudyState
  recordSession: (outcomes: readonly SessionOutcome[]) => void
  recordIntroduced: (itemIds: readonly string[]) => void
  reset: () => void
}

/** Owns the persisted study record: schedules, streak and lifetime totals. */
export function useStudyState(): StudyStateApi {
  const [study, setStudy] = useState<StudyState>(() => parseStudyState(readRaw(KEY)))

  // Persisting in an effect keeps the state updaters pure, which matters
  // because React may run an updater more than once.
  useEffect(() => {
    writeRaw(KEY, serialiseStudyState(study))
  }, [study])

  const recordSession = useCallback((outcomes: readonly SessionOutcome[]) => {
    const now = Date.now()
    setStudy((current) => applySession(current, outcomes, now))
  }, [])

  const recordIntroduced = useCallback((itemIds: readonly string[]) => {
    const now = Date.now()
    setStudy((current) => applyIntroduced(current, itemIds, now))
  }, [])

  const reset = useCallback(() => {
    setStudy(emptyStudyState())
  }, [])

  return { study, recordSession, recordIntroduced, reset }
}
