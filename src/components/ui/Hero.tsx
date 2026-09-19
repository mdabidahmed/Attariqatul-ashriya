import type { ReactNode } from 'react'

import TopicLabel from '../TopicLabel'

interface HeroProps {
  /** Uppercase, letterspaced: what kind of moment this is. */
  eyebrow?: ReactNode
  title?: ReactNode
  titleId?: string
  topic?: string | null
  caption?: ReactNode
  /** The hero's own content: a score, a meter, whatever the screen is about. */
  children?: ReactNode
  /** The one thing to do next, rendered as a white filled button. */
  primary?: ReactNode
  /** Translucent pills: real alternatives, visibly subordinate. */
  secondary?: ReactNode
  /** `calm` inverts it to a white card for the "nothing due" case. */
  tone?: 'filled' | 'calm'
  /**
   * `centred` is a hero whose whole content is one thing, sized to the space
   * it is given rather than to its own content — the quiz prompt.
   */
  layout?: 'stack' | 'centred'
  /**
   * `h1` on a screen where this hero's title is the only heading the page
   * has — results and reference. Defaults to `h2` for heroes that sit under
   * a screen's own `h1` (the home screen's masthead).
   */
  titleLevel?: 'h1' | 'h2'
}

/**
 * The one filled element on a screen.
 *
 * Everything else in the app is a white card, and when everything leads
 * nothing does — so exactly one block per screen carries the accent fill, and
 * it is the block holding what the screen is actually for.
 */
export default function Hero({
  eyebrow,
  title,
  titleId,
  topic,
  caption,
  children,
  primary,
  secondary,
  tone = 'filled',
  layout = 'stack',
  titleLevel = 'h2',
}: HeroProps) {
  const TitleTag = titleLevel
  return (
    <section
      className={`hero ${tone === 'calm' ? 'hero--calm' : ''} ${
        layout === 'centred' ? 'hero--centred' : ''
      }`}
      aria-labelledby={titleId}
    >
      {eyebrow === undefined ? null : <p className="hero__eyebrow">{eyebrow}</p>}
      {title === undefined && !topic ? null : (
        <div className="hero__heading">
          {title === undefined ? null : (
            <TitleTag className="hero__title" id={titleId}>
              {title}
            </TitleTag>
          )}
          {topic ? <TopicLabel className="hero__topic" text={topic} /> : null}
        </div>
      )}
      {caption === undefined ? null : <p className="hero__caption">{caption}</p>}
      {children}
      {primary ? <div className="hero__primary">{primary}</div> : null}
      {secondary ? <div className="hero__secondary">{secondary}</div> : null}
    </section>
  )
}
