import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { type LanguageCode } from '@/i18n/locales'
import { useSkills } from '@/stores/skillStore'
import { useConnectorStore } from '@/features/connectors/stores'
import type { Connector } from '@/features/connectors/types'
import type { InstalledSkill } from '@/types'

interface UseSkillMentionOptions {
  lang: LanguageCode
  prompt: string
  onPromptChange: (value: string) => void
}

/**
 * Unified item for the slash-command popover.
 * Wraps both skills and active connectors under the `/` prefix.
 */
export type SlashCommandItem =
  | {
      type: 'skill'
      id: string
      name: string
      description: string
      skill: InstalledSkill
    }
  | {
      type: 'connector'
      id: string
      name: string
      description: string
      connector: Connector
    }

interface SkillMentionResult {
  // State
  showMentionPopover: boolean
  mentionQuery: string
  filteredItems: SlashCommandItem[]
  /** @deprecated Use filteredItems instead */
  filteredSkills: InstalledSkill[]
  selectedIndex: number
  mentionStartIndex: number

  // Actions
  handleMentionSelect: (item: SlashCommandItem) => void
  handleKeyNavigation: (event: React.KeyboardEvent) => boolean
  closeMentionPopover: () => void

  // Utils
  extractMentionedSkills: () => InstalledSkill[]
  extractMentionedConnectors: () => Connector[]
  removeMentionsFromPrompt: (text: string) => string
}

/** Provider display names for connector slash commands */
const CONNECTOR_DISPLAY_NAMES: Record<string, string> = {
  'google-drive': 'Google Drive',
  gmail: 'Gmail',
  'google-calendar': 'Google Calendar',
  'google-chat': 'Google Chat',
  'google-meet': 'Google Meet',
  'google-tasks': 'Google Tasks',
  notion: 'Notion',
  dropbox: 'Dropbox',
  github: 'GitHub',
  qonto: 'Qonto',
  slack: 'Slack',
  'outlook-mail': 'Outlook Mail',
  onedrive: 'OneDrive',
  figma: 'Figma',
  'custom-api': 'Custom API',
  'custom-mcp': 'MCP Server',
}

function getConnectorDisplayName(connector: Connector): string {
  return (
    connector.name ||
    CONNECTOR_DISPLAY_NAMES[connector.provider] ||
    connector.provider
  )
}

function getConnectorDescription(connector: Connector): string {
  const parts: string[] = []
  parts.push(CONNECTOR_DISPLAY_NAMES[connector.provider] || connector.provider)
  if (connector.accountEmail) {
    parts.push(`(${connector.accountEmail})`)
  }
  return parts.join(' ')
}

// Regex to detect /mentions — only after whitespace or at the start of the prompt
// to avoid false positives in URLs like https://…
const MENTION_REGEX = /(?:^|\s)\/([\w-]*)$/

export function useSkillMention({
  prompt,
  onPromptChange,
}: UseSkillMentionOptions): SkillMentionResult {
  const allSkills = useSkills()
  const availableSkills = useMemo(
    () => allSkills.filter((s) => s.enabled),
    [allSkills],
  )

  // Ensure connector store is initialized, then fetch active (connected) connectors
  const initialize = useConnectorStore((state) => state.initialize)
  const isInitialized = useConnectorStore((state) => state.isInitialized)
  const initRef = useRef(false)
  useEffect(() => {
    if (!isInitialized && !initRef.current) {
      initRef.current = true
      initialize()
    }
  }, [isInitialized, initialize])

  const connectors = useConnectorStore((state) => state.connectors)
  const activeConnectors = useMemo(
    () => connectors.filter((c) => c.status === 'connected'),
    [connectors],
  )

  const [showMentionPopover, setShowMentionPopover] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)

  // Build unified slash-command items from skills + connectors
  const allItems: SlashCommandItem[] = useMemo(() => {
    const skillItems: SlashCommandItem[] = availableSkills.map((skill) => ({
      type: 'skill' as const,
      id: `skill-${skill.id}`,
      name: skill.name,
      description: skill.description,
      skill,
    }))
    const connectorItems: SlashCommandItem[] = activeConnectors.map(
      (connector) => ({
        type: 'connector' as const,
        id: `connector-${connector.id}`,
        name: getConnectorDisplayName(connector),
        description: getConnectorDescription(connector),
        connector,
      }),
    )
    return [...skillItems, ...connectorItems]
  }, [availableSkills, activeConnectors])

  // Filter items based on mention query
  const filteredItems = useMemo(() => {
    if (!mentionQuery && mentionQuery !== '') {
      return allItems
    }

    const query = mentionQuery.toLowerCase().replace(/-/g, ' ')
    return allItems.filter((item) => {
      const name = item.name.toLowerCase()
      const hyphenatedName = name.replace(/\s+/g, '-')
      const description = item.description.toLowerCase()

      let matches =
        name.includes(query) ||
        hyphenatedName.includes(mentionQuery.toLowerCase()) ||
        description.includes(query)

      // Additional matching for skills by id
      if (!matches && item.type === 'skill') {
        matches = item.skill.id.toLowerCase().includes(query)
      }

      // Additional matching for connectors by provider
      if (!matches && item.type === 'connector') {
        matches = item.connector.provider.toLowerCase().includes(query)
      }

      return matches
    })
  }, [allItems, mentionQuery])

  // Keep backward-compat filteredSkills (skills only from filtered items)
  const filteredSkills = useMemo(
    () =>
      filteredItems
        .filter((i) => i.type === 'skill')
        .map((i) => (i as Extract<SlashCommandItem, { type: 'skill' }>).skill),
    [filteredItems],
  )

  // Detect / mentions while typing
  useEffect(() => {
    const match = prompt.match(MENTION_REGEX)

    if (match) {
      const query = match[1] || ''
      setMentionQuery(query)
      // The full match may start with a space; the `/` position is match.index + (match[0].length - match[1].length - 1)
      const slashIndex = prompt.length - match[1].length - 1
      setMentionStartIndex(slashIndex)
      setShowMentionPopover(true)
      setSelectedIndex(0)
    } else {
      setShowMentionPopover(false)
      setMentionQuery('')
      setMentionStartIndex(-1)
    }
  }, [prompt])

  // Handle selecting an item (skill or connector) from the popover
  const handleMentionSelect = useCallback(
    (item: SlashCommandItem) => {
      if (mentionStartIndex === -1) return

      const itemName = item.name.replace(/\s+/g, '-')
      // Replace the partial /mention with the full item name
      const beforeMention = prompt.substring(0, mentionStartIndex)
      const afterMention = prompt.substring(
        mentionStartIndex + 1 + mentionQuery.length,
      )
      const newPrompt = `${beforeMention}/${itemName} ${afterMention}`

      onPromptChange(newPrompt)
      setShowMentionPopover(false)
      setMentionQuery('')
      setMentionStartIndex(-1)
    },
    [prompt, mentionStartIndex, mentionQuery, onPromptChange],
  )

  // Handle keyboard navigation in the popover
  const handleKeyNavigation = useCallback(
    (event: React.KeyboardEvent): boolean => {
      if (!showMentionPopover || filteredItems.length === 0) {
        return false
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setSelectedIndex((prev) =>
            prev < filteredItems.length - 1 ? prev + 1 : 0,
          )
          return true

        case 'ArrowUp':
          event.preventDefault()
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredItems.length - 1,
          )
          return true

        case 'Tab':
        case 'Enter':
          if (filteredItems[selectedIndex]) {
            event.preventDefault()
            handleMentionSelect(filteredItems[selectedIndex])
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
    [showMentionPopover, filteredItems, selectedIndex, handleMentionSelect],
  )

  // Close the popover
  const closeMentionPopover = useCallback(() => {
    setShowMentionPopover(false)
    setMentionQuery('')
    setMentionStartIndex(-1)
  }, [])

  // Extract all mentioned skills from the prompt
  const extractMentionedSkills = useCallback((): InstalledSkill[] => {
    const mentions: InstalledSkill[] = []
    // Match / preceded by whitespace or start-of-string, followed by word chars/hyphens
    const matches = prompt.matchAll(/(?:^|\s)\/([\w-]+)/g)

    for (const match of matches) {
      const mentionName = match[1].toLowerCase()

      const skill = availableSkills.find((s) => {
        const name = s.name.toLowerCase().replace(/\s+/g, '-')
        const id = s.id.toLowerCase()
        return name === mentionName || id === mentionName
      })

      if (skill && !mentions.find((s) => s.id === skill.id)) {
        mentions.push(skill)
      }
    }

    return mentions
  }, [prompt, availableSkills])

  // Extract all mentioned connectors from the prompt
  const extractMentionedConnectors = useCallback((): Connector[] => {
    const mentions: Connector[] = []
    const matches = prompt.matchAll(/(?:^|\s)\/([\w-]+)/g)

    for (const match of matches) {
      const mentionName = match[1].toLowerCase()

      const connector = activeConnectors.find((c) => {
        const displayName = getConnectorDisplayName(c)
          .toLowerCase()
          .replace(/\s+/g, '-')
        const provider = c.provider.toLowerCase()
        return displayName === mentionName || provider === mentionName
      })

      if (connector && !mentions.find((c) => c.id === connector.id)) {
        mentions.push(connector)
      }
    }

    return mentions
  }, [prompt, activeConnectors])

  // Remove all /mentions from the prompt
  const removeMentionsFromPrompt = useCallback((text: string): string => {
    return text
      .replace(/(?:^|\s)\/[\w-]+\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }, [])

  return {
    showMentionPopover,
    mentionQuery,
    filteredItems,
    filteredSkills,
    selectedIndex,
    mentionStartIndex,
    handleMentionSelect,
    handleKeyNavigation,
    closeMentionPopover,
    extractMentionedSkills,
    extractMentionedConnectors,
    removeMentionsFromPrompt,
  }
}
