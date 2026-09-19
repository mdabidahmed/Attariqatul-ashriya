import { useCallback, useEffect, useState } from 'react'

import { lessonName } from '../domain/plan'
import type { Lesson, QuizItem } from '../domain/types'
import Phrase from './Phrase'
import ActionRow from './ui/ActionRow'
import Button from './ui/Button'
import Chip from './ui/Chip'
import Chips from './ui/Chips'
import SessionHeader from './ui/SessionHeader'

interface LearnScreenProps {
  lesson: Lesson
  items: readonly QuizItem[]
  onIntroduced: (itemIds: readonly string[]) => void
  onQuiz: () => void
  onHome: () => void
}

/**
 * Pre-exposure before testing: a flashcard pass over a lesson's vocabulary so
 * the student is not cold-guessing words they have never seen.
 *
 * The card is the only thing that reveals. There used to be two controls for
 * one action — the card, and a "Show meaning" button under it — which made
 * them read as alternatives and left the action row meaning something
 * different on every card. Now the card reveals and the row navigates, and
 * neither can be mistaken for the other.
 *
 * Nothing here is scored. See the note on self-assessment in the README.
 */
export default function LearnScreen({ lesson, items, onIntroduced, onQuiz, onHome }: LearnScreenProps) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  const card = items[index]
  const isLast = index === items.length - 1

  const reveal = useCallback(() => {
    if (revealed) return
    setRevealed(true)
    // Recorded per card rather than on unmount, so closing the tab part-way
    // through the deck still keeps what was seen.
    if (card) onIntroduced([card.id])
  }, [card, onIntroduced, revealed])

  const advance = useCallback(() => {
    if (isLast) {
      onQuiz()
      return
    }
    setRevealed(false)
    setIndex((current) => Math.min(current + 1, items.length - 1))
  }, [isLast, items.length, onQuiz])

  const goBack = useCallback(() => {
    setRevealed(false)
    setIndex((current) => Math.max(current - 1, 0))
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      // Space and Enter do what the card does, then what the row does: the
      // ordinary flashcard rhythm, one key.
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        if (revealed) advance()
        else reveal()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        advance()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goBack()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [advance, goBack, reveal, revealed])

  if (!card) {
    return (
      <section className="screen learn">
        <p className="text-soft">This lesson has no vocabulary to learn.</p>
        <Button variant="quiet" onClick={onHome}>
          Back to start
        </Button>
      </section>
    )
  }

  return (
    <section className="screen learn">
      {/* The same header as the quiz, because it is the same component: two
          screens in one flow should not have two visual languages. */}
      <SessionHeader
        counter={
          <>
            Card <strong>{index + 1}</strong> of <strong>{items.length}</strong>
          </>
        }
        trailing={
          <Button variant="quiet" className="session__exit" onClick={onHome}>
            Back to start
          </Button>
        }
        value={index + 1}
        max={items.length}
        meterLabel={`Card ${index + 1} of ${items.length}`}
        chips={
          <Chips>
            <Chip tone="accent">Learning</Chip>
            <Chip>{lessonName(lesson)}</Chip>
          </Chips>
        }
      />

      <button
        type="button"
        className={`flashcard ${revealed ? 'flashcard--revealed' : ''}`}
        onClick={reveal}
        aria-expanded={revealed}
        aria-label={revealed ? `${card.prompt.text} means ${card.answer.text}` : 'Show the meaning'}
      >
        <Phrase className="flashcard__ar" text={card.prompt.text} lang="ar" size="xl" />

        {/* Reserved for the tallest case — meaning plus the book's sentence —
            so revealing moves nothing and every card is the same height. */}
        <span className="flashcard__reveal">
          {revealed ? (
            <>
              <span className="flashcard__en">{card.answer.text}</span>
              {card.example ? (
                <span className="flashcard__example">
                  <Phrase text={card.example.ar} lang="ar" size="sm" inline />
                  <span className="flashcard__example-en">{card.example.en}</span>
                </span>
              ) : null}
            </>
          ) : (
            <span className="flashcard__cue">Tap the card to reveal</span>
          )}
        </span>
      </button>

      <ActionRow layout="lead">
        <Button variant="quiet" onClick={goBack} disabled={index === 0} aria-label="Previous card">
          Back
        </Button>
        <Button variant="primary" className="learn__primary" onClick={advance}>
          {isLast ? 'Quiz me on these' : 'Next card'}
        </Button>
      </ActionRow>

      <p className="session__hint">
        <kbd>Space</kbd> reveal · <kbd>→</kbd> next · <kbd>←</kbd> back
      </p>
    </section>
  )
}
