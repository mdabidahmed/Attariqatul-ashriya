import { useMemo } from 'react'

import { LessonLine, type LessonRow } from '../LessonGrid'
import Panel from '../ui/Panel'
import Rows from '../ui/Rows'
import SectionHead from '../ui/SectionHead'

interface BookmarksPageProps {
  rows: readonly LessonRow[]
  bookmarkedIds: readonly number[]
  onLearn: (lessonId: number) => void
  onPractise: (lessonId: number) => void
  onOpenReference: (lessonId: number) => void
  onToggleBookmark: (lessonId: number) => void
}

/** Lessons saved for later, in the same row shape as everywhere else. */
export default function BookmarksPage({
  rows,
  bookmarkedIds,
  onLearn,
  onPractise,
  onOpenReference,
  onToggleBookmark,
}: BookmarksPageProps) {
  const bookmarkedSet = useMemo(() => new Set(bookmarkedIds), [bookmarkedIds])
  const bookmarked = rows.filter((row) => bookmarkedSet.has(row.lesson.id))

  return (
    <section className="screen page">
      <SectionHead title="Bookmarks" count={bookmarked.length} />
      <Panel>
        {bookmarked.length === 0 ? (
          <p className="text-soft text-sm">
            Nothing saved yet. Tap the bookmark icon on any lesson to keep it here for quick access.
          </p>
        ) : (
          <Rows>
            {bookmarked.map((row) => (
              <LessonLine
                key={row.lesson.id}
                row={row}
                onLearn={onLearn}
                onPractise={onPractise}
                onOpenReference={onOpenReference}
                isBookmarked={() => true}
                onToggleBookmark={onToggleBookmark}
              />
            ))}
          </Rows>
        )}
      </Panel>
    </section>
  )
}
