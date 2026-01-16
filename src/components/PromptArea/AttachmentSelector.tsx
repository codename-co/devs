import {
  Button,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Image,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Listbox,
  ListboxItem,
  Spinner,
} from '@heroui/react'
import { useCallback, useState } from 'react'

import { Icon } from '../Icon'

import { type LanguageCode } from '@/i18n/locales'
import { type KnowledgeItem } from '@/types'
import { db } from '@/lib/db'
import { getFileIcon } from '@/lib/utils'
import { formatBytes } from '@/lib/format'
import { useI18n } from '@/i18n'
import { PROVIDER_CONFIG } from '@/features/connectors'
import { ConnectorWizard } from '@/features/connectors/components'

interface AttachmentSelectorProps {
  lang: LanguageCode
  onFileUpload: () => void
  onKnowledgeFileSelect: (item: KnowledgeItem) => void
}

export function AttachmentSelector({
  lang,
  onFileUpload,
  onKnowledgeFileSelect,
}: AttachmentSelectorProps) {
  const { t } = useI18n(lang as any)

  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([])
  const [loadingKnowledge, setLoadingKnowledge] = useState(false)
  const [isKnowledgePopoverOpen, setIsKnowledgePopoverOpen] = useState(false)
  const [isMainDropdownOpen, setIsMainDropdownOpen] = useState(false)
  const [showConnectorWizard, setShowConnectorWizard] = useState(false)

  const loadKnowledgeItems = useCallback(async () => {
    setLoadingKnowledge(true)
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      if (!db.hasStore('knowledgeItems')) {
        setKnowledgeItems([])
        return
      }

      const items = await db.getAll('knowledgeItems')
      // Only show files, not folders
      const fileItems = items.filter((item) => item.type === 'file')
      // Sort by most recently modified
      fileItems.sort(
        (a, b) =>
          new Date(b.lastModified).getTime() -
          new Date(a.lastModified).getTime(),
      )
      setKnowledgeItems(fileItems.slice(0, 20)) // Limit to 20 items for performance
    } catch (error) {
      console.error('Error loading knowledge items:', error)
      setKnowledgeItems([])
    } finally {
      setLoadingKnowledge(false)
    }
  }, [])

  const renderKnowledgePreview = useCallback((item: KnowledgeItem) => {
    if (item.fileType === 'image' && item.content?.startsWith('data:image/')) {
      return (
        <Image
          src={item.content}
          alt={item.name}
          className="w-6 h-6 rounded object-cover"
          loading="lazy"
        />
      )
    }

    return <Icon name={getFileIcon(item.mimeType || '') as any} size="sm" />
  }, [])

  const handleKnowledgeItemSelect = useCallback(
    (item: KnowledgeItem) => {
      onKnowledgeFileSelect(item)
      setIsKnowledgePopoverOpen(false)
      setIsMainDropdownOpen(false)
    },
    [onKnowledgeFileSelect],
  )

  const handleUpload = useCallback(() => {
    onFileUpload()
    setIsMainDropdownOpen(false)
  }, [onFileUpload])

  return (
    <>
      <Dropdown
        placement="bottom-start"
        className="bg-white dark:bg-default-50 dark:text-white"
        isOpen={isMainDropdownOpen}
        onOpenChange={setIsMainDropdownOpen}
      >
        <DropdownTrigger>
          <Button isIconOnly radius="md" variant="bordered" size="sm">
            <Icon name="Plus" />
          </Button>
        </DropdownTrigger>
        <DropdownMenu aria-label="File attachment options">
          <DropdownItem
            key="upload"
            startContent={<Icon name="Attachment" size="sm" />}
            onPress={handleUpload}
          >
            {t('Upload new file')}
          </DropdownItem>
          <DropdownItem
            key="knowledge"
            isReadOnly
            textValue={t('Choose from knowledge base')}
            className="p-0"
          >
            <Popover
              placement="right-start"
              isOpen={isKnowledgePopoverOpen}
              onOpenChange={(open) => {
                setIsKnowledgePopoverOpen(open)
                if (open) {
                  loadKnowledgeItems()
                }
              }}
              offset={12}
            >
              <PopoverTrigger>
                <div className="flex items-center justify-between w-full px-2 py-1.5 cursor-pointer hover:bg-default-100 rounded-md">
                  <div className="flex items-center gap-2">
                    <Icon name="Folder" size="sm" />
                    <span>{t('Choose from knowledge base')}</span>
                  </div>
                  <Icon name="NavArrowRight" size="sm" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="">
                {loadingKnowledge ? (
                  <div className="flex items-center justify-center gap-2 p-4">
                    <Spinner size="sm" />
                    <span className="text-sm text-default-500">
                      {t('Loading agent and conversation…')}
                    </span>
                  </div>
                ) : knowledgeItems.length === 0 ? (
                  <div className="flex items-center gap-2 p-4 text-default-500 text-sm">
                    <Icon name="QuestionMark" size="sm" />
                    {t('No files found in knowledge base')}
                  </div>
                ) : (
                  <Listbox
                    aria-label={t('Choose from knowledge base')}
                    className="p-1"
                    onAction={(key) => {
                      const item = knowledgeItems.find(
                        (item) => item.id === String(key),
                      )
                      if (item) {
                        handleKnowledgeItemSelect(item)
                      }
                    }}
                  >
                    {knowledgeItems.slice(0, 10).map((item) => (
                      <ListboxItem
                        key={item.id}
                        startContent={renderKnowledgePreview(item)}
                        endContent={
                          <Chip size="sm" variant="flat" className="text-xs">
                            {formatBytes(item.size || 0, lang)}
                          </Chip>
                        }
                        description={
                          <div className="text-xs text-default-500 truncate max-w-40">
                            {item.path.replace(/^\//, '')}
                          </div>
                        }
                        textValue={item.name}
                        className="py-1"
                      >
                        <div className="font-medium truncate max-w-40">
                          {item.name}
                        </div>
                      </ListboxItem>
                    ))}
                  </Listbox>
                )}
              </PopoverContent>
            </Popover>
          </DropdownItem>
          <DropdownItem
            key="connectors"
            startContent={<Icon name="Plus" size="sm" />}
            endContent={
              <div className="flex items-center -space-x-0.5">
                {Object.values(PROVIDER_CONFIG)
                  .slice(0, 5)
                  .map((provider, index) => (
                    <div
                      key={provider.name}
                      className="w-5 h-5 rounded-full bg-white dark:bg-default-100 flex items-center justify-center border border-default-200 -ml-1.5"
                      style={{
                        zIndex: Object.values(PROVIDER_CONFIG).length - index,
                      }}
                    >
                      <Icon name={provider.icon} className="w-3 h-3" />
                    </div>
                  ))}
              </div>
            }
            textValue={t('Add connectors')}
            onPress={() => {
              setShowConnectorWizard(true)
              setIsMainDropdownOpen(false)
            }}
          >
            {t('Add connectors')}
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>

      {/* Connector Wizard Modal - rendered outside Dropdown to prevent unmounting */}
      <ConnectorWizard
        isOpen={showConnectorWizard}
        onClose={() => setShowConnectorWizard(false)}
        category="app"
      />
    </>
  )
}
