import React, { useState, useEffect, useMemo } from 'react'
import { Button, Card, Checkbox, Chip, Input, Modal, Select, Spinner, Tab, Tabs, TextArea, useOverlayState } from '@heroui/react'

import { useAgentMemoryStore } from '@/stores/agentMemoryStore'
import { MemoryReviewList } from '@/components/MemoryReview'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { generateMemorySynthesis } from '@/lib/memory-learning-service'
import {
  useDecryptedAgentMemories,
  useAgents,
  useDecryptedMemories,
} from '@/hooks'
import type {
  AgentMemoryEntry,
  MemoryCategory,
  MemoryConfidence,
} from '@/types'
import { useI18n } from '@/i18n'
import { MultiFilter, Icon } from '@/components'
import type { MultiFilterSelection } from '@/components'
import { useHashHighlight } from '@/hooks/useHashHighlight'

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
  const { getHighlightClasses } = useHashHighlight()

  // Use reactive hooks with decrypted content for display
  const allMemories = useDecryptedMemories()
  const agents = useAgents()
  const [filterSelection, setFilterSelection] = useState<MultiFilterSelection>({
    agent: 'all',
    category: 'all',
  })
  const selectedAgentId =
    filterSelection.agent === 'all' ? null : filterSelection.agent
  const filterCategory = (filterSelection.category || 'all') as
    | MemoryCategory
    | 'all'
  const [memoryTab, setMemoryTab] = useState<string>('review')
  const [isGeneratingSynthesis, setIsGeneratingSynthesis] = useState(false)

  // Get memories for selected agent using reactive hook
  const agentMemories = useDecryptedAgentMemories(selectedAgentId || undefined)

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

  const { isOpen: isDeleteOpen, open: onDeleteOpen, close: onDeleteClose } = useOverlayState()
  const { isOpen: isMemoryEditOpen, open: onMemoryEditOpen, close: onMemoryEditClose } = useOverlayState()
  const { isOpen: isMemoryCreateOpen, open: onMemoryCreateOpen, close: onMemoryCreateClose } = useOverlayState()
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
      <div className="space-y-3">
        {/* Description */}
        <p className="text-sm text-default-500">
          {t(
            'Agent memories are pieces of information that an agent can store and recall to inform its decisions and actions. They can be facts, preferences, behaviors, relationships, or any other relevant information about the agent or its environment.',
          )}
        </p>

        {/* Toolbar: Agent selector + Actions */}
        <div
          id="agent-filter"
          className={getHighlightClasses(
            'agent-filter',
            'flex flex-col sm:flex-row items-start sm:items-center gap-3',
          )}
        >
          {selectedAgentId && (
            <div className="flex gap-2">
              <Button
                size="sm"
                color="secondary"
                variant="secondary"
                startContent={<Icon name="Plus" className="w-3.5 h-3.5" />}
                onPress={onMemoryCreateOpen}
              >
                {t('Create Memory')}
              </Button>
              <Button
                size="sm"
                color="primary"
                variant="secondary"
                startContent={
                  <Icon name="RefreshDouble" className="w-3.5 h-3.5" />
                }
                onPress={handleGenerateSynthesis}
                isLoading={isGeneratingSynthesis}
              >
                {t('Generate Synthesis')}
              </Button>
            </div>
          )}

          {/* Stats chips */}
          {stats && selectedAgentId && (
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <Chip size="sm" variant="soft">
                {stats.total} {t('Total Memories')}
              </Chip>
              {stats.pendingReview > 0 && (
                <Chip size="sm" variant="soft" color="warning">
                  {stats.pendingReview} {t('Pending Review')}
                </Chip>
              )}
              {(stats.byConfidence.high ?? 0) > 0 && (
                <Chip size="sm" variant="soft" color="success">
                  {stats.byConfidence.high} {t('High Confidence')}
                </Chip>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex justify-between gap-4">
          <Tabs
            size="sm"
            selectedKey={memoryTab}
            onSelectionChange={(key) => setMemoryTab(key as string)}
            aria-label="Memory management tabs"
          >
            {/* Review Tab */}
            <Tab
              key="review"
              title={
                <div className="flex items-center gap-2">
                  <Icon name="Clock" size="sm" className="hidden lg:inline" />
                  <span>{t('Pending Review')}</span>
                  {pendingMemories.length > 0 && (
                    <Chip size="sm" color="warning" variant="primary">
                      {pendingMemories.length}
                    </Chip>
                  )}
                </div>
              }
            />

            {/* Approved Memories Tab */}
            <Tab
              key="approved"
              title={
                <div className="flex items-center gap-2">
                  <Icon name="Check" size="sm" className="hidden lg:inline" />
                  <span>{t('Approved')}</span>
                  {approvedMemories.length > 0 && (
                    <Chip size="sm" variant="soft">
                      {approvedMemories.length}
                    </Chip>
                  )}
                </div>
              }
            />

            {/* Synthesis Tab */}
            <Tab
              key="synthesis"
              title={
                <div className="flex items-center gap-2">
                  <Icon name="Brain" size="sm" className="hidden lg:inline" />
                  <span>{t('Synthesis')}</span>
                </div>
              }
              isDisabled={!selectedAgentId}
            />
          </Tabs>
          <MultiFilter
            label=" "
            sections={[
              {
                key: 'agent',
                title: t('Filter by agent'),
                options: [
                  { key: 'all', label: t('All agents') },
                  ...agents.map((agent) => ({
                    key: agent.id,
                    label: agent.name,
                  })),
                ],
              },
              {
                key: 'category',
                title: t('Filter by category'),
                options: [
                  { key: 'all', label: t('All Categories') },
                  ...Object.entries(categoryLabels).map(([key, label]) => ({
                    key,
                    label: t(label as any),
                  })),
                ],
              },
            ]}
            selectedKeys={filterSelection}
            onSelectionChange={setFilterSelection}
          />
        </div>
      </div>

      {memoryTab === 'review' && (
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
      )}

      {memoryTab === 'approved' && (
        <div className="py-4 space-y-4">
          {isMemoryLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : approvedMemories.length === 0 && filterCategory === 'all' ? (
            <div className="flex flex-col items-center justify-center py-16 text-default-400">
              <Icon name="Brain" className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {t('No approved memories yet')}
              </p>
              <p className="text-sm text-center max-w-md">
                {t(
                  'Memories will appear here once they are approved from the review queue.',
                )}
              </p>
            </div>
          ) : approvedMemories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-default-400">
              <Icon name="FilterAlt" className="w-10 h-10 mb-3 opacity-50" />
              <p className="text-sm">{t('No memories match this filter')}</p>
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
      )}

      {memoryTab === 'synthesis' && (
        <div className="py-4">
          {!selectedAgentId ? (
            <div className="flex flex-col items-center justify-center py-16 text-default-400">
              <Icon name="Brain" className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {t('Select an agent to view their memory synthesis')}
              </p>
            </div>
          ) : memoryDocument?.synthesis ? (
            <Card>
              <Card.Header className="flex justify-between">
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
                  variant="secondary"
                  startContent={<Icon name="Download" className="w-4 h-4" />}
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
              </Card.Header>
              <Card.Content>
                <MarkdownRenderer content={memoryDocument.synthesis} />
              </Card.Content>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-default-400">
              <Icon name="Brain" className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {t('No synthesis generated yet')}
              </p>
              <p className="text-sm text-center max-w-md mb-4">
                {t(
                  'Generate a synthesis to create a summary of all approved memories for this agent.',
                )}
              </p>
              <Button
                color="primary"
                onPress={handleGenerateSynthesis}
                isLoading={isGeneratingSynthesis}
                startContent={<Icon name="RefreshDouble" className="w-4 h-4" />}
              >
                {t('Generate Synthesis')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Delete Memory Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onOpenChange={(v) => !v && (onDeleteClose)()}>
        <Modal.Dialog>
          <Modal.Header>{t('Delete Memory')}</Modal.Header>
          <Modal.Body>
            <p>
              {t(
                'Are you sure you want to delete this memory? This action cannot be undone.',
              )}
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onPress={onDeleteClose}>
              {t('Cancel')}
            </Button>
            <Button color="danger" onPress={handleDeleteMemory}>
              {t('Delete')}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal>

      {/* Edit Memory Modal */}
      <Modal isOpen={isMemoryEditOpen} onOpenChange={(v) => !v && (onMemoryEditClose)()} size="2xl">
        <Modal.Dialog>
          <Modal.Header>{t('Edit Memory')}</Modal.Header>
          <Modal.Body className="gap-4">
            <Input
              label={t('Title')}
              value={memoryEditForm.title}
              onValueChange={(value) =>
                setMemoryEditForm((prev) => ({ ...prev, title: value }))
              }
            />
            <TextArea
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
                  <Select.Item id={key}>{t(label as any)}</Select.Item>
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
                <Select.Item id="high">{t('High')}</Select.Item>
                <Select.Item id="medium">{t('Medium')}</Select.Item>
                <Select.Item id="low">{t('Low')}</Select.Item>
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
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onPress={onMemoryEditClose}>
              {t('Cancel')}
            </Button>
            <Button color="primary" onPress={handleEditMemory}>
              {t('Save')}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal>

      {/* Create Memory Modal */}
      <Modal
        isOpen={isMemoryCreateOpen}
        onOpenChange={(v) => !v && (onMemoryCreateClose)()}
        size="2xl"
      >
        <Modal.Dialog>
          <Modal.Header>{t('Create Memory')}</Modal.Header>
          <Modal.Body className="gap-4">
            <Input
              label={t('Title')}
              placeholder="Brief description of this memory"
              value={memoryCreateForm.title}
              onValueChange={(value) =>
                setMemoryCreateForm((prev) => ({ ...prev, title: value }))
              }
              isRequired
            />
            <TextArea
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
                  <Select.Item id={key}>{t(label as any)}</Select.Item>
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
                <Select.Item id="high">{t('High')}</Select.Item>
                <Select.Item id="medium">{t('Medium')}</Select.Item>
                <Select.Item id="low">{t('Low')}</Select.Item>
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
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onPress={onMemoryCreateClose}>
              {t('Cancel')}
            </Button>
            <Button
              color="primary"
              onPress={handleCreateMemory}
              isDisabled={!memoryCreateForm.title || !memoryCreateForm.content}
            >
              {t('Create Memory')}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
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
    <Card className="w-full group" shadow="sm">
      <Card.Content className="flex flex-row gap-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-semibold text-sm truncate">{memory.title}</h4>
            <Chip size="sm" variant="soft" color={confidenceColor as any}>
              {t((memory.confidence || 'medium') as any)}
            </Chip>
            <Chip size="sm" variant="secondary">
              {t(categoryLabel as any)}
            </Chip>
            {memory.isGlobal && (
              <Chip size="sm" variant="primary" color="accent">
                {t('Global')}
              </Chip>
            )}
            {memory.validationStatus === 'auto_approved' && (
              <Chip size="sm" variant="soft" color="default">
                {t('Auto-approved')}
              </Chip>
            )}
          </div>
          <p className="text-sm text-default-600 mb-2 line-clamp-2">
            {memory.content}
          </p>
          <div className="flex items-center gap-3 text-xs text-default-400">
            <span>
              {t('Learned: {date}', {
                date: new Date(memory.learnedAt).toLocaleDateString(),
              })}
            </span>
            {memory.usageCount > 0 && (
              <span>
                {t('Used {count} times', { count: memory.usageCount })}
              </span>
            )}
            {(memory.keywords || []).length > 0 && (
              <div className="flex gap-1">
                {memory.keywords.slice(0, 3).map((keyword) => (
                  <Chip
                    key={keyword}
                    size="sm"
                    variant="soft"
                    className="text-xs"
                  >
                    {keyword}
                  </Chip>
                ))}
                {memory.keywords.length > 3 && (
                  <span className="text-default-400">
                    +{memory.keywords.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            color={memory.isGlobal ? 'danger' : 'primary'}
            onPress={onToggleGlobal}
            title={memory.isGlobal ? t('Remove Global') : t('Make Global')}
          >
            <Icon name="Share" className="w-4 h-4" />
          </Button>
          <Button isIconOnly size="sm" variant="ghost" onPress={onEdit}>
            <Icon name="EditPencil" className="w-4 h-4" />
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            color="danger"
            onPress={onDelete}
          >
            <Icon name="Trash" className="w-4 h-4" />
          </Button>
        </div>
      </Card.Content>
    </Card>
  )
}
