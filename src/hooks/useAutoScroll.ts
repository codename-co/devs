import { useEffect, useRef } from 'react'

/**
 * Hook that manages auto-scrolling to bottom during streaming content.
 *
 * Behaviour:
 * - Scrolls to document bottom as `deps` change while `isActive` is true.
 * - Disengages when the user scrolls up (> 150 px from bottom).
 * - Re-engages when the user scrolls back near the bottom.
 * - Resets scroll lock when `isActive` transitions to true (new stream).
 *
 * @returns `streamingEndRef` — attach to a sentinel `<div>` at the bottom of
 * the streaming region so scroll calculations stay accurate.
 */
export function useAutoScroll(isActive: boolean, deps: unknown[] = []) {
  const streamingEndRef = useRef<HTMLDivElement | null>(null)
  const userHasScrolledUpRef = useRef(false)
  const isAutoScrollingRef = useRef(false)

  // Track user scroll intent
  useEffect(() => {
    const handleScroll = () => {
      if (!isActive) return
      if (isAutoScrollingRef.current) return

      const scrollBottom = window.innerHeight + window.scrollY
      const docHeight = document.documentElement.scrollHeight
      const distanceFromBottom = docHeight - scrollBottom

      if (distanceFromBottom > 150) {
        userHasScrolledUpRef.current = true
      } else {
        userHasScrolledUpRef.current = false
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isActive])

  // Reset scroll lock when streaming starts
  useEffect(() => {
    if (isActive) {
      userHasScrolledUpRef.current = false
    }
  }, [isActive])

  // Scroll to the very bottom as streaming content changes
  useEffect(() => {
    if (isActive && !userHasScrolledUpRef.current && streamingEndRef.current) {
      isAutoScrollingRef.current = true
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'instant',
      })
      requestAnimationFrame(() => {
        isAutoScrollingRef.current = false
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, ...deps])

  return { streamingEndRef }
}
