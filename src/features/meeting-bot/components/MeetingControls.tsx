/**
 * MeetingControls Component
 *
 * Controls for interacting with the meeting (chat, reactions, leave).
 */

import { useState } from 'react'
import {
  Button,
  Input,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Chip,
} from '@heroui/react'
import { Icon } from '@/components'
import type { MeetingParticipant } from '../types'

export interface MeetingControlsProps {
  onSpeak: (text: string) => void
  onSendChat: (text: string) => void
  onReact: (emoji: string) => void
  onLeave: () => void
  participants: MeetingParticipant[]
}

const REACTIONS = ['👍', '👏', '❤️', '😂', '😮', '🎉', '🤔', '👎']

/**
 * Meeting controls component
 */
export function MeetingControls({
  onSpeak,
  onSendChat,
  onReact,
  onLeave,
  participants,
}: MeetingControlsProps) {
  const [chatMessage, setChatMessage] = useState('')

  const handleSendChat = () => {
    if (!chatMessage.trim()) return
    onSendChat(chatMessage.trim())
    setChatMessage('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendChat()
    }
  }

  const activeParticipants = participants.filter((p) => !p.leftAt)

  return (
    <div className="space-y-4">
      {/* Participants */}
      <div className="flex items-center gap-2 flex-wrap">
        <Icon name="User" size="sm" className="text-default-500" />
        <span className="text-sm text-default-500">
          {activeParticipants.length} participant
          {activeParticipants.length !== 1 ? 's' : ''}
        </span>
        {activeParticipants.slice(0, 5).map((p) => (
          <Chip key={p.id} size="sm" variant="flat">
            {p.name}
          </Chip>
        ))}
        {activeParticipants.length > 5 && (
          <Chip size="sm" variant="flat">
            +{activeParticipants.length - 5} more
          </Chip>
        )}
      </div>

      {/* Chat input */}
      <div className="flex gap-2">
        <Input
          placeholder="Send a message to the meeting chat..."
          value={chatMessage}
          onChange={(e) => setChatMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          startContent={
            <Icon name="ChatBubble" size="sm" className="text-default-400" />
          }
        />
        <Button
          color="primary"
          isDisabled={!chatMessage.trim()}
          onPress={handleSendChat}
        >
          Send
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-between">
        <div className="flex gap-2">
          {/* Reactions */}
          <Popover placement="top">
            <PopoverTrigger>
              <Button
                variant="flat"
                startContent={<Icon name="Emoji" size="sm" />}
              >
                React
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <div className="grid grid-cols-4 gap-1 p-2">
                {REACTIONS.map((emoji) => (
                  <Button
                    key={emoji}
                    size="sm"
                    variant="light"
                    isIconOnly
                    className="text-xl"
                    onPress={() => onReact(emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* TTS (experimental) */}
          <Popover placement="top">
            <PopoverTrigger>
              <Button
                variant="flat"
                startContent={<Icon name="Voice" size="sm" />}
              >
                Speak
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <div className="p-3 space-y-2 w-64">
                <p className="text-xs text-default-500">
                  ⚠️ TTS requires audio routing setup on the server. Chat is
                  more reliable.
                </p>
                <Input
                  placeholder="Text to speak..."
                  size="sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement
                      if (target.value.trim()) {
                        onSpeak(target.value.trim())
                        target.value = ''
                      }
                    }
                  }}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Leave button */}
        <Button
          color="danger"
          variant="flat"
          startContent={<Icon name="Xmark" size="sm" />}
          onPress={onLeave}
        >
          Leave Meeting
        </Button>
      </div>
    </div>
  )
}
