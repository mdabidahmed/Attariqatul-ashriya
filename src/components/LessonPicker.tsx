import { useDeferredValue, useId, useMemo, useState } from 'react'

import type { BookIndex } from '../domain/bookIndex'
import { buildSearchIndex, describeSelection, lessonIdsInRange, searchLessons } from '../domain/lessonRanges'
import { lessonName } from '../domain/plan'
import type { Lesson } from '../domain/types'
import Button from './ui/Button'
import Row from './ui/Row'
import Rows from './ui/Rows'

interface LessonPickerProps {
  lessons: readonly Lesson[]
  index: BookIndex
  selected: readonly number[]
  onChange: (lessonIds: number[]) => void
}

/**
 * Searchable, range-selectable lesson picker.
 *
 * 75 checkboxes is unusable as a flat list, so search leads, the range
 * controls are secondary and compact, and the list itself gets the room. Rows
 * are one line each with the Arabic topic beside the lesson name, matching the
 * home screen's lesson lines.
 */
export default function LessonPicker({ lessons, index, selected, onChange }: LessonPickerProps) {
  const [query, setQuery] = useState('')
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')
  const searchId = useId()
  const fromId = useId()
  const toId = useId()

  const selectedSet = useMemo(() => new Set(selected), [selected])

  // Precomputed once per book: typing must not re-normalise 75 Arabic topics
  // on every keystroke.
  const searchable = useMemo(() => buildSearchIndex(lessons), [lessons])
  // Re-rendering the list costs more than a frame, so it is allowed to lag a
  // keystroke behind while the input itself stays responsive.
  const deferredQuery = useDeferredValue(query)
  const visible = useMemo(() => searchLessons(searchable, deferredQuery), [deferredQuery, searchable])
  const filtering = deferredQuery !== query
  const searching = deferredQuery.trim().length > 0

  const applyRange = (): void => {
    const from = Number.parseInt(rangeFrom, 10)
    const to = Number.parseInt(rangeTo, 10)
    if (!Number.isFinite(from) || !Number.isFinite(to)) return
    onChange(lessonIdsInRange(lessons, from, to))
  }

  const toggle = (lessonId: number): void => {
    onChange(selectedSet.has(lessonId) ? selected.filter((id) => id !== lessonId) : [...selected, lessonId])
  }

  const selectVisible = (): void => {
    const merged = new Set(selected)
    for (const lesson of visible) merged.add(lesson.id)
    onChange([...merged])
  }

  const clearVisible = (): void => {
    const visibleIds = new Set(visible.map((lesson) => lesson.id))
    onChange(selected.filter((id) => !visibleIds.has(id)))
  }

  return (
    <div className="picker">
      {/* One string, separators included, so it cannot run together. */}
      <p className="picker__summary">{describeSelection(selected, lessons.length)}</p>

      <div className="picker__controls">
        <label className="field field--grow" htmlFor={searchId}>
          <span className="sr-only">Search lessons by number or topic</span>
          <input
            id={searchId}
            className="field__input field__input--search"
            type="search"
            value={query}
            placeholder="Search number or topic…"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <Button variant="quiet" size="tiny" onClick={selectVisible}>
          {searching ? `Select ${visible.length}` : 'Select all'}
        </Button>
        <Button variant="quiet" size="tiny" onClick={clearVisible}>
          {searching ? 'Clear these' : 'Clear all'}
        </Button>
      </div>

      <div className="picker__range">
        <span className="picker__range-label">Lessons</span>
        <label className="field field--number" htmlFor={fromId}>
          <span className="sr-only">From lesson number</span>
          <input
            id={fromId}
            className="field__input"
            type="number"
            min={1}
            max={lessons.length}
            value={rangeFrom}
            placeholder="1"
            onChange={(event) => setRangeFrom(event.target.value)}
          />
        </label>
        <span className="picker__range-label">to</span>
        <label className="field field--number" htmlFor={toId}>
          <span className="sr-only">To lesson number</span>
          <input
            id={toId}
            className="field__input"
            type="number"
            min={1}
            max={lessons.length}
            value={rangeTo}
            placeholder={String(lessons.length)}
            onChange={(event) => setRangeTo(event.target.value)}
          />
        </label>
        <Button variant="quiet" size="tiny" onClick={applyRange} disabled={!rangeFrom || !rangeTo}>
          Use range
        </Button>
      </div>

      {visible.length === 0 ? (
        <p className="text-soft text-sm">No lesson matches “{deferredQuery.trim()}”.</p>
      ) : (
        <Rows variant="boxed" pending={filtering}>
          {visible.map((lesson) => {
            const checked = selectedSet.has(lesson.id)
            const questions = index.answerableByLesson.get(lesson.id)?.length ?? 0
            return (
              /* The same row as the home screen's lessons, so scanning the
                 picker and scanning the home list are the same motion. */
              <li key={lesson.id}>
                <Row
                  as="label"
                  selected={checked}
                  lead={<input type="checkbox" checked={checked} onChange={() => toggle(lesson.id)} />}
                  title={lessonName(lesson)}
                  topic={lesson.topicEn}
                >
                  <span className={`row__meta ${questions === 0 ? 'picker__count--none' : ''}`}>
                    {questions === 0 ? 'notes only' : `${questions}`}
                  </span>
                </Row>
              </li>
            )
          })}
        </Rows>
      )}
    </div>
  )
}
