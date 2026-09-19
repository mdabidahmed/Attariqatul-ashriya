import { useCallback, useRef, useState, type ReactNode } from 'react'

interface TooltipProps {
  label: string
  children: ReactNode
}

type TooltipState = { top: number; left: number; placement: 'above' | 'below' }

const GAP = 8
const EDGE_MARGIN = 8
/** Below this much room above the trigger, there is nowhere to put an
    "above" tooltip without it running off the top of the page. */
const MIN_ROOM_ABOVE = 48

/**
 * A small floating label, positioned from the trigger's own on-screen
 * position rather than sitting in normal document flow.
 *
 * This exists instead of the native `title` attribute because `title`
 * renders wherever the browser's own tooltip happens to land — routinely
 * over whatever content sits just below the trigger — cannot be styled to
 * match the app, is slow to appear, and never shows for a keyboard user
 * tabbing through rather than hovering. This one prefers the space above the
 * trigger (so it does not sit on top of a grid of other things to click),
 * flips below when there is no room, and shows on focus as well as hover.
 *
 * The label is also carried on the trigger's own `aria-label`, so a screen
 * reader gets it regardless of whether this visual bubble is showing.
 */
export default function Tooltip({ label, children }: TooltipProps) {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const [state, setState] = useState<TooltipState | null>(null)

  const show = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect()
    if (!rect) return
    const placement: TooltipState['placement'] = rect.top > MIN_ROOM_ABOVE ? 'above' : 'below'
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, EDGE_MARGIN),
      window.innerWidth - EDGE_MARGIN,
    )
    const top = placement === 'above' ? rect.top - GAP : rect.bottom + GAP
    setState({ top, left, placement })
  }, [])

  const hide = useCallback(() => setState(null), [])

  return (
    <span
      ref={anchorRef}
      className="tooltip-anchor"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {state ? (
        <span
          role="tooltip"
          aria-hidden="true"
          className={`tooltip tooltip--${state.placement}`}
          style={{ top: state.top, left: state.left }}
        >
          {label}
        </span>
      ) : null}
    </span>
  )
}
