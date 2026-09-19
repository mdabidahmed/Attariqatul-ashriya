import type { Ref } from 'react'

import { lessonName } from '../domain/plan'
import type { AnswerRecord, Question } from '../domain/types'
import Phrase from './Phrase'

interface FeedbackPanelProps {
  question: Question
  answer: AnswerRecord
  isLast: boolean
  onNext: () => void
  nextButtonRef: Ref<HTMLButtonElement>
}

function pageLabel(pages: readonly number[]): string | null {
  if (pages.length === 0) return null
  if (pages.length === 1) return `p. ${pages[0]}`
  return `pp. ${pages[0]}\u2013${pages[pages.length - 1]}`
}

/**
 * The moment after an answer, as a compact bar.
 *
 * It sits in a fixed-height row so it can appear without pushing any option
 * off screen: the four cards stay exactly where they were, already marked with
 * a tick and a cross, and this names the correct pairing beside them. The
 * model sentence from the book only appears where there is vertical room for
 * it; on a short viewport the results screen carries it instead.
 */
export default function FeedbackPanel({
  question,
  answer,
  isLast,
  onNext,
  nextButtonRef,
}: FeedbackPanelProps) {
  const chosen = question.options[answer.chosenIndex]
  const tone = answer.correct ? 'correct' : 'wrong'
  const pages = pageLabel(question.bookPages)

  const announcement = answer.correct
    ? `Correct. ${question.prompt.text} is ${question.answer.text}.`
    : `Incorrect. You chose ${chosen?.text ?? 'nothing'}. The correct answer is ${question.answer.text}.`

  return (
    <div className={`feedback feedback--${tone}`}>
      <p className="sr-only" role="status">
        {announcement}
      </p>

      <span className={`verdict verdict--${tone}`}>
        <span className="verdict__icon" aria-hidden="true">
          {answer.correct ? '\u2713' : '\u2715'}
        </span>
        {answer.correct ? 'Correct' : 'Not quite'}
      </span>

      <span className="feedback__pairing">
        <Phrase text={question.prompt.text} lang={question.prompt.lang} size="xs" inline />
        <span className="feedback__equals" aria-hidden="true">
          =
        </span>
        <Phrase text={question.answer.text} lang={question.answer.lang} size="xs" inline />
      </span>

      {question.example ? (
        <span className="feedback__example">
          <Phrase text={question.example.ar} lang="ar" size="xs" inline />
          <span className="feedback__example-en">{question.example.en}</span>
        </span>
      ) : null}

      <span className="feedback__source">
        {[lessonName({ id: question.lessonId }), pages].filter(Boolean).join(' \u00b7 ')}
      </span>

      <button
        type="button"
        className="button button--primary button--next"
        onClick={onNext}
        ref={nextButtonRef}
      >
        {isLast ? 'Results' : 'Next'}
        <kbd aria-hidden="true">{'\u21b5'}</kbd>
      </button>
    </div>
  )
}
