import { useState, useMemo } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Tabs,
  Tab,
  Avatar,
  Button,
  Chip,
  Select,
  SelectItem,
  Input,
  Tooltip,
  Divider,
} from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { successToast } from '@/lib/toast'
import type {
  WorkspaceMember,
  InviteLink,
  WorkspaceRole,
} from '@/types/collaboration'

export interface ShareDialogProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  workspaceName: string
  currentUserId: string
  currentUserRole: WorkspaceRole
  members: WorkspaceMember[]
  inviteLinks: InviteLink[]
  onUpdateMemberRole: (userId: string, newRole: WorkspaceRole) => Promise<void>
  onRemoveMember: (userId: string) => Promise<void>
  onCreateInviteLink: (config: {
    role: WorkspaceRole
    expiresIn?: number
    maxUses?: number
  }) => Promise<InviteLink>
  onDeleteInviteLink: (linkId: string) => Promise<void>
  onLeaveWorkspace?: () => Promise<void>
}

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel: string
  isLoading?: boolean
}

const roleColors: Record<
  WorkspaceRole,
  'secondary' | 'primary' | 'success' | 'default'
> = {
  owner: 'secondary',
  admin: 'primary',
  editor: 'success',
  viewer: 'default',
}

const roleLabels: Record<
  WorkspaceRole,
  'Owner' | 'Admin' | 'Editor' | 'Viewer'
> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
}

const EXPIRATION_OPTIONS = [
  { value: '3600', labelKey: '1 hour' as const },
  { value: '86400', labelKey: '24 hours' as const },
  { value: '604800', labelKey: '7 days' as const },
  { value: '2592000', labelKey: '30 days' as const },
  { value: 'never', labelKey: 'Never' as const },
]

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  isLoading = false,
}: ConfirmationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody>
          <p className="text-default-600">{message}</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose} isDisabled={isLoading}>
            Cancel
          </Button>
          <Button color="danger" onPress={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))

  if (diffMs < 0) return 'Expired'
  if (diffHours < 1) return 'Less than 1 hour'
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''}`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''}`
  return date.toLocaleDateString()
}

// Extended member type with optional display properties
interface ExtendedWorkspaceMember extends WorkspaceMember {
  displayName?: string
  avatar?: string
  email?: string
}

export function ShareDialog({
  isOpen,
  onClose,
  workspaceId: _workspaceId,
  workspaceName,
  currentUserId,
  currentUserRole,
  members,
  inviteLinks,
  onUpdateMemberRole,
  onRemoveMember,
  onCreateInviteLink,
  onDeleteInviteLink,
  onLeaveWorkspace,
}: ShareDialogProps) {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members')
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    type: 'remove' | 'leave' | 'deleteLink'
    targetId?: string
    targetName?: string
  }>({ isOpen: false, type: 'remove' })

  // Invite link creation state
  const [newLinkRole, setNewLinkRole] = useState<WorkspaceRole>('viewer')
  const [newLinkExpiration, setNewLinkExpiration] = useState<string>('604800')
  const [newLinkMaxUses, setNewLinkMaxUses] = useState<string>('')
  const [isCreatingLink, setIsCreatingLink] = useState(false)

  const canManageMembers =
    currentUserRole === 'owner' || currentUserRole === 'admin'
  const canManageLinks =
    currentUserRole === 'owner' || currentUserRole === 'admin'
  const isOwner = currentUserRole === 'owner'

  // Sort members: owner first, then by role, then alphabetically
  const sortedMembers = useMemo(() => {
    const roleOrder: Record<WorkspaceRole, number> = {
      owner: 0,
      admin: 1,
      editor: 2,
      viewer: 3,
    }
    return [...members].sort((a, b) => {
      if (roleOrder[a.role] !== roleOrder[b.role]) {
        return roleOrder[a.role] - roleOrder[b.role]
      }
      const extA = a as ExtendedWorkspaceMember
      const extB = b as ExtendedWorkspaceMember
      const nameA = extA.displayName || a.userId
      const nameB = extB.displayName || b.userId
      return nameA.localeCompare(nameB)
    })
  }, [members])

  // Find who invited a member
  const getInviterName = (invitedBy: string): string => {
    const inviter = members.find((m) => m.userId === invitedBy) as
      | ExtendedWorkspaceMember
      | undefined
    return inviter?.displayName || invitedBy
  }

  const handleRoleChange = async (userId: string, newRole: WorkspaceRole) => {
    if (!canManageMembers) return

    setIsUpdating(userId)
    try {
      await onUpdateMemberRole(userId, newRole)
      successToast(t('Member role updated'))
    } finally {
      setIsUpdating(null)
    }
  }

  const handleRemoveMember = (member: ExtendedWorkspaceMember) => {
    setConfirmModal({
      isOpen: true,
      type: 'remove',
      targetId: member.userId,
      targetName: member.displayName || member.userId,
    })
  }

  const handleLeaveWorkspace = () => {
    setConfirmModal({
      isOpen: true,
      type: 'leave',
    })
  }

  const handleDeleteLink = (linkId: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'deleteLink',
      targetId: linkId,
    })
  }

  const handleConfirmAction = async () => {
    setIsUpdating('confirm')
    try {
      if (confirmModal.type === 'remove' && confirmModal.targetId) {
        await onRemoveMember(confirmModal.targetId)
        successToast(t('Member removed'))
      } else if (confirmModal.type === 'leave' && onLeaveWorkspace) {
        await onLeaveWorkspace()
        successToast(t('You have left the workspace'))
        onClose()
      } else if (confirmModal.type === 'deleteLink' && confirmModal.targetId) {
        await onDeleteInviteLink(confirmModal.targetId)
        successToast(t('Invite link deleted'))
      }
    } finally {
      setIsUpdating(null)
      setConfirmModal({ isOpen: false, type: 'remove' })
    }
  }

  const handleCreateInviteLink = async () => {
    setIsCreatingLink(true)
    try {
      const config: {
        role: WorkspaceRole
        expiresIn?: number
        maxUses?: number
      } = {
        role: newLinkRole,
      }

      if (newLinkExpiration !== 'never') {
        config.expiresIn = parseInt(newLinkExpiration, 10)
      }

      if (newLinkMaxUses && parseInt(newLinkMaxUses, 10) > 0) {
        config.maxUses = parseInt(newLinkMaxUses, 10)
      }

      await onCreateInviteLink(config)
      successToast(t('Invite link created'))

      // Reset form
      setNewLinkRole('viewer')
      setNewLinkExpiration('604800')
      setNewLinkMaxUses('')
    } finally {
      setIsCreatingLink(false)
    }
  }

  const handleCopyLink = async (link: InviteLink) => {
    const inviteUrl = `${window.location.origin}/invite/${link.token}`
    await navigator.clipboard.writeText(inviteUrl)
    successToast(t('Link copied to clipboard'))
  }

  const getConfirmModalContent = () => {
    switch (confirmModal.type) {
      case 'remove':
        return {
          title: t('Remove Member'),
          message: t(
            'Are you sure you want to remove {name} from this workspace?',
            {
              name: confirmModal.targetName || '',
            },
          ),
          confirmLabel: t('Remove'),
        }
      case 'leave':
        return {
          title: t('Leave Workspace'),
          message: t(
            'Are you sure you want to leave this workspace? You will need a new invite to rejoin.',
          ),
          confirmLabel: t('Leave'),
        }
      case 'deleteLink':
        return {
          title: t('Delete Invite Link'),
          message: t(
            'Are you sure you want to delete this invite link? Anyone with this link will no longer be able to join.',
          ),
          confirmLabel: t('Delete'),
        }
    }
  }

  const confirmContent = getConfirmModalContent()

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Icon name="User" size="md" />
              <span>{t('Share {name}', { name: workspaceName })}</span>
            </div>
          </ModalHeader>

          <ModalBody className="gap-4">
            <Tabs
              selectedKey={activeTab}
              onSelectionChange={(key) =>
                setActiveTab(key as 'members' | 'invites')
              }
              variant="underlined"
              classNames={{
                tabList:
                  'gap-6 w-full relative rounded-none py-0 border-b border-divider',
                tab: 'py-4',
              }}
            >
              {/* Members Tab */}
              <Tab
                key="members"
                title={
                  <div className="flex items-center gap-2">
                    <Icon name="User" size="sm" />
                    <span>{t('Members')}</span>
                    <Chip size="sm" variant="flat">
                      {members.length}
                    </Chip>
                  </div>
                }
              >
                <div className="flex flex-col gap-3 py-4">
                  {sortedMembers.map((member) => {
                    const extMember = member as ExtendedWorkspaceMember
                    const isCurrentUser = member.userId === currentUserId
                    const isMemberOwner = member.role === 'owner'
                    const canEditRole =
                      canManageMembers && !isMemberOwner && !isCurrentUser
                    const canRemove =
                      canManageMembers && !isMemberOwner && !isCurrentUser

                    return (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between gap-4 p-3 rounded-lg bg-default-100 hover:bg-default-200 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar
                            src={extMember.avatar}
                            name={getInitials(
                              extMember.displayName || member.userId,
                            )}
                            size="sm"
                            className="shrink-0"
                          />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                {extMember.displayName || member.userId}
                              </span>
                              {isCurrentUser && (
                                <Chip size="sm" variant="flat" color="primary">
                                  {t('You')}
                                </Chip>
                              )}
                            </div>
                            {extMember.email && (
                              <span className="text-small text-default-500 truncate">
                                {extMember.email}
                              </span>
                            )}
                            {member.invitedBy && !isMemberOwner && (
                              <span className="text-tiny text-default-400">
                                {t('Invited by {name}', {
                                  name: getInviterName(member.invitedBy),
                                })}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {canEditRole ? (
                            <Select
                              size="sm"
                              selectedKeys={[member.role]}
                              onChange={(e) =>
                                handleRoleChange(
                                  member.userId,
                                  e.target.value as WorkspaceRole,
                                )
                              }
                              isDisabled={isUpdating === member.userId}
                              className="w-28"
                              aria-label={t('Member role')}
                            >
                              <SelectItem key="admin">{t('Admin')}</SelectItem>
                              <SelectItem key="editor">
                                {t('Editor')}
                              </SelectItem>
                              <SelectItem key="viewer">
                                {t('Viewer')}
                              </SelectItem>
                            </Select>
                          ) : (
                            <Chip
                              size="sm"
                              color={roleColors[member.role]}
                              variant="flat"
                            >
                              {t(roleLabels[member.role])}
                            </Chip>
                          )}

                          {canRemove && (
                            <Tooltip content={t('Remove member')}>
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                color="danger"
                                onPress={() => handleRemoveMember(extMember)}
                                isDisabled={isUpdating === member.userId}
                              >
                                <Icon name="Trash" size="sm" />
                              </Button>
                            </Tooltip>
                          )}

                          {isCurrentUser && !isOwner && onLeaveWorkspace && (
                            <Tooltip content={t('Leave workspace')}>
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                color="danger"
                                onPress={handleLeaveWorkspace}
                              >
                                <Icon name="X" size="sm" />
                              </Button>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Tab>

              {/* Invite Links Tab */}
              <Tab
                key="invites"
                title={
                  <div className="flex items-center gap-2">
                    <Icon name="Share" size="sm" />
                    <span>{t('Invite Links')}</span>
                    <Chip size="sm" variant="flat">
                      {inviteLinks.length}
                    </Chip>
                  </div>
                }
              >
                <div className="flex flex-col gap-4 py-4">
                  {/* Create new invite link form */}
                  {canManageLinks && (
                    <>
                      <div className="flex flex-col gap-3 p-4 rounded-lg bg-default-100">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Icon name="Plus" size="sm" />
                          <span>{t('Create Invite Link')}</span>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Select
                            size="sm"
                            label={t('Role')}
                            selectedKeys={[newLinkRole]}
                            onChange={(e) =>
                              setNewLinkRole(e.target.value as WorkspaceRole)
                            }
                            className="w-32"
                          >
                            {isOwner ? (
                              <>
                                <SelectItem key="admin">
                                  {t('Admin')}
                                </SelectItem>
                                <SelectItem key="editor">
                                  {t('Editor')}
                                </SelectItem>
                                <SelectItem key="viewer">
                                  {t('Viewer')}
                                </SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem key="editor">
                                  {t('Editor')}
                                </SelectItem>
                                <SelectItem key="viewer">
                                  {t('Viewer')}
                                </SelectItem>
                              </>
                            )}
                          </Select>

                          <Select
                            size="sm"
                            label={t('Expires')}
                            selectedKeys={[newLinkExpiration]}
                            onChange={(e) =>
                              setNewLinkExpiration(e.target.value)
                            }
                            className="w-32"
                          >
                            {EXPIRATION_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value}>
                                {t(opt.labelKey)}
                              </SelectItem>
                            ))}
                          </Select>

                          <Input
                            size="sm"
                            type="number"
                            label={t('Max uses')}
                            placeholder={t('Unlimited')}
                            value={newLinkMaxUses}
                            onChange={(e) => setNewLinkMaxUses(e.target.value)}
                            className="w-28"
                            min={1}
                          />

                          <Button
                            size="sm"
                            color="primary"
                            onPress={handleCreateInviteLink}
                            isLoading={isCreatingLink}
                            className="self-end"
                          >
                            {t('Create')}
                          </Button>
                        </div>
                      </div>

                      <Divider />
                    </>
                  )}

                  {/* Existing invite links */}
                  {inviteLinks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-default-500">
                      <Icon
                        name="Share"
                        size="xl"
                        className="mb-2 opacity-50"
                      />
                      <span>{t('No invite links')}</span>
                      {canManageLinks && (
                        <span className="text-small">
                          {t('Create one above to invite people')}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {inviteLinks.map((link) => {
                        const isExpired =
                          link.expiresAt &&
                          new Date(link.expiresAt) < new Date()
                        const isMaxedOut =
                          link.maxUses && link.usedCount >= link.maxUses

                        return (
                          <div
                            key={link.id}
                            className={`flex items-center justify-between gap-4 p-3 rounded-lg ${
                              isExpired || isMaxedOut
                                ? 'bg-danger-50 opacity-60'
                                : 'bg-default-100'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Chip
                                    size="sm"
                                    color={roleColors[link.role]}
                                    variant="flat"
                                  >
                                    {t(roleLabels[link.role])}
                                  </Chip>

                                  {isExpired && (
                                    <Chip
                                      size="sm"
                                      color="danger"
                                      variant="flat"
                                    >
                                      {t('Expired')}
                                    </Chip>
                                  )}

                                  {isMaxedOut && !isExpired && (
                                    <Chip
                                      size="sm"
                                      color="warning"
                                      variant="flat"
                                    >
                                      {t('Max uses reached')}
                                    </Chip>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 text-small text-default-500">
                                  {link.expiresAt && !isExpired && (
                                    <span className="flex items-center gap-1">
                                      <Icon name="Clock" size="sm" />
                                      {t('Expires in {time}', {
                                        time: formatRelativeTime(
                                          new Date(link.expiresAt),
                                        ),
                                      })}
                                    </span>
                                  )}

                                  {link.maxUses && (
                                    <span>
                                      {t('{used}/{max} uses', {
                                        used: link.usedCount,
                                        max: link.maxUses,
                                      })}
                                    </span>
                                  )}

                                  {!link.maxUses && (
                                    <span>
                                      {t('{count} uses', {
                                        count: link.usedCount,
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {!isExpired && !isMaxedOut && (
                                <Tooltip content={t('Copy link')}>
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="flat"
                                    onPress={() => handleCopyLink(link)}
                                  >
                                    <Icon name="Copy" size="sm" />
                                  </Button>
                                </Tooltip>
                              )}

                              {canManageLinks && (
                                <Tooltip content={t('Delete link')}>
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    color="danger"
                                    onPress={() => handleDeleteLink(link.id)}
                                  >
                                    <Icon name="Trash" size="sm" />
                                  </Button>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </Tab>
            </Tabs>
          </ModalBody>

          <ModalFooter>
            <Button variant="flat" onPress={onClose}>
              {t('Close')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: 'remove' })}
        onConfirm={handleConfirmAction}
        title={confirmContent.title}
        message={confirmContent.message}
        confirmLabel={confirmContent.confirmLabel}
        isLoading={isUpdating === 'confirm'}
      />
    </>
  )
}
