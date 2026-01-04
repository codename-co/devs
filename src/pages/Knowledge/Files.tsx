import React, { useState, useEffect, useCallback } from 'react'
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

import { db } from '@/lib/db'
import { KnowledgeItem } from '@/types'
import { Title } from '@/components'
import { useI18n } from '@/i18n'
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
import { formatBytes } from '@/lib/format'
import {
  documentProcessor,
  type ProcessingEvent,
} from '@/lib/document-processor'
import localI18n from './i18n'

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

export const Files: React.FC = () => {
  const { lang, t } = useI18n(localI18n)

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

  useEffect(() => {
    loadKnowledgeItems()
    loadWatchedFolders()

    // Subscribe to watcher changes
    const unsubscribeWatchers = onWatchersChanged(() => {
      console.log('Watchers changed, refreshing UI…')
      loadWatchedFolders()
      loadKnowledgeItems()
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
            loadKnowledgeItems()
            successToast(
              `Synced ${event.fileCount} changes from ${event.watcherPath}`,
            )
          }
          break

        case 'file_added':
        case 'file_updated':
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
              loadKnowledgeItems()
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

    return () => {
      unsubscribeWatchers()
      unsubscribeSync()
      unsubscribeProcessing()
    }
  }, [])

  const loadWatchedFolders = () => {
    setWatchedFolders(getAllWatchers())
  }

  const loadKnowledgeItems = async () => {
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

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
          const allItems = await db.getAll('knowledgeItems')
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

      await loadKnowledgeItems()
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
      errorToast(
        'Failed to upload files. Please try again or refresh the page.',
      )
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

    try {
      setSyncStatus('syncing')
      const dirHandle = await window.showDirectoryPicker()

      await watchFolder(dirHandle as any)

      await loadKnowledgeItems()
      loadWatchedFolders()
      setSyncStatus('idle')

      successToast(
        `Folder "${dirHandle.name}" is now being watched for changes. Files will be automatically synced.`,
      )
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
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
      loadKnowledgeItems()
    } catch (error) {
      console.error('Error unwatching folder:', error)
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
          loadKnowledgeItems()
          successToast('Folder has been reconnected and is now syncing.')
          return
        }
        // If permission request failed, fall through to directory picker
      } catch (error) {
        console.log(
          'Permission request failed, falling back to directory picker',
        )
      }
    }

    // Use directory picker (either no stored handle or permission was denied)
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
        return
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
                <Title level={2}>
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
                            onPress={() => handleUnwatchFolder(watcher.id)}
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
                              onPress={() => handleUnwatchFolder(watcher.id)}
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
    </>
  )
}
