import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'

interface UseHashHighlightOptions {
  /**
   * Duration in milliseconds for the highlight effect.
   * @default 2000
   */
  highlightDuration?: number
  /**
   * Delay in milliseconds before scrolling to the element.
   * Useful when waiting for animations (e.g., accordion expansion).
   * @default 150
   */
  scrollDelay?: number
  /**
   * Scroll behavior options.
   * @default { behavior: 'smooth', block: 'center' }
   */
  scrollOptions?: ScrollIntoViewOptions
}

interface ParsedHash {
  /** The section part (before /) or the full hash if no / present */
  section: string | null
  /** The element part (after /) or null if no / present */
  element: string | null
}

interface UseHashHighlightReturn {
  /**
   * The currently highlighted element ID, or null if none.
   */
  highlightedElement: string | null
  /**
   * The current hash value (without the # prefix).
   */
  hash: string
  /**
   * The parsed hash components (section and element).
   */
  parsedHash: ParsedHash
  /**
   * The section from the hash (for accordion/tab control).
   * Format: #section or #section/element -> returns "section"
   */
  activeSection: string | null
  /**
   * The element from the hash (for highlighting).
   * Format: #section/element -> returns "element"
   */
  activeElement: string | null
  /**
   * Check if a specific element should be highlighted.
   */
  isHighlighted: (elementId: string) => boolean
  /**
   * Get CSS classes for highlighting an element.
   * Returns highlight classes if the element matches, empty string otherwise.
   */
  getHighlightClasses: (elementId: string, baseClasses?: string) => string
  /**
   * Manually trigger highlight for an element.
   */
  triggerHighlight: (elementId: string) => void
  /**
   * Clear the current highlight.
   */
  clearHighlight: () => void
}

/**
 * Hook for handling URL hash-based element highlighting.
 * Automatically scrolls to and highlights elements when navigating via hash links.
 *
 * Hash format: #section or #section/element
 * - #section - Opens/activates a section (e.g., accordion)
 * - #section/element - Opens section AND highlights the element
 *
 * @example
 * ```tsx
 * // URL: /settings#conversational/global-system-instructions
 * const { activeSection, getHighlightClasses } = useHashHighlight()
 *
 * // activeSection = "conversational" (use for accordion control)
 * // activeElement = "global-system-instructions" (auto-highlighted)
 *
 * // Use in JSX
 * <div
 *   id="global-system-instructions"
 *   className={getHighlightClasses('global-system-instructions', 'p-4')}
 * >
 *   ...
 * </div>
 * ```
 */
export function useHashHighlight(
  options: UseHashHighlightOptions = {},
): UseHashHighlightReturn {
  const {
    highlightDuration = 2000,
    scrollDelay = 150,
    scrollOptions = { behavior: 'smooth', block: 'center' },
  } = options

  const location = useLocation()
  const [highlightedElement, setHighlightedElement] = useState<string | null>(
    null,
  )

  const hash = location.hash.replace('#', '')

  // Parse hash format: #section or #section/element
  const parsedHash: ParsedHash = (() => {
    if (!hash) return { section: null, element: null }
    const slashIndex = hash.indexOf('/')
    if (slashIndex === -1) {
      // No slash: hash is just a section
      return { section: hash, element: null }
    }
    // Has slash: split into section and element
    return {
      section: hash.substring(0, slashIndex) || null,
      element: hash.substring(slashIndex + 1) || null,
    }
  })()

  const activeSection = parsedHash.section
  const activeElement = parsedHash.element

  const clearHighlight = useCallback(() => {
    setHighlightedElement(null)
  }, [])

  const triggerHighlight = useCallback(
    (elementId: string) => {
      // Small delay to allow any animations (e.g., accordion expansion)
      setTimeout(() => {
        const element = document.getElementById(elementId)
        if (element) {
          element.scrollIntoView(scrollOptions)
          setHighlightedElement(elementId)
          // Remove highlight after duration
          setTimeout(clearHighlight, highlightDuration)
        }
      }, scrollDelay)
    },
    [scrollDelay, scrollOptions, highlightDuration, clearHighlight],
  )

  // Handle hash changes - trigger highlight for element-level deep links
  useEffect(() => {
    if (!hash) {
      clearHighlight()
      return
    }

    // If hash has an element part (section/element), highlight the element
    if (activeElement) {
      triggerHighlight(activeElement)
    }
  }, [hash, activeElement, triggerHighlight, clearHighlight])

  const isHighlighted = useCallback(
    (elementId: string) => highlightedElement === elementId,
    [highlightedElement],
  )

  const getHighlightClasses = useCallback(
    (elementId: string, baseClasses: string = '') => {
      const highlightClasses =
        'transition-all duration-500 rounded-lg ring-2 ring-primary ring-offset-2 bg-primary-50 dark:bg-primary-900/20'
      const transitionClasses = 'transition-all duration-500 rounded-lg'

      if (highlightedElement === elementId) {
        return `${baseClasses} ${highlightClasses}`.trim()
      }
      return `${baseClasses} ${transitionClasses}`.trim()
    },
    [highlightedElement],
  )

  return {
    highlightedElement,
    hash,
    parsedHash,
    activeSection,
    activeElement,
    isHighlighted,
    getHighlightClasses,
    triggerHighlight,
    clearHighlight,
  }
}

/**
 * CSS class string for highlight effect.
 * Can be used for manual styling when not using getHighlightClasses.
 */
export const HIGHLIGHT_CLASSES =
  'ring-2 ring-primary ring-offset-2 bg-primary-50 dark:bg-primary-900/20'

/**
 * CSS class string for transition effect on highlightable elements.
 */
export const HIGHLIGHT_TRANSITION_CLASSES =
  'transition-all duration-500 rounded-lg'
