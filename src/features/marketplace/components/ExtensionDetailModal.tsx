import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Divider,
  Avatar,
  Tooltip,
  useDisclosure,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  ButtonGroup,
} from '@heroui/react'
import { OpenNewWindow } from 'iconoir-react'

import { Icon } from '@/components'
import { useI18n, type LanguageCode } from '@/i18n'
import type { IconName } from '@/lib/types'
import type {
  MarketplaceExtension,
  ExtensionColor,
  ExtensionType,
} from '../types'
import { useMarketplaceStore } from '../store'
import localI18n from '../pages/i18n'
import { ExtensionPreview } from './ExtensionPreview'

/**
 * Extension Detail Modal
 *
 * Displays detailed information about a marketplace extension
 * with install/uninstall actions.
 */

// Category metadata for display
const CATEGORY_META: Record<ExtensionType, { icon: IconName; label: string }> =
  {
    app: { icon: 'CubeScan', label: 'Apps' },
    agent: { icon: 'User', label: 'Agents' },
    connector: { icon: 'Puzzle', label: 'Connectors' },
    tool: { icon: 'Settings', label: 'Tools' },
  }

// Map extension color to HeroUI color
function getAvatarColor(
  color?: ExtensionColor,
): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' {
  switch (color) {
    case 'primary':
    case 'blue':
    case 'indigo':
      return 'primary'
    case 'secondary':
    case 'purple':
    case 'pink':
      return 'secondary'
    case 'success':
    case 'green':
    case 'teal':
      return 'success'
    case 'warning':
    case 'orange':
    case 'yellow':
      return 'warning'
    case 'danger':
    case 'red':
      return 'danger'
    default:
      return 'default'
  }
}

interface ExtensionDetailModalProps {
  extension: MarketplaceExtension | null
  isOpen: boolean
  onClose: () => void
}

export function ExtensionDetailModal({
  extension,
  isOpen,
  onClose,
}: ExtensionDetailModalProps) {
  const { lang, t } = useI18n(localI18n)

  const navigate = useNavigate()
  const isLoading = useMarketplaceStore((state) => state.isLoading)
  const installExtension = useMarketplaceStore(
    (state) => state.installExtension,
  )
  const uninstallExtension = useMarketplaceStore(
    (state) => state.uninstallExtension,
  )
  const deleteCustomExtension = useMarketplaceStore(
    (state) => state.deleteCustomExtension,
  )
  const isInstalled = useMarketplaceStore((state) => state.isInstalled)
  const loadExtensionById = useMarketplaceStore(
    (state) => state.loadExtensionById,
  )

  // Delete confirmation modal
  const {
    isOpen: isDeleteModalOpen,
    onOpen: onDeleteModalOpen,
    onClose: onDeleteModalClose,
  } = useDisclosure()

  // State for full extension details (includes author, source, etc.)
  const [fullExtension, setFullExtension] =
    useState<MarketplaceExtension | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  // State for preview mode
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  // Load full extension details when modal opens
  useEffect(() => {
    if (isOpen && extension?.id) {
      setIsLoadingDetails(true)
      loadExtensionById(extension.id)
        .then((details) => {
          setFullExtension(details)
        })
        .finally(() => {
          setIsLoadingDetails(false)
        })
    } else if (!isOpen) {
      // Reset when modal closes
      setFullExtension(null)
      setIsPreviewMode(false)
    }
  }, [isOpen, extension?.id, loadExtensionById])

  if (!extension) return null

  // Use full extension if loaded, otherwise fall back to partial
  const displayExtension = fullExtension || extension

  const localizedName =
    displayExtension.i18n?.[lang as LanguageCode]?.name || displayExtension.name
  const localizedDescription =
    displayExtension.i18n?.[lang as LanguageCode]?.description ||
    displayExtension.description
  const categoryMeta = CATEGORY_META[displayExtension.type || 'app']
  const avatarColor = getAvatarColor(displayExtension.color)
  const installed = isInstalled(displayExtension.id)

  const handleInstall = async () => {
    await installExtension(extension.id)
    onClose()
  }

  const handleUninstall = async () => {
    await uninstallExtension(extension.id)
    onClose()
  }

  const handleConfirmDelete = async () => {
    await deleteCustomExtension(extension.id)
    onDeleteModalClose()
    onClose()
  }

  // const handleCopyUuid = () => {
  //   navigator.clipboard.writeText(extension.id)
  // }

  // Metadata rows
  const metadataRows: {
    label: string
    value: string
    action: React.ReactNode
  }[] = [
    {
      label: t('Extension type'),
      value: t(categoryMeta.label as any),
      action: null,
    },
    {
      label: t('Author'),
      value: displayExtension.author?.name || (isLoadingDetails ? '...' : '-'),
      action: null,
    },
    // {
    //   label: 'UUID',
    //   value: extension.id,
    //   action: (
    //     <Tooltip content={t('Copy' as any) || 'Copy'}>
    //       <Button
    //         isIconOnly
    //         size="sm"
    //         variant="light"
    //         onPress={handleCopyUuid}
    //         aria-label="Copy UUID"
    //       >
    //         <Copy className="w-4 h-4" />
    //       </Button>
    //     </Tooltip>
    //   ),
    // },
  ]

  // Add website if available
  if (displayExtension.author?.url) {
    metadataRows.push({
      label: t('Website'),
      value: '', // displayExtension.author.url,
      action: (
        <Tooltip content={t('Open in new tab' as any) || 'Open in new tab'}>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            as="a"
            href={displayExtension.author.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open website"
          >
            <OpenNewWindow className="w-4 h-4" />
          </Button>
        </Tooltip>
      ),
    })
  }

  // Add source/repo if available
  if (displayExtension.source) {
    metadataRows.push({
      label: t('View source'),
      value: '', // displayExtension.source,
      action: (
        <Tooltip content={t('Open in new tab' as any) || 'Open in new tab'}>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            as="a"
            href={displayExtension.source}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View source"
          >
            <OpenNewWindow className="w-4 h-4" />
          </Button>
        </Tooltip>
      ),
    })
  }

  // Add privacy policy if available
  if (displayExtension.privacyPolicy) {
    metadataRows.push({
      label: t('Privacy Policy'),
      value: '', // displayExtension.privacyPolicy,
      action: (
        <Tooltip content={t('Open in new tab' as any) || 'Open in new tab'}>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            as="a"
            href={displayExtension.privacyPolicy}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Privacy policy"
          >
            <OpenNewWindow className="w-4 h-4" />
          </Button>
        </Tooltip>
      ),
    })
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={isPreviewMode ? () => setIsPreviewMode(false) : onClose}
        size={isPreviewMode ? 'full' : 'lg'}
        placement="bottom-center"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col items-center gap-4 pt-8">
            {isPreviewMode ? (
              <div className="flex items-center gap-2 w-full">
                <Button
                  isIconOnly
                  variant="light"
                  onPress={() => setIsPreviewMode(false)}
                  aria-label="Back"
                >
                  <Icon name="NavArrowLeft" />
                </Button>
                <h2 className="text-xl font-semibold flex-1">
                  {localizedName}
                </h2>
              </div>
            ) : (
              <>
                <Avatar
                  icon={
                    <Icon name={displayExtension.icon || categoryMeta.icon} />
                  }
                  color={avatarColor}
                  size="lg"
                  radius="lg"
                  isBordered={installed}
                  classNames={{
                    base: 'w-16 h-16',
                    icon: 'w-8 h-8',
                  }}
                />
                <div className="text-center">
                  <h2 className="text-xl font-semibold">{localizedName}</h2>
                </div>
              </>
            )}
          </ModalHeader>

          <ModalBody className={isPreviewMode ? 'p-0 flex-1' : 'gap-6'}>
            {isPreviewMode ? (
              (() => {
                // Get the first page code from the pages object
                const pages = displayExtension.pages || {}
                const pageKeys = Object.keys(pages)
                const firstPageCode =
                  pageKeys.length > 0 ? pages[pageKeys[0]] : ''
                return (
                  <ExtensionPreview
                    extensionId={displayExtension.id}
                    extensionName={localizedName}
                    pageCode={firstPageCode}
                    className="h-full"
                    minHeight="100%"
                  />
                )
              })()
            ) : (
              <>
                {/* Description */}
                {localizedDescription && (
                  <p className="text-center text-default-500">
                    {localizedDescription}
                  </p>
                )}

                {/* Screenshots */}
                {displayExtension.screenshots &&
                  displayExtension.screenshots.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
                        {displayExtension.screenshots.map(
                          (screenshot, index) => (
                            <img
                              key={index}
                              src={screenshot}
                              alt={`${localizedName} screenshot ${index + 1}`}
                              className="rounded-lg border border-default-200 max-h-48 object-contain"
                            />
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {/* Install/Uninstall Button */}
                <div className="flex justify-center gap-2">
                  <ButtonGroup>
                    {/* Primary action: Install/Uninstall */}
                    {installed ? (
                      <Button
                        color="danger"
                        variant="flat"
                        onPress={handleUninstall}
                        isLoading={isLoading}
                        startContent={!isLoading && <Icon name="Trash" />}
                      >
                        {t('Uninstall')}
                      </Button>
                    ) : (
                      <Button
                        color="primary"
                        variant="flat"
                        onPress={handleInstall}
                        isLoading={isLoading}
                        startContent={!isLoading && <Icon name="Plus" />}
                      >
                        {t('Install')}
                      </Button>
                    )}

                    {/* Secondary actions dropdown */}
                    <Dropdown>
                      <DropdownTrigger>
                        <Button isIconOnly variant="flat">
                          <Icon name="MoreVert" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu
                        aria-label="Extension actions"
                        items={
                          displayExtension.isCustom
                            ? [
                                {
                                  key: 'preview',
                                  icon: 'Eye',
                                  label: t('Preview'),
                                  action: () => setIsPreviewMode(true),
                                },
                                {
                                  key: 'edit',
                                  icon: 'EditPencil',
                                  label: t('Edit'),
                                  action: () => {
                                    navigate(
                                      `/marketplace/edit/${displayExtension.id}`,
                                    )
                                    onClose()
                                  },
                                },
                                {
                                  key: 'duplicate',
                                  icon: 'Copy',
                                  label: t('Duplicate & edit'),
                                  action: () => {
                                    navigate(
                                      `/marketplace/edit/${displayExtension.id}?duplicate=true`,
                                    )
                                    onClose()
                                  },
                                },
                                {
                                  key: 'delete',
                                  icon: 'Trash',
                                  color: 'danger',
                                  label: t('Delete extension'),
                                  action: onDeleteModalOpen,
                                },
                              ]
                            : [
                                {
                                  key: 'preview',
                                  icon: 'Eye',
                                  label: t('Preview'),
                                  action: () => setIsPreviewMode(true),
                                },
                                {
                                  key: 'duplicate',
                                  icon: 'Copy',
                                  label: t('Duplicate & edit'),
                                  action: () => {
                                    navigate(
                                      `/marketplace/edit/${displayExtension.id}?duplicate=true`,
                                    )
                                    onClose()
                                  },
                                },
                              ]
                        }
                      >
                        {(item) => (
                          <DropdownItem
                            key={item.key}
                            startContent={<Icon name={item.icon as IconName} />}
                            onPress={item.action}
                          >
                            {t(item.label as any)}
                          </DropdownItem>
                        )}
                      </DropdownMenu>
                    </Dropdown>
                  </ButtonGroup>
                </div>

                <Divider />

                {/* Metadata Section */}
                <div className="rounded-lg border border-default-200 overflow-hidden">
                  {metadataRows.map((row, index) => (
                    <div
                      key={row.label}
                      className={`flex items-center justify-between px-4 py-3 ${
                        index !== metadataRows.length - 1
                          ? 'border-b border-default-200'
                          : ''
                      }`}
                    >
                      <span className="text-default-500 text-sm">
                        {row.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate max-w-[180px]">
                          {row.value}
                        </span>
                        {row.action}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </ModalBody>

          {!isPreviewMode && <ModalFooter />}
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose} size="sm">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            {t('Delete extension')}
          </ModalHeader>
          <ModalBody>
            <p>{t('Are you sure you want to delete this extension?')}</p>
            <p className="font-semibold">{localizedName}</p>
            <p className="text-sm text-default-500">
              {t('This action cannot be undone.')}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onDeleteModalClose}>
              {t('Cancel')}
            </Button>
            <Button color="danger" onPress={handleConfirmDelete}>
              {t('Delete')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}

export default ExtensionDetailModal
