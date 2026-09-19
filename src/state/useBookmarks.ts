import { useCallback, useMemo, useState } from 'react'

import { parseBookmarks, toggleBookmark } from '../domain/bookmarks'
import { readRaw, writeRaw } from './storage'

const KEY = 'bookmarks'

export interface BookmarksApi {
  ids: readonly number[]
  isBookmarked: (lessonId: number) => boolean
  toggle: (lessonId: number) => void
}

/** Owns the set of saved-for-later lesson ids and persists it. */
export function useBookmarks(): BookmarksApi {
  const [ids, setIds] = useState<number[]>(() => parseBookmarks(readRaw(KEY)))
  const idSet = useMemo(() => new Set(ids), [ids])

  const toggle = useCallback((lessonId: number) => {
    setIds((current) => {
      const next = toggleBookmark(current, lessonId)
      writeRaw(KEY, next)
      return next
    })
  }, [])

  const isBookmarked = useCallback((lessonId: number) => idSet.has(lessonId), [idSet])

  return { ids, isBookmarked, toggle }
}
