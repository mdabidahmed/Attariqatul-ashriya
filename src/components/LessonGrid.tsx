import { useState } from 'react'

import { lessonLabel, lessonName } from '../domain/plan'
import type { LessonMastery } from '../domain/scheduler'
import type { Lesson } from '../domain/types'
import Meter from './Meter'
import Badge from './ui/Badge'
import Button from './ui/Button'
import Row from './ui/Row'
import Rows from './ui/Rows'
import SectionHead from './ui/SectionHead'
import Tooltip from './ui/Tooltip'

export interface LessonRow {
  lesson: Lesson
  mastery: LessonMastery
  referenceOnly: boolean
  isNext: boolean
}

interface LessonGridProps {
  rows: readonly LessonRow[]
  onLearn: (lessonId: number) => void
  onPractise: (lessonId: number) => void
  onOpenReference: (lessonId: number) => void
}

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

/**
 * One line per lesson.
 *
 * These rows used to be about 105px each — title, percentage, topic on its own
 * line, meter, count and two links stacked up — which meant a handful of
 * started lessons pushed everything else off the screen.
 */
function LessonLine({
  row,
  onLearn,
  onPractise,
  onOpenReference,
}: { row: LessonRow } & Omit<LessonGridProps, 'rows'>) {
  const { lesson, mastery, referenceOnly } = row
  const percent = Math.round(mastery.fraction * 100)

  return (
    <Row
      title={lessonName(lesson)}
      badge={referenceOnly ? <Badge>Reading</Badge> : null}
      topic={lesson.topicEn}
      actions={
        referenceOnly ? (
          <Button variant="quiet" size="tiny" onClick={() => onOpenReference(lesson.id)}>
            Read
          </Button>
        ) : (
          <>
            <Button variant="quiet" size="tiny" onClick={() => onLearn(lesson.id)}>
              Words
            </Button>
            <Button variant="quiet" size="tiny" onClick={() => onPractise(lesson.id)}>
              Practise
            </Button>
          </>
        )
      }
    >
      {referenceOnly ? (
        <span className="row__meta">{lesson.notesEn.length} notes</span>
      ) : (
        <>
          <span className="row__meter">
            <Meter
              value={percent}
              max={100}
              size="sm"
              tone={mastery.fraction >= 0.8 ? 'good' : 'accent'}
              label={`${lessonName(lesson)} mastery`}
            />
          </span>
          <span className="row__figure">{percent}%</span>
          <span className="row__meta row__meta--optional">
            {mastery.weak > 0 ? `${mastery.weak} to review` : `${mastery.started}/${mastery.total}`}
          </span>
        </>
      )}
    </Row>
  )
}

/**
 * At 75 lessons a row each would be an endless scroll, so only the lessons in
 * play get a line. The rest of the book is a tile grid that doubles as a map
 * of where the student has reached.
 */
export default function LessonGrid({ rows, onLearn, onPractise, onOpenReference }: LessonGridProps) {
  const [showAll, setShowAll] = useState(false)

  // The next lesson is the hero of the page, so it is not repeated here.
  const inProgress = rows.filter((row) => !row.isNext && row.mastery.started > 0 && !row.referenceOnly)
  const lines = showAll ? rows : inProgress

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
        <Rows>
          {lines.map((row) => (
            <LessonLine
              key={row.lesson.id}
              row={row}
              onLearn={onLearn}
              onPractise={onPractise}
              onOpenReference={onOpenReference}
            />
          ))}
        </Rows>
      )}

      {showAll ? null : (
        <div className="book-map">
          <p className="book-map__caption">
            The whole book. Darker means better known; outlined lessons are reading notes.
          </p>
          <ul className="tiles">
            {rows.map((row) => {
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
        </div>
      )}
    </>
  )
}
