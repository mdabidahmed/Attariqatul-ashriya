import { useCallback, useEffect, useRef, useState } from 'react'

import {
  ARABIC_FONTS,
  arabicFontOption,
  commitDraft,
  discardDraft,
  isDirty,
  openDraft,
  stageArabicFont,
  type ArabicFontId,
  type SettingsDraft,
} from '../domain/arabicFont'
import { THEMES, themeOption, type ThemeId } from '../domain/theme'
import Phrase from './Phrase'

interface SettingsDialogProps {
  open: boolean
  /** The face currently in effect app-wide. */
  font: ArabicFontId
  /** The theme currently in effect app-wide. */
  theme: ThemeId
  /** Called only on Save. */
  onCommit: (font: ArabicFontId) => void
  /** Called the moment a theme is picked — see the note below. */
  onChangeTheme: (theme: ThemeId) => void
  onClose: () => void
}

/** Vocalised line from Lesson Nine: shows how a face handles shadda and harakat. */
const PREVIEW = 'أَلسَّمَاءُ فَوْقَنَا، وَالْأَرْضُ تَحْتَنَا'

/**
 * Settings, as a native modal dialog.
 *
 * `showModal()` is used rather than a hand-rolled overlay because it brings
 * focus trapping, Escape handling, the backdrop and inertness of the page
 * behind it for free.
 *
 * The font is staged: the preview below reflects the pending face immediately,
 * but the app only changes on Save. Every dismissal route — Cancel, Escape and
 * the backdrop — runs through the dialog's own `close` event, which discards.
 * Committing is the one explicit path, so there is no route where dismissing
 * can leave the app on a font the student did not choose. Judging a font
 * takes reading it, which is what the preview box is for.
 *
 * The theme is not staged: choosing "Dark" flips the whole app immediately,
 * because that flip *is* the preview — there is nothing more to judge by
 * waiting, and stopping to press Save would only leave the dialog itself
 * showing the wrong theme while you decide.
 */
export default function SettingsDialog({
  open,
  font,
  theme,
  onCommit,
  onChangeTheme,
  onClose,
}: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const savedRef = useRef(false)
  const [draft, setDraft] = useState<SettingsDraft>(() => openDraft(font))

  // Open and close the real dialog to follow the prop.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      savedRef.current = false
      setDraft(openDraft(font))
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open, font])

  // While a modal is up the page behind it must not scroll.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  const handleDialogClose = useCallback(() => {
    // Reached by Cancel, Escape, the backdrop and Save alike. Only Save has
    // already committed, so everything else discards the font draft — the
    // theme has nothing to discard, since it was never staged.
    if (!savedRef.current) setDraft((current) => discardDraft(current))
    savedRef.current = false
    onClose()
  }, [onClose])

  const handleSave = useCallback(() => {
    const committed = commitDraft(draft)
    setDraft(committed)
    savedRef.current = true
    onCommit(committed.committed)
    dialogRef.current?.close()
  }, [draft, onCommit])

  /** A click landing on the dialog box itself is a click on the backdrop. */
  const handleBackdropClick = useCallback((event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) dialogRef.current?.close()
  }, [])

  const active = arabicFontOption(draft.pending)
  const activeTheme = themeOption(theme)
  const dirty = isDirty(draft)

  return (
    <dialog
      className="dialog"
      ref={dialogRef}
      aria-labelledby="settings-title"
      onClose={handleDialogClose}
      onClick={handleBackdropClick}
    >
      <div className="dialog__panel">
        <header className="dialog__head">
          <h2 className="dialog__title" id="settings-title">
            Settings
          </h2>
          <button
            type="button"
            className="icon-button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close settings"
          >
            <span aria-hidden="true">{'✕'}</span>
          </button>
        </header>

        <div className="dialog__body">
          <section className="setting">
            <h3 className="setting__title">Theme</h3>
            <p className="setting__hint">Light and dark both follow the same blue accent.</p>

            <div className="segmented segmented--stack" role="radiogroup" aria-label="Theme">
              {THEMES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={theme === option.id}
                  className={`segmented__item ${theme === option.id ? 'segmented__item--on' : ''}`}
                  onClick={() => onChangeTheme(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <p className="setting__note">{activeTheme.note}</p>
          </section>

          <section className="setting">
            <h3 className="setting__title">Arabic font</h3>
            <p className="setting__hint">
              Amiri matches how the book is typeset and keeps the harakat clearest. The Nastaliq faces are
              more decorative and slower to read.
            </p>

            <div className="segmented segmented--stack" role="radiogroup" aria-label="Arabic font">
              {ARABIC_FONTS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={draft.pending === option.id}
                  className={`segmented__item ${draft.pending === option.id ? 'segmented__item--on' : ''}`}
                  onClick={() => setDraft((current) => stageArabicFont(current, option.id))}
                >
                  {option.label}
                  <span className="segmented__note">{option.script}</span>
                </button>
              ))}
            </div>

            <p className="setting__note">{active.note}</p>

            {/*
             * Scoping data-arabic-font here previews the pending face without
             * touching the app-wide setting: the font tokens are plain
             * attribute selectors, so they cascade from any element.
             */}
            <div className="font-preview" data-arabic-font={draft.pending}>
              <p className="font-preview__label">Preview</p>
              <Phrase as="p" className="font-preview__sample" text={PREVIEW} lang="ar" size="lg" />
              <p className="text-faint text-sm">The sky is above us, and the ground is beneath us.</p>
            </div>
          </section>
        </div>

        <footer className="dialog__foot">
          <p className="dialog__status" role="status">
            {dirty ? 'Not saved yet' : 'Everything saved'}
          </p>
          <button type="button" className="button button--quiet" onClick={() => dialogRef.current?.close()}>
            Cancel
          </button>
          <button type="button" className="button button--primary" onClick={handleSave} disabled={!dirty}>
            Save
          </button>
        </footer>
      </div>
    </dialog>
  )
}
