import { modeLabel } from '../domain/modes'
import { lessonName } from '../domain/plan'
import { percentage, type SessionSummary } from '../domain/scoring'
import Meter from './Meter'
import Phrase from './Phrase'
import Button from './ui/Button'
import Chip from './ui/Chip'
import Chips from './ui/Chips'
import Hero from './ui/Hero'
import Panel from './ui/Panel'
import Row from './ui/Row'
import Rows from './ui/Rows'
import SectionHead from './ui/SectionHead'

interface ResultsScreenProps {
  summary: SessionSummary
  streakDays: number
  onDrillMissed: () => void
  onAgain: () => void
  onHome: () => void
}

function encouragement(percent: number): string {
  if (percent === 100) return 'Every answer correct.'
  if (percent >= 80) return 'Strong session.'
  if (percent >= 50) return 'Solid work \u2014 the misses below are your next win.'
  return 'These words need another pass. That is what the drill is for.'
}

interface BreakdownRow {
  key: string
  label: string
  topic?: string
  correct: number
  total: number
}

/**
 * The same row as the home screen's lessons: name, topic, meter, percentage,
 * raw count. A fifty-question session can touch twenty lessons, so these
 * have to be scannable at a glance rather than read one by one.
 */
function Breakdown({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  if (rows.length === 0) return null
  return (
    <Panel>
      <SectionHead title={title} count={rows.length > 6 ? rows.length : undefined} />
      <Rows>
        {rows.map((row) => {
          const percent = percentage(row.correct, row.total)
          return (
            <Row key={row.key} title={row.label} topic={row.topic}>
              <span className="row__meter">
                <Meter
                  value={row.correct}
                  max={row.total}
                  size="sm"
                  tone={row.correct === row.total ? 'good' : 'accent'}
                  label={`${row.label}: ${row.correct} of ${row.total}`}
                />
              </span>
              <span className="row__figure">{percent}%</span>
              <span className="row__meta row__meta--optional">
                {row.correct}/{row.total}
              </span>
            </Row>
          )
        })}
      </Rows>
    </Panel>
  )
}

export default function ResultsScreen({
  summary,
  streakDays,
  onDrillMissed,
  onAgain,
  onHome,
}: ResultsScreenProps) {
  if (summary.total === 0) {
    return (
      <section className="screen results">
        <Hero
          tone="calm"
          titleId="results-title"
          titleLevel="h1"
          eyebrow="Session ended"
          title="Nothing recorded"
          caption="No questions were answered, so nothing was added to your schedule."
          primary={
            <Button variant="primary" size="hero" onClick={onAgain}>
              Start again
            </Button>
          }
          secondary={
            <Button variant="on-accent" onClick={onHome}>
              Back to start
            </Button>
          }
        />
      </section>
    )
  }

  const missed = summary.missed.length

  return (
    <section className="screen results">
      {/*
       * The same hero as the home screen, carrying the same kind of thing:
       * where you are, and the one button that moves you on. The misses are
       * the reason to keep going, so drilling them is the primary; a fresh
       * session and the way home are the translucent alternatives.
       */}
      <Hero
        titleId="results-title"
        eyebrow="Session complete"
        primary={
          missed > 0 ? (
            <Button variant="primary" size="hero" onClick={onDrillMissed}>
              Drill the {missed} you missed
            </Button>
          ) : (
            <Button variant="primary" size="hero" onClick={onAgain}>
              Another session
            </Button>
          )
        }
        secondary={
          <>
            {missed > 0 ? (
              <Button variant="on-accent" onClick={onAgain}>
                Another session
              </Button>
            ) : null}
            <Button variant="on-accent" onClick={onHome}>
              Back to start
            </Button>
          </>
        }
      >
        <h1 className="score" id="results-title">
          <strong className="score__figure">{summary.correct}</strong>
          <span className="score__of">of {summary.total}</span>
          <span className="score__percent">{summary.percent}%</span>
        </h1>
        <Meter value={summary.correct} max={summary.total} tone="on-accent" label="Session score" />
        <p className="hero__caption">{encouragement(summary.percent)}</p>
        {streakDays > 0 || summary.unanswered > 0 ? (
          <Chips>
            {streakDays > 0 ? (
              <Chip>
                {streakDays} day{streakDays === 1 ? '' : 's'} in a row
              </Chip>
            ) : null}
            {summary.unanswered > 0 ? (
              <Chip>
                {summary.unanswered} left unanswered
              </Chip>
            ) : null}
          </Chips>
        ) : null}
      </Hero>

      {missed > 0 ? (
        <Panel>
          <SectionHead title="Worth another look" count={missed} />
          <ul className="misses">
            {summary.missed.map(({ question, chosen }) => (
              <li key={question.id} className="miss">
                <div className="miss__head">
                  <Phrase
                    className="miss__prompt"
                    text={question.prompt.text}
                    lang={question.prompt.lang}
                    size="sm"
                  />
                  <Chips>
                    <Chip tone="accent">{modeLabel(question.mode)}</Chip>
                    <Chip>{lessonName({ id: question.lessonId })}</Chip>
                  </Chips>
                </div>

                {/* Never colour alone: each line carries an icon and a word. */}
                <div className="miss__answers">
                  <p className="miss__line miss__line--wrong">
                    <span className="miss__key">
                      <span aria-hidden="true">{'\u2715'}</span> You picked
                    </span>
                    {chosen ? (
                      <Phrase text={chosen.text} lang={chosen.lang} size="xs" inline />
                    ) : (
                      <span>&mdash;</span>
                    )}
                  </p>
                  <p className="miss__line miss__line--right">
                    <span className="miss__key">
                      <span aria-hidden="true">{'\u2713'}</span> Correct
                    </span>
                    <Phrase text={question.answer.text} lang={question.answer.lang} size="xs" inline />
                  </p>
                </div>

                {question.example ? (
                  <p className="example example--plain miss__example">
                    <Phrase className="example__ar" text={question.example.ar} lang="ar" size="xs" inline />
                    <span className="example__en">{question.example.en}</span>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Breakdown
        title="By question type"
        rows={summary.perMode.map((row) => ({
          key: row.mode,
          label: modeLabel(row.mode),
          correct: row.correct,
          total: row.total,
        }))}
      />
      <Breakdown
        title="By lesson"
        rows={summary.perLesson.map((row) => ({
          key: String(row.lessonId),
          label: lessonName({ id: row.lessonId }),
          topic: row.topicEn,
          correct: row.correct,
          total: row.total,
        }))}
      />
    </section>
  )
}
