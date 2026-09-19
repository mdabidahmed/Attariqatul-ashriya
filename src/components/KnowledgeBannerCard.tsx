import knowledgeBanner from './assets/images/knowledge-banner-full.png'

/**
 * A static decorative card carrying a single, fixed dua — supplied as one
 * image, the same way the study-tips card is. `alt` carries both the
 * Arabic and its translation as real text for anyone not seeing the image.
 */
export default function KnowledgeBannerCard() {
  return (
    <img
      className="knowledge-banner"
      src={knowledgeBanner}
      alt="رَبِّ زِدْنِي عِلْمًا — My Lord, increase me in knowledge"
    />
  )
}
