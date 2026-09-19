import { lessonName } from '../../domain/plan'
import { percentage } from '../../domain/scoring'
import type { StudyState } from '../../domain/types'
import type { LessonRow } from '../LessonGrid'
import Meter from '../Meter'
import { ClipboardCheckIcon, FlameIcon, LessonsIcon, TargetIcon } from '../shell/icons'
import Panel from '../ui/Panel'
import Row from '../ui/Row'
import Rows from '../ui/Rows'
import SectionHead from '../ui/SectionHead'
import Stat from '../ui/Stat'
import StatStrip from '../ui/StatStrip'

interface ProgressPageProps {
  study: StudyState
  rows: readonly LessonRow[]
  totalQuizzableLessons: number
}

/**
 * The fuller version of Home's condensed "Your progress" panel: the same
 * lifetime numbers, plus every lesson's own mastery in one scannable list
 * rather than just the ones currently in play.
 */
export default function ProgressPage({ study, rows, totalQuizzableLessons }: ProgressPageProps) {
  const { lifetime, streak } = study
  const practised = rows.filter((row) => row.mastery.started > 0)
  const startedCount = practised.length

  return (
    <section className="screen page">
      <SectionHead title="Progress" />

      <Panel>
        <StatStrip>
          <Stat
            icon={<LessonsIcon size={18} />}
            tone="accent"
            label="Lessons started"
            value={startedCount}
            note={`/${totalQuizzableLessons}`}
          />
          <Stat
            icon={<ClipboardCheckIcon size={18} />}
            tone="good"
            label="Questions answered"
            value={lifetime.seen}
          />
          <Stat
            icon={<TargetIcon size={18} />}
            tone="bad"
            label="Accuracy"
            value={`${percentage(lifetime.correct, lifetime.seen)}%`}
          />
          <Stat
            icon={<FlameIcon size={18} />}
            tone="warn"
            label="Day streak"
            value={streak.current}
            note={streak.best > streak.current ? `best ${streak.best}` : undefined}
          />
        </StatStrip>
        {lifetime.seen === 0 ? (
          <p className="text-soft text-sm">Once you finish a session, these will start moving.</p>
        ) : null}
      </Panel>

      {practised.length > 0 ? (
        <Panel>
          <SectionHead title="By lesson" count={practised.length} />
          <Rows>
            {practised.map((row) => {
              const percent = Math.round(row.mastery.fraction * 100)
              return (
                <Row key={row.lesson.id} title={lessonName(row.lesson)} topic={row.lesson.topicEn}>
                  <span className="row__meter">
                    <Meter
                      value={percent}
                      max={100}
                      size="sm"
                      tone={row.mastery.fraction >= 0.8 ? 'good' : 'accent'}
                      label={`${lessonName(row.lesson)} mastery`}
                    />
                  </span>
                  <span className="row__figure">{percent}%</span>
                </Row>
              )
            })}
          </Rows>
        </Panel>
      ) : null}
    </section>
  )
}
