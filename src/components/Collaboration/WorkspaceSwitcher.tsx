import { useState, useMemo, useCallback } from 'react'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button,
  Listbox,
  ListboxItem,
  ListboxSection,
  Divider,
} from '@heroui/react'
import { twMerge } from 'tailwind-merge'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import type { Workspace } from '@/types/collaboration'

export interface WorkspaceSwitcherProps {
  workspaces: Workspace[]
  activeWorkspaceId: string
  currentUserId: string
  onWorkspaceSelect: (workspaceId: string) => void
  onCreateWorkspace: () => void
  onWorkspaceSettings: (workspaceId: string) => void
  syncStatus?: {
    workspaceId: string
    status: 'synced' | 'syncing' | 'offline' | 'error'
    pendingChanges: number
  }[]
  className?: string
}

type SyncStatusType = 'synced' | 'syncing' | 'offline' | 'error'

interface ExtendedWorkspace extends Workspace {
  isPersonal?: boolean
  description?: string
  memberCount?: number
  icon?: string
}

function SyncStatusIndicator({
  status,
  size = 'sm',
}: {
  status: SyncStatusType
  size?: 'sm' | 'md'
}) {
  const sizeClass = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'

  const statusConfig: Record<
    SyncStatusType,
    { color: string; animate?: boolean; title: string }
  > = {
    synced: { color: 'bg-success', title: 'Synced' },
    syncing: { color: 'bg-primary', animate: true, title: 'Syncing...' },
    offline: { color: 'bg-default-400', title: 'Offline' },
    error: { color: 'bg-danger', title: 'Sync error' },
  }

  const config = statusConfig[status]

  return (
    <span
      className={twMerge(
        'rounded-full inline-block',
        sizeClass,
        config.color,
        config.animate && 'animate-pulse'
      )}
      title={config.title}
    />
  )
}

function WorkspaceIcon({ icon, isPersonal }: { icon?: string; isPersonal?: boolean }) {
  // If there's a custom icon (emoji), display it
  if (icon) {
    return <span className="text-base">{icon}</span>
  }

  // Default icons based on workspace type
  if (isPersonal) {
    return <Icon name="User" size="sm" className="text-default-500" />
  }

  return <Icon name="Folder" size="sm" className="text-default-500" />
}

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  currentUserId,
  onWorkspaceSelect,
  onCreateWorkspace,
  onWorkspaceSettings,
  syncStatus = [],
  className,
}: WorkspaceSwitcherProps) {
  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredWorkspaceId, setHoveredWorkspaceId] = useState<string | null>(null)

  // Get sync status for a workspace
  const getSyncStatus = useCallback(
    (workspaceId: string): SyncStatusType => {
      const status = syncStatus.find((s) => s.workspaceId === workspaceId)
      return status?.status ?? 'offline'
    },
    [syncStatus]
  )

  // Separate personal and shared workspaces
  const { personalWorkspace, sharedWorkspaces } = useMemo(() => {
    const extended = workspaces as ExtendedWorkspace[]
    const personal = extended.find(
      (w) => w.isPersonal || w.ownerId === currentUserId
    )
    const shared = extended.filter(
      (w) => !w.isPersonal && w.ownerId !== currentUserId
    )
    return { personalWorkspace: personal, sharedWorkspaces: shared }
  }, [workspaces, currentUserId])

  // Get active workspace
  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId),
    [workspaces, activeWorkspaceId]
  ) as ExtendedWorkspace | undefined

  // Handle workspace selection
  const handleWorkspaceSelect = useCallback(
    (workspaceId: string) => {
      onWorkspaceSelect(workspaceId)
      setIsOpen(false)
    },
    [onWorkspaceSelect]
  )

  // Handle settings click
  const handleSettingsClick = useCallback(
    (e: React.MouseEvent, workspaceId: string) => {
      e.stopPropagation()
      onWorkspaceSettings(workspaceId)
      setIsOpen(false)
    },
    [onWorkspaceSettings]
  )

  // Handle create workspace
  const handleCreateWorkspace = useCallback(() => {
    onCreateWorkspace()
    setIsOpen(false)
  }, [onCreateWorkspace])

  // Render workspace item content
  const renderWorkspaceItem = (workspace: ExtendedWorkspace, isPersonal: boolean) => {
    const isActive = workspace.id === activeWorkspaceId
    const isHovered = workspace.id === hoveredWorkspaceId
    const status = getSyncStatus(workspace.id)

    return (
      <div
        className="flex items-center gap-3 w-full py-1"
        onMouseEnter={() => setHoveredWorkspaceId(workspace.id)}
        onMouseLeave={() => setHoveredWorkspaceId(null)}
      >
        {/* Icon */}
        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
          <WorkspaceIcon icon={workspace.icon} isPersonal={isPersonal} />
        </div>

        {/* Name and member count */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{workspace.name}</span>
            {!isPersonal && workspace.memberCount && workspace.memberCount > 1 && (
              <span className="flex items-center gap-0.5 text-xs text-default-400">
                <Icon name="Group" size="sm" />
                {workspace.memberCount}
              </span>
            )}
          </div>
        </div>

        {/* Sync status */}
        <div className="flex-shrink-0">
          <SyncStatusIndicator status={status} size="sm" />
        </div>

        {/* Active checkmark or settings gear */}
        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
          {isActive ? (
            <Icon name="Check" size="sm" className="text-primary" />
          ) : isHovered ? (
            <button
              onClick={(e) => handleSettingsClick(e, workspace.id)}
              className="p-0.5 rounded hover:bg-default-200 transition-colors"
              aria-label="Workspace settings"
            >
              <Icon name="Settings" size="sm" className="text-default-400 hover:text-default-600" />
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      placement="bottom-start"
      offset={8}
    >
      <PopoverTrigger>
        <Button
          variant="light"
          className={twMerge(
            'h-9 px-3 gap-2 min-w-0',
            className
          )}
          aria-label="Switch workspace"
        >
          {/* Workspace icon */}
          <WorkspaceIcon
            icon={activeWorkspace?.icon}
            isPersonal={activeWorkspace?.isPersonal || activeWorkspace?.ownerId === currentUserId}
          />

          {/* Workspace name */}
          <span className="truncate max-w-32 text-sm font-medium">
            {activeWorkspace?.name ?? t('Select workspace')}
          </span>

          {/* Sync status */}
          {activeWorkspace && (
            <SyncStatusIndicator
              status={getSyncStatus(activeWorkspace.id)}
              size="sm"
            />
          )}

          {/* Chevron */}
          <Icon
            name="NavArrowDown"
            size="sm"
            className={twMerge(
              'text-default-400 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0">
        <div className="py-2">
          <Listbox
            aria-label="Workspaces"
            selectionMode="single"
            selectedKeys={[activeWorkspaceId]}
            onAction={(key) => {
              if (key !== 'create-workspace') {
                handleWorkspaceSelect(key as string)
              }
            }}
            classNames={{
              list: 'gap-0',
            }}
          >
            {/* Personal workspace section */}
            <ListboxSection
              title={t('Personal')}
              classNames={{
                heading: 'text-xs font-semibold text-default-500 px-3 py-1.5',
                group: 'px-1',
              }}
            >
              {personalWorkspace ? (
                <ListboxItem
                  key={personalWorkspace.id}
                  textValue={personalWorkspace.name}
                  className="px-2 py-1 rounded-lg data-[hover=true]:bg-default-100"
                >
                  {renderWorkspaceItem(personalWorkspace, true)}
                </ListboxItem>
              ) : (
                <ListboxItem
                  key="no-personal"
                  textValue="No personal workspace"
                  className="px-2 py-1 text-default-400 text-sm italic"
                  isReadOnly
                >
                  {t('No personal workspace')}
                </ListboxItem>
              )}
            </ListboxSection>

            {/* Shared workspaces section */}
            <ListboxSection
              title={t('Shared Workspaces')}
              classNames={{
                heading: 'text-xs font-semibold text-default-500 px-3 py-1.5 mt-2',
                group: 'px-1',
              }}
            >
              {sharedWorkspaces.length > 0 ? (
                sharedWorkspaces.map((workspace) => (
                  <ListboxItem
                    key={workspace.id}
                    textValue={workspace.name}
                    className="px-2 py-1 rounded-lg data-[hover=true]:bg-default-100"
                  >
                    {renderWorkspaceItem(workspace as ExtendedWorkspace, false)}
                  </ListboxItem>
                ))
              ) : (
                <ListboxItem
                  key="no-shared"
                  textValue="No shared workspaces"
                  className="px-2 py-2 text-default-400 text-sm"
                  isReadOnly
                >
                  <div className="flex flex-col items-center gap-1 py-2">
                    <Icon name="Group" size="lg" className="text-default-300" />
                    <span className="text-center">{t('No shared workspaces yet')}</span>
                    <span className="text-xs text-default-300 text-center">
                      {t('Create a workspace to collaborate with others')}
                    </span>
                  </div>
                </ListboxItem>
              )}
            </ListboxSection>
          </Listbox>

          {/* Divider and create button */}
          <Divider className="my-2" />

          <div className="px-2">
            <Button
              variant="flat"
              color="primary"
              size="sm"
              className="w-full justify-start gap-2"
              startContent={<Icon name="Plus" size="sm" />}
              onPress={handleCreateWorkspace}
            >
              {t('Create Workspace')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
