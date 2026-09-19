import { containsArabic } from '../domain/arabic'
import type { Lang } from '../domain/types'

export type PhraseSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface PhraseProps {
  text: string
  lang?: Lang
  size?: PhraseSize
  as?: 'span' | 'p' | 'div' | 'strong'
  className?: string
  /**
   * Set for text inside a compact control — a pill, caption or list subtitle.
   * Arabic then uses tight leading instead of the reading leading, which would
   * otherwise inflate the control to several times the height of its text.
   */
  inline?: boolean
}

/**
 * Renders book text with the right direction, language and font.
 *
 * Arabic runs are bidi-isolated, so mixing them with English labels on one
 * line cannot reorder either side.
 */
export default function Phrase({
  text,
  lang,
  size = 'md',
  as: Tag = 'span',
  className,
  inline = false,
}: PhraseProps) {
  const arabic = lang === 'ar' || (lang !== 'en' && containsArabic(text))
  const classes = [
    'phrase',
    `phrase--${size}`,
    arabic ? 'phrase--ar' : 'phrase--en',
    inline ? 'phrase--inline' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag className={classes} dir={arabic ? 'rtl' : 'ltr'} lang={arabic ? 'ar' : 'en'}>
      {text}
    </Tag>
  )
}
