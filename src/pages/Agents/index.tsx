import {
  Alert,
  Card,
  CardBody,
  Spinner,
  Tab,
  Tabs,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Chip,
} from '@heroui/react'
import { useEffect, useState } from 'react'

import { useI18n } from '@/i18n'
import localI18n from './i18n'
import {
  getAgentsSeparated,
  updateAgent,
  softDeleteAgent,
} from '@/stores/agentStore'
import { userSettings } from '@/stores/userStore'
import { type Agent } from '@/types'
import { Container, Section, AgentKnowledgePicker, Icon } from '@/components'
import { AgentCard } from '@/components/AgentCard'
import DefaultLayout from '@/layouts/Default'
import { HeaderProps } from '@/lib/types'
import { useNavigate } from 'react-router-dom'
import { MoreVert, Trash, Voice } from 'iconoir-react'

export const AgentsPage = () => {
  const [userAgents, setUserAgents] = useState<Agent[]>([])
  const [globalAgents, setGlobalAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
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
  const { isOpen: isKnowledgeModalOpen, onClose: onKnowledgeModalClose } =
    useDisclosure()
  const {
    isOpen: isDeleteModalOpen,
    onOpen: onDeleteModalOpen,
    onClose: onDeleteModalClose,
  } = useDisclosure()

  const hideDefaultAgents = userSettings((state) => state.hideDefaultAgents)

  const fetchAgents = async () => {
    setLoading(true)
    try {
      const { customAgents, builtInAgents } = await getAgentsSeparated()

      if (customAgents.length === 0 && builtInAgents.length > 0) {
        setActiveTab('global-agents')
      } else {
        setActiveTab('my-agents')
      }
      setUserAgents(customAgents)
      setGlobalAgents(builtInAgents)
    } catch (error) {
      console.error('Error fetching agents:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [hideDefaultAgents])

  const handleAgentClick = (agentSlug: string) => {
    navigate(url(`/agents/run#${agentSlug}`))
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

      // Refresh agents list
      await fetchAgents()
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
      // Refresh agents list
      await fetchAgents()
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
          <CardBody className="text-center py-12">
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
          </CardBody>
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
                    <DropdownTrigger>
                      <Button isIconOnly variant="light" size="sm">
                        <MoreVert className="w-4 h-4" />
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu>
                      <DropdownItem
                        key="live"
                        startContent={<Voice className="w-4 h-4" />}
                        onPress={() => handleStartLiveConversation(agent.slug)}
                      >
                        {t('Start Live Conversation')}
                      </DropdownItem>
                      {!isGlobal && agent.id.startsWith('custom-') ? (
                        <>
                          {/* <DropdownItem
                            key="edit"
                            startContent={<EditPencil className="w-4 h-4" />}
                            onPress={() => handleEditKnowledge(agent)}
                          >
                            {t('Edit Knowledge')}
                          </DropdownItem> */}
                          <DropdownItem
                            key="delete"
                            className="text-danger"
                            color="danger"
                            startContent={<Trash className="w-4 h-4" />}
                            onPress={() => handleDeleteAgent(agent)}
                          >
                            {t('Delete')}
                          </DropdownItem>
                        </>
                      ) : null}
                    </DropdownMenu>
                  </Dropdown>
                </div>
              }
            />
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <Container>
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      </Container>
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
                      <Chip size="sm" variant="flat">
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
                    <Chip size="sm" variant="flat">
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
        onClose={onKnowledgeModalClose}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-2">
              {t('Edit Knowledge for {name}', { name: editingAgent?.name })}
            </div>
          </ModalHeader>
          <ModalBody>
            <AgentKnowledgePicker
              selectedKnowledgeIds={selectedKnowledgeIds}
              onSelectionChange={setSelectedKnowledgeIds}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
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
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose} size="md">
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-2">{t('Delete Agent')}</div>
          </ModalHeader>
          <ModalBody>
            <p>
              {t(
                'Are you sure you want to delete "{name}"? This action cannot be undone.',
                { name: deletingAgent?.name },
              )}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
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
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DefaultLayout>
  )
}
