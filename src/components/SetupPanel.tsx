import type { BookIndex } from '../domain/bookIndex'
import { MODES } from '../domain/modes'
import type { Lesson, ModeId, SessionSetup } from '../domain/types'
import { QUESTION_COUNTS } from '../state/useSetup'
import LessonPicker from './LessonPicker'
import Button from './ui/Button'
import SectionHead from './ui/SectionHead'

interface SetupPanelProps {
  lessons: readonly Lesson[]
  index: BookIndex
  setup: SessionSetup
  availabilityByMode: Partial<Record<ModeId, number>>
  available: number
  onChange: (setup: SessionSetup) => void
  onStart: () => void
}

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]
}

/** Deep configuration, behind a disclosure so it never blocks starting. */
export default function SetupPanel({
  lessons,
  index,
  setup,
  availabilityByMode,
  available,
  onChange,
  onStart,
}: SetupPanelProps) {
  const update = (patch: Partial<SessionSetup>): void => onChange({ ...setup, ...patch })

  const plannedCount = setup.count === 'all' ? available : Math.min(setup.count, available)

  return (
    <div className="setup">
      <section className="setup__section">
        <SectionHead as="h3" title="Lessons" />
        <LessonPicker
          lessons={lessons}
          index={index}
          selected={setup.lessonIds}
          onChange={(lessonIds) => update({ lessonIds })}
        />
      </section>

      <section className="setup__section">
        <SectionHead as="h3" title="Question types" />
        <ul className="check-list">
          {MODES.map((mode) => {
            const checked = setup.modes.includes(mode.id)
            const count = availabilityByMode[mode.id] ?? 0
            return (
              <li key={mode.id}>
                <label className={`check ${checked ? 'check--on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => update({ modes: toggle(setup.modes, mode.id) })}
                  />
                  <span className="check__body">
                    <span className="check__title">{mode.labelEn}</span>
                    <span className="check__note">{mode.description}</span>
                    <span className={`check__meta ${count === 0 ? 'check__meta--empty' : ''}`}>
                      {count === 0 ? 'nothing available from these lessons' : `${count} questions available`}
                    </span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="setup__section">
        <SectionHead as="h3" title="Session length" />
        <div className="segmented" role="group" aria-label="Number of questions">
          {QUESTION_COUNTS.map((option) => (
            <button
              key={String(option)}
              type="button"
              className={`segmented__item ${setup.count === option ? 'segmented__item--on' : ''}`}
              aria-pressed={setup.count === option}
              onClick={() => update({ count: option })}
            >
              {option === 'all' ? 'All' : option}
            </button>
          ))}
        </div>
        <p className="text-faint text-sm">
          Short sessions finish. Ten to twenty questions a day beats one long session a week.
        </p>
      </section>

      <Button variant="primary" size="hero" onClick={onStart} disabled={plannedCount === 0}>
        {plannedCount === 0
          ? 'No questions from this selection'
          : `Practise this selection (${plannedCount})`}
      </Button>
    </div>
  )
}
