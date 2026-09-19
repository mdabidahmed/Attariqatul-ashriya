import { describe, expect, it } from 'vitest'

import { parseBookmarks, toggleBookmark } from './bookmarks'

describe('parseBookmarks', () => {
  it('accepts an array of positive integers', () => {
    expect(parseBookmarks([1, 5, 12])).toEqual([1, 5, 12])
  })

  it('sorts and de-duplicates', () => {
    expect(parseBookmarks([12, 1, 5, 1, 12])).toEqual([1, 5, 12])
  })

  it('falls back to empty on anything unusable', () => {
    for (const value of [null, undefined, '', 'nope', 42, {}, true]) {
      expect(parseBookmarks(value)).toEqual([])
    }
  })

  it('drops non-positive-integer entries but keeps the rest', () => {
    expect(parseBookmarks([1, -1, 0, 1.5, 'x', null, 2])).toEqual([1, 2])
  })
})

describe('toggleBookmark', () => {
  it('adds an absent id', () => {
    expect(toggleBookmark([1, 3], 2)).toEqual([1, 2, 3])
  })

  it('removes a present id', () => {
    expect(toggleBookmark([1, 2, 3], 2)).toEqual([1, 3])
  })

  it('never mutates the input array', () => {
    const ids = Object.freeze([1, 2])
    expect(() => toggleBookmark(ids, 3)).not.toThrow()
    expect(ids).toEqual([1, 2])
  })
})
