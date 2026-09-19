import bookNameLogo from '../assets/images/book-name-full.png'
import { BookmarkIcon, HomeIcon, LessonsIcon, PracticeIcon, ProgressIcon } from './icons'
import GearIcon from '../icons/GearIcon'

export type NavTarget = 'home' | 'lessons' | 'practice' | 'bookmarks' | 'progress'

interface SidebarProps {
  active: NavTarget
  bookTitleEn: string
  bookTitleAr: string
  onNavigate: (target: NavTarget) => void
  onOpenSettings: () => void
}

const NAV_ITEMS: { target: NavTarget; label: string; Icon: typeof HomeIcon }[] = [
  { target: 'home', label: 'Home', Icon: HomeIcon },
  { target: 'lessons', label: 'Lessons', Icon: LessonsIcon },
  { target: 'practice', label: 'Practice', Icon: PracticeIcon },
  { target: 'bookmarks', label: 'Bookmarks', Icon: BookmarkIcon },
  { target: 'progress', label: 'Progress', Icon: ProgressIcon },
]

/**
 * The persistent left-hand navigation. Below the phone breakpoint this same
 * markup is repainted as a bottom tab bar by `shell.css` rather than being
 * replaced with a second component — one source of truth for the nav items.
 */
export default function Sidebar({ active, bookTitleEn, bookTitleAr, onNavigate, onOpenSettings }: SidebarProps) {
  return (
    <nav className="sidebar" aria-label="Main">
      <div className="sidebar__brand">
        {/* A single pre-composed logo image rather than a live icon+text
            lockup: unlike the hero, this title is static on every screen,
            so there is no dynamic content an image could go stale against.
            The `alt` carries both languages for anyone not seeing the
            image itself. */}
        <img
          className="sidebar__brand-logo"
          src={bookNameLogo}
          alt={`${bookTitleEn} — ${bookTitleAr}`}
        />
      </div>

      <ul className="sidebar__nav">
        {NAV_ITEMS.map(({ target, label, Icon }) => (
          <li key={target}>
            <button
              type="button"
              className={`sidebar__item ${active === target ? 'sidebar__item--on' : ''}`}
              aria-current={active === target ? 'page' : undefined}
              onClick={() => onNavigate(target)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          </li>
        ))}
        <li>
          <button type="button" className="sidebar__item" onClick={onOpenSettings}>
            <GearIcon size={20} />
            <span>Settings</span>
          </button>
        </li>
      </ul>
    </nav>
  )
}
