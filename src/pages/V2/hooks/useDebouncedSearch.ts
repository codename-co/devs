import { useCallback, useEffect, useRef, useState } from 'react'

const DEBOUNCE_MS = 200

/**
 * Manages a local input value that debounces writes to an external callback,
 * while staying responsive to external resets (e.g. clear button, navigation).
 *
 * Returns `[localValue, setValue, flush]`:
 * - `setValue` — debounced; use for keystrokes.
 * - `flush` — immediate; use for programmatic updates (filter toggles).
 *
 * How it avoids the sync loop:
 * - Tracks the last value we sent upstream in `sentRef`.
 * - When `externalValue` changes to something different from `sentRef`,
 *   it's an external reset (clear button, back navigation) → sync local state.
 * - When `externalValue` catches up to our debounced write → ignore (no-op).
 */
export function useDebouncedSearch(
  externalValue: string,
  onChange: (value: string) => void,
): readonly [value: string, setValue: (v: string) => void, flush: (v: string) => void] {
  const [localValue, setLocalValue] = useState(externalValue)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const sentRef = useRef(externalValue)

  // Flush immediately — used for programmatic updates (filter toggles)
  const flush = useCallback(
    (value: string) => {
      clearTimeout(timeoutRef.current)
      setLocalValue(value)
      sentRef.current = value
      onChange(value)
    },
    [onChange],
  )

  // Debounced setter — used for keystrokes
  const setValue = useCallback(
    (value: string) => {
      setLocalValue(value)
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        sentRef.current = value
        onChange(value)
      }, DEBOUNCE_MS)
    },
    [onChange],
  )

  // Sync from external changes we didn't initiate (clear button, navigation, etc.)
  useEffect(() => {
    if (externalValue !== sentRef.current) {
      clearTimeout(timeoutRef.current)
      sentRef.current = externalValue
      setLocalValue(externalValue)
    }
  }, [externalValue])

  // Cleanup on unmount
  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  return [localValue, setValue, flush] as const
}
