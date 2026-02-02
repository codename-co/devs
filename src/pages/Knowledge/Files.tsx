import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Button,
  Checkbox,
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
  Pagination,
  Progress,
  Spinner,
  Textarea,
  useDisclosure,
  Tooltip,
} from '@heroui/react'
import {
  Upload,
  Folder,
  Trash,
  EditPencil,
  MoreVert,
  SubmitDocument,
  RefreshDouble,
  CheckCircle,
  Xmark,
} from 'iconoir-react'

import {
  getKnowledgeItem,
  getAllKnowledgeItems,
  deleteKnowledgeItem,
  deleteKnowledgeItems,
  updateKnowledgeItem,
} from '@/stores/knowledgeStore'
import { KnowledgeItem } from '@/types'
import { useKnowledge, useSyncReady } from '@/hooks'
import {
  Title,
  MultiFilter,
  FilterSection,
  FilterOption,
  MultiFilterSelection,
  Icon,
  ContentPreviewModal,
} from '@/components'
import { useI18n } from '@/i18n'
import {
  knowledgeSync,
  watchFolder,
  getAllWatchers,
  unwatchFolder,
  reconnectFolder,
  onWatchersChanged,
  onSyncEvent,
  deleteFilesByWatchId,
  type FolderWatcher,
  type SyncEvent,
} from '@/lib/knowledge-sync'
import { errorToast, successToast, warningToast } from '@/lib/toast'
import { notifyError } from '@/features/notifications'
import { formatBytes } from '@/lib/format'
import {
  getKnowledgeItemIcon,
  getKnowledgeItemColor,
} from '@/lib/knowledge-utils'
import {
  documentProcessor,
  type ProcessingEvent,
} from '@/lib/document-processor'
import { useConnectorStore } from '@/features/connectors/stores'
import { getProvider } from '@/features/connectors/providers/apps'
import type { AppConnectorProvider } from '@/features/connectors/types'
import localI18n from './i18n'

// Import to ensure File System API types are available
import '@/features/local-backup/types/file-system.d'

interface LocalFileSystemFileHandle {
  readonly kind: 'file'
  readonly name: string
  getFile(): Promise<File>
}

// @ts-expect-error Interface is used in LocalFileSystemFileHandle.entries() return type
interface LocalFileSystemDirectoryHandle {
  readonly kind: 'directory'
  readonly name: string
  entries(): AsyncIterable<
    [string, LocalFileSystemFileHandle | LocalFileSystemDirectoryHandle]
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
    }) => Promise<LocalFileSystemFileHandle[]>
  }
}

export const Files: React.FC = () => {
  const { lang, t } = useI18n(localI18n)
  const location = useLocation()
  const navigate = useNavigate()

  // Use reactive hook for instant updates (no async loading needed)
  const rawKnowledgeItems = useKnowledge()
  const isSyncReady = useSyncReady()
  const { connectors, initialize: initializeConnectors } = useConnectorStore()

  // Initialize connector store
  useEffect(() => {
    initializeConnectors()
  }, [initializeConnectors])

  // Filter state
  const [filterSelection, setFilterSelection] = useState<MultiFilterSelection>({
    type: 'all',
    source: 'all',
  })

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Calculate filter sections with counts
  const filterSections = useMemo<FilterSection[]>(() => {
    // File type counts
    const typeCounts = rawKnowledgeItems.reduce(
      (acc, item) => {
        const type = item.fileType || 'other'
        acc[type] = (acc[type] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Source counts
    const sourceCounts = rawKnowledgeItems.reduce(
      (acc, item) => {
        const source = item.syncSource || 'unknown'
        acc[source] = (acc[source] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Count items per connector
    const connectorCounts = rawKnowledgeItems.reduce(
      (acc, item) => {
        if (item.connectorId) {
          acc[item.connectorId] = (acc[item.connectorId] || 0) + 1
        }
        return acc
      },
      {} as Record<string, number>,
    )

    // Build source options
    const sourceOptions: FilterOption[] = [
      {
        key: 'all',
        label: t('All Sources'),
        count: rawKnowledgeItems.length,
      },
      {
        key: 'manual',
        label: t('Manual Upload'),
        count: sourceCounts.manual || 0,
        icon: 'Upload',
      },
      {
        key: 'filesystem_api',
        label: t('Synced Folders'),
        count: sourceCounts.filesystem_api || 0,
        icon: 'Folder',
      },
    ]

    // Add individual connectors with items
    connectors.forEach((connector) => {
      const count = connectorCounts[connector.id] || 0
      if (count > 0) {
        const providerConfig =
          connector.category === 'app'
            ? getProvider(connector.provider as AppConnectorProvider)
            : null

        sourceOptions.push({
          key: `connector:${connector.id}`,
          label: connector.name,
          count,
          icon: (providerConfig?.icon ||
            'OpenNewWindow') as FilterOption['icon'],
        })
      }
    })

    return [
      {
        key: 'type',
        title: t('File Type'),
        options: [
          {
            key: 'all',
            label: t('All Types'),
            count: rawKnowledgeItems.length,
          },
          {
            key: 'document',
            label: t('Documents'),
            count: typeCounts.document || 0,
            icon: 'Document',
          },
          {
            key: 'image',
            label: t('Images'),
            count: typeCounts.image || 0,
            icon: 'MediaImage',
          },
          {
            key: 'text',
            label: t('Text Files'),
            count: typeCounts.text || 0,
            icon: 'Page',
          },
          {
            key: 'other',
            label: t('Other'),
            count: typeCounts.other || 0,
            icon: 'Page',
          },
        ] as FilterOption[],
      },
      {
        key: 'source',
        title: t('Source'),
        options: sourceOptions,
      },
    ]
  }, [rawKnowledgeItems, connectors, t])

  // Filter and sort items
  const knowledgeItems = useMemo(() => {
    let filtered = [...rawKnowledgeItems]

    const typeFilter = filterSelection.type
    const sourceFilter = filterSelection.source

    // Apply file type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((item) => {
        if (typeFilter === 'other') {
          return !item.fileType
        }
        return item.fileType === typeFilter
      })
    }

    // Apply sync source filter
    if (sourceFilter !== 'all') {
      // Check if it's a connector-specific filter
      if (sourceFilter.startsWith('connector:')) {
        const connectorId = sourceFilter.replace('connector:', '')
        filtered = filtered.filter((item) => item.connectorId === connectorId)
      } else {
        // Regular sync source filter
        filtered = filtered.filter((item) => item.syncSource === sourceFilter)
      }
    }

    // Sort by creation date (newest first)
    return filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [rawKnowledgeItems, filterSelection])

  // Reset to page 1 and clear selection when filters change
  useEffect(() => {
    setCurrentPage(1)
    setSelectedItems(new Set())
  }, [filterSelection])

  // Calculate pagination
  const totalPages = Math.ceil(knowledgeItems.length / itemsPerPage)
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return knowledgeItems.slice(startIndex, endIndex)
  }, [knowledgeItems, currentPage, itemsPerPage])

  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null)
  const [previewItem, setPreviewItem] = useState<KnowledgeItem | null>(null)
  const {
    isOpen: isEditModalOpen,
    onOpen: onEditModalOpen,
    onClose: onEditModalClose,
  } = useDisclosure()
  const {
    isOpen: isPreviewOpen,
    onOpen: onPreviewOpen,
    onClose: onPreviewClose,
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
  const {
    isOpen: isUnwatchModalOpen,
    onOpen: onUnwatchModalOpen,
    onClose: onUnwatchModalClose,
  } = useDisclosure()
  const [unwatchingFolderId, setUnwatchingFolderId] = useState<string | null>(
    null,
  )
  const [isPickerActive, setIsPickerActive] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const {
    isOpen: isBulkDeleteModalOpen,
    onOpen: onBulkDeleteModalOpen,
    onClose: onBulkDeleteModalClose,
  } = useDisclosure()

  // Handle URL hash to open preview modal for specific file ID
  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (hash) {
      // Load the knowledge item by ID and open the preview modal
      const item = getKnowledgeItem(hash)
      if (item) {
        setPreviewItem(item)
        onPreviewOpen()
      }
    }
  }, [location.hash, onPreviewOpen])

  // Close preview and clear URL hash
  const handlePreviewClose = useCallback(() => {
    onPreviewClose()
    setPreviewItem(null)
    // Clear the hash from URL without triggering navigation
    if (location.hash) {
      navigate(location.pathname + location.search, { replace: true })
    }
  }, [
    onPreviewClose,
    navigate,
    location.pathname,
    location.search,
    location.hash,
  ])

  useEffect(() => {
    loadWatchedFolders()

    // Subscribe to watcher changes
    const unsubscribeWatchers = onWatchersChanged(() => {
      console.log('Watchers changed, refreshing UI…')
      loadWatchedFolders()
      // Knowledge items update automatically via reactive hooks
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
            // Knowledge items update automatically via reactive hooks
            successToast(
              `Synced ${event.fileCount} files from ${event.watcherPath}`,
            )
          }
          break

        case 'file_added':
        case 'file_updated':
        case 'file_deleted':
          // Knowledge items update automatically via reactive hooks
          break

        case 'sync_error':
          // Only show error status if the watcher is still active
          // (Inactive watchers are expected to fail)
          const watcher = watchedFolders.find((w) => w.id === event.watcherId)
          if (watcher?.isActive) {
            setSyncStatus('error')
            notifyError({
              title: 'Sync Error',
              description: `Sync error in ${event.watcherPath}: ${event.error}`,
            })
          }
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
              // Get the completed job's item ID before deleting
              const completedJob = next.get(event.jobId)
              next.delete(event.jobId)
              // Knowledge items update automatically via reactive hooks
              successToast('Document processing completed')

              // Update preview item if it's the one that was just processed
              if (completedJob) {
                const updatedItem = getKnowledgeItem(completedJob.itemId)
                if (updatedItem) {
                  setPreviewItem((current) =>
                    current?.id === updatedItem.id ? updatedItem : current,
                  )
                }
              }
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

    return () => {
      unsubscribeWatchers()
      unsubscribeSync()
      unsubscribeProcessing()
    }
  }, [])

  const loadWatchedFolders = () => {
    setWatchedFolders(getAllWatchers())
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
          const allItems = getAllKnowledgeItems()
          const isDupe =
            allItems.filter((item) => item.contentHash === result.contentHash)
              .length > 1

          if (isDupe) {
            duplicateCount++
          } else {
            addedCount++

            if (result.fileType === 'document' || result.fileType === 'text') {
              try {
                await documentProcessor.queueProcessing(result.id)
              } catch (error) {
                console.error('Failed to queue processing:', error)
              }
            }
          }
        }
      }

      // Knowledge items update automatically via reactive hooks
      setSyncStatus('idle')

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
      notifyError({
        title: 'Upload Failed',
        description:
          'Failed to upload files. Please try again or refresh the page.',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleFilePicker = async () => {
    if (!window.showOpenFilePicker) {
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
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
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

    // Prevent concurrent picker calls
    if (isPickerActive) {
      console.log('Directory picker already active, ignoring request')
      return
    }

    try {
      setIsPickerActive(true)
      setSyncStatus('syncing')
      const dirHandle = await window.showDirectoryPicker()

      await watchFolder(dirHandle as any)

      // Knowledge items update automatically via reactive hooks
      loadWatchedFolders()
      setSyncStatus('idle')

      successToast(
        `Folder "${dirHandle.name}" is now being watched for changes. Files will be automatically synced.`,
      )
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setSyncStatus('idle')
        return
      }
      console.error('Directory picker error:', error)
      setSyncStatus('error')
    } finally {
      setIsPickerActive(false)
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

  const deleteItem = (id: string) => {
    try {
      deleteKnowledgeItem(id)
      // Remove from selection if selected
      setSelectedItems((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      // Knowledge items update automatically via reactive hooks
    } catch (error) {
      console.error('Failed to delete item:', error)
    }
  }

  const deleteSelectedItems = () => {
    try {
      const itemsToDelete = Array.from(selectedItems)
      deleteKnowledgeItems(itemsToDelete)
      setSelectedItems(new Set())
      onBulkDeleteModalClose()
      successToast(
        t('{count} item(s) deleted', { count: itemsToDelete.length }),
      )
    } catch (error) {
      console.error('Failed to delete items:', error)
      notifyError({
        title: 'Delete Failed',
        description: t('Failed to delete some items'),
      })
    }
  }

  const reprocessSelectedItems = async () => {
    try {
      const itemsToProcess = Array.from(selectedItems)
      for (const id of itemsToProcess) {
        await documentProcessor.queueProcessing(id)
      }
      successToast(
        t('{count} item(s) queued for processing', {
          count: itemsToProcess.length,
        }),
      )
    } catch (error) {
      console.error('Failed to reprocess items:', error)
      notifyError({
        title: 'Reprocess Failed',
        description: t('Failed to reprocess some items'),
      })
    }
  }

  const toggleItemSelection = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAllItems = () => {
    const allIds = knowledgeItems.map((item) => item.id)
    setSelectedItems(new Set(allIds))
  }

  const unselectAllItems = () => {
    setSelectedItems(new Set())
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

  const saveItemChanges = () => {
    if (!selectedItem) return

    try {
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

      updateKnowledgeItem(updatedItem)
      // Knowledge items update automatically via reactive hooks
      onEditModalClose()
    } catch (error) {
      console.error('Failed to update item:', error)
    }
  }

  const reprocessItem = async (item: KnowledgeItem) => {
    try {
      await documentProcessor.queueProcessing(item.id)
      successToast(`Processing started for "${item.name}"`)
    } catch (error) {
      console.error('Failed to reprocess item:', error)
      errorToast('Failed to start processing. Please try again.')
    }
  }

  const promptUnwatchFolder = (watchId: string) => {
    setUnwatchingFolderId(watchId)
    onUnwatchModalOpen()
  }

  const handleUnwatchFolder = async (keepFiles: boolean) => {
    if (!unwatchingFolderId) return
    try {
      if (!keepFiles) {
        await deleteFilesByWatchId(unwatchingFolderId)
      }
      await unwatchFolder(unwatchingFolderId)
      loadWatchedFolders()
      // Knowledge items update automatically via reactive hooks
    } catch (error) {
      console.error('Error unwatching folder:', error)
    } finally {
      onUnwatchModalClose()
      setUnwatchingFolderId(null)
    }
  }

  const handleReconnectFolder = async (
    watchId: string,
    hasStoredHandle: boolean = false,
  ) => {
    // If we have a stored handle, try to request permission without picker
    if (hasStoredHandle) {
      try {
        const success = await reconnectFolder(watchId)
        if (success) {
          loadWatchedFolders()
          // Knowledge items update automatically via reactive hooks
          successToast('Folder has been reconnected and is now syncing.')
          return
        }
        // If permission request failed, show error and don't fall through
        // User needs to use "Reconnect" instead which will prompt for folder
        warningToast(
          'Permission denied. Please use "Reconnect" to select the folder again.',
        )
        return
      } catch (error) {
        console.error('Permission request failed:', error)
        notifyError({
          title: 'Permission Error',
          description:
            'Failed to request permission. Please use "Reconnect" to select the folder again.',
        })
        return
      }
    }

    // Use directory picker (either no stored handle or permission was denied)
    if (!window.showDirectoryPicker) {
      warningToast('Directory picker is not supported in this browser.')
      return
    }

    // Prevent concurrent picker calls
    if (isPickerActive) {
      console.log('Directory picker already active, ignoring reconnect request')
      return
    }

    try {
      setIsPickerActive(true)
      const dirHandle = await window.showDirectoryPicker()
      await reconnectFolder(watchId, dirHandle)
      loadWatchedFolders()
      // Knowledge items update automatically via reactive hooks
      successToast(
        `Folder "${dirHandle.name}" has been reconnected and is now syncing.`,
      )
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      console.error('Error reconnecting folder:', error)
      notifyError({
        title: 'Reconnect Failed',
        description: 'Failed to reconnect folder. Please try again.',
      })
    } finally {
      setIsPickerActive(false)
    }
  }

  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date)
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString()
  }

  const getFileIcon = (item: KnowledgeItem) => {
    const iconName = getKnowledgeItemIcon(item)
    const color = getKnowledgeItemColor(item)
    return <Icon name={iconName} size="lg" className={`text-${color}`} />
  }

  return (
    <>
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
                    startContent={<SubmitDocument className="w-4 h-4" />}
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
                <Title level={3}>
                  {t('Synced folders')}
                  <span className="ml-2 text-lg text-default-500">
                    ({watchedFolders.length})
                  </span>
                </Title>
                {syncStatus !== 'idle' && (
                  <Chip
                    color={syncStatus === 'syncing' ? 'primary' : 'danger'}
                    size="sm"
                    variant="flat"
                  >
                    {syncStatus === 'syncing' ? 'Syncing…' : 'Sync Error'}
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
                              watcher.isActive ? 'bg-success' : 'bg-danger'
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
                            onPress={() => promptUnwatchFolder(watcher.id)}
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
                                handleReconnectFolder(
                                  watcher.id,
                                  !!watcher.directoryHandle,
                                )
                              }
                            >
                              {watcher.directoryHandle
                                ? t('Grant Access')
                                : t('Reconnect')}
                            </Button>
                            <Button
                              size="sm"
                              variant="light"
                              color="danger"
                              onPress={() => promptUnwatchFolder(watcher.id)}
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
            {rawKnowledgeItems.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <Title level={3}>
                      {t('My Knowledge')}
                      <span className="ml-2 text-lg text-default-500">
                        ({knowledgeItems.length})
                      </span>
                    </Title>
                  </div>
                  <div className="flex gap-2">
                    {knowledgeItems.length > 0 && (
                      <>
                        {selectedItems.size > 0 ? (
                          <>
                            <Tooltip content={t('Delete selected')}>
                              <Button
                                size="sm"
                                color="danger"
                                variant="flat"
                                isIconOnly
                                startContent={<Trash className="w-4 h-4" />}
                                onPress={onBulkDeleteModalOpen}
                              />
                            </Tooltip>
                            <Tooltip content={t('Reprocess')}>
                              <Button
                                size="sm"
                                color="primary"
                                variant="flat"
                                isIconOnly
                                startContent={
                                  <RefreshDouble className="w-4 h-4" />
                                }
                                onPress={reprocessSelectedItems}
                              />
                            </Tooltip>
                            <Button
                              size="sm"
                              variant="flat"
                              startContent={<Xmark className="w-4 h-4" />}
                              onPress={unselectAllItems}
                            >
                              {t('Unselect all')}
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="flat"
                            startContent={<CheckCircle className="w-4 h-4" />}
                            onPress={selectAllItems}
                          >
                            {t('Select all')}
                          </Button>
                        )}
                      </>
                    )}
                    <MultiFilter
                      label={t('Filters')}
                      sections={filterSections}
                      selectedKeys={filterSelection}
                      onSelectionChange={setFilterSelection}
                      size="sm"
                    />
                  </div>
                </div>
                {!isSyncReady ? (
                  <div className="flex justify-center p-8">
                    <Spinner size="lg" />
                  </div>
                ) : knowledgeItems.length === 0 ? (
                  <div className="text-center p-8 text-default-500">
                    {t('No items match the selected filters')}
                  </div>
                ) : (
                  <>
                    <div
                      data-testid="knowledge-items"
                      className="divide-y divide-default-100 mt-4"
                    >
                      {paginatedItems.map((item) => {
                        const processingJob = Array.from(
                          processingJobs.values(),
                        ).find((job) => job.itemId === item.id)

                        return (
                          <div
                            key={item.id}
                            className={`p-4 flex items-center justify-between hover:bg-default-50 ${selectedItems.has(item.id) ? 'bg-primary-50' : ''}`}
                          >
                            <div className="flex items-center space-x-4 flex-1">
                              <Checkbox
                                isSelected={selectedItems.has(item.id)}
                                onValueChange={() =>
                                  toggleItemSelection(item.id)
                                }
                                aria-label={t('Select {name}', {
                                  name: item.name,
                                })}
                              />
                              <div
                                className="flex-shrink-0 cursor-pointer"
                                onClick={() => {
                                  setPreviewItem(item)
                                  onPreviewOpen()
                                }}
                              >
                                {getFileIcon(item)}
                              </div>

                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => {
                                  setPreviewItem(item)
                                  onPreviewOpen()
                                }}
                              >
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
                                    <span>{formatBytes(item.size, lang)}</span>
                                  )}
                                  <span>{formatDate(item.createdAt)}</span>
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
                                  <Button isIconOnly variant="light" size="sm">
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
                                    startContent={<Trash className="w-4 h-4" />}
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

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex justify-center mt-6">
                        <Pagination
                          total={totalPages}
                          page={currentPage}
                          onChange={setCurrentPage}
                          showControls
                          size="lg"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

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

      {/* Unwatch Folder Confirmation Modal */}
      <Modal
        isOpen={isUnwatchModalOpen}
        onClose={() => {
          onUnwatchModalClose()
          setUnwatchingFolderId(null)
        }}
      >
        <ModalContent>
          <ModalHeader>{t('Stop Syncing Folder')}</ModalHeader>
          <ModalBody>
            <p>
              {t(
                'Do you want to keep the synced files in your knowledge base?',
              )}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              color="danger"
              variant="light"
              onPress={() => handleUnwatchFolder(false)}
            >
              {t('Delete Files')}
            </Button>
            <Button color="primary" onPress={() => handleUnwatchFolder(true)}>
              {t('Keep Files')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal isOpen={isBulkDeleteModalOpen} onClose={onBulkDeleteModalClose}>
        <ModalContent>
          <ModalHeader>{t('Delete Selected Items')}</ModalHeader>
          <ModalBody>
            <p>
              {t(
                'Are you sure you want to delete {count} item(s)? This action cannot be undone.',
                { count: selectedItems.size },
              )}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onBulkDeleteModalClose}>
              {t('Cancel')}
            </Button>
            <Button color="danger" onPress={deleteSelectedItems}>
              {t('Delete')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Content Preview Modal */}
      {previewItem && (
        <ContentPreviewModal
          isOpen={isPreviewOpen}
          onClose={handlePreviewClose}
          type="knowledge"
          item={previewItem}
          onRequestProcessing={async (itemId) => {
            try {
              await documentProcessor.queueProcessing(itemId)
              successToast(t('Document queued for processing'))
              // Refresh the preview item to show updated status
              const updatedItem = getKnowledgeItem(itemId)
              if (updatedItem) {
                setPreviewItem(updatedItem)
              }
            } catch (error) {
              errorToast(t('Failed to queue document for processing'))
              console.error('Processing error:', error)
            }
          }}
        />
      )}
    </>
  )
}
