import { useState, useCallback, useEffect, useMemo } from 'react'
import { type LanguageCode } from '@/i18n/locales'
import { loadAllMethodologies } from '@/stores/methodologiesStore'
import type { Methodology } from '@/types/methodology.types'

interface UseMethodologyMentionOptions {
  lang: LanguageCode
  prompt: string
  onPromptChange: (value: string) => void
}

interface MethodologyMentionResult {
  // State
  showMentionPopover: boolean
  mentionQuery: string
  filteredMethodologies: Methodology[]
  selectedIndex: number
  mentionStartIndex: number

  // Actions
  handleMentionSelect: (methodology: Methodology) => void
  handleKeyNavigation: (event: React.KeyboardEvent) => boolean
  closeMentionPopover: () => void

  // Utils
  extractMentionedMethodologies: () => Methodology[]
  removeMentionsFromPrompt: (text: string) => string
}

// Regex to detect #mentions - matches # followed by word characters and hyphens
const MENTION_REGEX = /#([\w-]*)$/

export function useMethodologyMention({
  lang,
  prompt,
  onPromptChange,
}: UseMethodologyMentionOptions): MethodologyMentionResult {
  const [availableMethodologies, setAvailableMethodologies] = useState<
    Methodology[]
  >([])
  const [showMentionPopover, setShowMentionPopover] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)

  // Load all available methodologies
  useEffect(() => {
    const loadMethodologies = async () => {
      const methodologies = await loadAllMethodologies()
      setAvailableMethodologies(methodologies)
    }
    loadMethodologies()
  }, [])

  // Filter methodologies based on mention query
  const filteredMethodologies = useMemo(() => {
    if (!mentionQuery && mentionQuery !== '') {
      return availableMethodologies
    }

    const query = mentionQuery.toLowerCase()
    return availableMethodologies.filter((methodology) => {
      const name = (
        methodology.metadata.i18n?.[lang]?.name ?? methodology.metadata.name
      ).toLowerCase()
      const id = methodology.metadata.id.toLowerCase()
      return name.includes(query) || id.includes(query)
    })
  }, [availableMethodologies, mentionQuery, lang])

  // Detect # mentions while typing
  useEffect(() => {
    // Find if there's an active mention being typed
    const match = prompt.match(MENTION_REGEX)

    if (match) {
      const query = match[1] || ''
      setMentionQuery(query)
      setMentionStartIndex(prompt.length - match[0].length)
      setShowMentionPopover(true)
      setSelectedIndex(0)
    } else {
      setShowMentionPopover(false)
      setMentionQuery('')
      setMentionStartIndex(-1)
    }
  }, [prompt])

  // Handle selecting a methodology from the popover
  const handleMentionSelect = useCallback(
    (methodology: Methodology) => {
      if (mentionStartIndex === -1) return

      const methodologyName =
        methodology.metadata.i18n?.[lang]?.name ?? methodology.metadata.name
      // Replace the partial #mention with the full methodology name
      const beforeMention = prompt.substring(0, mentionStartIndex)
      const afterMention = prompt.substring(
        mentionStartIndex + 1 + mentionQuery.length,
      )
      const newPrompt = `${beforeMention}#${methodologyName} ${afterMention}`

      onPromptChange(newPrompt)
      setShowMentionPopover(false)
      setMentionQuery('')
      setMentionStartIndex(-1)
    },
    [prompt, mentionStartIndex, mentionQuery, onPromptChange, lang],
  )

  // Handle keyboard navigation in the popover
  const handleKeyNavigation = useCallback(
    (event: React.KeyboardEvent): boolean => {
      if (!showMentionPopover || filteredMethodologies.length === 0) {
        return false
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setSelectedIndex((prev) =>
            prev < filteredMethodologies.length - 1 ? prev + 1 : 0,
          )
          return true

        case 'ArrowUp':
          event.preventDefault()
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredMethodologies.length - 1,
          )
          return true

        case 'Tab':
        case 'Enter':
          if (filteredMethodologies[selectedIndex]) {
            event.preventDefault()
            handleMentionSelect(filteredMethodologies[selectedIndex])
            return true
          }
          return false

        case 'Escape':
          event.preventDefault()
          setShowMentionPopover(false)
          return true

        default:
          return false
      }
    },
    [
      showMentionPopover,
      filteredMethodologies,
      selectedIndex,
      handleMentionSelect,
    ],
  )

  // Close the popover
  const closeMentionPopover = useCallback(() => {
    setShowMentionPopover(false)
    setMentionQuery('')
    setMentionStartIndex(-1)
  }, [])

  // Extract all mentioned methodologies from the prompt
  const extractMentionedMethodologies = useCallback((): Methodology[] => {
    const mentions: Methodology[] = []
    // Use matchAll to avoid issues with global regex state
    // Match # followed by word characters and hyphens
    const matches = prompt.matchAll(/#([\w-]+)/g)

    for (const match of matches) {
      const mentionName = match[1].toLowerCase()

      // Find matching methodology by name or id (case-insensitive, ignoring spaces)
      const methodology = availableMethodologies.find((m) => {
        const name = (m.metadata.i18n?.[lang]?.name ?? m.metadata.name)
          .toLowerCase()
          .replace(/\s+/g, '-')
        const id = m.metadata.id.toLowerCase()
        // Match name (with hyphens instead of spaces) or id
        return name === mentionName || id === mentionName
      })

      if (
        methodology &&
        !mentions.find((m) => m.metadata.id === methodology.metadata.id)
      ) {
        mentions.push(methodology)
      }
    }

    return mentions
  }, [prompt, availableMethodologies, lang])

  // Remove all #mentions from the prompt
  const removeMentionsFromPrompt = useCallback((text: string): string => {
    // Replace #mentions with empty string, cleaning up extra spaces
    return text
      .replace(/#[\w-]+\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }, [])

  return {
    showMentionPopover,
    mentionQuery,
    filteredMethodologies,
    selectedIndex,
    mentionStartIndex,
    handleMentionSelect,
    handleKeyNavigation,
    closeMentionPopover,
    extractMentionedMethodologies,
    removeMentionsFromPrompt,
  }
}
