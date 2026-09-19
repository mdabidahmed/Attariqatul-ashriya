interface MeterProps {
  value: number
  max: number
  label: string
  tone?: 'accent' | 'good' | 'on-accent'
  size?: 'sm' | 'md'
}

export default function Meter({ value, max, label, tone = 'accent', size = 'md' }: MeterProps) {
  const safeMax = max > 0 ? max : 1
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100))

  return (
    <div
      className={`meter meter--${size} meter--${tone}`}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-label={label}
    >
      <div className="meter__fill" style={{ width: `${percent}%` }} />
    </div>
  )
}
