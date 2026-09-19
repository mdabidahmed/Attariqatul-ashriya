import { useDeferredValue, useMemo, useState } from 'react'

import { LessonLine } from '../LessonGrid'
import type { LessonRow } from '../LessonGrid'
import { buildSearchIndex, searchLessons } from '../../domain/lessonRanges'
import Panel from '../ui/Panel'
import Rows from '../ui/Rows'
import SectionHead from '../ui/SectionHead'

interface LessonsPageProps {
  rows: readonly LessonRow[]
  initialQuery: string
  onLearn: (lessonId: number) => void
  onPractise: (lessonId: number) => void
  onOpenReference: (lessonId: number) => void
  isBookmarked: (lessonId: number) => boolean
  onToggleBookmark: (lessonId: number) => void
}

/**
 * Every lesson in the book, one line each, searchable — the full-page
 * counterpart to Home's condensed "in progress" list. Reuses `LessonLine`
 * rather than a second row renderer, so a lesson looks the same wherever it
 * appears.
 */
export default function LessonsPage({
  rows,
  initialQuery,
  onLearn,
  onPractise,
  onOpenReference,
  isBookmarked,
  onToggleBookmark,
}: LessonsPageProps) {
  const [query, setQuery] = useState(initialQuery)
  const searchable = useMemo(() => buildSearchIndex(rows.map((row) => row.lesson)), [rows])
  const deferredQuery = useDeferredValue(query)
  const rowsById = useMemo(() => new Map(rows.map((row) => [row.lesson.id, row])), [rows])
  const visible = useMemo(() => searchLessons(searchable, deferredQuery), [searchable, deferredQuery])

  return (
    <section className="screen page">
      <SectionHead title="Lessons" count={`${visible.length} of ${rows.length}`} />
      <label className="field field--grow">
        <span className="sr-only">Search lessons by number or topic</span>
        <input
          className="field__input field__input--search"
          type="search"
          value={query}
          placeholder="Search number or topic…"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <Panel>
        {visible.length === 0 ? (
          <p className="text-soft text-sm">No lesson matches "{deferredQuery.trim()}".</p>
        ) : (
          <Rows>
            {visible.map((lesson) => {
              const row = rowsById.get(lesson.id)
              return row ? (
                <LessonLine
                  key={lesson.id}
                  row={row}
                  onLearn={onLearn}
                  onPractise={onPractise}
                  onOpenReference={onOpenReference}
                  isBookmarked={isBookmarked}
                  onToggleBookmark={onToggleBookmark}
                />
              ) : null
            })}
          </Rows>
        )}
      </Panel>
    </section>
  )
}
