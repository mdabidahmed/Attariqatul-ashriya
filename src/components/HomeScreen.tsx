import heroBanner from './assets/images/hero-banner.jpg'
import type { LessonMastery } from '../domain/scheduler'
import { percentage } from '../domain/scoring'
import type { Book, Lesson, SessionFocus, StudyState } from '../domain/types'
import KnowledgeBannerCard from './KnowledgeBannerCard'
import LearningSummaryCard from './LearningSummaryCard'
import LessonGrid, { type LessonRow } from './LessonGrid'
import PractiseHero from './PractiseHero'
import QuoteCard from './QuoteCard'
import { ClipboardCheckIcon, FlameIcon, LessonsIcon, TargetIcon } from './shell/icons'
import StudyTipsCard from './StudyTipsCard'
import Button from './ui/Button'
import Panel from './ui/Panel'
import SectionHead from './ui/SectionHead'
import Stat from './ui/Stat'
import StatStrip from './ui/StatStrip'

interface HomeScreenProps {
  book: Book
  study: StudyState
  lessonRows: readonly LessonRow[]
  nextLesson: Lesson | null
  nextLessonMastery: LessonMastery | null
  reviewCount: number
  customAvailable: number
  onStart: (focus: SessionFocus, lessonIds?: number[]) => void
  onLearn: (lessonId: number) => void
  onOpenReference: (lessonId: number) => void
  onResetProgress: () => void
  isBookmarked: (lessonId: number) => boolean
  onToggleBookmark: (lessonId: number) => void
}

/**
 * The dashboard's landing page: what to practise next, a condensed sense of
 * progress, and the lessons currently in play. The full lesson browser,
 * the custom session builder and the bookmarked list all moved out to their
 * own pages — this one stays about *today*, not the whole book.
 */
export default function HomeScreen({
  book,
  study,
  lessonRows,
  nextLesson,
  nextLessonMastery,
  reviewCount,
  customAvailable,
  onStart,
  onLearn,
  onOpenReference,
  onResetProgress,
  isBookmarked,
  onToggleBookmark,
}: HomeScreenProps) {
  const { lifetime, streak } = study
  const startedCount = lessonRows.filter((row) => row.mastery.started > 0).length

  return (
    <section className="screen home">
      <div className="home-grid">
        <div className="home-grid__main">
          <div className="hero-frame" style={{ backgroundImage: `url(${heroBanner})` }}>
            <PractiseHero
              lesson={nextLesson}
              mastery={nextLessonMastery}
              reviewCount={reviewCount}
              hasPractisedBefore={lifetime.sessions > 0}
              canPractiseSelection={customAvailable > 0}
              onStart={onStart}
              onLearn={onLearn}
            />
          </div>

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

            <StatStrip>
              <Stat
                icon={<LessonsIcon size={18} />}
                tone="accent"
                label="Lessons started"
                value={startedCount}
                note={`/${book.lessons.length}`}
              />
              <Stat
                icon={<ClipboardCheckIcon size={18} />}
                tone="good"
                label="Questions answered"
                value={lifetime.seen}
              />
              <Stat
                icon={<TargetIcon size={18} />}
                tone="bad"
                label="Accuracy"
                value={`${percentage(lifetime.correct, lifetime.seen)}%`}
              />
              <Stat
                icon={<FlameIcon size={18} />}
                tone="warn"
                label="Day streak"
                value={streak.current}
                note={streak.best > streak.current ? `best ${streak.best}` : undefined}
              />
            </StatStrip>
            {lifetime.seen === 0 ? (
              <p className="text-soft text-sm">
                Finish the first round above and these will start moving.
              </p>
            ) : null}
          </Panel>

          <Panel>
            <LessonGrid
              rows={lessonRows}
              onLearn={onLearn}
              onPractise={(lessonId) => onStart('lesson', [lessonId])}
              onOpenReference={onOpenReference}
              isBookmarked={isBookmarked}
              onToggleBookmark={onToggleBookmark}
            />
          </Panel>
        </div>

        <aside className="home-grid__aside">
          <QuoteCard />
          <StudyTipsCard />
          <LearningSummaryCard
            lessonsStarted={startedCount}
            totalLessons={book.lessons.length}
            questionsAnswered={lifetime.seen}
            accuracyPercent={percentage(lifetime.correct, lifetime.seen)}
            streakDays={streak.current}
          />
          <KnowledgeBannerCard />
        </aside>
      </div>
    </section>
  )
}
