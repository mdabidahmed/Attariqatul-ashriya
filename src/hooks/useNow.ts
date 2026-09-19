import { useEffect, useState } from 'react'

const MINUTE = 60_000

/**
 * A clock that is stable within a render but refreshes periodically, so
 * "due today" counts stay honest without reading `Date.now()` during render.
 */
export function useNow(intervalMs: number = MINUTE): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])

  return now
}
