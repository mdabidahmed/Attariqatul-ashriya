import Phrase, { type PhraseSize } from './Phrase'
import { OPTION_LETTERS } from './optionLetters'
import type { QuestionOption } from '../domain/types'

export type OptionState = 'idle' | 'correct' | 'wrong' | 'muted'

interface OptionButtonProps {
  option: QuestionOption
  index: number
  state: OptionState
  locked: boolean
  textSize: PhraseSize
  onSelect: (index: number) => void
}

/**
 * Correctness is never signalled by colour alone: each answered state carries
 * an icon and a word as well.
 */
const BADGES: Record<OptionState, { icon: string; label: string } | null> = {
  idle: null,
  muted: null,
  correct: { icon: '\u2713', label: 'Correct' },
  wrong: { icon: '\u2715', label: 'Your answer' },
}

export default function OptionButton({
  option,
  index,
  state,
  locked,
  textSize,
  onSelect,
}: OptionButtonProps) {
  const letter = OPTION_LETTERS[index] ?? String(index + 1)
  const badge = BADGES[state]

  return (
    <button
      type="button"
      className={`option option--${state}`}
      /*
       * The card follows its answer's direction, so the letter badge always
       * sits at the reading start of the text: left for English, right for
       * Arabic. Laying Arabic out left-to-right left a wide dead gap between
       * the badge and the text.
       */
      dir={option.lang === 'ar' ? 'rtl' : 'ltr'}
      onClick={() => onSelect(index)}
      disabled={locked}
      aria-label={`${letter}. ${option.text}`}
    >
      <span className="option__letter" aria-hidden="true">
        {letter}
      </span>
      <Phrase className="option__text" text={option.text} lang={option.lang} size={textSize} />
      {/* Always rendered, so revealing a badge cannot shift the text. */}
      <span className={`option__badge option__badge--${state}`}>
        {badge ? (
          <>
            <span aria-hidden="true">{badge.icon}</span>
            <span className="option__badge-label">{badge.label}</span>
          </>
        ) : null}
      </span>
    </button>
  )
}
