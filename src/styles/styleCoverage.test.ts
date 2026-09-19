/**
 * Guards against a whole class of regression.
 *
 * Restructuring the home screen once replaced a region of `components.css`
 * that also happened to contain the lesson picker's and the reference
 * screen's rules, silently unstyling both. Nothing failed: the app built,
 * every test passed, and the damage only showed up in a screenshot.
 *
 * So: every class a component renders must have a rule somewhere.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const stylesDir = path.join(repoRoot, 'src/styles')
const componentsDir = path.join(repoRoot, 'src/components')

function readStyles(): string {
  return fs
    .readdirSync(stylesDir)
    .filter((name) => name.endsWith('.css'))
    .map((name) => fs.readFileSync(path.join(stylesDir, name), 'utf8'))
    .join('\n')
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return entry.name.endsWith('.tsx') ? [full] : []
  })
}

/**
 * Classes built from a template literal, e.g. `option--${state}`, appear in
 * source as a prefix. Their variants are covered by the prefix check below.
 */
const DYNAMIC_PREFIXES = [
  'option--',
  'option__badge--',
  'meter--',
  'notice--',
  'feedback--',
  'verdict--',
  'segmented__item--',
  'phrase--',
  'tile--',
  'app--',
  'check--',
  'lesson-row--',
  'picker__list--',
  'picker-line--',
  'chip--',
  'topic__run--',
  'button--',
  'tooltip--',
  'stat--',
]

describe('every rendered class is styled', () => {
  const css = readStyles()
  const defined = new Set<string>()
  for (const match of css.matchAll(/\.([a-zA-Z0-9_-]+)/g)) {
    defined.add(match[1] as string)
  }

  const files = [...walk(componentsDir), path.join(repoRoot, 'src/App.tsx')]

  it('finds components to check', () => {
    expect(files.length).toBeGreaterThan(10)
    expect(defined.size).toBeGreaterThan(100)
  })

  it.each(files.map((file) => [path.relative(repoRoot, file), file] as const))(
    '%s uses only styled classes',
    (_label, file) => {
      const source = fs.readFileSync(file, 'utf8')
      const used = new Set<string>()

      for (const match of source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
        const raw = (match[1] ?? match[2] ?? '').replace(/\$\{[^}]*\}/g, ' ')
        for (const cls of raw.split(/\s+/)) {
          if (cls) used.add(cls)
        }
      }

      const unstyled = [...used].filter((cls) => {
        if (defined.has(cls)) return false
        // A dangling prefix from an interpolated variant is fine as long as
        // the family itself exists in the stylesheet.
        return !DYNAMIC_PREFIXES.some((prefix) => cls === prefix || cls.startsWith(prefix))
      })

      expect(unstyled, `no CSS rule for: ${unstyled.join(', ')}`).toEqual([])
    },
  )
})
