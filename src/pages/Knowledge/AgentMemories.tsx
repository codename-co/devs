import React, { useState, useEffect, useMemo } from 'react'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Chip,
  Divider,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
  Spinner,
  Tab,
  Tabs,
  Textarea,
  useDisclosure,
} from '@heroui/react'

import { useAgentMemoryStore } from '@/stores/agentMemoryStore'
import { MemoryReviewList } from '@/components/MemoryReview'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { generateMemorySynthesis } from '@/lib/memory-learning-service'
import { useAgentMemories, useAgents, useMemories } from '@/hooks'
import type {
  AgentMemoryEntry,
  MemoryCategory,
  MemoryConfidence,
} from '@/types'
import { useI18n } from '@/i18n'
import { Icon } from '@/components'

export const categoryLabels: Record<MemoryCategory, string> = {
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

export const AgentMemories: React.FC = () => {
  const { t } = useI18n()

  // Use reactive hooks for instant updates
  const allMemories = useMemories()
  const agents = useAgents()
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [memoryTab, setMemoryTab] = useState<string>('review')
  const [filterCategory, setFilterCategory] = useState<MemoryCategory | 'all'>(
    'all',
  )
  const [isGeneratingSynthesis, setIsGeneratingSynthesis] = useState(false)

  // Get memories for selected agent using reactive hook
  const agentMemories = useAgentMemories(selectedAgentId || undefined)

  // Decide which memories to use based on selection
  const memories = selectedAgentId ? agentMemories : allMemories

  const {
    memoryDocuments,
    isLoading: isMemoryLoading,
    loadMemoryDocument,
    approveMemory,
    rejectMemory,
    editAndApproveMemory,
    bulkApproveMemories,
    bulkRejectMemories,
    deleteMemory,
    updateMemory,
    createMemory,
    upgradeToGlobal,
    downgradeFromGlobal,
  } = useAgentMemoryStore()

  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure()
  const {
    isOpen: isMemoryEditOpen,
    onOpen: onMemoryEditOpen,
    onClose: onMemoryEditClose,
  } = useDisclosure()
  const {
    isOpen: isMemoryCreateOpen,
    onOpen: onMemoryCreateOpen,
    onClose: onMemoryCreateClose,
  } = useDisclosure()
  const [memoryToDelete, setMemoryToDelete] = useState<string | null>(null)
  const [memoryToEdit, setMemoryToEdit] = useState<AgentMemoryEntry | null>(
    null,
  )
  const [memoryEditForm, setMemoryEditForm] = useState({
    title: '',
    content: '',
    category: '' as MemoryCategory,
    confidence: '' as MemoryConfidence,
    keywords: '',
  })
  const [memoryCreateForm, setMemoryCreateForm] = useState({
    title: '',
    content: '',
    category: 'fact' as MemoryCategory,
    confidence: 'medium' as MemoryConfidence,
    keywords: '',
    tags: '',
    isGlobal: false,
  })

  // Only load memory document when agent changes (data loads automatically via reactive hooks)
  useEffect(() => {
    if (selectedAgentId) {
      loadMemoryDocument(selectedAgentId)
    }
  }, [selectedAgentId, loadMemoryDocument])

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId),
    [agents, selectedAgentId],
  )

  const memoryDocument = useMemo(
    () => memoryDocuments.find((d) => d.agentId === selectedAgentId),
    [memoryDocuments, selectedAgentId],
  )

  // Compute stats from reactive memories
  const stats = useMemo(() => {
    if (!selectedAgentId) return null
    const agentMems = memories.filter((m) => m.agentId === selectedAgentId)
    return {
      total: agentMems.length,
      byCategory: agentMems.reduce(
        (acc, m) => {
          acc[m.category] = (acc[m.category] || 0) + 1
          return acc
        },
        {} as Record<MemoryCategory, number>,
      ),
      byConfidence: agentMems.reduce(
        (acc, m) => {
          acc[m.confidence] = (acc[m.confidence] || 0) + 1
          return acc
        },
        {} as Record<MemoryConfidence, number>,
      ),
      byValidation: agentMems.reduce(
        (acc, m) => {
          acc[m.validationStatus] = (acc[m.validationStatus] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
      pendingReview: agentMems.filter((m) => m.validationStatus === 'pending')
        .length,
    }
  }, [selectedAgentId, memories])

  // Compute pending memories from reactive data
  const pendingMemories = useMemo(
    () =>
      memories.filter(
        (m) =>
          m.validationStatus === 'pending' &&
          (!selectedAgentId || m.agentId === selectedAgentId),
      ),
    [selectedAgentId, memories],
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

  const confirmDeleteMemory = (id: string) => {
    setMemoryToDelete(id)
    onDeleteOpen()
  }

  const openMemoryEditModal = (memory: AgentMemoryEntry) => {
    setMemoryToEdit(memory)
    setMemoryEditForm({
      title: memory.title,
      content: memory.content,
      category: memory.category,
      confidence: memory.confidence,
      keywords: memory.keywords.join(', '),
    })
    onMemoryEditOpen()
  }

  const handleEditMemory = async () => {
    if (memoryToEdit) {
      await updateMemory(memoryToEdit.id, {
        title: memoryEditForm.title,
        content: memoryEditForm.content,
        category: memoryEditForm.category,
        confidence: memoryEditForm.confidence,
        keywords: memoryEditForm.keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
      })
      setMemoryToEdit(null)
      onMemoryEditClose()
    }
  }

  const handleCreateMemory = async () => {
    if (!selectedAgentId) return

    await createMemory({
      agentId: selectedAgentId,
      title: memoryCreateForm.title,
      content: memoryCreateForm.content,
      category: memoryCreateForm.category,
      confidence: memoryCreateForm.confidence,
      keywords: memoryCreateForm.keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
      tags: memoryCreateForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      isGlobal: memoryCreateForm.isGlobal,
      validationStatus: 'approved',
      learnedAt: new Date(),
      sourceConversationIds: [],
      sourceMessageIds: [],
    })

    setMemoryCreateForm({
      title: '',
      content: '',
      category: 'fact',
      confidence: 'medium',
      keywords: '',
      tags: '',
      isGlobal: false,
    })
    onMemoryCreateClose()
  }

  return (
    <>
      <div className="py-6">
        {/* Agent Selector */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Select
            label={t('Select Agent')}
            placeholder={t('All agents')}
            selectedKeys={selectedAgentId ? [selectedAgentId] : []}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string
              setSelectedAgentId(selected || null)
            }}
            className="max-w-xs"
          >
            {agents.map((agent) => (
              <SelectItem key={agent.id}>{agent.name}</SelectItem>
            ))}
          </Select>

          {selectedAgentId && (
            <div className="flex gap-2 items-end">
              <Button
                color="secondary"
                variant="flat"
                startContent={<Icon name="Plus" className="w-4 h-4" />}
                onPress={onMemoryCreateOpen}
              >
                {t('Create Memory')}
              </Button>
              <Button
                color="primary"
                variant="flat"
                startContent={<Icon name="RefreshDouble" className="w-4 h-4" />}
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

              <Divider className="my-4" />
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.byCategory).map(
                  ([category, count]) =>
                    count > 0 && (
                      <Chip key={category} size="sm" variant="flat">
                        {t(categoryLabels[category as MemoryCategory] as any)}:{' '}
                        {count}
                      </Chip>
                    ),
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Memory Sub-Tabs */}
        <Tabs
          selectedKey={memoryTab}
          onSelectionChange={(key) => setMemoryTab(key as string)}
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
              {isMemoryLoading ? (
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
                  isLoading={isMemoryLoading}
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

              {isMemoryLoading ? (
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
                      onEdit={() => openMemoryEditModal(memory)}
                      onDelete={() => confirmDeleteMemory(memory.id)}
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
                        const blob = new Blob([memoryDocument.synthesis], {
                          type: 'text/markdown',
                        })
                        const blobUrl = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = blobUrl
                        a.download = `${selectedAgent?.name || 'agent'}-memory-synthesis.md`
                        a.click()
                        URL.revokeObjectURL(blobUrl)
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
      </div>

      {/* Delete Memory Confirmation Modal */}
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
      <Modal isOpen={isMemoryEditOpen} onClose={onMemoryEditClose} size="2xl">
        <ModalContent>
          <ModalHeader>{t('Edit Memory')}</ModalHeader>
          <ModalBody className="gap-4">
            <Input
              label={t('Title')}
              value={memoryEditForm.title}
              onValueChange={(value) =>
                setMemoryEditForm((prev) => ({ ...prev, title: value }))
              }
            />
            <Textarea
              label={t('Content')}
              value={memoryEditForm.content}
              onValueChange={(value) =>
                setMemoryEditForm((prev) => ({ ...prev, content: value }))
              }
              minRows={3}
            />
            <div className="flex gap-4">
              <Select
                label={t('Category')}
                selectedKeys={
                  memoryEditForm.category ? [memoryEditForm.category] : []
                }
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as MemoryCategory
                  setMemoryEditForm((prev) => ({ ...prev, category: selected }))
                }}
                className="flex-1"
              >
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <SelectItem key={key}>{t(label as any)}</SelectItem>
                ))}
              </Select>
              <Select
                label={t('Confidence')}
                selectedKeys={
                  memoryEditForm.confidence ? [memoryEditForm.confidence] : []
                }
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as MemoryConfidence
                  setMemoryEditForm((prev) => ({
                    ...prev,
                    confidence: selected,
                  }))
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
              value={memoryEditForm.keywords}
              onValueChange={(value) =>
                setMemoryEditForm((prev) => ({ ...prev, keywords: value }))
              }
              description={t('Comma-separated list of keywords')}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onMemoryEditClose}>
              {t('Cancel')}
            </Button>
            <Button color="primary" onPress={handleEditMemory}>
              {t('Save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Create Memory Modal */}
      <Modal
        isOpen={isMemoryCreateOpen}
        onClose={onMemoryCreateClose}
        size="2xl"
      >
        <ModalContent>
          <ModalHeader>{t('Create Memory')}</ModalHeader>
          <ModalBody className="gap-4">
            <Input
              label={t('Title')}
              placeholder="Brief description of this memory"
              value={memoryCreateForm.title}
              onValueChange={(value) =>
                setMemoryCreateForm((prev) => ({ ...prev, title: value }))
              }
              isRequired
            />
            <Textarea
              label={t('Content')}
              placeholder="Detailed information to remember"
              value={memoryCreateForm.content}
              onValueChange={(value) =>
                setMemoryCreateForm((prev) => ({ ...prev, content: value }))
              }
              minRows={4}
              isRequired
            />
            <div className="flex gap-4">
              <Select
                label={t('Category')}
                selectedKeys={[memoryCreateForm.category]}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as MemoryCategory
                  setMemoryCreateForm((prev) => ({
                    ...prev,
                    category: selected,
                  }))
                }}
                className="flex-1"
              >
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <SelectItem key={key}>{t(label as any)}</SelectItem>
                ))}
              </Select>
              <Select
                label={t('Confidence')}
                selectedKeys={[memoryCreateForm.confidence]}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as MemoryConfidence
                  setMemoryCreateForm((prev) => ({
                    ...prev,
                    confidence: selected,
                  }))
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
              placeholder="keyword1, keyword2, keyword3"
              value={memoryCreateForm.keywords}
              onValueChange={(value) =>
                setMemoryCreateForm((prev) => ({ ...prev, keywords: value }))
              }
              description={t('Comma-separated list of keywords')}
            />
            <Input
              label="Tags"
              placeholder="tag1, tag2, tag3"
              value={memoryCreateForm.tags}
              onValueChange={(value) =>
                setMemoryCreateForm((prev) => ({ ...prev, tags: value }))
              }
              description="Comma-separated list of tags (optional)"
            />
            <Checkbox
              isSelected={memoryCreateForm.isGlobal}
              onValueChange={(value) =>
                setMemoryCreateForm((prev) => ({ ...prev, isGlobal: value }))
              }
            >
              {t('Make Global')} - Share this memory with all agents
            </Checkbox>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onMemoryCreateClose}>
              {t('Cancel')}
            </Button>
            <Button
              color="primary"
              onPress={handleCreateMemory}
              isDisabled={!memoryCreateForm.title || !memoryCreateForm.content}
            >
              {t('Create Memory')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
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
