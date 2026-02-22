import { useState, useCallback, useEffect, useMemo } from 'react'
import { type LanguageCode } from '@/i18n/locales'
import { useSkills } from '@/stores/skillStore'
import type { InstalledSkill } from '@/types'

interface UseSkillMentionOptions {
  lang: LanguageCode
  prompt: string
  onPromptChange: (value: string) => void
}

interface SkillMentionResult {
  // State
  showMentionPopover: boolean
  mentionQuery: string
  filteredSkills: InstalledSkill[]
  selectedIndex: number
  mentionStartIndex: number

  // Actions
  handleMentionSelect: (skill: InstalledSkill) => void
  handleKeyNavigation: (event: React.KeyboardEvent) => boolean
  closeMentionPopover: () => void

  // Utils
  extractMentionedSkills: () => InstalledSkill[]
  removeMentionsFromPrompt: (text: string) => string
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
  const [showMentionPopover, setShowMentionPopover] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)

  // Filter skills based on mention query
  const filteredSkills = useMemo(() => {
    if (!mentionQuery && mentionQuery !== '') {
      return availableSkills
    }

    const query = mentionQuery.toLowerCase()
    return availableSkills.filter((skill) => {
      const name = skill.name.toLowerCase()
      const id = skill.id.toLowerCase()
      const description = skill.description.toLowerCase()
      return (
        name.includes(query) ||
        id.includes(query) ||
        description.includes(query)
      )
    })
  }, [availableSkills, mentionQuery])

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

  // Handle selecting a skill from the popover
  const handleMentionSelect = useCallback(
    (skill: InstalledSkill) => {
      if (mentionStartIndex === -1) return

      const skillName = skill.name.replace(/\s+/g, '-')
      // Replace the partial /mention with the full skill name
      const beforeMention = prompt.substring(0, mentionStartIndex)
      const afterMention = prompt.substring(
        mentionStartIndex + 1 + mentionQuery.length,
      )
      const newPrompt = `${beforeMention}/${skillName} ${afterMention}`

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
      if (!showMentionPopover || filteredSkills.length === 0) {
        return false
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setSelectedIndex((prev) =>
            prev < filteredSkills.length - 1 ? prev + 1 : 0,
          )
          return true

        case 'ArrowUp':
          event.preventDefault()
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredSkills.length - 1,
          )
          return true

        case 'Tab':
        case 'Enter':
          if (filteredSkills[selectedIndex]) {
            event.preventDefault()
            handleMentionSelect(filteredSkills[selectedIndex])
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
    [showMentionPopover, filteredSkills, selectedIndex, handleMentionSelect],
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
    filteredSkills,
    selectedIndex,
    mentionStartIndex,
    handleMentionSelect,
    handleKeyNavigation,
    closeMentionPopover,
    extractMentionedSkills,
    removeMentionsFromPrompt,
  }
}
