import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Spinner,
  Tab,
  Tabs,
  Divider,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Input,
  Textarea,
} from '@heroui/react'

import { useI18n } from '@/i18n'
import { useAgentMemoryStore } from '@/stores/agentMemoryStore'
import { loadAllAgents, getDefaultAgent } from '@/stores/agentStore'
import { MemoryReviewList } from '@/components/MemoryReview'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { Container, Section, Icon } from '@/components'
import { AgentSelector } from '@/components/PromptArea/AgentSelector'
import DefaultLayout from '@/layouts/Default'
import { HeaderProps } from '@/lib/types'
import type {
  Agent,
  MemoryCategory,
  MemoryConfidence,
  AgentMemoryEntry,
} from '@/types'
import { generateMemorySynthesis } from '@/lib/memory-learning-service'

// Category display configuration
const categoryLabels: Record<MemoryCategory, string> = {
  fact: 'Facts',
  preference: 'Preferences',
  behavior: 'Behaviors',
  domain_knowledge: 'Domain Knowledge',
  relationship: 'Relationships',
  procedure: 'Procedures',
  correction: 'Corrections',
}

const confidenceColors: Record<MemoryConfidence, string> = {
  high: 'success',
  medium: 'warning',
  low: 'danger',
}

export function AgentMemoryPage() {
  const { agentId } = useParams<{ agentId?: string }>()
  const navigate = useNavigate()
  const { t, url, lang } = useI18n()

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [activeTab, setActiveTab] = useState<string>('review')
  const [filterCategory, setFilterCategory] = useState<MemoryCategory | 'all'>(
    'all',
  )
  const [isGeneratingSynthesis, setIsGeneratingSynthesis] = useState(false)

  const {
    memories,
    memoryDocuments,
    isLoading,
    loadMemoriesForAgent,
    loadAllMemories,
    loadMemoryDocument,
    getPendingReviewMemories,
    approveMemory,
    rejectMemory,
    editAndApproveMemory,
    bulkApproveMemories,
    bulkRejectMemories,
    getMemoryStats,
    deleteMemory,
    updateMemory,
    upgradeToGlobal,
    downgradeFromGlobal,
  } = useAgentMemoryStore()

  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure()
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure()
  const [memoryToDelete, setMemoryToDelete] = useState<string | null>(null)
  const [memoryToEdit, setMemoryToEdit] = useState<AgentMemoryEntry | null>(
    null,
  )
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    category: '' as MemoryCategory,
    confidence: '' as MemoryConfidence,
    keywords: '',
  })

  // Set initial selected agent from URL param
  useEffect(() => {
    if (agentId) {
      loadAllAgents().then((loadedAgents) => {
        const agent = loadedAgents.find((a) => a.id === agentId)
        if (agent) setSelectedAgent(agent)
      })
    }
  }, [agentId])

  // Load memories when agent changes
  useEffect(() => {
    if (selectedAgent) {
      loadMemoriesForAgent(selectedAgent.id)
      loadMemoryDocument(selectedAgent.id)
    } else {
      loadAllMemories()
    }
  }, [selectedAgent, loadMemoriesForAgent, loadAllMemories, loadMemoryDocument])

  // Update URL when agent changes
  useEffect(() => {
    if (selectedAgent && selectedAgent.id !== agentId) {
      navigate(url(`/agent-memory/${selectedAgent.id}`), { replace: true })
    }
  }, [selectedAgent, agentId, navigate, url])

  const selectedAgentId = selectedAgent?.id || null

  const memoryDocument = useMemo(
    () => memoryDocuments.find((d) => d.agentId === selectedAgentId),
    [memoryDocuments, selectedAgentId],
  )

  const stats = useMemo(
    () => (selectedAgentId ? getMemoryStats(selectedAgentId) : null),
    [selectedAgentId, getMemoryStats, memories],
  )

  const pendingMemories = useMemo(
    () => getPendingReviewMemories(selectedAgentId || undefined),
    [getPendingReviewMemories, selectedAgentId, memories],
  )

  const approvedMemories = useMemo(() => {
    let filtered = memories.filter(
      (m) =>
        (m.validationStatus === 'approved' ||
          m.validationStatus === 'auto_approved') &&
        (!selectedAgentId || m.agentId === selectedAgentId),
    )
    if (filterCategory !== 'all') {
      filtered = filtered.filter((m) => m.category === filterCategory)
    }
    return filtered.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  }, [memories, selectedAgentId, filterCategory])

  const handleGenerateSynthesis = async () => {
    if (!selectedAgentId) return
    setIsGeneratingSynthesis(true)
    try {
      await generateMemorySynthesis(selectedAgentId)
      await loadMemoryDocument(selectedAgentId)
    } catch (error) {
      console.error('Failed to generate synthesis:', error)
    } finally {
      setIsGeneratingSynthesis(false)
    }
  }

  const handleDeleteMemory = async () => {
    if (memoryToDelete) {
      await deleteMemory(memoryToDelete)
      setMemoryToDelete(null)
      onDeleteClose()
    }
  }

  const confirmDelete = (id: string) => {
    setMemoryToDelete(id)
    onDeleteOpen()
  }

  const openEditModal = (memory: AgentMemoryEntry) => {
    setMemoryToEdit(memory)
    setEditForm({
      title: memory.title,
      content: memory.content,
      category: memory.category,
      confidence: memory.confidence,
      keywords: memory.keywords.join(', '),
    })
    onEditOpen()
  }

  const handleEditMemory = async () => {
    if (memoryToEdit) {
      await updateMemory(memoryToEdit.id, {
        title: editForm.title,
        content: editForm.content,
        category: editForm.category,
        confidence: editForm.confidence,
        keywords: editForm.keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
      })
      setMemoryToEdit(null)
      onEditClose()
    }
  }

  const header: HeaderProps = {
    icon: {
      name: 'Brain',
      color: 'text-purple-500',
    },
    title: t('Agent Memory'),
    subtitle: t('Review and manage what agents have learned'),
  }

  return (
    <DefaultLayout header={header}>
      <Container>
        <Section>
          {/* Agent Selector */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-start">
            <div className="flex items-center gap-2">
              <AgentSelector
                lang={lang}
                selectedAgent={selectedAgent || getDefaultAgent()}
                onAgentChange={(agent) => setSelectedAgent(agent)}
              />
              {selectedAgent && (
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  onPress={() => setSelectedAgent(null)}
                >
                  <Icon name="Xmark" className="w-4 h-4" />
                </Button>
              )}
            </div>

            {selectedAgent && (
              <div className="flex gap-2 items-center">
                <Button
                  color="primary"
                  variant="flat"
                  size="sm"
                  startContent={
                    <Icon name="RefreshDouble" className="w-4 h-4" />
                  }
                  onPress={handleGenerateSynthesis}
                  isLoading={isGeneratingSynthesis}
                >
                  {t('Generate Synthesis')}
                </Button>
              </div>
            )}
          </div>

          {/* Statistics */}
          {stats && selectedAgentId && (
            <Card className="mb-6">
              <CardBody>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-sm text-default-500">
                      {t('Total Memories')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-warning">
                      {stats.pendingReview}
                    </p>
                    <p className="text-sm text-default-500">
                      {t('Pending Review')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-success">
                      {stats.byConfidence.high}
                    </p>
                    <p className="text-sm text-default-500">
                      {t('High Confidence')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-danger">
                      {stats.byConfidence.low}
                    </p>
                    <p className="text-sm text-default-500">
                      {t('Low Confidence')}
                    </p>
                  </div>
                </div>

                {/* Category breakdown */}
                <Divider className="my-4" />
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.byCategory).map(
                    ([category, count]) =>
                      count > 0 && (
                        <Chip key={category} size="sm" variant="flat">
                          {t(categoryLabels[category as MemoryCategory] as any)}
                          : {count}
                        </Chip>
                      ),
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Main Content Tabs */}
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as string)}
            aria-label="Memory management tabs"
          >
            {/* Review Tab */}
            <Tab
              key="review"
              title={
                <div className="flex items-center gap-2">
                  <Icon name="Clock" className="w-4 h-4" />
                  <span>{t('Pending Review')}</span>
                  {pendingMemories.length > 0 && (
                    <Chip size="sm" color="warning" variant="solid">
                      {pendingMemories.length}
                    </Chip>
                  )}
                </div>
              }
            >
              <div className="py-4">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Spinner size="lg" />
                  </div>
                ) : (
                  <MemoryReviewList
                    memories={pendingMemories}
                    onApprove={approveMemory}
                    onReject={rejectMemory}
                    onEdit={editAndApproveMemory}
                    onBulkApprove={bulkApproveMemories}
                    onBulkReject={bulkRejectMemories}
                    isLoading={isLoading}
                    emptyMessage={
                      selectedAgentId
                        ? t('No memories pending review for this agent')
                        : t('No memories pending review')
                    }
                  />
                )}
              </div>
            </Tab>

            {/* Approved Memories Tab */}
            <Tab
              key="approved"
              title={
                <div className="flex items-center gap-2">
                  <Icon name="Check" className="w-4 h-4" />
                  <span>{t('Approved')}</span>
                </div>
              }
            >
              <div className="py-4">
                {/* Category Filter */}
                <div className="flex gap-2 mb-4">
                  <Select
                    label={t('Filter by category')}
                    selectedKeys={[filterCategory]}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as
                        | MemoryCategory
                        | 'all'
                      setFilterCategory(selected)
                    }}
                    className="max-w-xs"
                    size="sm"
                    startContent={<Icon name="Search" className="w-4 h-4" />}
                    items={[
                      { key: 'all', label: 'All Categories' },
                      ...Object.entries(categoryLabels).map(([key, label]) => ({
                        key,
                        label,
                      })),
                    ]}
                  >
                    {(item) => (
                      <SelectItem key={item.key}>
                        {t(item.label as any)}
                      </SelectItem>
                    )}
                  </Select>
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Spinner size="lg" />
                  </div>
                ) : approvedMemories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-default-400">
                    <Icon name="Brain" className="w-12 h-12 mb-4 opacity-50" />
                    <p>{t('No approved memories yet')}</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {approvedMemories.map((memory) => (
                      <MemoryCard
                        key={memory.id}
                        memory={memory}
                        onEdit={() => openEditModal(memory)}
                        onDelete={() => confirmDelete(memory.id)}
                        onToggleGlobal={async () => {
                          if (memory.isGlobal) {
                            await downgradeFromGlobal(memory.id)
                          } else {
                            await upgradeToGlobal(memory.id)
                          }
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Tab>

            {/* Synthesis Tab */}
            <Tab
              key="synthesis"
              title={
                <div className="flex items-center gap-2">
                  <Icon name="Brain" className="w-4 h-4" />
                  <span>{t('Synthesis')}</span>
                </div>
              }
              isDisabled={!selectedAgentId}
            >
              <div className="py-4">
                {!selectedAgentId ? (
                  <div className="flex flex-col items-center justify-center py-12 text-default-400">
                    <p>{t('Select an agent to view their memory synthesis')}</p>
                  </div>
                ) : memoryDocument?.synthesis ? (
                  <Card>
                    <CardHeader className="flex justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {t('Memory Synthesis for {agent}', {
                            agent: selectedAgent?.name || selectedAgentId,
                          })}
                        </h3>
                        <p className="text-sm text-default-500">
                          {t('Last updated: {date}', {
                            date: new Date(
                              memoryDocument.lastSynthesisAt,
                            ).toLocaleString(),
                          })}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="flat"
                        startContent={
                          <Icon name="Download" className="w-4 h-4" />
                        }
                        onPress={() => {
                          // Download synthesis as markdown
                          const blob = new Blob([memoryDocument.synthesis], {
                            type: 'text/markdown',
                          })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `${selectedAgent?.name || 'agent'}-memory-synthesis.md`
                          a.click()
                          URL.revokeObjectURL(url)
                        }}
                      >
                        {t('Export')}
                      </Button>
                    </CardHeader>
                    <CardBody>
                      <MarkdownRenderer content={memoryDocument.synthesis} />
                    </CardBody>
                  </Card>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-default-400">
                    <Icon name="Brain" className="w-12 h-12 mb-4 opacity-50" />
                    <p className="mb-4">{t('No synthesis generated yet')}</p>
                    <Button
                      color="primary"
                      onPress={handleGenerateSynthesis}
                      isLoading={isGeneratingSynthesis}
                      startContent={
                        <Icon name="RefreshDouble" className="w-4 h-4" />
                      }
                    >
                      {t('Generate Synthesis')}
                    </Button>
                  </div>
                )}
              </div>
            </Tab>
          </Tabs>
        </Section>
      </Container>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalContent>
          <ModalHeader>{t('Delete Memory')}</ModalHeader>
          <ModalBody>
            <p>
              {t(
                'Are you sure you want to delete this memory? This action cannot be undone.',
              )}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onDeleteClose}>
              {t('Cancel')}
            </Button>
            <Button color="danger" onPress={handleDeleteMemory}>
              {t('Delete')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Memory Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="2xl">
        <ModalContent>
          <ModalHeader>{t('Edit Memory')}</ModalHeader>
          <ModalBody className="gap-4">
            <Input
              label={t('Title')}
              value={editForm.title}
              onValueChange={(value) =>
                setEditForm((prev) => ({ ...prev, title: value }))
              }
            />
            <Textarea
              label={t('Content')}
              value={editForm.content}
              onValueChange={(value) =>
                setEditForm((prev) => ({ ...prev, content: value }))
              }
              minRows={3}
            />
            <div className="flex gap-4">
              <Select
                label={t('Category')}
                selectedKeys={editForm.category ? [editForm.category] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as MemoryCategory
                  setEditForm((prev) => ({ ...prev, category: selected }))
                }}
                className="flex-1"
              >
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <SelectItem key={key}>{t(label as any)}</SelectItem>
                ))}
              </Select>
              <Select
                label={t('Confidence')}
                selectedKeys={editForm.confidence ? [editForm.confidence] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as MemoryConfidence
                  setEditForm((prev) => ({ ...prev, confidence: selected }))
                }}
                className="flex-1"
              >
                <SelectItem key="high">{t('High')}</SelectItem>
                <SelectItem key="medium">{t('Medium')}</SelectItem>
                <SelectItem key="low">{t('Low')}</SelectItem>
              </Select>
            </div>
            <Input
              label={t('Keywords')}
              value={editForm.keywords}
              onValueChange={(value) =>
                setEditForm((prev) => ({ ...prev, keywords: value }))
              }
              description={t('Comma-separated list of keywords')}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onEditClose}>
              {t('Cancel')}
            </Button>
            <Button color="primary" onPress={handleEditMemory}>
              {t('Save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DefaultLayout>
  )
}

// ============================================================================
// Memory Card Component (for approved memories list)
// ============================================================================

interface MemoryCardProps {
  memory: AgentMemoryEntry
  onDelete: () => void
  onEdit: () => void
  onToggleGlobal: () => void
}

function MemoryCard({
  memory,
  onDelete,
  onEdit,
  onToggleGlobal,
}: MemoryCardProps) {
  const { t } = useI18n()

  const categoryLabel =
    categoryLabels[memory.category] || memory.category || 'Unknown'
  const confidenceColor = confidenceColors[memory.confidence] || 'default'

  return (
    <Card className="w-full">
      <CardBody className="flex flex-row gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold">{memory.title}</h4>
            <Chip size="sm" variant="flat" color={confidenceColor as any}>
              {t((memory.confidence || 'medium') as any)}
            </Chip>
            <Chip size="sm" variant="bordered">
              {t(categoryLabel as any)}
            </Chip>
            {memory.isGlobal && (
              <Chip size="sm" variant="solid" color="primary">
                {t('Global')}
              </Chip>
            )}
            {memory.validationStatus === 'auto_approved' && (
              <Chip size="sm" variant="dot" color="default">
                {t('Auto-approved')}
              </Chip>
            )}
          </div>
          <p className="text-sm text-default-600 mb-2">{memory.content}</p>
          <div className="flex flex-wrap gap-1">
            {(memory.keywords || []).slice(0, 5).map((keyword) => (
              <Chip key={keyword} size="sm" variant="flat" className="text-xs">
                {keyword}
              </Chip>
            ))}
          </div>
          <p className="text-xs text-default-400 mt-2">
            {t('Learned: {date}', {
              date: new Date(memory.learnedAt).toLocaleDateString(),
            })}
            {memory.usageCount > 0 &&
              ` • ${t('Used {count} times', { count: memory.usageCount })}`}
          </p>
        </div>
        <div className="flex flex-col justify-center gap-1">
          <Button
            isIconOnly
            size="sm"
            variant="light"
            color={memory.isGlobal ? 'danger' : 'primary'}
            onPress={onToggleGlobal}
            title={memory.isGlobal ? t('Remove Global') : t('Make Global')}
          >
            <Icon name="Share" className="w-4 h-4" />
          </Button>
          <Button isIconOnly size="sm" variant="light" onPress={onEdit}>
            <Icon name="EditPencil" className="w-4 h-4" />
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            color="danger"
            onPress={onDelete}
          >
            <Icon name="Trash" className="w-4 h-4" />
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}

export default AgentMemoryPage
