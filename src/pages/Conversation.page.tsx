import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Pagination,
  Spinner,
} from '@heroui/react'

import { useConversationStore } from '@/stores/conversationStore'
import { loadAllAgents } from '@/stores/agentStore'
import DefaultLayout from '@/layouts/Default'
import type { Agent, Conversation } from '@/types'
import { useI18n } from '@/i18n'
import { HeaderProps } from '@/lib/types'
import { Container, Section } from '@/components'

export function ConversationPage() {
  const { t, url } = useI18n()
  const navigate = useNavigate()
  const {
    conversations,
    isLoading,
    loadConversations,
    deleteConversation,
    getConversationTitle,
  } = useConversationStore()
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  const header: HeaderProps = {
    icon: {
      name: 'ChatBubble',
      color: 'text-default-300',
    },
    title: t('Conversations history'),
    subtitle: t('View and manage your past conversations'),
  }

  useEffect(() => {
    loadConversations()
    loadAllAgents().then(setAgents)
  }, [loadConversations])

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

  const handleDeleteConversation = async (
    conversationId: string,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation()
    if (confirm('Are you sure you want to delete this conversation?')) {
      await deleteConversation(conversationId)
    }
  }

  const getAgentName = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId)
    return agent?.name || 'Unknown Agent'
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString()
  }

  // Sort conversations by timestamp (most recent first) and paginate
  const sortedConversations = useMemo(() => {
    return conversations.sort(
      (a: Conversation, b: Conversation) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
  }, [conversations])

  const totalPages = Math.ceil(sortedConversations.length / itemsPerPage)

  const paginatedConversations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return sortedConversations.slice(startIndex, endIndex)
  }, [sortedConversations, currentPage, itemsPerPage])

  return (
    <DefaultLayout title={t('Conversations history')} header={header}>
      <Section>
        <Container>
          {isLoading ? (
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
          ) : (
            <>
              <div className="mb-4 flex justify-between items-center">
                <p className="text-sm text-default-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(
                    currentPage * itemsPerPage,
                    sortedConversations.length,
                  )}{' '}
                  of {sortedConversations.length} conversations
                </p>
              </div>
              <div className="grid gap-4">
                {paginatedConversations.map((conversation) => (
                  <Card
                    key={conversation.id}
                    isPressable
                    className="transition-all hover:scale-[1.02]"
                    onPress={() => handleLoadConversation(conversation.id)}
                  >
                    <CardHeader className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">
                          {getConversationTitle(conversation)}
                        </h3>
                        <p className="text-sm text-default-500">
                          Agent: {getAgentName(conversation.agentId)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-default-400">
                          {formatDate(conversation.timestamp)}
                        </span>
                        {selectedConversation === conversation.id && (
                          <Spinner size="sm" />
                        )}
                      </div>
                    </CardHeader>
                    <Divider />
                    <CardBody>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-default-600">
                          {conversation.messages.length} messages
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="light"
                            color="primary"
                            disabled={selectedConversation === conversation.id}
                          >
                            Load
                          </Button>
                          <Button
                            size="sm"
                            variant="light"
                            color="danger"
                            onClick={(e) =>
                              handleDeleteConversation(conversation.id, e)
                            }
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <Pagination
                    total={totalPages}
                    page={currentPage}
                    onChange={setCurrentPage}
                    showControls
                    showShadow
                    color="primary"
                  />
                </div>
              )}
            </>
          )}
        </Container>
      </Section>
    </DefaultLayout>
  )
}
