import { lessonName } from '../domain/plan'
import type { Lesson } from '../domain/types'
import Phrase from './Phrase'
import ActionRow from './ui/ActionRow'
import Button from './ui/Button'
import Chip from './ui/Chip'
import Chips from './ui/Chips'
import Hero from './ui/Hero'
import Panel from './ui/Panel'
import Row from './ui/Row'
import Rows from './ui/Rows'
import SectionHead from './ui/SectionHead'

interface ReferenceScreenProps {
  lesson: Lesson
  onHome: () => void
}

/**
 * Lessons with no quizzable content — the book's "Dictation and laws of
 * Dictation" chapters are orthography rules — are shown as reading material
 * rather than being turned into a dead-end quiz.
 *
 * It is still one of the app's screens, so it is built from the same pieces:
 * the hero carries which lesson this is and why there is nothing to drill,
 * and the reading sits in the ordinary panels under the ordinary labels.
 */
export default function ReferenceScreen({ lesson, onHome }: ReferenceScreenProps) {
  const pages =
    lesson.bookPages.length > 0
      ? `page${lesson.bookPages.length > 1 ? 's' : ''} ${lesson.bookPages.join('\u2013')}`
      : null

  return (
    <section className="screen reference">
      <Hero
        titleId="reference-title"
        titleLevel="h1"
        eyebrow="Reading"
        title={lessonName(lesson)}
        topic={lesson.topicEn}
        caption="No exercises to quiz: this lesson teaches how to write what you have learned, so it is here to read rather than to drill."
      >
        {lesson.titleAr ? (
          <Phrase as="p" className="reference__title-ar" text={lesson.titleAr} lang="ar" size="md" />
        ) : null}
        {pages ? (
          <Chips>
            <Chip>{pages}</Chip>
          </Chips>
        ) : null}
      </Hero>

      <Panel>
        <SectionHead
          title="Notes from the book"
          count={lesson.notesEn.length > 0 ? lesson.notesEn.length : undefined}
        />
        {lesson.notesEn.length > 0 ? (
          <ul className="notes">
            {lesson.notesEn.map((note) => (
              <li key={note} className="notes__item">
                {note}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-soft text-sm">No notes were extracted for this lesson.</p>
        )}
      </Panel>

      {lesson.vocabulary.length > 0 ? (
        <Panel>
          <SectionHead title="Vocabulary in this lesson" count={lesson.vocabulary.length} />
          <Rows>
            {lesson.vocabulary.map((entry) => (
              <Row key={`${entry.en}-${entry.ar}`} title={entry.en}>
                <Phrase text={entry.ar} lang="ar" size="sm" />
              </Row>
            ))}
          </Rows>
        </Panel>
      ) : null}

      {/*
       * The one action, at the end rather than in the hero. Every other
       * screen puts its exit in the top block, but those are things you are
       * doing; this is something you are reading, and the moment you want
       * the way out is the moment you finish. Measured at one viewport plus
       * 200px, so it is never far.
       */}
      <ActionRow>
        <Button variant="subtle" onClick={onHome}>
          Back to start
        </Button>
      </ActionRow>
    </section>
  )
}
