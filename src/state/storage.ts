/**
 * localStorage access that never throws: the API is unavailable in some
 * privacy modes, the quota can be full, and stored values may be corrupt or
 * left over from an older version of the app.
 */

const NAMESPACE = 'attariqa.v1'

function getStore(): Storage | null {
  try {
    const store = globalThis.localStorage
    // Touch it: Safari in private mode throws on write, not on access.
    const probe = `${NAMESPACE}.probe`
    store.setItem(probe, '1')
    store.removeItem(probe)
    return store
  } catch {
    return null
  }
}

export const STORAGE_AVAILABLE = getStore() !== null

export function readRaw(key: string): unknown {
  const store = getStore()
  if (!store) return undefined
  let raw: string | null
  try {
    raw = store.getItem(`${NAMESPACE}.${key}`)
  } catch {
    return undefined
  }
  if (raw === null) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    removeKey(key)
    return undefined
  }
}

export function writeRaw(key: string, value: unknown): boolean {
  const store = getStore()
  if (!store) return false
  try {
    store.setItem(`${NAMESPACE}.${key}`, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeKey(key: string): void {
  const store = getStore()
  if (!store) return
  try {
    store.removeItem(`${NAMESPACE}.${key}`)
  } catch {
    // Nothing sensible to do; the app works without persistence.
  }
}
