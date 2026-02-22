import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Button,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Spinner,
  Select,
  SelectItem,
  Card,
  CardHeader,
  CardBody,
} from '@heroui/react'
import { Pin, MoreVert, PinSlash } from 'iconoir-react'
import { useNavigate } from 'react-router-dom'

import { usePinnedMessageStore } from '@/stores/pinnedMessageStore'
import { useAgents } from '@/hooks'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { useI18n, useUrl } from '@/i18n'
import { Icon } from '@/components'
import { useHashHighlight } from '@/hooks/useHashHighlight'

export const PinnedMessages: React.FC = () => {
  const { lang, t } = useI18n()
  const url = useUrl(lang)
  const navigate = useNavigate()
  const { getHighlightClasses } = useHashHighlight()

  // Use reactive hook for instant updates
  const agents = useAgents()
  const [pinnedAgentFilter, setPinnedAgentFilter] = useState<string | 'all'>(
    'all',
  )

  const {
    pinnedMessages,
    isLoading: isPinnedLoading,
    loadPinnedMessages,
    deletePinnedMessage,
  } = usePinnedMessageStore()

  useEffect(() => {
    loadPinnedMessages()
  }, [loadPinnedMessages])

  const filteredPinnedMessages = useMemo(() => {
    if (pinnedAgentFilter === 'all') {
      return pinnedMessages
    }
    return pinnedMessages.filter((pm) => pm.agentId === pinnedAgentFilter)
  }, [pinnedMessages, pinnedAgentFilter])

  const getAgentName = useCallback(
    (agentId: string) => {
      const agent = agents.find((a) => a.id === agentId)
      return agent?.name || agentId
    },
    [agents],
  )

  const getAgentSlug = useCallback(
    (agentId: string) => {
      const agent = agents.find((a) => a.id === agentId)
      return agent?.slug || agentId // fallback to id for backward compatibility
    },
    [agents],
  )

  return (
    <div className="space-y-3">
      {/* Description */}
      <p className="text-sm text-default-500">
        {t(
          'Pinned messages are important information that need to be accessible by agents during future conversations.',
        )}
      </p>

      {filteredPinnedMessages.length > 0 && (
        <div
          id="agent-filter"
          className={getHighlightClasses('agent-filter', 'flex justify-end')}
        >
          {/* Agent Filter */}
          <Select
            size="sm"
            // label={t('Filter by agent')}
            placeholder={t('All agents')}
            selectedKeys={
              pinnedAgentFilter === 'all' ? [] : [pinnedAgentFilter]
            }
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string
              setPinnedAgentFilter(selected || 'all')
            }}
            className="min-w-48 max-w-3xs"
          >
            {agents.map((agent) => (
              <SelectItem key={agent.id}>{agent.name}</SelectItem>
            ))}
          </Select>
        </div>
      )}

      {/* Pinned Messages List */}
      {isPinnedLoading ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : filteredPinnedMessages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-default-400">
          <Pin className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-md mb-2">{t('No pinned messages')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPinnedMessages.map((pinnedMessage) => (
            <Card
              key={pinnedMessage.id}
              className="border-l-4 border-warning-400"
            >
              <CardHeader className="flex flex-row justify-between items-start gap-4 pb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Chip size="sm" variant="flat" color="primary">
                      {getAgentName(pinnedMessage.agentId)}
                    </Chip>
                    <span className="text-tiny text-default-400">
                      {new Date(pinnedMessage.pinnedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {/* <p className="font-medium text-sm">
                    {pinnedMessage.description}
                  </p> */}
                </div>
                <Dropdown>
                  <DropdownTrigger>
                    <Button isIconOnly variant="light" size="sm">
                      <MoreVert className="w-4 h-4" />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu>
                    <DropdownItem
                      key="view"
                      startContent={
                        <Icon name="OpenInBrowser" className="w-4 h-4" />
                      }
                      onPress={() => {
                        navigate(
                          url(
                            `/agents/run/${getAgentSlug(pinnedMessage.agentId)}/${pinnedMessage.conversationId}`,
                          ),
                        )
                      }}
                    >
                      {t('View conversation')}
                    </DropdownItem>
                    <DropdownItem
                      key="unpin"
                      startContent={<PinSlash className="w-4 h-4" />}
                      className="text-danger"
                      color="danger"
                      onPress={() => deletePinnedMessage(pinnedMessage.id)}
                    >
                      {t('Unpin message')}
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </CardHeader>
              <CardBody className="pt-0">
                <div className="bg-default-100 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <MarkdownRenderer
                    content={pinnedMessage.content}
                    className="prose dark:prose-invert prose-sm"
                  />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
