import { ProgressIcon } from './shell/icons'

interface LearningSummaryCardProps {
  lessonsStarted: number
  totalLessons: number
  questionsAnswered: number
  accuracyPercent: number
  streakDays: number
}

/**
 * The same four lifetime numbers as the main stat strip, restated compactly
 * in the right column — no new data, just a second, denser read of it for
 * whoever is scanning the sidebar rather than the page body.
 */
export default function LearningSummaryCard({
  lessonsStarted,
  totalLessons,
  questionsAnswered,
  accuracyPercent,
  streakDays,
}: LearningSummaryCardProps) {
  const items: { label: string; value: string }[] = [
    { label: 'Lessons', value: `${lessonsStarted} / ${totalLessons}` },
    { label: 'Questions', value: String(questionsAnswered) },
    { label: 'Accuracy', value: `${accuracyPercent}%` },
    { label: 'Day streak', value: String(streakDays) },
  ]

  return (
    <aside className="summary-card">
      <p className="summary-card__title">
        <span className="summary-card__icon" aria-hidden="true">
          <ProgressIcon size={16} />
        </span>
        Learning summary
      </p>
      <dl className="summary-card__list">
        {items.map((item) => (
          <div key={item.label} className="summary-card__row">
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  )
}
