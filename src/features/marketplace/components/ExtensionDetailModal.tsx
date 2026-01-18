import { useEffect, useState } from 'react'
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

  const isLoading = useMarketplaceStore((state) => state.isLoading)
  const installExtension = useMarketplaceStore(
    (state) => state.installExtension,
  )
  const uninstallExtension = useMarketplaceStore(
    (state) => state.uninstallExtension,
  )
  const isInstalled = useMarketplaceStore((state) => state.isInstalled)
  const loadExtensionById = useMarketplaceStore(
    (state) => state.loadExtensionById,
  )

  // State for full extension details (includes author, source, etc.)
  const [fullExtension, setFullExtension] =
    useState<MarketplaceExtension | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      placement="bottom-center"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col items-center gap-4 pt-8">
          <Avatar
            icon={<Icon name={displayExtension.icon || categoryMeta.icon} />}
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
        </ModalHeader>

        <ModalBody className="gap-6">
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
                  {displayExtension.screenshots.map((screenshot, index) => (
                    <img
                      key={index}
                      src={screenshot}
                      alt={`${localizedName} screenshot ${index + 1}`}
                      className="rounded-lg border border-default-200 max-h-48 object-contain"
                    />
                  ))}
                </div>
              </div>
            )}

          {/* Install/Uninstall Button */}
          <div className="flex justify-center">
            {installed ? (
              <Button
                color="danger"
                variant="bordered"
                onPress={handleUninstall}
                isLoading={isLoading}
                startContent={!isLoading && <Icon name="Trash" />}
              >
                {t('Uninstall')}
              </Button>
            ) : (
              <Button
                color="primary"
                variant="bordered"
                onPress={handleInstall}
                isLoading={isLoading}
                startContent={!isLoading && <Icon name="Plus" />}
              >
                {t('Install')}
              </Button>
            )}
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
                <span className="text-default-500 text-sm">{row.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate max-w-[180px]">
                    {row.value}
                  </span>
                  {row.action}
                </div>
              </div>
            ))}
          </div>
        </ModalBody>

        <ModalFooter className="flex justify-center pb-6">
          <Button variant="light" size="sm" onPress={onClose}>
            {t('Cancel')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default ExtensionDetailModal
