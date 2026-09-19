/**
 * Guards the pattern that shears Arabic glyphs.
 *
 * Arabic needs asymmetric vertical room: harakat above, and ن م ج ح ع ي ق س ل
 * ك ه و ر dropping well below the baseline, deepest in final position. Twice
 * now a line box tuned against Latin metrics has clipped it — first the
 * stretched pills, then a fixed `height` plus `overflow: hidden` that cut the
 * descenders off the lesson-row topics.
 *
 * Real ink containment is asserted in the browser, where fonts actually load
 * and glyphs actually rasterise. This test guards the CSS that made it
 * possible, which is what recurs.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const stylesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)))

function css(): string {
  return fs
    .readdirSync(stylesDir)
    .filter((name) => name.endsWith('.css'))
    .map((name) => fs.readFileSync(path.join(stylesDir, name), 'utf8'))
    .join('\n')
}

interface Rule {
  selector: string
  body: string
}

function rules(text: string): Rule[] {
  const out: Rule[] = []
  for (const match of text.matchAll(/(^|\n)([^{}@\n][^{}]*?)\{([^}]*)\}/g)) {
    out.push({ selector: (match[2] ?? '').trim().replace(/\s+/g, ' '), body: match[3] ?? '' })
  }
  return out
}

/** Selectors that carry Arabic in a compact, single-line context. */
const ARABIC_CONTEXTS = ['.topic', '.phrase--ar', '.topic__run--ar', '.option__text', '.chip']

describe('nothing clips Arabic vertically', () => {
  const all = rules(css())

  it('no Arabic context pins a height while hiding overflow', () => {
    const offenders = all
      .filter((rule) => ARABIC_CONTEXTS.some((name) => rule.selector.includes(name)))
      .filter((rule) => /(^|[\s;])height:/.test(rule.body) && /overflow:\s*hidden/.test(rule.body))
      .map((rule) => rule.selector)

    expect(offenders, `these clip through letterforms: ${offenders.join(', ')}`).toEqual([])
  })

  it('a container that hides overflow never fixes its height in em', () => {
    // `height: 1.85em` was the exact shape of the bug: a box sized from the
    // Latin font-size, with the Arabic ink falling outside it.
    const offenders = all
      .filter((rule) => /overflow:\s*hidden/.test(rule.body))
      .filter((rule) => /height:\s*[\d.]+em/.test(rule.body))
      .map((rule) => rule.selector)

    expect(offenders, `em-sized clipping boxes: ${offenders.join(', ')}`).toEqual([])
  })

  it('every font keeps a tight rhythm loose enough for descenders', () => {
    const values = [...css().matchAll(/--ar-line-height-tight:\s*([\d.]+)/g)].map((m) => Number(m[1]))
    expect(values.length, 'a tight rhythm is defined per font').toBeGreaterThanOrEqual(3)
    for (const value of values) {
      // Below about 1.7 the descenders of final ن and م start to shear.
      expect(value, `tight line-height ${value} is too tight for Arabic`).toBeGreaterThanOrEqual(1.7)
    }
  })

  it('the tight rhythm stays tighter than the reading rhythm', () => {
    const reading = [...css().matchAll(/--ar-line-height:\s*([\d.]+)/g)].map((m) => Number(m[1]))
    const tight = [...css().matchAll(/--ar-line-height-tight:\s*([\d.]+)/g)].map((m) => Number(m[1]))
    expect(Math.max(...tight)).toBeLessThan(Math.max(...reading))
  })

  it('compact Arabic keeps some vertical padding for its harakat', () => {
    const pads = [...css().matchAll(/--ar-pad-block-tight:\s*([\d.]+)em/g)].map((m) => Number(m[1]))
    expect(pads.length).toBeGreaterThanOrEqual(3)
    for (const pad of pads) expect(pad).toBeGreaterThan(0)
  })

  /*
   * The quiz options clamp to three lines, which is a height pin with hidden
   * overflow by another name: measured in the browser, it sheared the damma
   * off أُسْتَاذٌ in Amiri at every viewport. A line box sized from the
   * font's own metrics does not contain that face's harakat, so a clipping
   * Arabic context has to take its padding from --ar-pad-clip.
   */
  it('Arabic inside a line-clamped box takes the clip headroom', () => {
    const clamped = all.filter((rule) => /-webkit-line-clamp/.test(rule.body))
    expect(clamped.length, 'something still clamps lines').toBeGreaterThan(0)

    const padded = all
      .filter((rule) => rule.selector.includes('.phrase--ar'))
      .filter((rule) => /--ar-pad-clip/.test(rule.body))
    expect(padded.length, 'the clamped Arabic context declares clip headroom').toBeGreaterThan(0)
  })

  it('every font defines its own clip headroom', () => {
    const values = [...css().matchAll(/--ar-pad-clip:\s*([^;]+);/g)].map((m) => (m[1] as string).trim())
    expect(values.length, 'a clip headroom is defined per font').toBeGreaterThanOrEqual(3)
    for (const value of values) {
      const first = Number.parseFloat(value)
      expect(first, `clip headroom ${value} leaves no room for harakat`).toBeGreaterThan(0)
    }
  })
})
