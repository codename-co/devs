import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { ThreadTag } from '@/lib/yjs'

interface UseTagMentionOptions {
  tags: ThreadTag[]
  inputValue: string
  onInputValueChange: (value: string) => void
  inputRef?: React.RefObject<HTMLInputElement | null>
}

interface TagMentionResult {
  showPopover: boolean
  query: string
  filteredTags: ThreadTag[]
  selectedIndex: number
  handleSelect: (tag: ThreadTag) => void
  handleKeyNavigation: (event: React.KeyboardEvent) => boolean
  closePopover: () => void
}

// Matches # followed by optional word characters at the cursor position
const TAG_MENTION_REGEX = /#([\w-]*)$/

export function useTagMention({
  tags,
  inputValue,
  onInputValueChange,
  inputRef,
}: UseTagMentionOptions): TagMentionResult {
  const [showPopover, setShowPopover] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)
  /** Suppress the detection effect for one cycle after a selection */
  const justSelectedRef = useRef(false)

  // Filter tags by query
  const filteredTags = useMemo(() => {
    if (!query) return tags
    const q = query.toLowerCase()
    return tags.filter((tag) => tag.name.toLowerCase().includes(q))
  }, [tags, query])

  // Detect # while typing
  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false
      return
    }
    const cursorPos = inputRef?.current?.selectionStart ?? inputValue.length
    const textUpToCursor = inputValue.substring(0, cursorPos)
    const match = textUpToCursor.match(TAG_MENTION_REGEX)
    if (match) {
      setQuery(match[1] || '')
      setMentionStartIndex(cursorPos - match[0].length)
      setShowPopover(true)
      setSelectedIndex(0)
    } else {
      setShowPopover(false)
      setQuery('')
      setMentionStartIndex(-1)
    }
  }, [inputValue, inputRef])

  const handleSelect = useCallback(
    (tag: ThreadTag) => {
      if (mentionStartIndex === -1) return

      const beforeMention = inputValue.substring(0, mentionStartIndex)
      const mentionLen = 1 + query.length // 1 for the '#' char
      const afterMention = inputValue.substring(mentionStartIndex + mentionLen)
      // Insert #tag-name with trailing space
      const tagToken = `#${tag.name.replace(/\s+/g, '-')}`
      const newValue = `${beforeMention}${tagToken} ${afterMention}`.trimEnd()

      onInputValueChange(newValue)
      justSelectedRef.current = true
      setShowPopover(false)
      setQuery('')
      setMentionStartIndex(-1)
    },
    [inputValue, mentionStartIndex, query, onInputValueChange],
  )

  const handleKeyNavigation = useCallback(
    (event: React.KeyboardEvent): boolean => {
      if (!showPopover || filteredTags.length === 0) return false

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setSelectedIndex((prev) =>
            prev < filteredTags.length - 1 ? prev + 1 : 0,
          )
          return true
        case 'ArrowUp':
          event.preventDefault()
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredTags.length - 1,
          )
          return true
        case 'Tab':
        case 'Enter':
          if (filteredTags[selectedIndex]) {
            event.preventDefault()
            handleSelect(filteredTags[selectedIndex])
            return true
          }
          return false
        case 'Escape':
          event.preventDefault()
          setShowPopover(false)
          return true
        default:
          return false
      }
    },
    [showPopover, filteredTags, selectedIndex, handleSelect],
  )

  const closePopover = useCallback(() => {
    setShowPopover(false)
    setQuery('')
    setMentionStartIndex(-1)
  }, [])

  return {
    showPopover,
    query,
    filteredTags,
    selectedIndex,
    handleSelect,
    handleKeyNavigation,
    closePopover,
  }
}
