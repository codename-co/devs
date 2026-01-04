import {
  Button,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Image,
} from '@heroui/react'
import { useCallback, useState } from 'react'

import { Icon } from '../Icon'

import { type LanguageCode } from '@/i18n/locales'
import { type KnowledgeItem } from '@/types'
import { db } from '@/lib/db'
import { getFileIcon } from '@/lib/utils'
import { formatBytes } from '@/lib/format'
import { useI18n } from '@/i18n'

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

  const handleAction = useCallback(
    (key: React.Key) => {
      if (key === 'upload') {
        onFileUpload()
      } else if (typeof key === 'string' && key.startsWith('knowledge-')) {
        const itemId = key.replace('knowledge-', '')
        const item = knowledgeItems.find((item) => item.id === itemId)
        if (item) {
          onKnowledgeFileSelect(item)
        }
      }
    },
    [onFileUpload, onKnowledgeFileSelect, knowledgeItems],
  )

  return (
    <Dropdown
      placement="bottom-start"
      className="bg-white dark:bg-default-50 dark:text-white"
      onOpenChange={(isOpen) => {
        if (isOpen) {
          loadKnowledgeItems()
        }
      }}
    >
      <DropdownTrigger>
        <Button isIconOnly radius="md" variant="bordered" size="sm">
          <Icon name="Plus" />
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="File attachment options"
        onAction={handleAction}
      >
        <DropdownSection aria-label="Actions" showDivider>
          <DropdownItem
            key="upload"
            startContent={<Icon name="Attachment" size="sm" />}
          >
            {t('Upload new file')}
          </DropdownItem>
        </DropdownSection>
        <DropdownSection
          title={t('Choose from knowledge base')}
          aria-label={t('Choose from knowledge base')}
        >
          {loadingKnowledge ? (
            <DropdownItem key="loading" isDisabled>
              <div className="flex items-center gap-2">
                <Icon name="Settings" className="animate-spin" size="sm" />
                Loading knowledge base...
              </div>
            </DropdownItem>
          ) : knowledgeItems.length === 0 ? (
            <DropdownItem key="empty" isDisabled>
              <div className="flex items-center gap-2 text-default-500">
                No files in knowledge base
              </div>
            </DropdownItem>
          ) : (
            knowledgeItems.slice(0, 10).map((item) => (
              <DropdownItem
                key={`knowledge-${item.id}`}
                startContent={renderKnowledgePreview(item)}
                endContent={
                  <Chip size="sm" variant="flat" className="text-xs">
                    {formatBytes(item.size || 0, lang)}
                  </Chip>
                }
                description={
                  <div className="text-xs text-default-500 truncate max-w-32">
                    {item.path.replace(/^\//, '')}
                  </div>
                }
                textValue={item.name}
                className="py-1"
              >
                <div className="font-medium truncate max-w-32">{item.name}</div>
              </DropdownItem>
            ))
          )}
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  )
}
