import tipsCardImage from './assets/images/tips-card-full.png'

const TIPS = [
  'Study a little every day',
  'Review your mistakes',
  'Learn the words first',
  'Use practice mode',
  'Keep a notebook',
]

/**
 * The sidebar-column study-tips card, as one supplied image rather than a
 * live list — the whole card, icons and all, is the artwork. `alt` carries
 * the same five lines as real text, so a screen reader still gets them even
 * though the visible page doesn't.
 */
export default function StudyTipsCard() {
  return (
    <img
      className="tips-card"
      src={tipsCardImage}
      alt={`Study tips: ${TIPS.join('; ')}`}
    />
  )
}
