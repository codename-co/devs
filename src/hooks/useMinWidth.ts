import { useState, useEffect } from 'react'

/**
 * Returns true when the viewport width is at or above the given threshold.
 * Re-evaluates on window resize.
 */
export function useMinWidth(minWidth: number): boolean {
  const [isWide, setIsWide] = useState(() => window.innerWidth >= minWidth)

  useEffect(() => {
    const check = () => setIsWide(window.innerWidth >= minWidth)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [minWidth])

  return isWide
}
