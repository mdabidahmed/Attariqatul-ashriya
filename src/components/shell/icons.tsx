interface IconProps {
  /** Edge length in pixels; the glyph scales with it. */
  size?: number
}

/**
 * The shell's nav and topbar glyphs: plain stroked line icons, hand-drawn
 * like `GearIcon`, so the sidebar does not pull in an icon library for eight
 * simple pictograms. Every one is decorative (`aria-hidden`) — the
 * accessible name belongs on the button or link that wraps it.
 */
function iconProps(size: number) {
  return {
    className: 'icon',
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
    focusable: false as const,
  }
}

export function HomeIcon({ size = 20 }: IconProps) {
  return (
    <svg {...iconProps(size)}>
      <path d="M3.5 10.5L12 3.5l8.5 7" />
      <path d="M5.5 9v10.5h13V9" />
      <path d="M9.75 19.5v-6h4.5v6" />
    </svg>
  )
}

export function LessonsIcon({ size = 20 }: IconProps) {
  return (
    <svg {...iconProps(size)}>
      <path d="M12 5.5c-1.6-1.2-3.9-1.5-6-1.5v13.5c2.1 0 4.4.3 6 1.5" />
      <path d="M12 5.5c1.6-1.2 3.9-1.5 6-1.5v13.5c-2.1 0-4.4.3-6 1.5" />
      <path d="M12 5.5v13.5" />
    </svg>
  )
}

export function PracticeIcon({ size = 20 }: IconProps) {
  return (
    <svg {...iconProps(size)}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1Z" />
      <path d="M9 11h6M9 14.5h6M9 18h3.5" />
    </svg>
  )
}

export function BookmarkIcon({ size = 20 }: IconProps) {
  return (
    <svg {...iconProps(size)}>
      <path d="M6.5 4h11a1 1 0 0 1 1 1v15l-6.5-4-6.5 4V5a1 1 0 0 1 1-1Z" />
    </svg>
  )
}

export function ProgressIcon({ size = 20 }: IconProps) {
  return (
    <svg {...iconProps(size)}>
      <path d="M4 20V10M11 20V4M18 20v-7" />
      <path d="M3 20.5h18" />
    </svg>
  )
}

export function SunIcon({ size = 18 }: IconProps) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.3M12 19.2v2.3M4.4 4.4l1.6 1.6M18 18l1.6 1.6M2.5 12h2.3M19.2 12h2.3M4.4 19.6L6 18M18 6l1.6-1.6" />
    </svg>
  )
}

export function MoonIcon({ size = 18 }: IconProps) {
  return (
    <svg {...iconProps(size)}>
      <path d="M20 14.2A8.5 8.5 0 1 1 9.8 4a6.7 6.7 0 0 0 10.2 10.2Z" />
    </svg>
  )
}

export function SearchIcon({ size = 18 }: IconProps) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M19.5 19.5l-4.6-4.6" />
    </svg>
  )
}

/** The stat strip's four glyphs: lessons, questions, accuracy, streak. */
export function ClipboardCheckIcon({ size = 18 }: IconProps) {
  return (
    <svg {...iconProps(size)}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1Z" />
      <path d="M9 13.2l2 2 4-4.4" />
    </svg>
  )
}

export function TargetIcon({ size = 18 }: IconProps) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </svg>
  )
}

export function FlameIcon({ size = 18 }: IconProps) {
  return (
    <svg {...iconProps(size)}>
      <path d="M12 21c4 0 6.5-2.6 6.5-6 0-3-2-4.8-3-7-0.5 1.5-1.4 2.3-2.2 2.3 0.4-2.6-0.8-5-3.3-6.8 0.3 2.2-0.6 3.9-2 5.4C6.4 10.4 5.5 12 5.5 14c0 3.6 2.5 7 6.5 7Z" />
    </svg>
  )
}

/** The motivation cards' two glyphs: study tips and the encouragement quote. */
export function LightbulbIcon({ size = 18 }: IconProps) {
  return (
    <svg {...iconProps(size)}>
      <path d="M9 18.5h6M9.5 21h5" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c0.6 0.45 0.9 1.15 0.9 1.9v0.2h5.2v-0.2c0-0.75 0.3-1.45 0.9-1.9A6 6 0 0 0 12 3Z" />
    </svg>
  )
}

export function SproutIcon({ size = 18 }: IconProps) {
  return (
    <svg {...iconProps(size)}>
      <path d="M12 21v-9" />
      <path d="M12 12C12 8.5 9.5 6.5 5.5 6.5 5.5 10 7.5 12 12 12Z" />
      <path d="M12 10.5c0-3 2-5.5 6-5.5 0 3.5-2 6-6 5.5Z" />
    </svg>
  )
}
