/** Saved-for-later lessons: a plain set of lesson ids, nothing more. */

/** Never throws: anything that isn't an array of positive integers is dropped. */
export function parseBookmarks(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  const ids = new Set<number>()
  for (const entry of value) {
    if (typeof entry === 'number' && Number.isInteger(entry) && entry > 0) ids.add(entry)
  }
  return [...ids].sort((a, b) => a - b)
}

/** Adds the id if absent, removes it if present. Never mutates the input. */
export function toggleBookmark(ids: readonly number[], lessonId: number): number[] {
  return ids.includes(lessonId)
    ? ids.filter((id) => id !== lessonId)
    : [...ids, lessonId].sort((a, b) => a - b)
}
