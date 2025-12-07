import { useState } from 'react'
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Textarea,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Divider,
  Tooltip,
  CardFooter,
  ButtonGroup,
} from '@heroui/react'

import { useI18n } from '@/i18n'
import { Icon } from '@/components/Icon'
import type {
  AgentMemoryEntry,
  MemoryCategory,
  MemoryConfidence,
} from '@/types'

interface MemoryReviewCardProps {
  memory: AgentMemoryEntry
  onApprove: (id: string, notes?: string) => Promise<void>
  onReject: (id: string, notes?: string) => Promise<void>
  onEdit: (id: string, content: string, notes?: string) => Promise<void>
  isLoading?: boolean
}

// Category icons and colors
const categoryConfig: Record<
  MemoryCategory,
  { icon: string; color: string; label: string }
> = {
  fact: { icon: 'Brain', color: 'primary', label: 'Fact' },
  preference: { icon: 'Check', color: 'success', label: 'Preference' },
  behavior: { icon: 'Clock', color: 'warning', label: 'Behavior' },
  domain_knowledge: {
    icon: 'Brain',
    color: 'secondary',
    label: 'Domain Knowledge',
  },
  relationship: { icon: 'Brain', color: 'default', label: 'Relationship' },
  procedure: { icon: 'Clock', color: 'primary', label: 'Procedure' },
  correction: { icon: 'WarningTriangle', color: 'danger', label: 'Correction' },
}

// Confidence indicators
const confidenceConfig: Record<
  MemoryConfidence,
  { icon: string; color: string; label: string }
> = {
  high: { icon: 'Check', color: 'success', label: 'High' },
  medium: { icon: 'QuestionMark', color: 'warning', label: 'Medium' },
  low: { icon: 'WarningTriangle', color: 'danger', label: 'Low' },
}

export function MemoryReviewCard({
  memory,
  onApprove,
  onReject,
  onEdit,
  isLoading = false,
}: MemoryReviewCardProps) {
  const { t } = useI18n()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [editedContent, setEditedContent] = useState(memory.content)
  const [reviewNotes, setReviewNotes] = useState('')
  const [actionLoading, setActionLoading] = useState<
    'approve' | 'reject' | 'edit' | null
  >(null)

  const categoryInfo = categoryConfig[memory.category] || {
    icon: 'Brain',
    color: 'default',
    label: memory.category || 'Unknown',
  }
  const confidenceInfo = confidenceConfig[memory.confidence] || {
    icon: 'QuestionMark',
    color: 'default',
    label: memory.confidence || 'Unknown',
  }

  const handleApprove = async () => {
    setActionLoading('approve')
    try {
      await onApprove(memory.id, reviewNotes || undefined)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    setActionLoading('reject')
    try {
      await onReject(memory.id, reviewNotes || undefined)
    } finally {
      setActionLoading(null)
    }
  }

  const handleEditAndApprove = async () => {
    setActionLoading('edit')
    try {
      await onEdit(memory.id, editedContent, reviewNotes || undefined)
      onClose()
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-0">
          <div className="flex flex-col gap-1">
            <h4 className="text-md font-semibold">{memory.title}</h4>
            <div className="flex flex-wrap gap-2">
              <Chip
                size="sm"
                variant="flat"
                color={categoryInfo.color as any}
                startContent={
                  <Icon name={categoryInfo.icon as any} className="w-3 h-3" />
                }
              >
                {t(categoryInfo.label as any)}
              </Chip>
              <Tooltip
                content={t('Confidence level: {level}' as any, {
                  level: t(confidenceInfo.label as any),
                })}
              >
                <Chip
                  size="sm"
                  variant="dot"
                  color={confidenceInfo.color as any}
                >
                  {t(confidenceInfo.label as any)}
                </Chip>
              </Tooltip>
            </div>
          </div>
          <span className="text-xs text-default-400">
            {formatDate(memory.learnedAt)}
          </span>
        </CardHeader>

        <CardBody className="gap-3">
          <p className="text-sm text-default-600">{memory.content}</p>

          {memory.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {memory.keywords.map((keyword) => (
                <Chip
                  key={keyword}
                  size="sm"
                  variant="bordered"
                  className="text-xs"
                >
                  {keyword}
                </Chip>
              ))}
            </div>
          )}
        </CardBody>
        <Divider />

        <CardFooter>
          <ButtonGroup variant="flat" size="sm">
            <Button
              color="danger"
              size="sm"
              startContent={<Icon name="Xmark" className="w-4 h-4" />}
              onPress={handleReject}
              isLoading={actionLoading === 'reject'}
              isDisabled={isLoading || actionLoading !== null}
            >
              {t('Forget')}
            </Button>
            <Button
              color="default"
              startContent={<Icon name="EditPencil" className="w-4 h-4" />}
              onPress={onOpen}
              isDisabled={isLoading || actionLoading !== null}
            >
              {t('Edit')}
            </Button>
            <Button
              color="success"
              variant="solid"
              startContent={<Icon name="Check" className="w-4 h-4" />}
              onPress={handleApprove}
              isLoading={actionLoading === 'approve'}
              isDisabled={isLoading || actionLoading !== null}
            >
              {t('Memorize')}
            </Button>
          </ButtonGroup>
        </CardFooter>
      </Card>

      {/* Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            {t('Edit Memory')}
          </ModalHeader>
          <ModalBody>
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <Chip
                  size="sm"
                  variant="flat"
                  color={categoryInfo.color as any}
                  startContent={
                    <Icon name={categoryInfo.icon as any} className="w-3 h-3" />
                  }
                >
                  {t(categoryInfo.label as any)}
                </Chip>
                <Chip
                  size="sm"
                  variant="dot"
                  color={confidenceInfo.color as any}
                >
                  {t(confidenceInfo.label as any)}
                </Chip>
              </div>

              <h4 className="font-semibold">{memory.title}</h4>

              <Textarea
                label={t('Memory content')}
                value={editedContent}
                onValueChange={setEditedContent}
                minRows={3}
                maxRows={10}
              />

              <Textarea
                label={t('Review notes (optional)')}
                placeholder={t('Explain your changes...')}
                value={reviewNotes}
                onValueChange={setReviewNotes}
                minRows={2}
                maxRows={4}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              {t('Cancel')}
            </Button>
            <Button
              color="success"
              onPress={handleEditAndApprove}
              isLoading={actionLoading === 'edit'}
              startContent={<Icon name="Check" className="w-4 h-4" />}
            >
              {t('Save & Approve')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}

// ============================================================================
// Memory Review List Component
// ============================================================================

interface MemoryReviewListProps {
  memories: AgentMemoryEntry[]
  onApprove: (id: string, notes?: string) => Promise<void>
  onReject: (id: string, notes?: string) => Promise<void>
  onEdit: (id: string, content: string, notes?: string) => Promise<void>
  onBulkApprove?: (ids: string[]) => Promise<void>
  onBulkReject?: (ids: string[]) => Promise<void>
  isLoading?: boolean
  emptyMessage?: string
}

export function MemoryReviewList({
  memories,
  onApprove,
  onReject,
  onEdit,
  onBulkApprove,
  onBulkReject,
  isLoading = false,
  emptyMessage,
}: MemoryReviewListProps) {
  const { t } = useI18n()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedIds(newSelection)
  }

  const selectAll = () => {
    setSelectedIds(new Set(memories.map((m) => m.id)))
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  const handleBulkApprove = async () => {
    if (onBulkApprove && selectedIds.size > 0) {
      await onBulkApprove(Array.from(selectedIds))
      setSelectedIds(new Set())
    }
  }

  const handleBulkReject = async () => {
    if (onBulkReject && selectedIds.size > 0) {
      await onBulkReject(Array.from(selectedIds))
      setSelectedIds(new Set())
    }
  }

  if (memories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-default-400">
        <Icon name="Brain" className="w-12 h-12 mb-4 opacity-50" />
        <p>{emptyMessage || t('No memories pending review')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Bulk Actions */}
      {(onBulkApprove || onBulkReject) && (
        <div className="flex flex-row items-center justify-between">
          <div className="flex gap-2">
            {selectedIds.size > 0 ? (
              <Button size="sm" variant="light" onPress={deselectAll}>
                {t('Deselect All')}
              </Button>
            ) : (
              <Button size="sm" variant="light" onPress={selectAll}>
                {t('Select All')}
              </Button>
            )}
            <span className="text-sm text-default-500 self-center">
              {t('{count} selected', { count: selectedIds.size })}
            </span>
          </div>
          <div className="flex gap-2">
            {onBulkReject && (
              <Button
                size="sm"
                color="danger"
                variant="flat"
                isDisabled={selectedIds.size === 0 || isLoading}
                onPress={handleBulkReject}
                startContent={<Icon name="Xmark" className="w-4 h-4" />}
              >
                {t('Reject Selected')}
              </Button>
            )}
            {onBulkApprove && (
              <Button
                size="sm"
                color="success"
                isDisabled={selectedIds.size === 0 || isLoading}
                onPress={handleBulkApprove}
                startContent={<Icon name="Check" className="w-4 h-4" />}
              >
                {t('Approve Selected')}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Memory Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {memories.map((memory) => (
          <div
            key={memory.id}
            className={`relative ${
              selectedIds.has(memory.id) ? 'ring-2 ring-primary rounded-xl' : ''
            }`}
            onClick={(e) => {
              // Only toggle selection if clicking on the card background, not buttons
              if ((e.target as HTMLElement).closest('button')) return
              if (onBulkApprove || onBulkReject) {
                toggleSelection(memory.id)
              }
            }}
          >
            <MemoryReviewCard
              memory={memory}
              onApprove={onApprove}
              onReject={onReject}
              onEdit={onEdit}
              isLoading={isLoading}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
