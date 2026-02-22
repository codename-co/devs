/**
 * LocalBackupSection — Settings section for local folder backup.
 *
 * Redesigned UX that clearly shows:
 *  - Current backup status (active / inactive / error)
 *  - What is configured to be backed up vs. what was actually backed up
 *  - Live item counts from the database alongside last-backup counts
 *  - Folder path, last sync time, and quick actions
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button, Chip, Progress, Tooltip } from '@heroui/react'

import '@/features/local-backup/types/file-system.d'
import {
  useFolderSyncStore,
  tryReconnectFolderSync,
} from '@/features/local-backup/stores/folderSyncStore'
import { Icon } from '@/components/Icon'
import type { IconName } from '@/lib/types'
import { useI18n } from '@/i18n'
import { localI18n } from '@/features/local-backup/i18n'
import { useLiveMap } from '@/lib/yjs'
import * as Y from '@/lib/yjs/maps'
import * as yjsMaps from '@/lib/yjs/maps'
import type { Agent, KnowledgeItem } from '@/types'
import { Switch } from '@/components'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window
}

/** Category metadata for the backup data rows. */
interface BackupCategory {
  key: string
  icon: IconName
  syncKey:
    | 'syncAgents'
    | 'syncConversations'
    | 'syncMemories'
    | 'syncKnowledge'
    | 'syncTasks'
    | 'syncStudio'
    | 'syncFullExport'
  label: string
  description: string
}

const CATEGORIES: BackupCategory[] = [
  {
    key: 'agents',
    icon: 'Sparks',
    syncKey: 'syncAgents',
    label: 'Agents',
    description: 'Custom agents you have created',
  },
  {
    key: 'conversations',
    icon: 'ChatBubble',
    syncKey: 'syncConversations',
    label: 'Conversations',
    description: 'Your chat history',
  },
  {
    key: 'memories',
    icon: 'Brain',
    syncKey: 'syncMemories',
    label: 'Memories',
    description: 'Agent learned memories',
  },
  {
    key: 'knowledge',
    icon: 'Book',
    syncKey: 'syncKnowledge',
    label: 'Knowledge',
    description: 'Knowledge base files',
  },
  {
    key: 'tasks',
    icon: 'TriangleFlagTwoStripes',
    syncKey: 'syncTasks',
    label: 'Tasks',
    description: 'Workflow tasks',
  },
  {
    key: 'studio',
    icon: 'MediaImage',
    syncKey: 'syncStudio',
    label: 'Studio',
    description: 'Studio image generations',
  },
  {
    key: 'fullExport',
    icon: 'DatabaseExport',
    syncKey: 'syncFullExport',
    label: 'Full Export',
    description: 'Complete database JSON export',
  },
]

/** Time-ago formatter (returns human-readable relative time). */
function timeAgo(date: Date, lang: string): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return date.toLocaleDateString(lang, { dateStyle: 'medium' })
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LocalBackupSection() {
  const { t, lang } = useI18n(localI18n)
  const {
    isEnabled,
    isInitializing,
    isSyncing,
    error,
    basePath,
    lastSync,
    syncStats,
    syncAgents,
    syncConversations,
    syncMemories,
    syncKnowledge,
    syncTasks,
    syncStudio,
    syncFullExport,
    enableSync,
    disableSync,
    triggerSync,
    updateSyncOptions,
    clearError,
  } = useFolderSyncStore()

  const [needsPermission, setNeedsPermission] = useState(false)
  const [pendingHandle, setPendingHandle] =
    useState<FileSystemDirectoryHandle | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const useFallbackDownload = !isFileSystemAccessSupported()

  // ---------- live counts from Yjs ----------
  const liveAgents = useLiveMap(Y.agents)
  const liveConversations = useLiveMap(Y.conversations)
  const liveMemories = useLiveMap(Y.memories)
  const liveKnowledge = useLiveMap(Y.knowledge)
  const liveTasks = useLiveMap(Y.tasks)
  const liveStudio = useLiveMap(Y.studioEntries)

  const liveCounts = useMemo(
    () => ({
      agents: liveAgents.filter((a) => !(a as Agent).deletedAt).length,
      conversations: liveConversations.length,
      memories: liveMemories.length,
      knowledge: liveKnowledge.filter(
        (k) => (k as KnowledgeItem).type === 'file',
      ).length,
      tasks: liveTasks.length,
      studio: liveStudio.length,
      fullExport: 1, // always 1 file
    }),
    [
      liveAgents,
      liveConversations,
      liveMemories,
      liveKnowledge,
      liveTasks,
      liveStudio,
    ],
  )

  // ---------- sync option map ----------
  const syncFlags: Record<string, boolean> = {
    syncAgents,
    syncConversations,
    syncMemories,
    syncKnowledge,
    syncTasks,
    syncStudio,
    syncFullExport,
  }

  // ---------- status derivation ----------
  const status: 'active' | 'error' | 'permission' | 'inactive' = error
    ? 'error'
    : needsPermission
      ? 'permission'
      : isEnabled && basePath
        ? 'active'
        : 'inactive'

  // ---------- reconnect on mount ----------
  useEffect(() => {
    if (isEnabled && !basePath) {
      tryReconnectFolderSync().then((success) => {
        if (!success && isEnabled) setNeedsPermission(true)
      })
    }
  }, [isEnabled, basePath])

  // ---------- handlers ----------
  const handleSelectFolder = useCallback(async () => {
    if (!isFileSystemAccessSupported() || !window.showDirectoryPicker) return
    try {
      const directoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents',
      })
      const permission = await directoryHandle.queryPermission({
        mode: 'readwrite',
      })
      if (permission === 'granted') {
        await enableSync(directoryHandle)
        setNeedsPermission(false)
      } else if (permission === 'prompt') {
        setPendingHandle(directoryHandle)
        setNeedsPermission(true)
      }
    } catch (err) {
      if ((err as DOMException).name !== 'AbortError')
        console.error('Failed to select folder:', err)
    }
  }, [enableSync])

  const handleGrantPermission = useCallback(async () => {
    if (pendingHandle) {
      try {
        const permission = await pendingHandle.requestPermission({
          mode: 'readwrite',
        })
        if (permission === 'granted') {
          await enableSync(pendingHandle)
          setNeedsPermission(false)
          setPendingHandle(null)
        }
      } catch (err) {
        console.error('Failed to get permission:', err)
      }
    } else if (isEnabled) {
      handleSelectFolder()
    }
  }, [pendingHandle, isEnabled, enableSync, handleSelectFolder])

  const handleToggleCategory = useCallback(
    (syncKey: string) => {
      updateSyncOptions({ [syncKey]: !syncFlags[syncKey] })
    },
    [
      syncAgents,
      syncConversations,
      syncMemories,
      syncKnowledge,
      syncTasks,
      syncStudio,
      syncFullExport,
      updateSyncOptions,
    ],
  )

  const handleDownloadBackup = useCallback(async () => {
    setIsDownloading(true)
    try {
      const exportData: Record<string, unknown[] | Record<string, unknown>> = {}
      const mapNames = [
        'agents',
        'conversations',
        'knowledge',
        'tasks',
        'artifacts',
        'memories',
        'preferences',
        'credentials',
        'studioEntries',
        'workflows',
        'battles',
        'pinnedMessages',
        'traces',
        'spans',
        'tracingConfig',
        'connectors',
        'connectorSyncStates',
        'notifications',
        'memoryLearningEvents',
        'agentMemoryDocuments',
        'sharedContexts',
        'installedExtensions',
        'customExtensions',
        'langfuseConfig',
      ] as const

      for (const mapName of mapNames) {
        try {
          const map = yjsMaps[mapName as keyof typeof yjsMaps]
          if (map && typeof map.toJSON === 'function') {
            const mapData = map.toJSON()
            exportData[mapName] = Object.values(mapData)
          }
        } catch (err) {
          console.warn(`Failed to export map ${mapName}:`, err)
          exportData[mapName] = []
        }
      }

      const fullExportData = {
        _meta: {
          exportedAt: new Date().toISOString(),
          source: 'yjs',
          version: 1,
          maps: mapNames.length,
          compressed: true,
        },
        ...exportData,
      }

      const jsonString = JSON.stringify(fullExportData)
      const stream = new Blob([jsonString]).stream()
      const compressedStream = stream.pipeThrough(new CompressionStream('gzip'))
      const compressedBlob = await new Response(compressedStream).blob()

      const url = URL.createObjectURL(compressedBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `devs-backup-${new Date().toISOString().split('T')[0]}.json.gz`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download backup:', err)
    } finally {
      setIsDownloading(false)
    }
  }, [])

  /* ================================================================ */
  /*  Helper to get the backed-up count for a category key            */
  /* ================================================================ */
  const backedUpCount = (key: string): number | null => {
    if (!syncStats) return null
    if (key === 'fullExport') return syncStats.fullExport ? 1 : 0
    return (syncStats as unknown as Record<string, number | boolean>)[
      key
    ] as number
  }

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */
  return (
    <div className="flex flex-col gap-6">
      {/* ── Description ── */}
      <p className="text-sm text-default-500 max-w-lg">
        {t(
          'Your conversations are yours. Keep them safe on your device—no cloud surprises, no vanishing chats.',
        )}
      </p>

      {/* ── Status Banner ── */}
      <div
        className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${
          status === 'active'
            ? 'border-success-200 bg-success-50/50'
            : status === 'error'
              ? 'border-danger-200 bg-danger-50/50'
              : status === 'permission'
                ? 'border-warning-200 bg-warning-50/50'
                : 'border-default-200 bg-default-50'
        }`}
      >
        {/* Left — icon + status text */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`flex items-center justify-center h-9 w-9 rounded-lg shrink-0 ${
              status === 'active'
                ? 'bg-success-100 text-success-600'
                : status === 'error'
                  ? 'bg-danger-100 text-danger-600'
                  : status === 'permission'
                    ? 'bg-warning-100 text-warning-600'
                    : 'bg-default-100 text-default-500'
            }`}
          >
            <Icon
              name={
                status === 'active'
                  ? 'HardDrive'
                  : status === 'error'
                    ? 'WarningTriangle'
                    : status === 'permission'
                      ? 'Lock'
                      : 'CloudSync'
              }
              className="h-5 w-5"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-default-800">
                {status === 'active'
                  ? t('Local Backup Active')
                  : status === 'error'
                    ? t('Backup Error')
                    : status === 'permission'
                      ? t('Permission required')
                      : t('Local backup disabled')}
              </span>
              {status === 'active' && (
                <Chip size="sm" variant="flat" color="success" className="h-5">
                  {t('Active')}
                </Chip>
              )}
              {isSyncing && (
                <Chip size="sm" variant="flat" color="primary" className="h-5">
                  {t('Backing up...')}
                </Chip>
              )}
            </div>
            {/* Subtitle */}
            <p className="text-xs text-default-400 truncate mt-0.5">
              {status === 'active' && basePath && (
                <>
                  <Icon name="Folder" className="h-3 w-3 inline mr-1" />
                  {basePath}
                  {lastSync && (
                    <>
                      {' · '}
                      {t('Last backup:')} {timeAgo(new Date(lastSync), lang)}
                    </>
                  )}
                </>
              )}
              {status === 'error' && error}
              {status === 'permission' &&
                t('Please grant write permission to the folder')}
              {status === 'inactive' &&
                t('Select a folder to backup your data locally')}
            </p>
          </div>
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-2 shrink-0">
          {status === 'active' && (
            <>
              <Tooltip content={t('Backup Now')}>
                <Button
                  size="sm"
                  variant="flat"
                  color="success"
                  isIconOnly
                  isLoading={isSyncing}
                  onPress={() => triggerSync()}
                >
                  {!isSyncing && (
                    <Icon name="RefreshDouble" className="h-4 w-4" />
                  )}
                </Button>
              </Tooltip>
              <Tooltip content={t('Change Folder')}>
                <Button
                  size="sm"
                  variant="flat"
                  isIconOnly
                  onPress={handleSelectFolder}
                >
                  <Icon name="Folder" className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Button
                size="sm"
                variant="light"
                color="danger"
                onPress={disableSync}
              >
                {t('Stop')}
              </Button>
            </>
          )}
          {status === 'error' && (
            <Button size="sm" variant="flat" onPress={clearError}>
              {t('Dismiss')}
            </Button>
          )}
          {status === 'permission' && (
            <Button
              size="sm"
              color="warning"
              variant="flat"
              onPress={handleGrantPermission}
            >
              {t('Grant Permission')}
            </Button>
          )}
          {status === 'inactive' && !useFallbackDownload && (
            <Button
              size="sm"
              color="primary"
              variant="flat"
              onPress={handleSelectFolder}
              isLoading={isInitializing}
              startContent={
                !isInitializing && <Icon name="Folder" className="h-4 w-4" />
              }
            >
              {t('Select Folder')}
            </Button>
          )}
        </div>
      </div>

      {/* ── Download Fallback (Safari / Firefox) ── */}
      {useFallbackDownload && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-default-400">
            {t(
              'Your browser does not support automatic folder sync. You can download a backup file instead.',
            )}
          </p>
          <Button
            color="primary"
            variant="flat"
            size="sm"
            onPress={handleDownloadBackup}
            isLoading={isDownloading}
            startContent={
              !isDownloading && <Icon name="Download" className="h-4 w-4" />
            }
          >
            {t('Download Backup')}
          </Button>
        </div>
      )}

      {/* ── Data Categories ── */}
      {!useFallbackDownload && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-default-700">
              {t('What to backup:')}
            </h4>
          </div>

          {CATEGORIES.map((cat) => {
            const enabled = syncFlags[cat.syncKey]
            const dbCount = liveCounts[cat.key as keyof typeof liveCounts] ?? 0
            const backed = backedUpCount(cat.key)
            const isFullyBacked =
              backed !== null && backed >= dbCount && enabled
            const isPartial = backed !== null && backed > 0 && backed < dbCount

            return (
              <Switch
                key={cat.key}
                onValueChange={() => {
                  handleToggleCategory(cat.syncKey)
                }}
                isSelected={enabled}
                startContent={
                  <div
                    className={`flex items-center justify-center h-8 w-8 rounded-lg shrink-0 ${
                      enabled
                        ? 'bg-primary-100 text-primary-600'
                        : 'bg-default-100 text-default-400'
                    }`}
                  >
                    <Icon name={cat.icon} className="h-4 w-4" />
                  </div>
                }
                endContent={
                  <div className="flex items-center gap-2 shrink-0">
                    {isEnabled && backed !== null && enabled && (
                      <Tooltip
                        content={
                          cat.key === 'fullExport'
                            ? backed
                              ? t('Backed up')
                              : t('Not yet backed up')
                            : `${backed}/${dbCount} ${t('backed up')}`
                        }
                      >
                        <div className="flex items-center gap-1.5">
                          {cat.key !== 'fullExport' && (
                            <span className="text-xs font-medium text-default-600">
                              {backed}/{dbCount}
                            </span>
                          )}
                          <Icon
                            name={
                              isFullyBacked
                                ? 'CheckCircle'
                                : isPartial
                                  ? 'WarningCircle'
                                  : 'Circle'
                            }
                            className={`h-4 w-4 ${
                              isFullyBacked
                                ? 'text-success-500'
                                : isPartial
                                  ? 'text-warning-500'
                                  : 'text-default-300'
                            }`}
                          />
                        </div>
                      </Tooltip>
                    )}
                  </div>
                }
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${enabled ? 'text-default-800' : 'text-default-500'}`}
                  >
                    {t(cat.label as Parameters<typeof t>[0])}
                  </span>
                  {cat.key !== 'fullExport' && (
                    <span className="text-xs text-default-400">
                      {dbCount} {t('in database')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-default-400 truncate">
                  {t(cat.description as Parameters<typeof t>[0])}
                </p>
              </Switch>
            )
          })}
        </div>
      )}

      {/* ── Backup Summary (when active and has stats) ── */}
      {isEnabled && syncStats && !useFallbackDownload && (
        <div className="flex flex-col gap-2 rounded-lg border border-default-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-default-500 uppercase tracking-wider">
              {t('Last backup summary')}
            </h4>
            {lastSync && (
              <span className="text-xs text-default-400">
                {new Date(lastSync).toLocaleString(lang, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
            {CATEGORIES.filter(
              (c) => syncFlags[c.syncKey] && c.key !== 'fullExport',
            ).map((cat) => {
              const backed = (
                syncStats as unknown as Record<string, number | boolean>
              )[cat.key] as number
              const total = liveCounts[cat.key as keyof typeof liveCounts] ?? 0
              const pct = total > 0 ? Math.round((backed / total) * 100) : 0
              return (
                <div key={cat.key} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-default-600">
                      <Icon name={cat.icon} className="h-3 w-3 inline mr-1" />
                      {t(cat.label as Parameters<typeof t>[0])}
                    </span>
                    <span className="text-default-800 font-medium">
                      {backed}/{total}
                    </span>
                  </div>
                  <Progress
                    size="sm"
                    value={pct}
                    color={
                      pct >= 100 ? 'success' : pct > 0 ? 'primary' : 'default'
                    }
                    aria-label={`${cat.label} backup progress`}
                    className="h-1"
                  />
                </div>
              )
            })}
            {syncFullExport && syncStats.fullExport && (
              <div className="flex items-center gap-1.5 text-xs text-success-600">
                <Icon name="CheckCircle" className="h-3.5 w-3.5" />
                {t('Full Export')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tip ── */}
      {!useFallbackDownload && (
        <p className="text-xs text-default-400">
          <Icon name="InfoCircle" className="h-3 w-3 inline mr-1" />
          {t('Files are stored as readable Markdown')}.{' '}
          {t('Preview files in Finder, sync with Git, or edit externally')}.
        </p>
      )}
    </div>
  )
}
