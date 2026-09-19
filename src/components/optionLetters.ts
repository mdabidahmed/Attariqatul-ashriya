/** Labels for the four answer options, shared by the buttons and the keyboard handler. */
export const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const

export type OptionLetter = (typeof OPTION_LETTERS)[number]
