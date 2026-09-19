import { useEffect } from 'react'

import { OPTION_LETTERS, type OptionLetter } from '../components/optionLetters'

function optionIndexFromKey(key: string): number | null {
  if (key.length === 1 && key >= '1' && key <= '9') return Number(key) - 1
  const letterIndex = OPTION_LETTERS.indexOf(key.toUpperCase() as OptionLetter)
  return letterIndex === -1 ? null : letterIndex
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

interface Options {
  optionCount: number
  answered: boolean
  onSelect: (index: number) => void
  onAdvance: () => void
}

/**
 * Keyboard control for the quiz: 1-4 or A-D choose an option, Enter or Space
 * advances once an answer is locked in.
 *
 * While unanswered, Enter and Space are left alone so the browser's native
 * button activation still works for anyone tabbing through the options.
 */
export function useQuizKeyboard({ optionCount, answered, onSelect, onAdvance }: Options): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      if (!answered) {
        const index = optionIndexFromKey(event.key)
        if (index !== null && index < optionCount) {
          event.preventDefault()
          onSelect(index)
        }
        return
      }

      if (event.key === 'Enter' || event.key === ' ') {
        // Swallow the key so the focused Next button is not activated twice.
        event.preventDefault()
        onAdvance()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [answered, onAdvance, onSelect, optionCount])
}
