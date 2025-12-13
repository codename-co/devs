import { useState, useCallback, useEffect, useMemo } from 'react'
import { type Agent } from '@/types'
import { loadAllAgents } from '@/stores/agentStore'
import { type LanguageCode } from '@/i18n/locales'

interface UseAgentMentionOptions {
  lang: LanguageCode
  prompt: string
  onPromptChange: (value: string) => void
}

interface AgentMentionResult {
  // State
  showMentionPopover: boolean
  mentionQuery: string
  filteredAgents: Agent[]
  selectedIndex: number
  mentionStartIndex: number

  // Actions
  handleMentionSelect: (agent: Agent) => void
  handleKeyNavigation: (event: React.KeyboardEvent) => boolean
  closeMentionPopover: () => void

  // Utils
  extractMentionedAgents: () => Agent[]
  removeMentionsFromPrompt: (text: string) => string
}

// Regex to detect @mentions - matches @ followed by word characters
const MENTION_REGEX = /@(\w*)$/

export function useAgentMention({
  lang,
  prompt,
  onPromptChange,
}: UseAgentMentionOptions): AgentMentionResult {
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([])
  const [showMentionPopover, setShowMentionPopover] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)

  // Load all available agents
  useEffect(() => {
    const loadAgents = async () => {
      const agents = await loadAllAgents()
      setAvailableAgents(agents)
    }
    loadAgents()
  }, [])

  // Filter agents based on mention query
  const filteredAgents = useMemo(() => {
    if (!mentionQuery && mentionQuery !== '') {
      return availableAgents
    }

    const query = mentionQuery.toLowerCase()
    return availableAgents.filter((agent) => {
      const name = (agent.i18n?.[lang]?.name ?? agent.name).toLowerCase()
      const id = agent.id.toLowerCase()
      return name.includes(query) || id.includes(query)
    })
  }, [availableAgents, mentionQuery, lang])

  // Detect @ mentions while typing
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

  // Handle selecting an agent from the popover
  const handleMentionSelect = useCallback(
    (agent: Agent) => {
      if (mentionStartIndex === -1) return

      const agentName = agent.i18n?.[lang]?.name ?? agent.name
      // Replace the partial @mention with the full agent name
      const beforeMention = prompt.substring(0, mentionStartIndex)
      const afterMention = prompt.substring(
        mentionStartIndex + 1 + mentionQuery.length,
      )
      const newPrompt = `${beforeMention}@${agentName} ${afterMention}`

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
      if (!showMentionPopover || filteredAgents.length === 0) {
        return false
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setSelectedIndex((prev) =>
            prev < filteredAgents.length - 1 ? prev + 1 : 0,
          )
          return true

        case 'ArrowUp':
          event.preventDefault()
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredAgents.length - 1,
          )
          return true

        case 'Tab':
        case 'Enter':
          if (filteredAgents[selectedIndex]) {
            event.preventDefault()
            handleMentionSelect(filteredAgents[selectedIndex])
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
    [showMentionPopover, filteredAgents, selectedIndex, handleMentionSelect],
  )

  // Close the popover
  const closeMentionPopover = useCallback(() => {
    setShowMentionPopover(false)
    setMentionQuery('')
    setMentionStartIndex(-1)
  }, [])

  // Extract all mentioned agents from the prompt
  const extractMentionedAgents = useCallback((): Agent[] => {
    const mentions: Agent[] = []
    // Use matchAll to avoid issues with global regex state
    const matches = prompt.matchAll(/@(\w+)/g)

    for (const match of matches) {
      const mentionName = match[1].toLowerCase()

      // Find matching agent by name or id (case-insensitive, ignoring spaces)
      const agent = availableAgents.find((a) => {
        const name = (a.i18n?.[lang]?.name ?? a.name)
          .toLowerCase()
          .replace(/\s+/g, '')
        const id = a.id.toLowerCase()
        // Match name (without spaces) or id
        return name === mentionName || id === mentionName
      })

      if (agent && !mentions.find((m) => m.id === agent.id)) {
        mentions.push(agent)
      }
    }

    return mentions
  }, [prompt, availableAgents, lang])

  // Remove all @mentions from the prompt
  const removeMentionsFromPrompt = useCallback((text: string): string => {
    // Replace @mentions with empty string, cleaning up extra spaces
    return text
      .replace(/@[\w]+\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }, [])

  return {
    showMentionPopover,
    mentionQuery,
    filteredAgents,
    selectedIndex,
    mentionStartIndex,
    handleMentionSelect,
    handleKeyNavigation,
    closeMentionPopover,
    extractMentionedAgents,
    removeMentionsFromPrompt,
  }
}
