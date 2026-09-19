interface GearIconProps {
  /** Edge length in pixels; the glyph scales with it. */
  size?: number
}

/**
 * A cog, hand-written so one glyph does not pull in an icon library.
 *
 * Drawn as a single filled silhouette with the hub punched out by
 * `fill-rule="evenodd"`. Eight chunky teeth sit flush with the ring. An
 * earlier attempt used thin detached spokes, which reads as a brightness sun
 * rather than a gear; teeth continuous with the body plus a hollow hub are the
 * two cues that make a cog a cog. Filled rather than stroked because stroked
 * teeth turn to mush at the ~22px this renders at, and the silhouette fills
 * most of the viewBox for the same reason.
 *
 * Decorative by design: `aria-hidden` here, and the accessible name belongs on
 * the button that wraps it.
 */
export default function GearIcon({ size = 22 }: GearIconProps) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.76 0.98L14.24 0.98L14.47 3.92A8.45 8.45 0 0 1 15.97 4.54L18.21 2.62L21.38 5.79L19.46 8.03A8.45 8.45 0 0 1 20.08 9.53L23.02 9.76L23.02 14.24L20.08 14.47A8.45 8.45 0 0 1 19.46 15.97L21.38 18.21L18.21 21.38L15.97 19.46A8.45 8.45 0 0 1 14.47 20.08L14.24 23.02L9.76 23.02L9.53 20.08A8.45 8.45 0 0 1 8.03 19.46L5.79 21.38L2.62 18.21L4.54 15.97A8.45 8.45 0 0 1 3.92 14.47L0.98 14.24L0.98 9.76L3.92 9.53A8.45 8.45 0 0 1 4.54 8.03L2.62 5.79L5.79 2.62L8.03 4.54A8.45 8.45 0 0 1 9.53 3.92ZM12 8.4A3.6 3.6 0 1 0 12 15.6A3.6 3.6 0 1 0 12 8.4Z"
      />
    </svg>
  )
}
