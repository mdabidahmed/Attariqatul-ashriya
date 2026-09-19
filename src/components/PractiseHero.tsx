import { lessonName } from '../domain/plan'
import type { LessonMastery } from '../domain/scheduler'
import type { Lesson, SessionFocus } from '../domain/types'
import Meter from './Meter'
import Button from './ui/Button'
import Hero from './ui/Hero'

interface PractiseHeroProps {
  /** The lesson the book wants next, or null once every lesson is started. */
  lesson: Lesson | null
  mastery: LessonMastery | null
  reviewCount: number
  hasPractisedBefore: boolean
  canPractiseSelection: boolean
  onStart: (focus: SessionFocus, lessonIds?: number[]) => void
  onLearn: (lessonId: number) => void
}

/** Plain language, because "2 to fix · new words from lesson 1" told nobody anything. */
function caption(newWords: number, reviewCount: number): string {
  if (newWords > 0 && reviewCount > 0) {
    return `${newWords} new to learn, plus ${reviewCount} you got wrong before.`
  }
  if (newWords > 0) return `${newWords} new words and sentences to learn.`
  if (reviewCount > 0) return `${reviewCount} to review — nothing new left in this lesson.`
  return 'This lesson is up to date. A round will keep it fresh.'
}

/**
 * The home screen's hero: what to practise next, and the button that starts
 * it. This is the block the rest of the app's heroes are modelled on.
 */
export default function PractiseHero({
  lesson,
  mastery,
  reviewCount,
  hasPractisedBefore,
  canPractiseSelection,
  onStart,
  onLearn,
}: PractiseHeroProps) {
  if (!lesson) {
    return (
      <Hero
        tone="calm"
        titleId="hero-title"
        eyebrow={reviewCount > 0 ? 'Time to review' : 'All caught up'}
        title={reviewCount > 0 ? `${reviewCount} to review` : 'Every lesson started'}
        caption={
          reviewCount > 0
            ? 'These are the words you have missed or not seen in a while.'
            : 'Nothing is due today. Come back tomorrow, or pick any lesson below.'
        }
        primary={
          <Button
            variant="primary"
            size="hero"
            onClick={() => onStart(reviewCount > 0 ? 'weak' : 'mixed')}
            disabled={reviewCount === 0 && !canPractiseSelection}
          >
            {reviewCount > 0 ? 'Start reviewing' : 'Practise anyway'}
          </Button>
        }
      />
    )
  }

  const total = mastery?.total ?? 0
  const started = mastery?.started ?? 0
  const newWords = Math.max(0, total - started)
  const percent = mastery ? Math.round(mastery.fraction * 100) : 0

  return (
    <Hero
      titleId="hero-title"
      eyebrow={hasPractisedBefore ? 'Next up' : 'Start here'}
      title={lessonName(lesson)}
      topic={lesson.topicEn}
      caption={caption(newWords, reviewCount)}
      primary={
        <Button variant="primary" size="hero" onClick={() => onStart('next')}>
          {hasPractisedBefore ? `Practise ${lessonName(lesson)}` : `Start ${lessonName(lesson)}`}
        </Button>
      }
      secondary={
        <>
          <Button variant="on-accent" onClick={() => onLearn(lesson.id)}>
            See the words first
          </Button>
          <Button variant="on-accent" onClick={() => onStart('weak')} disabled={reviewCount === 0}>
            {reviewCount > 0 ? `Review ${reviewCount} due` : 'Nothing due'}
          </Button>
        </>
      }
    >
      {started > 0 ? (
        <div className="hero__progress">
          <Meter
            value={percent}
            max={100}
            size="sm"
            tone="on-accent"
            label={`${lessonName(lesson)} mastery`}
          />
          <span className="hero__progress-label">
            {started} of {total} practised · {percent}% known
          </span>
        </div>
      ) : null}
    </Hero>
  )
}
