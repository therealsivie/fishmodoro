import { createContext, useContext } from 'react'

export const ClockContext = createContext<number | null>(null)

const readClock = Date.now

export function useNow(): number {
  const now = useContext(ClockContext)
  return now ?? readClock()
}
