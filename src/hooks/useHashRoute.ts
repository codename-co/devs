/**
 * useHashRoute - URL Hash Route Parser
 *
 * Parses the URL location hash into structured segments and provides
 * utilities for navigation within hash-based routing.
 *
 * Example:
 *   URL: /my/page#category/section/id
 *   Result: { hash: 'category/section/id', segments: ['category', 'section', 'id'] }
 *
 * Usage:
 *   const { hash, segments, setHash, updateSegment, getSegment } = useHashRoute()
 *
 *   // Access segments by index
 *   const category = getSegment(0) // 'category'
 *   const section = getSegment(1)  // 'section'
 *   const id = getSegment(2)       // 'id'
 *
 *   // Update the entire hash
 *   setHash('new/path/here')
 *
 *   // Update a specific segment
 *   updateSegment(1, 'newSection') // → #category/newSection/id
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

export interface HashRouteState {
  /** The raw hash string without the leading '#' */
  hash: string
  /** The hash split into path segments */
  segments: string[]
}

export interface UseHashRouteReturn extends HashRouteState {
  /** Set the entire hash (without '#' prefix) */
  setHash: (newHash: string) => void
  /** Get a specific segment by index, returns undefined if not found */
  getSegment: (index: number) => string | undefined
  /** Update a specific segment at the given index */
  updateSegment: (index: number, value: string) => void
  /** Push a new segment to the end of the hash path */
  pushSegment: (value: string) => void
  /** Remove the last segment from the hash path */
  popSegment: () => void
  /** Clear all hash segments */
  clearHash: () => void
  /** Check if a segment exists at the given index */
  hasSegment: (index: number) => boolean
}

/**
 * Parse a hash string into segments
 */
function parseHash(hash: string): string[] {
  // Remove leading '#' if present
  const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash
  // Split by '/' and filter out empty strings
  return cleanHash.split('/').filter(Boolean)
}

/**
 * Build a hash string from segments
 */
function buildHash(segments: string[]): string {
  return segments.filter(Boolean).join('/')
}

/**
 * Hook that parses URL location hash into structured segments
 * and provides utilities for hash-based navigation.
 */
export function useHashRoute(): UseHashRouteReturn {
  const [state, setState] = useState<HashRouteState>(() => {
    const hash = window.location.hash.slice(1) // Remove '#'
    return {
      hash,
      segments: parseHash(hash),
    }
  })

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      setState({
        hash,
        segments: parseHash(hash),
      })
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Set the entire hash
  const setHash = useCallback((newHash: string) => {
    const cleanHash = newHash.startsWith('#') ? newHash.slice(1) : newHash
    window.location.hash = cleanHash
  }, [])

  // Get a segment by index
  const getSegment = useCallback(
    (index: number): string | undefined => {
      return state.segments[index]
    },
    [state.segments],
  )

  // Update a specific segment
  const updateSegment = useCallback(
    (index: number, value: string) => {
      const newSegments = [...state.segments]

      // Extend array if needed
      while (newSegments.length <= index) {
        newSegments.push('')
      }

      newSegments[index] = value
      const newHash = buildHash(newSegments)
      window.location.hash = newHash
    },
    [state.segments],
  )

  // Push a new segment
  const pushSegment = useCallback(
    (value: string) => {
      const newSegments = [...state.segments, value]
      const newHash = buildHash(newSegments)
      window.location.hash = newHash
    },
    [state.segments],
  )

  // Pop the last segment
  const popSegment = useCallback(() => {
    if (state.segments.length > 0) {
      const newSegments = state.segments.slice(0, -1)
      const newHash = buildHash(newSegments)
      window.location.hash = newHash
    }
  }, [state.segments])

  // Clear all hash
  const clearHash = useCallback(() => {
    window.location.hash = ''
  }, [])

  // Check if segment exists
  const hasSegment = useCallback(
    (index: number): boolean => {
      return (
        index >= 0 && index < state.segments.length && !!state.segments[index]
      )
    },
    [state.segments],
  )

  return useMemo(
    () => ({
      hash: state.hash,
      segments: state.segments,
      setHash,
      getSegment,
      updateSegment,
      pushSegment,
      popSegment,
      clearHash,
      hasSegment,
    }),
    [
      state,
      setHash,
      getSegment,
      updateSegment,
      pushSegment,
      popSegment,
      clearHash,
      hasSegment,
    ],
  )
}

export default useHashRoute
