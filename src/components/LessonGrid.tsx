import { useMemo, useState } from 'react'

import { lessonLabel, lessonName } from '../domain/plan'
import type { LessonMastery } from '../domain/scheduler'
import type { Lesson } from '../domain/types'
import Meter from './Meter'
import Phrase from './Phrase'
import { BookmarkIcon } from './shell/icons'
import Badge from './ui/Badge'
import Button from './ui/Button'
import SectionHead from './ui/SectionHead'
import Tooltip from './ui/Tooltip'

export interface LessonRow {
  lesson: Lesson
  mastery: LessonMastery
  referenceOnly: boolean
  isNext: boolean
}

interface LessonActions {
  onLearn: (lessonId: number) => void
  onPractise: (lessonId: number) => void
  onOpenReference: (lessonId: number) => void
  /** Omitted where bookmarking makes no sense, e.g. inside the picker. */
  isBookmarked?: (lessonId: number) => boolean
  onToggleBookmark?: (lessonId: number) => void
}

interface LessonGridProps extends LessonActions {
  rows: readonly LessonRow[]
}

type TileFilter = 'all' | 'in-progress' | 'completed' | 'not-started'

/** Five tints, so a whole book of tiles reads as a heat map at a glance. */
function tintFor(row: LessonRow): string {
  if (row.referenceOnly) return 'tile--reference'
  const fraction = row.mastery.fraction
  if (fraction >= 0.8) return 'tile--t4'
  if (fraction >= 0.5) return 'tile--t3'
  if (fraction >= 0.2) return 'tile--t2'
  if (row.mastery.started > 0) return 'tile--t1'
  return 'tile--t0'
}

/** The same three buckets the filter tabs and the tile tints both use. */
function bucketFor(row: LessonRow): Exclude<TileFilter, 'all'> {
  if (row.mastery.fraction >= 0.8) return 'completed'
  if (row.mastery.started > 0) return 'in-progress'
  return 'not-started'
}

const TILE_FILTERS: { id: TileFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'not-started', label: 'Not Started' },
]

/**
 * One card per lesson, in three zones — what it is, how it's going, what to
 * do about it — rather than one dense line. A 75-lesson book only ever
 * shows a handful of these at once (the rest are the tile map below), so
 * the room is there to spend.
 */
export function LessonLine({
  row,
  onLearn,
  onPractise,
  onOpenReference,
  isBookmarked,
  onToggleBookmark,
}: { row: LessonRow } & LessonActions) {
  const { lesson, mastery, referenceOnly } = row
  const percent = Math.round(mastery.fraction * 100)
  const bookmarked = isBookmarked?.(lesson.id) ?? false
  // Several lessons' "topic" is itself Arabic (a preview of the lesson's own
  // vocabulary), in which case it duplicates `titleAr` rather than adding an
  // English gloss — shown once, not twice.
  const topicIsEnglish = /[a-zA-Z]/.test(lesson.topicEn)

  return (
    <li className={`lesson-card ${row.isNext ? 'lesson-card--next' : ''}`}>
      <div className="lesson-card__info">
        <p className="lesson-card__title">
          {lessonName(lesson)}
          {referenceOnly ? <Badge>Reading</Badge> : null}
        </p>
        {topicIsEnglish ? <p className="lesson-card__topic">{lesson.topicEn}</p> : null}
        {lesson.titleAr ? (
          <Phrase className="lesson-card__ar" text={lesson.titleAr} lang="ar" size="sm" inline />
        ) : null}
      </div>

      <div className="lesson-card__progress">
        {referenceOnly ? (
          <span className="row__meta">{lesson.notesEn.length} notes</span>
        ) : (
          <>
            <Meter
              value={percent}
              max={100}
              size="sm"
              tone={mastery.fraction >= 0.8 ? 'good' : 'accent'}
              label={`${lessonName(lesson)} mastery`}
            />
            <span className="lesson-card__progress-meta">
              <strong>{percent}%</strong>
              {mastery.weak > 0 ? `${mastery.weak} to review` : `${mastery.started}/${mastery.total}`}
            </span>
          </>
        )}
      </div>

      <div className="lesson-card__actions">
        {onToggleBookmark ? (
          <button
            type="button"
            className={`bookmark-toggle ${bookmarked ? 'bookmark-toggle--on' : ''}`}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? `Remove ${lessonName(lesson)} from bookmarks` : `Bookmark ${lessonName(lesson)}`}
            onClick={() => onToggleBookmark(lesson.id)}
          >
            <BookmarkIcon size={16} />
          </button>
        ) : null}
        {referenceOnly ? (
          <Button variant="subtle" size="tiny" onClick={() => onOpenReference(lesson.id)}>
            Read
          </Button>
        ) : (
          <>
            <Button variant="quiet" size="tiny" onClick={() => onLearn(lesson.id)}>
              Words
            </Button>
            {/* The card's one strong action: everything else here is a
                quieter alternative to actually practising. */}
            <Button variant="primary" size="tiny" onClick={() => onPractise(lesson.id)}>
              Practise
            </Button>
          </>
        )}
      </div>
    </li>
  )
}

/**
 * At 75 lessons a row each would be an endless scroll, so only the lessons in
 * play get a card. The rest of the book is a tile grid that doubles as a map
 * of where the student has reached — filterable, so "where am I" and "what's
 * left" are both one click away instead of a scan of 75 numbers.
 */
export default function LessonGrid({
  rows,
  onLearn,
  onPractise,
  onOpenReference,
  isBookmarked,
  onToggleBookmark,
}: LessonGridProps) {
  const [showAll, setShowAll] = useState(false)
  const [tileFilter, setTileFilter] = useState<TileFilter>('all')

  // The next lesson is the hero of the page, so it is not repeated here.
  const inProgress = rows.filter((row) => !row.isNext && row.mastery.started > 0 && !row.referenceOnly)
  const lines = showAll ? rows : inProgress

  const visibleTiles = useMemo(
    () => (tileFilter === 'all' ? rows : rows.filter((row) => bucketFor(row) === tileFilter)),
    [rows, tileFilter],
  )

  return (
    <>
      <SectionHead
        title={showAll ? 'Every lesson' : 'Lessons in progress'}
        count={showAll ? rows.length : `${inProgress.length} of ${rows.length}`}
        action={
          <Button
            variant="quiet"
            size="tiny"
            onClick={() => setShowAll((current) => !current)}
            aria-expanded={showAll}
          >
            {showAll ? 'Show fewer' : `Show all ${rows.length}`}
          </Button>
        }
      />

      {lines.length === 0 ? (
        <p className="text-soft text-sm">
          Nothing else on the go — finish the lesson above and the next one appears here.
        </p>
      ) : (
        <ul className="lesson-cards">
          {lines.map((row) => (
            <LessonLine
              key={row.lesson.id}
              row={row}
              onLearn={onLearn}
              onPractise={onPractise}
              onOpenReference={onOpenReference}
              isBookmarked={isBookmarked}
              onToggleBookmark={onToggleBookmark}
            />
          ))}
        </ul>
      )}

      {showAll ? null : (
        <div className="book-map">
          <div className="book-map__head">
            <p className="book-map__caption">
              The whole book. Darker means better known; outlined lessons are reading notes.
            </p>
            <div className="segmented segmented--tabs" role="group" aria-label="Filter lesson progress">
              {TILE_FILTERS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`segmented__item ${tileFilter === option.id ? 'segmented__item--on' : ''}`}
                  aria-pressed={tileFilter === option.id}
                  onClick={() => setTileFilter(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <ul className="tile-legend">
            <li>
              <span className="tile-legend__swatch tile--t0" aria-hidden="true" />
              Not started
            </li>
            <li>
              <span className="tile-legend__swatch tile--t2" aria-hidden="true" />
              In progress
            </li>
            <li>
              <span className="tile-legend__swatch tile--t4" aria-hidden="true" />
              Completed
            </li>
            <li>
              <span className="tile-legend__swatch tile-legend__swatch--next" aria-hidden="true" />
              Current
            </li>
          </ul>
          {visibleTiles.length === 0 ? (
            <p className="text-soft text-sm">No lessons in this category yet.</p>
          ) : (
            <ul className="tiles">
              {visibleTiles.map((row) => {
                const label = `${lessonLabel(row.lesson)} — ${
                  row.referenceOnly ? 'reading notes' : `${Math.round(row.mastery.fraction * 100)}% known`
                }`
                return (
                  <li key={row.lesson.id}>
                    <Tooltip label={label}>
                      <button
                        type="button"
                        className={`tile ${tintFor(row)} ${row.isNext ? 'tile--next' : ''}`}
                        aria-label={label}
                        onClick={() =>
                          row.referenceOnly ? onOpenReference(row.lesson.id) : onPractise(row.lesson.id)
                        }
                      >
                        {row.lesson.id}
                      </button>
                    </Tooltip>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </>
  )
}
