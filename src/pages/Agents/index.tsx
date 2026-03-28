import { Alert, Card, Spinner, Tab, Tabs, Modal, Button, useOverlayState, Dropdown, Chip } from '@/components/heroui-compat'
import { useEffect, useState } from 'react'

import { useI18n } from '@/i18n'
import localI18n from './i18n'
import {
  useAgentsSeparated,
  updateAgent,
  softDeleteAgent,
} from '@/stores/agentStore'
import { type Agent } from '@/types'
import { Container, Section, AgentKnowledgePicker, Icon } from '@/components'
import { AgentCard } from '@/components/AgentCard'
import DefaultLayout from '@/layouts/Default'
import { HeaderProps } from '@/lib/types'
import { useNavigate } from 'react-router-dom'
import { MoreVert, Trash, Voice } from 'iconoir-react'

export const AgentsPage = () => {
  const {
    customAgents: userAgents,
    builtInAgents: globalAgents,
    loading,
  } = useAgentsSeparated()
  const [activeTab, setActiveTab] = useState<
    'global-agents' | 'my-agents' | undefined
  >(undefined)
  const [editingAgent, _setEditingAgent] = useState<Agent | null>(null)
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null)
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { t, url } = useI18n(localI18n)
  const navigate = useNavigate()
  const { isOpen: isKnowledgeModalOpen, close: onKnowledgeModalClose } = useOverlayState()
  const { isOpen: isDeleteModalOpen, open: onDeleteModalOpen, close: onDeleteModalClose } = useOverlayState()

  // Set initial active tab based on agent counts
  useEffect(() => {
    if (!loading && activeTab === undefined) {
      if (userAgents.length === 0 && globalAgents.length > 0) {
        setActiveTab('global-agents')
      } else {
        setActiveTab('my-agents')
      }
    }
  }, [loading, userAgents.length, globalAgents.length, activeTab])

  const handleAgentClick = (agentSlug: string) => {
    navigate(url(`/agents/run/${agentSlug}`))
  }

  const handleStartLiveConversation = (agentSlug: string) => {
    navigate(url(`/live#${agentSlug}`))
  }

  const handleSaveKnowledge = async () => {
    if (!editingAgent) return

    setSaving(true)
    try {
      await updateAgent(editingAgent.id, {
        knowledgeItemIds: selectedKnowledgeIds,
      })
      onKnowledgeModalClose()
    } catch (error) {
      console.error('Error updating agent knowledge:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAgent = (agent: Agent) => {
    setDeletingAgent(agent)
    onDeleteModalOpen()
  }

  const handleConfirmDelete = async () => {
    if (!deletingAgent) return

    setDeleting(true)
    try {
      await softDeleteAgent(deletingAgent.id)
      onDeleteModalClose()
      setDeletingAgent(null)
    } catch (error) {
      console.error('Error deleting agent:', error)
    } finally {
      setDeleting(false)
    }
  }

  const renderAgentGrid = (agents: Agent[], isGlobal = false) => {
    if (agents.length === 0) {
      return (
        <Card>
          <Card.Content className="text-center py-12">
            <p className="text-default-500 mb-4">
              {isGlobal
                ? 'No global agents available.'
                : 'No custom agents found yet.'}
            </p>
            {!isGlobal && (
              <p className="text-default-400 text-sm">
                Click "New Agent" above to create your first custom agent!
              </p>
            )}
          </Card.Content>
        </Card>
      )
    }

    return (
      <div className="gap-3 columns sm:columns-2">
        {agents.map((agent) => (
          <div key={agent.id} className="mb-3">
            <AgentCard
              id={agent.id}
              // showDetails
              className="w-full min-h-22"
              onPress={handleAgentClick}
              children={
                <div className="absolute end-2 top-2">
                  <Dropdown>
                    <Dropdown.Trigger>
                      <Button isIconOnly variant="ghost" size="sm">
                        <MoreVert className="w-4 h-4" />
                      </Button>
                    </Dropdown.Trigger>
                    <Dropdown.Menu>
                      <Dropdown.Item
                        id="live"
                        onPress={() => handleStartLiveConversation(agent.slug)}
                      >
                        {t('Start Live Conversation')}
                      </Dropdown.Item>
                      {!isGlobal && agent.id.startsWith('custom-') ? (
                        <>
                          {/* <Dropdown.Item
                            id="edit"
                            onPress={() => handleEditKnowledge(agent)}
                          >
                            {t('Edit Knowledge')}
                          </Dropdown.Item> */}
                          <Dropdown.Item
                            id="delete"
                            className="text-danger"
                            color="danger"
                            onPress={() => handleDeleteAgent(agent)}
                          >
                            {t('Delete')}
                          </Dropdown.Item>
                        </>
                      ) : null}
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              }
            />
          </div>
        ))}
      </div>
    )
  }

  const header: HeaderProps = {
    color: 'bg-warning-50',
    icon: {
      name: 'Sparks',
      color: 'text-warning-500',
    },
    title: t('Agents'),
    subtitle: t('Create and manage your AI specialists'),
    cta: {
      label: t('New Agent'),
      href: url('/agents/new'),
      icon: 'Plus',
    },
  }

  if (loading) {
    return (
      <DefaultLayout title={t('Agents')} header={header}>
        <Section>
          <Container>
            <div className="flex justify-center items-center h-64">
              <Spinner size="lg" />
            </div>
          </Container>
        </Section>
      </DefaultLayout>
    )
  }

  return (
    <DefaultLayout title={t('Agents')} header={header}>
      <Section>
        <Container>
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as any)}
            aria-label="Agents sections"
            variant="underlined"
            classNames={{
              tabList: 'gap-6',
              cursor: 'w-full',
              tab: 'max-w-fit px-0 h-12',
            }}
          >
            {userAgents.length > 0 && (
              <Tab
                key="my-agents"
                title={
                  <div className="flex items-center gap-2">
                    <Icon name="Sparks" className="w-5 h-5" />
                    <span>{t('My Agents')}</span>
                    {userAgents.length > 0 && (
                      <Chip size="sm" variant="soft">
                        {userAgents.length}
                      </Chip>
                    )}
                  </div>
                }
                aria-label={t('My Agents')}
              >
                {renderAgentGrid(userAgents, false)}
              </Tab>
            )}
            <Tab
              key="global-agents"
              title={
                <div className="flex items-center gap-2">
                  <Icon name="SparksSolid" className="w-5 h-5" />
                  <span>{t('Built-in Agents')}</span>
                  {globalAgents.length > 0 && (
                    <Chip size="sm" variant="soft">
                      {globalAgents.length}
                    </Chip>
                  )}
                </div>
              }
              aria-label={t('Built-in Agents')}
            >
              <Alert
                color="default"
                icon={<Icon name="LightBulbOn" />}
                // variant="faded"
                className="mb-6 text-sm"
              >
                Built-in agents are pre-configured agents that come with the
                platform. They showcase various capabilities and can serve as
                inspiration for your own custom agents.
              </Alert>
              {renderAgentGrid(globalAgents, true)}
            </Tab>
          </Tabs>
        </Container>
      </Section>

      {/* Edit Knowledge Modal */}
      <Modal
        isOpen={isKnowledgeModalOpen}
        onOpenChange={(v) => !v && (onKnowledgeModalClose)()}
        size="3xl"
        scrollBehavior="inside"
      >
        <Modal.Dialog>
          <Modal.Header>
            <div className="flex items-center gap-2">
              {t('Edit Knowledge for {name}', { name: editingAgent?.name })}
            </div>
          </Modal.Header>
          <Modal.Body>
            <AgentKnowledgePicker
              selectedKnowledgeIds={selectedKnowledgeIds}
              onSelectionChange={setSelectedKnowledgeIds}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="ghost"
              onPress={onKnowledgeModalClose}
              isDisabled={saving}
            >
              {t('Cancel')}
            </Button>
            <Button
              color="primary"
              onPress={handleSaveKnowledge}
              isLoading={saving}
            >
              {t('Save Changes')}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onOpenChange={(v) => !v && (onDeleteModalClose)()} size="md">
        <Modal.Dialog>
          <Modal.Header>
            <div className="flex items-center gap-2">{t('Delete Agent')}</div>
          </Modal.Header>
          <Modal.Body>
            <p>
              {t(
                'Are you sure you want to delete "{name}"? This action cannot be undone.',
                { name: deletingAgent?.name },
              )}
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="ghost"
              onPress={onDeleteModalClose}
              isDisabled={deleting}
            >
              {t('Cancel')}
            </Button>
            <Button
              color="danger"
              onPress={handleConfirmDelete}
              isLoading={deleting}
            >
              {t('Delete')}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal>
    </DefaultLayout>
  )
}
