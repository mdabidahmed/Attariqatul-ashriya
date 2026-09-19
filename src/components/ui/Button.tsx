import type { ButtonHTMLAttributes, Ref } from 'react'

/**
 * Filled blue leads, everything else steps back. `on-accent` is the
 * translucent pill that only works inside a filled hero.
 */
export type ButtonVariant = 'primary' | 'subtle' | 'ghost' | 'quiet' | 'on-accent'

/** Size is independent of emphasis: a tiny row action can still be primary. */
export type ButtonSize = 'tiny' | 'small' | 'base' | 'hero'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  buttonRef?: Ref<HTMLButtonElement>
}

export default function Button({
  variant = 'quiet',
  size = 'base',
  className,
  buttonRef,
  type = 'button',
  ...rest
}: ButtonProps) {
  const sizeClass = size === 'base' ? '' : `button--${size}`
  return (
    <button
      {...rest}
      type={type}
      ref={buttonRef}
      className={`button button--${variant} ${sizeClass} ${className ?? ''}`}
    />
  )
}
