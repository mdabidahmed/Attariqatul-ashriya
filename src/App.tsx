import { useCallback, useEffect, useMemo, useState } from 'react'

import HomeScreen from './components/HomeScreen'
import LearnScreen from './components/LearnScreen'
import Notice from './components/Notice'
import QuizScreen from './components/QuizScreen'
import ReferenceScreen from './components/ReferenceScreen'
import ResultsScreen from './components/ResultsScreen'
import { LESSONS_URL, loadBook, type BookLoadResult } from './data/loadBook'
import { buildBookIndex } from './domain/bookIndex'
import { buildItems, lessonVocabularyItems } from './domain/items'
import { buildStudyPlan } from './domain/plan'
import { buildQuestions, reshuffleQuestions } from './domain/questions'
import { randomSeed } from './domain/rng'
import { summarise, type SessionSummary } from './domain/scoring'
import { composeSession } from './domain/session'
import type { Question, Session, SessionFocus, SessionSetup } from './domain/types'
import { STORAGE_AVAILABLE } from './state/storage'
import { useArabicFont } from './state/useArabicFont'
import { useSetup } from './state/useSetup'
import { useStudyState } from './state/useStudyState'
import { useTheme } from './state/useTheme'

type Screen =
  | { name: 'home' }
  | { name: 'learn'; lessonId: number }
  | { name: 'reference'; lessonId: number }
  | { name: 'quiz' }
  | { name: 'results'; summary: SessionSummary; setup: SessionSetup; focus: SessionFocus }

function makeSession(questions: Question[], setup: SessionSetup, focus: SessionFocus, seed: number): Session {
  return { questions, answers: [], index: 0, setup, focus, seed, startedAt: Date.now() }
}

export default function App() {
  const [load, setLoad] = useState<BookLoadResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [session, setSession] = useState<Session | null>(null)

  const book = load?.status === 'ready' ? load.book : null
  const { setup, setSetup } = useSetup(book?.lessons ?? null)
  const { study, recordSession, recordIntroduced, reset } = useStudyState()
  const fonts = useArabicFont()
  const themeApi = useTheme()

  useEffect(() => {
    let cancelled = false
    void loadBook().then((result) => {
      if (!cancelled) setLoad(result)
    })
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  // Clearing `load` here rather than in the effect keeps the effect free of
  // synchronous state updates.
  const retryLoad = useCallback(() => {
    setLoad(null)
    setReloadToken((token) => token + 1)
  }, [])

  const items = useMemo(() => (book ? buildItems(book.lessons) : []), [book])
  // Built once per book: everything the UI asks per render reads from here
  // rather than walking several thousand items again.
  const index = useMemo(() => buildBookIndex(book?.lessons ?? [], items), [book, items])

  const startSession = useCallback(
    (focus: SessionFocus, lessonIds?: number[]) => {
      if (items.length === 0 || !book) return
      const now = Date.now()

      // `next` follows the book's grading: the earliest unstarted lesson plus
      // whatever is genuinely due from the lessons already begun.
      const plannedLessons =
        lessonIds ??
        (focus === 'next' || focus === 'weak'
          ? buildStudyPlan(book.lessons, index, study.items, now).focusLessonIds
          : setup.lessonIds)

      const effective: SessionSetup = { ...setup, lessonIds: plannedLessons }
      const seed = randomSeed()

      const composed = composeSession({
        items: index.answerable,
        progress: study.items,
        lessonIds: plannedLessons,
        modes: effective.modes,
        // Capped like any other session. Leaving review uncapped produced
        // 189-question sittings; anything still due simply stays due.
        count: effective.count,
        focus,
        seed,
        now,
      })

      const { questions } = buildQuestions(composed.items, items, seed)
      if (questions.length === 0) return

      setSession(makeSession(questions, effective, focus, seed))
      setScreen({ name: 'quiz' })
      window.scrollTo({ top: 0 })
    },
    [book, index, items, setup, study.items],
  )

  const handleSelect = useCallback((optionIndex: number) => {
    setSession((current) => {
      if (!current) return current
      if (current.answers[current.index]) return current
      const question = current.questions[current.index]
      if (!question) return current

      const answers = current.answers.slice()
      answers[current.index] = {
        questionId: question.id,
        itemId: question.itemId,
        chosenIndex: optionIndex,
        correct: optionIndex === question.correctIndex,
        answeredAt: Date.now(),
      }
      return { ...current, answers }
    })
  }, [])

  const finish = useCallback(
    (finished: Session) => {
      const summary = summarise(finished)
      if (summary.outcomes.length > 0) recordSession(summary.outcomes)
      setSession(null)
      setScreen({ name: 'results', summary, setup: finished.setup, focus: finished.focus })
      window.scrollTo({ top: 0 })
    },
    [recordSession],
  )

  const handleNext = useCallback(() => {
    if (!session || !session.answers[session.index]) return
    if (session.index + 1 < session.questions.length) {
      setSession({ ...session, index: session.index + 1 })
      window.scrollTo({ top: 0 })
    } else {
      finish(session)
    }
  }, [finish, session])

  const handleEnd = useCallback(() => {
    if (session) finish(session)
  }, [finish, session])

  const handleDrillMissed = useCallback(() => {
    if (screen.name !== 'results' || screen.summary.missed.length === 0) return
    const seed = randomSeed()
    const questions = reshuffleQuestions(
      screen.summary.missed.map((entry) => entry.question),
      seed,
    )
    setSession(makeSession(questions, screen.setup, 'weak', seed))
    setScreen({ name: 'quiz' })
    window.scrollTo({ top: 0 })
  }, [screen])

  const handleAgain = useCallback(() => {
    if (screen.name !== 'results') return
    startSession(screen.focus === 'weak' ? 'weak' : 'mixed')
  }, [screen, startSession])

  const goHome = useCallback(() => {
    setSession(null)
    setScreen({ name: 'home' })
    window.scrollTo({ top: 0 })
  }, [])

  const handleLearn = useCallback((lessonId: number) => {
    setScreen({ name: 'learn', lessonId })
    window.scrollTo({ top: 0 })
  }, [])

  const handleOpenReference = useCallback((lessonId: number) => {
    setScreen({ name: 'reference', lessonId })
    window.scrollTo({ top: 0 })
  }, [])

  if (!load) {
    return (
      <main className="app app--centred">
        <div className="loading" role="status">
          <span className="loading__spinner" aria-hidden="true" />
          <p>Loading the lessons…</p>
        </div>
      </main>
    )
  }

  if (load.status === 'error') {
    return (
      <main className="app app--centred">
        <Notice
          tone="error"
          title="The lesson data could not be loaded"
          action={
            <button type="button" className="button button--primary" onClick={retryLoad}>
              Try again
            </button>
          }
        >
          <ul className="reasons">
            {load.reasons.filter(Boolean).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <p className="text-sm">
            Start the app with <code>npm run dev</code> from the repo root so that <code>/data/</code> is
            served.
          </p>
        </Notice>
      </main>
    )
  }

  const currentBook = load.book
  const learnLesson =
    screen.name === 'learn' ? currentBook.lessons.find((lesson) => lesson.id === screen.lessonId) : undefined
  const referenceLesson =
    screen.name === 'reference'
      ? currentBook.lessons.find((lesson) => lesson.id === screen.lessonId)
      : undefined
  // Data notices belong on the home screen: mid-session they are just noise,
  // and on a phone they would push the question below the fold.
  const showDataNotices = screen.name === 'home'
  // The quiz owns the viewport exactly, with no page scroll and no footer.
  const isQuiz = Boolean(session) && screen.name === 'quiz'
  // The flashcards own the viewport too: same discipline, same rhythm.
  const isFixed = isQuiz || screen.name === 'learn'

  return (
    <main className={isFixed ? 'app app--fixed' : 'app'}>
      {showDataNotices && load.source === 'seed' ? (
        <Notice
          tone="warn"
          title="Practising on seed data"
          action={
            <button type="button" className="button button--subtle button--small" onClick={retryLoad}>
              Check again
            </button>
          }
        >
          <p className="text-sm">
            <code>{LESSONS_URL}</code> is not available yet, so {currentBook.lessons.length} hand-made lessons
            are standing in. The real book data is picked up automatically once that file appears.
          </p>
        </Notice>
      ) : null}

      {showDataNotices && load.issues.length > 0 ? (
        <Notice
          tone="info"
          title={`${load.issues.length} content issue${load.issues.length === 1 ? '' : 's'} skipped`}
        >
          <ul className="reasons">
            {load.issues.slice(0, 6).map((issue) => (
              <li key={`${issue.where}-${issue.message}`}>
                <strong>{issue.where}:</strong> {issue.message}
              </li>
            ))}
            {load.issues.length > 6 ? <li>…and {load.issues.length - 6} more.</li> : null}
          </ul>
        </Notice>
      ) : null}

      {showDataNotices && !STORAGE_AVAILABLE ? (
        <Notice tone="info" title="Progress will not be saved">
          <p className="text-sm">
            This browser is blocking local storage, so scheduling and streaks last only for this visit.
          </p>
        </Notice>
      ) : null}

      {session && screen.name === 'quiz' ? (
        <QuizScreen session={session} onSelect={handleSelect} onNext={handleNext} onEnd={handleEnd} />
      ) : screen.name === 'results' ? (
        <ResultsScreen
          summary={screen.summary}
          streakDays={study.streak.current}
          onDrillMissed={handleDrillMissed}
          onAgain={handleAgain}
          onHome={goHome}
        />
      ) : screen.name === 'reference' && referenceLesson ? (
        <ReferenceScreen lesson={referenceLesson} onHome={goHome} />
      ) : screen.name === 'learn' && learnLesson ? (
        <LearnScreen
          lesson={learnLesson}
          items={lessonVocabularyItems(items, learnLesson.id)}
          onIntroduced={recordIntroduced}
          onQuiz={() => startSession('lesson', [learnLesson.id])}
          onHome={goHome}
        />
      ) : (
        <HomeScreen
          book={currentBook}
          index={index}
          study={study}
          setup={setup}
          onChangeSetup={setSetup}
          onStart={startSession}
          onLearn={handleLearn}
          onOpenReference={handleOpenReference}
          onResetProgress={reset}
          fonts={fonts}
          themeApi={themeApi}
        />
      )}

      {isFixed ? null : (
        <footer className="app__footer">
          <p>
            {currentBook.meta.titleEn} · {load.source === 'live' ? 'live lesson data' : 'seed lesson data'}
          </p>
        </footer>
      )}
    </main>
  )
}
