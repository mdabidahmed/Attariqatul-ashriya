import { useCallback, useMemo, useRef, useState } from 'react'

import { countAvailable, countByMode, type BookIndex } from '../domain/bookIndex'
import { MODE_IDS } from '../domain/modes'
import { buildStudyPlan } from '../domain/plan'
import { lessonMasteryAll, poolCounts } from '../domain/scheduler'
import { percentage } from '../domain/scoring'
import type { Book, SessionFocus, SessionSetup, StudyState } from '../domain/types'
import { useNow } from '../hooks/useNow'
import type { ArabicFontApi } from '../state/useArabicFont'
import type { ThemeApi } from '../state/useTheme'
import GearIcon from './icons/GearIcon'
import LessonGrid, { type LessonRow } from './LessonGrid'
import Phrase from './Phrase'
import PractiseHero from './PractiseHero'
import SettingsDialog from './SettingsDialog'
import SetupPanel from './SetupPanel'
import Button from './ui/Button'
import Panel from './ui/Panel'
import SectionHead from './ui/SectionHead'
import Stat from './ui/Stat'
import StatStrip from './ui/StatStrip'

interface HomeScreenProps {
  book: Book
  index: BookIndex
  study: StudyState
  setup: SessionSetup
  onChangeSetup: (setup: SessionSetup) => void
  onStart: (focus: SessionFocus, lessonIds?: number[]) => void
  onLearn: (lessonId: number) => void
  onOpenReference: (lessonId: number) => void
  onResetProgress: () => void
  fonts: ArabicFontApi
  themeApi: ThemeApi
}

export default function HomeScreen({
  book,
  index,
  study,
  setup,
  onChangeSetup,
  onStart,
  onLearn,
  onOpenReference,
  onResetProgress,
  fonts,
  themeApi,
}: HomeScreenProps) {
  const now = useNow()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const gearRef = useRef<HTMLButtonElement>(null)

  // Native <dialog> restores focus on close, but be explicit about it so the
  // gear is never left unfocused after Escape or a backdrop dismissal.
  const closeSettings = useCallback(() => {
    setSettingsOpen(false)
    gearRef.current?.focus()
  }, [])

  const plan = useMemo(
    () => buildStudyPlan(book.lessons, index, study.items, now),
    [book.lessons, index, study.items, now],
  )

  const masteryByLesson = useMemo(
    () => lessonMasteryAll(index.byLesson, study.items, now),
    [index.byLesson, study.items, now],
  )

  const lessonRows = useMemo<LessonRow[]>(
    () =>
      book.lessons.map((lesson) => ({
        lesson,
        mastery: masteryByLesson.get(lesson.id) ?? {
          lessonId: lesson.id,
          fraction: 0,
          total: 0,
          started: 0,
          mastered: 0,
          weak: 0,
          due: 0,
        },
        referenceOnly: index.referenceLessonIds.has(lesson.id),
        isNext: plan.nextLessonId === lesson.id,
      })),
    [book.lessons, masteryByLesson, index.referenceLessonIds, plan.nextLessonId],
  )

  const nextLesson = useMemo(
    () => book.lessons.find((lesson) => lesson.id === plan.nextLessonId) ?? null,
    [book.lessons, plan.nextLessonId],
  )

  // Drawn from everything practised, not just the current selection: a mistake
  // in lesson four should still resurface while working on lesson twelve.
  const pools = useMemo(
    () => poolCounts(index.answerable, study.items, now),
    [index.answerable, study.items, now],
  )

  const customAvailable = useMemo(
    () => countAvailable(index, setup.lessonIds, setup.modes),
    [index, setup.lessonIds, setup.modes],
  )

  const availabilityByMode = useMemo(
    () => countByMode(index, setup.lessonIds, MODE_IDS),
    [index, setup.lessonIds],
  )

  const { lifetime, streak } = study
  const reviewCount = pools.weak + pools.due
  const startedCount = plan.startedLessonIds.length

  return (
    <section className="screen home">
      {/* A compact identity strip. The title used to take ~125px plus a gap
          before anything actionable appeared. */}
      <header className="masthead">
        <h1 className="masthead__title">
          <span className="masthead__title-en">{book.meta.titleEn}</span>
          <span className="masthead__sep" aria-hidden="true" />
          <Phrase className="masthead__title-ar" text={book.meta.titleAr} lang="ar" size="sm" inline />
        </h1>
        <button
          type="button"
          className="icon-button icon-button--settings"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          aria-haspopup="dialog"
          ref={gearRef}
        >
          <GearIcon />
        </button>
      </header>

      <PractiseHero
        lesson={nextLesson}
        mastery={nextLesson ? (masteryByLesson.get(nextLesson.id) ?? null) : null}
        reviewCount={reviewCount}
        hasPractisedBefore={lifetime.sessions > 0}
        canPractiseSelection={customAvailable > 0}
        onStart={onStart}
        onLearn={onLearn}
      />

      {/* The streak lives here, beside the progress it belongs to, instead
          of stranded in the top-right corner of the page. */}
      <Panel>
        <SectionHead
          title="Your progress"
          action={
            lifetime.seen > 0 ? (
              <Button variant="quiet" size="tiny" onClick={onResetProgress}>
                Reset
              </Button>
            ) : null
          }
        />

        {lifetime.seen > 0 ? (
          <StatStrip>
            <Stat
              label="Lessons started"
              value={startedCount}
              note={`/${index.quizzableLessonIds.size}`}
            />
            <Stat label="Questions answered" value={lifetime.seen} />
            <Stat label="Accuracy" value={`${percentage(lifetime.correct, lifetime.seen)}%`} />
            <Stat
              label="Day streak"
              value={streak.current}
              note={streak.best > streak.current ? `best ${streak.best}` : undefined}
            />
          </StatStrip>
        ) : (
          <p className="text-soft text-sm">
            Nothing practised yet. Finish the first round above and your streak, accuracy and lesson-by-lesson
            progress will show up here.
          </p>
        )}
      </Panel>

      <Panel>
        <LessonGrid
          rows={lessonRows}
          onLearn={onLearn}
          onPractise={(lessonId) => onStart('lesson', [lessonId])}
          onOpenReference={onOpenReference}
        />
      </Panel>

      <details className="disclosure">
        <summary className="disclosure__summary">
          Practise something else
          <span className="text-faint text-sm">
            {setup.lessonIds.length === book.lessons.length
              ? `all ${book.lessons.length} lessons`
              : `${setup.lessonIds.length} of ${book.lessons.length} lessons`}{' '}
            · {customAvailable} questions ready
          </span>
        </summary>
        <SetupPanel
          lessons={book.lessons}
          index={index}
          setup={setup}
          availabilityByMode={availabilityByMode}
          available={customAvailable}
          onChange={onChangeSetup}
          onStart={() => onStart('mixed')}
        />
      </details>

      <SettingsDialog
        open={settingsOpen}
        font={fonts.font}
        theme={themeApi.theme}
        onCommit={fonts.setFont}
        onChangeTheme={themeApi.setTheme}
        onClose={closeSettings}
      />
    </section>
  )
}
