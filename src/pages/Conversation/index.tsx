import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  CardBody,
  Pagination,
  Spinner,
  Input,
  Chip,
  ButtonGroup,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@heroui/react'
import { Search, Star, StarSolid, MoreVert } from 'iconoir-react'

import { useConversationStore } from '@/stores/conversationStore'
import { useConversations, useAgents, useSyncReady } from '@/hooks'
import DefaultLayout from '@/layouts/Default'
import type { Conversation } from '@/types'
import { useI18n } from '@/i18n'
import { HeaderProps } from '@/lib/types'
import { Container, Section, MarkdownRenderer } from '@/components'
import { successToast } from '@/lib/toast'
import { formatConversationDate, formatDate } from '@/lib/format'

export function ConversationPage() {
  const { t, url, lang } = useI18n()
  const navigate = useNavigate()

  // Use reactive hook for instant updates (no async loading needed)
  const conversations = useConversations()
  const agents = useAgents()
  const isSyncReady = useSyncReady()

  const {
    getConversationTitle,
    searchQuery,
    setSearchQuery,
    showPinnedOnly,
    setShowPinnedOnly,
    pinConversation,
    unpinConversation,
    summarizeConversation,
    renameConversation,
  } = useConversationStore()
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summaryConversation, setSummaryConversation] =
    useState<Conversation | null>(null)
  const [renameTarget, setRenameTarget] = useState<Conversation | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const itemsPerPage = 50

  const {
    isOpen: isSummaryOpen,
    onOpen: onSummaryOpen,
    onClose: onSummaryClose,
  } = useDisclosure()

  const {
    isOpen: isRenameOpen,
    onOpen: onRenameOpen,
    onClose: onRenameClose,
  } = useDisclosure()

  const header: HeaderProps = {
    icon: {
      name: 'ChatBubble',
      color: 'text-default-300',
    },
    title: t('Conversations history'),
    subtitle: t('Find your past conversations'),
  }

  // Agents load automatically via reactive hook

  // Reset to page 1 when search query or filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, showPinnedOnly])

  const handleLoadConversation = async (conversationId: string) => {
    setSelectedConversation(conversationId)
    try {
      // First find the conversation to get its agentId
      const conversation = conversations.find((c) => c.id === conversationId)
      if (!conversation) {
        throw new Error('Conversation not found')
      }

      // Navigate to the agent run page with the conversation
      navigate(url(`/agents/run#${conversation.agentId}/${conversationId}`))
    } catch (error) {
      console.error('Failed to load conversation:', error)
      setSelectedConversation(null)
    }
  }

  const getAgentName = (agentId: string) => {
    if (!agentId) return '??'
    const agent = agents.find((a) => a.id === agentId)
    return agent?.name || '–'
  }

  const handleTogglePin = async (conversationId: string, isPinned: boolean) => {
    if (isPinned) {
      await unpinConversation(conversationId)
    } else {
      await pinConversation(conversationId)
    }
  }

  const handleSummarize = async (conversation: Conversation) => {
    setIsSummarizing(true)
    try {
      await summarizeConversation(conversation.id)
      setSummaryConversation(conversation)
      onSummaryOpen()
      successToast('Summary generated successfully')
    } catch (error) {
      console.error('Failed to summarize:', error)
    } finally {
      setIsSummarizing(false)
    }
  }

  const handleOpenRename = (conversation: Conversation) => {
    setRenameTarget(conversation)
    setNewTitle(getConversationTitle(conversation))
    onRenameOpen()
  }

  const handleRename = async () => {
    if (!renameTarget || !newTitle.trim()) return
    try {
      await renameConversation(renameTarget.id, newTitle.trim())
      successToast(t('Conversation renamed successfully'))
      onRenameClose()
      setRenameTarget(null)
      setNewTitle('')
    } catch (error) {
      console.error('Failed to rename conversation:', error)
    }
  }

  // Sort, filter, and search conversations using reactive Yjs data
  const filteredConversations = useMemo(() => {
    let filtered = conversations

    // Apply pinned filter
    if (showPinnedOnly) {
      filtered = filtered.filter((c) => c.isPinned === true)
    }

    // Apply search (inline implementation using reactive data)
    if (searchQuery && searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.toLowerCase()
      filtered = filtered.filter((conversation) => {
        // Search in title
        if (conversation.title?.toLowerCase().includes(lowerQuery)) {
          return true
        }
        // Search in summary
        if (conversation.summary?.toLowerCase().includes(lowerQuery)) {
          return true
        }
        // Search in message content
        return conversation.messages.some((message) =>
          message.content.toLowerCase().includes(lowerQuery),
        )
      })
    }

    // Sort by pinned first, then by timestamp
    return [...filtered].sort((a: Conversation, b: Conversation) => {
      // Pinned conversations come first
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1

      // Compare timestamps (handles both Date objects and ISO strings)
      const timeA =
        a.timestamp instanceof Date
          ? a.timestamp.getTime()
          : new Date(a.timestamp).getTime()
      const timeB =
        b.timestamp instanceof Date
          ? b.timestamp.getTime()
          : new Date(b.timestamp).getTime()
      return timeB - timeA
    })
  }, [conversations, showPinnedOnly, searchQuery])

  const totalPages = Math.ceil(filteredConversations.length / itemsPerPage)

  const paginatedConversations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredConversations.slice(startIndex, endIndex)
  }, [filteredConversations, currentPage, itemsPerPage])

  // Group paginated conversations: pinned first, then by date
  const groupedConversations = useMemo(() => {
    const groups: { label: string; conversations: Conversation[] }[] = []

    // First, separate pinned and non-pinned conversations
    const pinnedConversations = paginatedConversations.filter((c) => c.isPinned)
    const unpinnedConversations = paginatedConversations.filter(
      (c) => !c.isPinned,
    )

    // Add pinned group first if there are any pinned conversations
    if (pinnedConversations.length > 0) {
      groups.push({ label: t('Pinned'), conversations: pinnedConversations })
    }

    // Group remaining conversations by date
    const dateGroups: Map<string, Conversation[]> = new Map()
    for (const conversation of unpinnedConversations) {
      const date = new Date(conversation.timestamp)
      const dateKey = formatConversationDate(date, lang)

      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, [])
      }
      dateGroups.get(dateKey)!.push(conversation)
    }

    // Add date groups
    for (const [label, conversations] of dateGroups) {
      groups.push({ label, conversations })
    }

    return groups
  }, [paginatedConversations, lang, t])

  return (
    <DefaultLayout title={t('Conversations history')} header={header}>
      <Section>
        <Container>
          {/* Search and Filter Controls */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <Input
              placeholder={t('Search conversations')}
              value={searchQuery}
              onValueChange={setSearchQuery}
              startContent={<Search className="w-4 h-4 text-default-400" />}
              classNames={{
                base: 'flex-1',
                input: 'text-small',
              }}
              isClearable
              onClear={() => setSearchQuery('')}
            />
            <ButtonGroup variant="flat">
              <Button
                color={showPinnedOnly ? 'primary' : 'default'}
                onPress={() => setShowPinnedOnly(!showPinnedOnly)}
                startContent={
                  showPinnedOnly ? (
                    <StarSolid className="w-4 h-4" />
                  ) : (
                    <Star className="w-4 h-4" />
                  )
                }
              >
                {t('Show pinned only')}
              </Button>
            </ButtonGroup>
          </div>

          {!isSyncReady ? (
            <div className="flex justify-center items-center py-12">
              <Spinner size="lg" />
            </div>
          ) : conversations.length === 0 ? (
            <Card>
              <CardBody className="text-center py-12">
                <p className="text-lg text-default-500">
                  No saved conversations found
                </p>
                <Button
                  color="primary"
                  className="mt-4"
                  onPress={() => navigate('/')}
                >
                  Start New Conversation
                </Button>
              </CardBody>
            </Card>
          ) : filteredConversations.length === 0 ? (
            <Card>
              <CardBody className="text-center py-12">
                <p className="text-lg text-default-500">
                  {showPinnedOnly
                    ? t('No pinned conversations')
                    : t('No conversations found')}
                </p>
              </CardBody>
            </Card>
          ) : (
            <>
              <div className="space-y-6">
                {groupedConversations.map((group) => (
                  <div key={group.label}>
                    <h2 className="text-sm font-medium text-default-500 mb-2 capitalize">
                      {group.label}
                    </h2>
                    <div className="space-y-2">
                      {group.conversations.map((conversation) => (
                        <Card
                          key={conversation.id}
                          isPressable
                          isHoverable
                          shadow="none"
                          className={`transition-transform w-full ${conversation.isPinned ? 'border-l-4 border-l-warning' : ''}`}
                          onPress={() =>
                            handleLoadConversation(conversation.id)
                          }
                        >
                          <CardBody className="py-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-base font-medium truncate">
                                    {getConversationTitle(conversation)}
                                  </h3>
                                  {conversation.isPinned && (
                                    <Chip
                                      size="sm"
                                      variant="flat"
                                      color="warning"
                                    >
                                      {t('Pinned')}
                                    </Chip>
                                  )}
                                </div>
                                <p className="text-sm text-default-500 mt-0.5">
                                  {getAgentName(conversation.agentId)}
                                </p>
                                {conversation.summary && (
                                  <p className="text-xs text-default-400 mt-1 line-clamp-2">
                                    {conversation.summary.substring(0, 150)}...
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  onPress={() =>
                                    handleTogglePin(
                                      conversation.id,
                                      conversation.isPinned || false,
                                    )
                                  }
                                  title={
                                    conversation.isPinned
                                      ? t('Unpin conversation')
                                      : t('Pin conversation')
                                  }
                                >
                                  {conversation.isPinned ? (
                                    <StarSolid className="w-4 h-4 text-warning" />
                                  ) : (
                                    <Star className="w-4 h-4" />
                                  )}
                                </Button>
                                <Dropdown>
                                  <DropdownTrigger>
                                    <Button
                                      isIconOnly
                                      size="sm"
                                      variant="light"
                                    >
                                      <MoreVert className="w-4 h-4" />
                                    </Button>
                                  </DropdownTrigger>
                                  <DropdownMenu>
                                    <DropdownItem
                                      key="rename"
                                      onPress={() =>
                                        handleOpenRename(conversation)
                                      }
                                    >
                                      {t('Rename conversation')}
                                    </DropdownItem>
                                    <DropdownItem
                                      key="summarize"
                                      onPress={() =>
                                        handleSummarize(conversation)
                                      }
                                      isDisabled={isSummarizing}
                                    >
                                      {conversation.summary
                                        ? t('View summary')
                                        : t('Summarize conversation')}
                                    </DropdownItem>
                                  </DropdownMenu>
                                </Dropdown>
                                {selectedConversation === conversation.id && (
                                  <Spinner size="sm" />
                                )}
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <Pagination
                    total={totalPages}
                    page={currentPage}
                    onChange={setCurrentPage}
                    showControls
                    size="sm"
                    color="primary"
                  />
                </div>
              )}
            </>
          )}

          {/* Summary Modal */}
          <Modal
            isOpen={isSummaryOpen}
            onClose={onSummaryClose}
            size="3xl"
            scrollBehavior="inside"
          >
            <ModalContent>
              <ModalHeader>
                <div>
                  <h3 className="text-lg font-semibold">
                    {summaryConversation
                      ? getConversationTitle(summaryConversation)
                      : 'Conversation Summary'}
                  </h3>
                  <p className="text-sm text-default-500 font-normal">
                    {summaryConversation &&
                      formatDate(new Date(summaryConversation.timestamp))}
                  </p>
                </div>
              </ModalHeader>
              <ModalBody>
                {summaryConversation?.summary ? (
                  <MarkdownRenderer content={summaryConversation.summary} />
                ) : (
                  <p className="text-default-500">
                    {t('No summary available')}
                  </p>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onSummaryClose}>
                  {t('Close')}
                </Button>
                {summaryConversation && (
                  <Button
                    color="primary"
                    onPress={() =>
                      handleLoadConversation(summaryConversation.id)
                    }
                  >
                    {t('View full conversation')}
                  </Button>
                )}
              </ModalFooter>
            </ModalContent>
          </Modal>

          {/* Rename Modal */}
          <Modal isOpen={isRenameOpen} onClose={onRenameClose} size="md">
            <ModalContent>
              <ModalHeader>{t('Rename conversation')}</ModalHeader>
              <ModalBody>
                <Input
                  label={t('Conversation title')}
                  placeholder={t('Enter a new title')}
                  value={newTitle}
                  onValueChange={setNewTitle}
                  autoFocus
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onRenameClose}>
                  {t('Cancel')}
                </Button>
                <Button
                  color="primary"
                  onPress={handleRename}
                  isDisabled={!newTitle.trim()}
                >
                  {t('Save')}
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </Container>
      </Section>
    </DefaultLayout>
  )
}
