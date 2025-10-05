import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, CardBody, Pagination, Spinner } from '@heroui/react'

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
  const { conversations, isLoading, loadConversations, getConversationTitle } =
    useConversationStore()
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

  const getAgentName = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId)
    return agent?.name || 'Unknown Agent'
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const conversationDate = new Date(date)
    const diffMs = now.getTime() - conversationDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return conversationDate.toLocaleDateString()
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
              <div className="space-y-2">
                {paginatedConversations.map((conversation) => (
                  <Card
                    key={conversation.id}
                    isPressable
                    isHoverable
                    shadow="none"
                    className="transition-transform w-full"
                    onPress={() => handleLoadConversation(conversation.id)}
                  >
                    <CardBody className="py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-medium truncate">
                            {getConversationTitle(conversation)}
                          </h3>
                          <p className="text-sm text-default-500 mt-0.5">
                            {getAgentName(conversation.agentId)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <time className="text-sm text-default-400">
                            {formatDate(conversation.timestamp)}
                          </time>
                          {selectedConversation === conversation.id && (
                            <Spinner size="sm" />
                          )}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
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
        </Container>
      </Section>
    </DefaultLayout>
  )
}
