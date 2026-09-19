import { useEffect, useRef } from 'react'

import { LONG_ANSWER_MODES, modeLabel } from '../domain/modes'
import { lessonName } from '../domain/plan'
import type { Session } from '../domain/types'
import { useQuizKeyboard } from '../hooks/useQuizKeyboard'
import FeedbackPanel from './FeedbackPanel'
import OptionButton, { type OptionState } from './OptionButton'
import Phrase from './Phrase'
import Button from './ui/Button'
import Chip from './ui/Chip'
import Chips from './ui/Chips'
import Hero from './ui/Hero'
import SessionHeader from './ui/SessionHeader'

interface QuizScreenProps {
  session: Session
  onSelect: (optionIndex: number) => void
  onNext: () => void
  onEnd: () => void
}

export default function QuizScreen({ session, onSelect, onNext, onEnd }: QuizScreenProps) {
  const { questions, index } = session
  const question = questions[index]
  const answer = session.answers[index] ?? null
  const answered = answer !== null
  const isLast = index === questions.length - 1
  const score = session.answers.filter((entry) => entry?.correct).length
  const answeredCount = session.answers.filter(Boolean).length

  const nextButtonRef = useRef<HTMLButtonElement>(null)

  // Move focus to Next once an answer is locked in, so a keyboard user is
  // never stranded on a button that has just been disabled. No scrolling is
  // needed any more: the whole screen is within the viewport.
  useEffect(() => {
    if (answered) nextButtonRef.current?.focus()
  }, [answered, index])

  useQuizKeyboard({
    optionCount: question?.options.length ?? 0,
    answered,
    onSelect,
    onAdvance: onNext,
  })

  if (!question) return null

  const optionState = (isCorrect: boolean, optionIndex: number): OptionState => {
    if (!answered) return 'idle'
    if (isCorrect) return 'correct'
    if (optionIndex === answer.chosenIndex) return 'wrong'
    return 'muted'
  }

  const longAnswers = LONG_ANSWER_MODES.has(question.mode)
  const requested = session.setup.count === 'all' ? null : session.setup.count
  const isShortSession = requested !== null && questions.length < requested

  return (
    /*
     * Sentences and Q&A need the full width to stay on one or two lines;
     * single words do not, and at 1100px a four-word answer sat alone in a
     * row of empty white. Short answers get the same reading measure as the
     * rest of the app.
     */
    <section className={`screen quiz ${longAnswers ? 'quiz--wide' : ''}`}>
      <SessionHeader
        counter={
          <>
            Question <strong>{index + 1}</strong> of <strong>{questions.length}</strong>
          </>
        }
        trailing={
          <>
            <p>
              <strong>{score}</strong> right
            </p>
            <Button
              variant="quiet"
              className="session__exit"
              onClick={onEnd}
              aria-label="End session and see your results"
            >
              End session
            </Button>
          </>
        }
        value={answeredCount}
        max={questions.length}
        meterLabel={`${answeredCount} of ${questions.length} questions answered`}
        chips={
          <Chips>
            <Chip tone="accent">{modeLabel(question.mode)}</Chip>
            <Chip>{lessonName({ id: question.lessonId })}</Chip>
            {isShortSession ? (
              <Chip tone="quiet">
                {session.focus === 'weak' ? 'everything due right now' : 'all this selection has left'}
              </Chip>
            ) : null}
          </Chips>
        }
      />

      {/*
       * The flexible row, and the screen's hero: the prompt is what the
       * student is answering, so it carries the accent fill the same way the
       * home screen's "what to practise next" does. Filling it costs no
       * vertical space — it is the same box, differently painted — and it
       * absorbs the slack, so a one- or two-line prompt never moves an option.
       */}
      <Hero
        layout="centred"
        eyebrow={
          question.mode === 'qa'
            ? 'Choose the correct Arabic reply'
            : question.answer.lang === 'ar'
              ? 'Choose the Arabic'
              : 'Choose the English meaning'
        }
      >
        <Phrase
          as="p"
          className="prompt__text"
          text={question.prompt.text}
          lang={question.prompt.lang}
          size="xl"
        />
      </Hero>

      <div className="options">
        {question.options.map((option, optionIndex) => (
          <OptionButton
            key={option.id}
            option={option}
            index={optionIndex}
            state={optionState(option.isCorrect, optionIndex)}
            locked={answered}
            textSize={longAnswers ? 'sm' : 'md'}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* Fixed height, so the feedback bar replaces the hint without moving
          a single option. */}
      <div className="quiz__footer">
        {answered ? (
          <FeedbackPanel
            question={question}
            answer={answer}
            isLast={isLast}
            onNext={onNext}
            nextButtonRef={nextButtonRef}
          />
        ) : (
          <p className="session__hint">
            <kbd>1</kbd>
            <kbd>2</kbd>
            <kbd>3</kbd>
            <kbd>4</kbd> or <kbd>A</kbd>–<kbd>D</kbd> to answer
          </p>
        )}
      </div>
    </section>
  )
}
