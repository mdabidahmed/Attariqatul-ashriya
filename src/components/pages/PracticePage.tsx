import type { BookIndex } from '../../domain/bookIndex'
import type { Lesson, ModeId, SessionSetup } from '../../domain/types'
import SetupPanel from '../SetupPanel'
import SectionHead from '../ui/SectionHead'

interface PracticePageProps {
  lessons: readonly Lesson[]
  index: BookIndex
  setup: SessionSetup
  availabilityByMode: Partial<Record<ModeId, number>>
  available: number
  onChange: (setup: SessionSetup) => void
  onStart: () => void
}

/**
 * A full page around the existing `SetupPanel` — the same custom-session
 * builder that used to live behind Home's "Practise something else"
 * disclosure, just given the room a real page has instead of a collapsed
 * strip.
 */
export default function PracticePage(props: PracticePageProps) {
  return (
    <section className="screen page">
      <SectionHead title="Practice" count={`${props.available} questions ready`} />
      <SetupPanel {...props} />
    </section>
  )
}
