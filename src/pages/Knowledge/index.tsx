import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Button,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Progress,
  Spinner,
  Textarea,
  useDisclosure,
  Tabs,
  Tab,
  Select,
  SelectItem,
  Card,
  CardBody,
  CardHeader,
  Divider,
} from '@heroui/react'
import {
  Upload,
  Folder,
  Page,
  Trash,
  EditPencil,
  MoreVert,
  MediaImage,
  SubmitDocument,
  RefreshDouble,
} from 'iconoir-react'
import { useLocation, useNavigate } from 'react-router-dom'

import { db } from '@/lib/db'
import { KnowledgeItem } from '@/types'
import DefaultLayout from '@/layouts/Default'
import { useI18n, useUrl } from '@/i18n'
import { Section, Container, Title, Icon } from '@/components'
import type { HeaderProps } from '@/lib/types'

// Agent Memory imports
import { useAgentMemoryStore } from '@/stores/agentMemoryStore'
import { loadAllAgents } from '@/stores/agentStore'
import { MemoryReviewList } from '@/components/MemoryReview'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { generateMemorySynthesis } from '@/lib/memory-learning-service'
import type {
  Agent,
  MemoryCategory,
  MemoryConfidence,
  AgentMemoryEntry,
} from '@/types'
import {
  knowledgeSync,
  watchFolder,
  getAllWatchers,
  unwatchFolder,
  reconnectFolder,
  onWatchersChanged,
  onSyncEvent,
  type FolderWatcher,
  type SyncEvent,
} from '@/lib/knowledge-sync'
import { errorToast, successToast, warningToast } from '@/lib/toast'
import localI18n from './i18n'
import { formatBytes } from '@/lib/format'
import {
  documentProcessor,
  type ProcessingEvent,
} from '@/lib/document-processor'

// Category display configuration for Agent Memory
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

interface FileSystemFileHandle {
  readonly kind: 'file'
  readonly name: string
  getFile(): Promise<File>
}

interface FileSystemDirectoryHandle {
  readonly kind: 'directory'
  readonly name: string
  entries(): AsyncIterable<
    [string, FileSystemFileHandle | FileSystemDirectoryHandle]
  >
}

declare global {
  interface Window {
    showOpenFilePicker?: (options?: {
      types?: Array<{
        description: string
        accept: Record<string, string[]>
      }>
      multiple?: boolean
    }) => Promise<FileSystemFileHandle[]>

    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
  }
}

export const KnowledgePage: React.FC = () => {
  const { lang, t } = useI18n(localI18n)
  const url = useUrl(lang)
  const location = useLocation()
  const navigate = useNavigate()

  // Main tab state - derived from path: /knowledge/files or /knowledge/memories
  const mainTab = location.pathname.endsWith('/knowledge/memories')
    ? 'memories'
    : 'files'
  const setMainTab = (tab: string) => {
    navigate(url(`/knowledge/${tab}`))
  }

  // =========================================================================
  // Files Tab State
  // =========================================================================
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null)
  const {
    isOpen: isEditModalOpen,
    onOpen: onEditModalOpen,
    onClose: onEditModalClose,
  } = useDisclosure()
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    tags: '',
  })
  const [watchedFolders, setWatchedFolders] = useState<FolderWatcher[]>([])
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>(
    'idle',
  )
  const [processingJobs, setProcessingJobs] = useState<
    Map<string, { itemId: string; progress: number; status: string }>
  >(new Map())

  // =========================================================================
  // Agent Memory Tab State
  // =========================================================================
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [memoryTab, setMemoryTab] = useState<string>('review')
  const [filterCategory, setFilterCategory] = useState<MemoryCategory | 'all'>(
    'all',
  )
  const [isGeneratingSynthesis, setIsGeneratingSynthesis] = useState(false)

  const {
    memories,
    memoryDocuments,
    isLoading: isMemoryLoading,
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
    isOpen: isMemoryEditOpen,
    onOpen: onMemoryEditOpen,
    onClose: onMemoryEditClose,
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

  // =========================================================================
  // Files Tab Effects
  // =========================================================================
  useEffect(() => {
    loadKnowledgeItems()
    loadWatchedFolders()

    // Subscribe to watcher changes
    const unsubscribeWatchers = onWatchersChanged(() => {
      console.log('Watchers changed, refreshing UI…')
      loadWatchedFolders()
      loadKnowledgeItems() // Refresh knowledge items when watchers change
    })

    // Subscribe to sync events
    const unsubscribeSync = onSyncEvent((event: SyncEvent) => {
      console.log('Sync event:', event)

      switch (event.type) {
        case 'sync_start':
          setSyncStatus('syncing')
          break

        case 'sync_complete':
          setSyncStatus('idle')
          if (event.fileCount && event.fileCount > 0) {
            loadKnowledgeItems() // Refresh the knowledge items list
            successToast(
              `Synced ${event.fileCount} changes from ${event.watcherPath}`,
            )
          }
          break

        case 'file_added':
          loadKnowledgeItems()
          break

        case 'file_updated':
          loadKnowledgeItems()
          break

        case 'file_deleted':
          loadKnowledgeItems()
          break

        case 'sync_error':
          setSyncStatus('error')
          errorToast(`Sync error in ${event.watcherPath}: ${event.error}`)
          break
      }
    })

    // Subscribe to processing events
    const unsubscribeProcessing = documentProcessor.onProcessingEvent(
      (event: ProcessingEvent) => {
        console.log('Processing event:', event)

        setProcessingJobs((prev) => {
          const next = new Map(prev)

          if (!event.jobId) return next

          switch (event.type) {
            case 'job_started':
              // Find the item being processed
              const job = documentProcessor.getJobStatus(event.jobId)
              if (job) {
                next.set(event.jobId, {
                  itemId: job.knowledgeItemId,
                  progress: 0,
                  status: 'processing',
                })
              }
              break

            case 'job_progress':
              const existing = next.get(event.jobId)
              if (existing) {
                next.set(event.jobId, {
                  ...existing,
                  progress: event.progress || 0,
                })
              }
              break

            case 'job_completed':
              next.delete(event.jobId)
              loadKnowledgeItems() // Refresh to show updated content
              successToast('Document processing completed')
              break

            case 'job_failed':
              next.delete(event.jobId)
              errorToast(`Processing failed: ${event.error}`)
              break
          }

          return next
        })
      },
    )

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeWatchers()
      unsubscribeSync()
      unsubscribeProcessing()
    }
  }, [])

  // =========================================================================
  // Agent Memory Tab Effects
  // =========================================================================
  useEffect(() => {
    loadAllAgents().then(setAgents)
  }, [])

  useEffect(() => {
    if (selectedAgentId) {
      loadMemoriesForAgent(selectedAgentId)
      loadMemoryDocument(selectedAgentId)
    } else {
      loadAllMemories()
    }
  }, [
    selectedAgentId,
    loadMemoriesForAgent,
    loadAllMemories,
    loadMemoryDocument,
  ])

  // =========================================================================
  // Files Tab Functions
  // =========================================================================
  const loadWatchedFolders = () => {
    setWatchedFolders(getAllWatchers()) // Get all watchers including disconnected ones
  }

  const loadKnowledgeItems = async () => {
    try {
      // Ensure database is initialized and has the required store
      if (!db.isInitialized()) {
        await db.init()
      }

      // If the knowledgeItems store doesn't exist, reset the database
      if (!db.hasStore('knowledgeItems')) {
        console.log('knowledgeItems store missing, resetting database…')
        await (db as any).resetDatabase()
      }

      const items = await db.getAll('knowledgeItems')
      setKnowledgeItems(
        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      )
    } catch (error) {
      console.error('Failed to load knowledge items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (files: FileList) => {
    setUploading(true)
    setSyncStatus('syncing')
    try {
      let addedCount = 0
      let duplicateCount = 0

      for (const file of Array.from(files)) {
        const result = await knowledgeSync.addFileWithDeduplication(
          file,
          'manual',
        )
        if (result) {
          // Check if this was a new file or a duplicate
          const allItems = await db.getAll('knowledgeItems')
          const isDupe =
            allItems.filter((item) => item.contentHash === result.contentHash)
              .length > 1

          if (isDupe) {
            duplicateCount++
          } else {
            addedCount++

            // Queue document processing for non-duplicate files
            if (result.fileType === 'document' || result.fileType === 'text') {
              try {
                await documentProcessor.queueProcessing(result.id)
              } catch (error) {
                console.error('Failed to queue processing:', error)
                // Non-critical error, continue with upload
              }
            }
          }
        }
      }

      await loadKnowledgeItems()
      setSyncStatus('idle')

      // Show user feedback
      if (addedCount > 0 || duplicateCount > 0) {
        let message = ''
        if (addedCount > 0) message += `${addedCount} file(s) added`
        if (duplicateCount > 0) {
          if (message) message += ', '
          message += `${duplicateCount} duplicate(s) skipped`
        }
        successToast(message)
      }
    } catch (error) {
      console.error('Failed to upload files:', error)
      setSyncStatus('error')
      errorToast(
        'Failed to upload files. Please try again or refresh the page.',
      )
    } finally {
      setUploading(false)
    }
  }

  const handleFilePicker = async () => {
    if (!window.showOpenFilePicker) {
      // Fallback to traditional file input
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = true
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files
        if (files) handleFileUpload(files)
      }
      input.click()
      return
    }

    try {
      const fileHandles = await window.showOpenFilePicker({
        multiple: true,
      })

      const files: File[] = []
      for (const handle of fileHandles) {
        const file = await handle.getFile()
        files.push(file)
      }

      const dt = new DataTransfer()
      files.forEach((file) => dt.items.add(file))
      await handleFileUpload(dt.files)
    } catch (error) {
      // Don't log error if user simply cancelled the file picker
      if (error instanceof DOMException && error.name === 'AbortError') {
        return // User cancelled, this is normal behavior
      }
      console.error('File picker error:', error)
    }
  }

  const handleFolderPicker = async () => {
    if (!window.showDirectoryPicker) {
      warningToast(
        'Directory picker is not supported in this browser. Please use a modern browser like Chrome or Edge.',
      )
      return
    }

    try {
      setSyncStatus('syncing')
      const dirHandle = await window.showDirectoryPicker()

      // Register folder for continuous sync
      await watchFolder(dirHandle as any)

      await loadKnowledgeItems()
      loadWatchedFolders()
      setSyncStatus('idle')

      successToast(
        `Folder "${dirHandle.name}" is now being watched for changes. Files will be automatically synced.`,
      )
    } catch (error) {
      // Don't log error if user simply cancelled the directory picker
      if (error instanceof DOMException && error.name === 'AbortError') {
        return // User cancelled, this is normal behavior
      }
      console.error('Directory picker error:', error)
      setSyncStatus('error')
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files)
    }
  }, [])

  const deleteItem = async (id: string) => {
    try {
      // Ensure database is initialized before deleting
      if (!db.isInitialized()) {
        await db.init()
      }
      await db.delete('knowledgeItems', id)
      await loadKnowledgeItems()
    } catch (error) {
      console.error('Failed to delete item:', error)
    }
  }

  const openEditModal = (item: KnowledgeItem) => {
    setSelectedItem(item)
    setEditForm({
      name: item.name,
      description: item.description || '',
      tags: item.tags?.join(', ') || '',
    })
    onEditModalOpen()
  }

  const saveItemChanges = async () => {
    if (!selectedItem) return

    try {
      // Ensure database is initialized before updating
      if (!db.isInitialized()) {
        await db.init()
      }

      const updatedItem: KnowledgeItem = {
        ...selectedItem,
        name: editForm.name,
        description: editForm.description || undefined,
        tags: editForm.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        lastModified: new Date(),
      }

      await db.update('knowledgeItems', updatedItem)
      await loadKnowledgeItems()
      onEditModalClose()
    } catch (error) {
      console.error('Failed to update item:', error)
    }
  }

  const reprocessItem = async (item: KnowledgeItem) => {
    try {
      // Only process document and text files
      // if (item.fileType !== 'document' && item.fileType !== 'text') {
      //   warningToast('Only document and text files can be processed')
      //   return
      // }

      // Queue the item for processing
      await documentProcessor.queueProcessing(item.id)
      successToast(`Processing started for "${item.name}"`)
    } catch (error) {
      console.error('Failed to reprocess item:', error)
      errorToast('Failed to start processing. Please try again.')
    }
  }

  const handleUnwatchFolder = async (watchId: string) => {
    try {
      await unwatchFolder(watchId)
      loadWatchedFolders()
      loadKnowledgeItems() // Refresh to show changes
    } catch (error) {
      console.error('Error unwatching folder:', error)
    }
  }

  const handleReconnectFolder = async (watchId: string) => {
    if (!window.showDirectoryPicker) {
      warningToast('Directory picker is not supported in this browser.')
      return
    }

    try {
      const dirHandle = await window.showDirectoryPicker()
      await reconnectFolder(watchId, dirHandle)
      loadWatchedFolders()
      loadKnowledgeItems()
      successToast(
        `Folder "${dirHandle.name}" has been reconnected and is now syncing.`,
      )
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return // User cancelled
      }
      console.error('Error reconnecting folder:', error)
      errorToast('Failed to reconnect folder. Please try again.')
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  const getFileIcon = (item: KnowledgeItem) => {
    if (item.type === 'folder') {
      return <Folder className="w-6 h-6 text-warning" />
    }

    switch (item.fileType) {
      case 'image':
        return <MediaImage className="w-6 h-6 text-success" />
      case 'document':
        return <Page className="w-6 h-6 text-secondary" />
      case 'text':
      default:
        return <Page className="w-6 h-6 text-primary" />
    }
  }

  // =========================================================================
  // Agent Memory Tab Functions
  // =========================================================================
  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId),
    [agents, selectedAgentId],
  )

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

  // =========================================================================
  // Render
  // =========================================================================
  const header: HeaderProps = {
    icon: {
      name: 'Brain',
      color: 'text-danger-300 dark:text-danger-600',
    },
    title: t('Knowledge Base'),
    subtitle: t('Manage your files and agents memories'),
  }

  return (
    <DefaultLayout header={header}>
      <Section>
        <Container>
          {/* Main Tabs - Files vs Agent Memory */}
          <Tabs
            selectedKey={mainTab}
            onSelectionChange={(key) => setMainTab(key as string)}
            aria-label="Knowledge base sections"
            variant="underlined"
            classNames={{
              tabList: 'gap-6',
              cursor: 'w-full',
              tab: 'max-w-fit px-0 h-12',
            }}
          >
            {/* Files Tab */}
            <Tab
              key="files"
              title={
                <div className="flex items-center gap-2">
                  <Icon name="Folder" className="w-5 h-5" />
                  <span>{t('Files')}</span>
                  {knowledgeItems.length > 0 && (
                    <Chip size="sm" variant="flat">
                      {knowledgeItems.length}
                    </Chip>
                  )}
                </div>
              }
            >
              <div className="py-6">
                {/* Upload Area */}
                <div
                  data-testid="upload-area"
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-primary bg-primary/10'
                      : 'border-default-300 hover:border-primary/50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center space-y-4">
                      <Spinner size="lg" />
                      <p>{t('Uploading files…')}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-4">
                      <Upload className="w-12 h-12 text-default-400" />
                      <div>
                        <p className="text-md mb-2">
                          {t('Drag & drop files here, or click to select')}
                        </p>
                        <div className="flex gap-3 justify-center">
                          <Button
                            data-testid="upload-files-button"
                            color="primary"
                            variant="flat"
                            startContent={
                              <SubmitDocument className="w-4 h-4" />
                            }
                            onPress={handleFilePicker}
                          >
                            {t('Pick files')}
                          </Button>
                          <Button
                            data-testid="upload-folder-button"
                            color="secondary"
                            variant="flat"
                            startContent={<Folder className="w-4 h-4" />}
                            onPress={handleFolderPicker}
                          >
                            {t('Sync a folder')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {(watchedFolders.length > 0 || knowledgeItems.length > 0) && (
                  <>
                    {/* Watched Folders Section */}
                    {watchedFolders.length > 0 && (
                      <div className="mt-8">
                        <Title level={2}>
                          {t('Synced folders')}
                          <span className="ml-2 text-lg text-default-500">
                            ({watchedFolders.length})
                          </span>
                        </Title>
                        {syncStatus !== 'idle' && (
                          <Chip
                            color={
                              syncStatus === 'syncing' ? 'primary' : 'danger'
                            }
                            size="sm"
                            variant="flat"
                          >
                            {syncStatus === 'syncing'
                              ? 'Syncing…'
                              : 'Sync Error'}
                          </Chip>
                        )}
                        <div className="space-y-2">
                          {watchedFolders.map((watcher) => (
                            <div
                              key={watcher.id}
                              className="flex items-center justify-between p-3 bg-default-50 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="relative">
                                  <Folder
                                    className={`w-5 h-5 ${watcher.isActive ? 'text-warning' : 'text-default-400'}`}
                                  />
                                  <div
                                    className={`absolute -top-1 -end-1 w-3 h-3 rounded-full ${
                                      watcher.isActive
                                        ? 'bg-success'
                                        : 'bg-danger'
                                    }`}
                                  />
                                </div>
                                <div>
                                  <p
                                    className={`font-medium ${watcher.isActive ? '' : 'text-default-500'}`}
                                  >
                                    {watcher.basePath}
                                  </p>
                                  <p className="text-sm text-default-500">
                                    {watcher.isActive ? (
                                      <>
                                        {t('Last sync: {time}', {
                                          time: watcher.lastSync.toLocaleTimeString(),
                                        })}
                                      </>
                                    ) : (
                                      t('Disconnected')
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {watcher.isActive ? (
                                  <Button
                                    size="sm"
                                    variant="light"
                                    color="danger"
                                    onPress={() =>
                                      handleUnwatchFolder(watcher.id)
                                    }
                                  >
                                    {t('Stop syncing')}
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="light"
                                      color="primary"
                                      onPress={() =>
                                        handleReconnectFolder(watcher.id)
                                      }
                                    >
                                      {t('Reconnect')}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="light"
                                      color="danger"
                                      onPress={() =>
                                        handleUnwatchFolder(watcher.id)
                                      }
                                    >
                                      {t('Remove')}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Knowledge Items List */}
                    {knowledgeItems.length > 0 && (
                      <div className="mt-8">
                        <Title level={2}>
                          {t('My Knowledge')}
                          <span className="ml-2 text-lg text-default-500">
                            ({knowledgeItems.length})
                          </span>
                        </Title>
                        {loading ? (
                          <div className="flex justify-center p-8">
                            <Spinner size="lg" />
                          </div>
                        ) : (
                          <div
                            data-testid="knowledge-items"
                            className="divide-y divide-default-100 mt-4"
                          >
                            {knowledgeItems.map((item) => {
                              // Find if this item is being processed
                              const processingJob = Array.from(
                                processingJobs.values(),
                              ).find((job) => job.itemId === item.id)

                              return (
                                <div
                                  key={item.id}
                                  className="p-4 flex items-center justify-between hover:bg-default-50"
                                >
                                  <div className="flex items-center space-x-4 flex-1">
                                    <div className="flex-shrink-0">
                                      {getFileIcon(item)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-medium truncate">
                                        {item.name}
                                      </h3>
                                      <div className="flex items-center space-x-4 text-sm text-default-500 mt-1">
                                        <span>{item.path}</span>
                                        {item.fileType && (
                                          <span className="capitalize">
                                            {item.fileType}
                                          </span>
                                        )}
                                        {item.size && (
                                          <span>
                                            {formatBytes(item.size, lang)}
                                          </span>
                                        )}
                                        <span>
                                          {formatDate(item.createdAt)}
                                        </span>
                                      </div>
                                      {processingJob && (
                                        <div className="mt-2">
                                          <div className="flex items-center gap-2 mb-1">
                                            <Spinner size="sm" />
                                            <span className="text-xs text-primary">
                                              Processing document...
                                            </span>
                                          </div>
                                          <Progress
                                            size="sm"
                                            value={processingJob.progress}
                                            color="primary"
                                            className="max-w-md"
                                            aria-label="Document processing progress"
                                          />
                                        </div>
                                      )}
                                      {item.description && (
                                        <p className="text-sm text-default-600 mt-1 truncate">
                                          {item.description}
                                        </p>
                                      )}
                                      {item.tags && item.tags.length > 0 && (
                                        <div className="flex gap-1 mt-2">
                                          {item.tags.map((tag) => (
                                            <Chip
                                              key={tag}
                                              size="sm"
                                              variant="flat"
                                              color="primary"
                                            >
                                              {tag}
                                            </Chip>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <Dropdown>
                                      <DropdownTrigger>
                                        <Button
                                          isIconOnly
                                          variant="light"
                                          size="sm"
                                        >
                                          <MoreVert className="w-4 h-4" />
                                        </Button>
                                      </DropdownTrigger>
                                      <DropdownMenu>
                                        <DropdownItem
                                          key="edit"
                                          startContent={
                                            <EditPencil className="w-4 h-4" />
                                          }
                                          onPress={() => openEditModal(item)}
                                        >
                                          {t('Edit')}
                                        </DropdownItem>
                                        <DropdownItem
                                          key="reprocess"
                                          startContent={
                                            <RefreshDouble className="w-4 h-4" />
                                          }
                                          onPress={() => reprocessItem(item)}
                                        >
                                          {t('Reprocess')}
                                        </DropdownItem>
                                        <DropdownItem
                                          key="delete"
                                          startContent={
                                            <Trash className="w-4 h-4" />
                                          }
                                          className="text-danger"
                                          color="danger"
                                          onPress={() => deleteItem(item.id)}
                                        >
                                          {t('Delete')}
                                        </DropdownItem>
                                      </DropdownMenu>
                                    </Dropdown>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </Tab>

            {/* Agent Memory Tab */}
            <Tab
              key="memories"
              title={
                <div className="flex items-center gap-2">
                  <Icon name="Brain" className="w-5 h-5" />
                  <span>{t('Agent Memory')}</span>
                  {pendingMemories.length > 0 && (
                    <Chip size="sm" variant="flat">
                      {pendingMemories.length}
                    </Chip>
                  )}
                </div>
              }
            >
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
                        color="primary"
                        variant="flat"
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
                                {t(
                                  categoryLabels[
                                    category as MemoryCategory
                                  ] as any,
                                )}
                                : {count}
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
                          startContent={
                            <Icon name="Search" className="w-4 h-4" />
                          }
                          items={[
                            { key: 'all', label: 'All Categories' },
                            ...Object.entries(categoryLabels).map(
                              ([key, label]) => ({
                                key,
                                label,
                              }),
                            ),
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
                          <Icon
                            name="Brain"
                            className="w-12 h-12 mb-4 opacity-50"
                          />
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
                          <p>
                            {t(
                              'Select an agent to view their memory synthesis',
                            )}
                          </p>
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
                                const blob = new Blob(
                                  [memoryDocument.synthesis],
                                  {
                                    type: 'text/markdown',
                                  },
                                )
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
                            <MarkdownRenderer
                              content={memoryDocument.synthesis}
                            />
                          </CardBody>
                        </Card>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-default-400">
                          <Icon
                            name="Brain"
                            className="w-12 h-12 mb-4 opacity-50"
                          />
                          <p className="mb-4">
                            {t('No synthesis generated yet')}
                          </p>
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
            </Tab>
          </Tabs>
        </Container>
      </Section>

      {/* Edit File Modal */}
      <Modal isOpen={isEditModalOpen} onClose={onEditModalClose} size="2xl">
        <ModalContent>
          <ModalHeader>{t('Knowledge Item')}</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label={t('name')}
                value={editForm.name}
                onValueChange={(value) =>
                  setEditForm((prev) => ({ ...prev, name: value }))
                }
              />
              <Textarea
                label={t('description')}
                placeholder="Optional description for this item…"
                value={editForm.description}
                onValueChange={(value) =>
                  setEditForm((prev) => ({ ...prev, description: value }))
                }
              />
              <Input
                label={t('tags')}
                placeholder="tag1, tag2, tag3"
                value={editForm.tags}
                onValueChange={(value) =>
                  setEditForm((prev) => ({ ...prev, tags: value }))
                }
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onEditModalClose}>
              {t('Cancel')}
            </Button>
            <Button color="primary" onPress={saveItemChanges}>
              {t('Save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

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
