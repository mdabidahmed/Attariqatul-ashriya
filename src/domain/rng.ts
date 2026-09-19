/**
 * Seeded pseudo-random numbers, so a session can be reproduced exactly from
 * its seed: same items, same distractors, same option order.
 */

export type Rng = () => number

/** xmur3 string hash — turns an arbitrary seed into a 32-bit integer. */
export function hash32(input: string): number {
  let h = 1779033703 ^ input.length
  for (let i = 0; i < input.length; i += 1) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^ (h >>> 16)) >>> 0
}

/** A short, stable, collision-resistant id for a string (two 32-bit halves). */
export function stableId(input: string): string {
  const low = hash32(input).toString(36)
  const high = hash32(`${input}\u0000salt`).toString(36)
  return `${low}${high}`
}

/** mulberry32 — small, fast, well-distributed enough for shuffling. */
export function createRng(seed: number | string): Rng {
  let state = (typeof seed === 'number' ? seed : hash32(seed)) >>> 0
  if (state === 0) state = 0x9e3779b9
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Integer in [0, maxExclusive). */
export function randomInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive)
}

/** Fisher-Yates on a copy — the input array is never mutated. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = randomInt(rng, i + 1)
    const a = out[i] as T
    const b = out[j] as T
    out[i] = b
    out[j] = a
  }
  return out
}

/** A fresh seed for a new session. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0
}
