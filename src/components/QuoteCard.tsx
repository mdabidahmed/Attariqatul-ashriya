import quoteCardImage from './assets/images/quote-card-full.png'

/**
 * The sidebar-column motivation card, as one supplied image. This used to
 * show one of three lines depending on the real streak; the image bakes in
 * only one of them ("A small step every day leads to big results"), so
 * that message no longer varies with actual progress — a deliberate
 * trade-off for using the artwork as-is rather than extracting it.
 */
export default function QuoteCard() {
  return (
    <img
      className="quote-card"
      src={quoteCardImage}
      alt="A small step every day leads to big results."
    />
  )
}
