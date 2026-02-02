import {
  DropdownMenu,
  DropdownSection,
  DropdownItem,
  type DropdownMenuProps,
  Image,
  Chip,
} from '@heroui/react'
import { useState, useEffect } from 'react'

import { Icon } from './Icon'
import { getFileIcon } from '@/lib/utils'
import { getAllKnowledgeItems } from '@/stores/knowledgeStore'
import { KnowledgeItem } from '@/types'
import { formatBytes } from '@/lib/format'
import { useI18n } from '@/i18n'

interface KnowledgeBasePickerProps extends Omit<DropdownMenuProps, 'children'> {
  onFileSelect?: (file: KnowledgeItem) => void
  disabled?: boolean
}

export function KnowledgeBasePicker({
  onFileSelect,
  disabled,
  ...props
}: KnowledgeBasePickerProps) {
  const { lang } = useI18n()

  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadKnowledgeItems = () => {
      try {
        const items = getAllKnowledgeItems()
        // Only show files, not folders
        const fileItems = items.filter((item) => item.type === 'file')
        // Sort by most recently modified
        fileItems.sort(
          (a, b) =>
            new Date(b.lastModified).getTime() -
            new Date(a.lastModified).getTime(),
        )
        setKnowledgeItems(fileItems)
      } catch (error) {
        console.error('Error loading knowledge items:', error)
        setKnowledgeItems([])
      } finally {
        setLoading(false)
      }
    }

    loadKnowledgeItems()
  }, [])

  const handleSelectionChange = (keys: 'all' | Set<React.Key>) => {
    if (keys === 'all') return

    const selectedKey = Array.from(keys)[0] as string
    const item = knowledgeItems.find((item) => item.id === selectedKey)
    if (item && onFileSelect) {
      onFileSelect(item)
    }
  }

  // Group items by file type
  const itemsByType = knowledgeItems.reduce(
    (acc, item) => {
      const fileType = item.fileType || 'text'
      if (!acc[fileType]) {
        acc[fileType] = []
      }
      acc[fileType].push(item)
      return acc
    },
    {} as Record<string, KnowledgeItem[]>,
  )

  const typeNames: Record<string, string> = {
    image: 'Images',
    document: 'Documents',
    text: 'Text Files',
  }

  const typeOrder = ['image', 'document', 'text']
  const orderedTypes = typeOrder.filter((type) => itemsByType[type]?.length > 0)

  const renderPreview = (item: KnowledgeItem) => {
    if (item.fileType === 'image' && item.content?.startsWith('data:image/')) {
      return (
        <Image
          src={item.content}
          alt={item.name}
          className="w-8 h-8 rounded object-cover"
          loading="lazy"
        />
      )
    }

    // For text files, show a text snippet
    if (
      item.fileType === 'text' &&
      item.content &&
      !item.content.startsWith('data:')
    ) {
      const snippet = item.content.substring(0, 50).replace(/\n/g, ' ')
      return (
        <div className="flex flex-col">
          <Icon name={getFileIcon(item.mimeType || '') as any} size="lg" />
          {snippet && (
            <div className="text-xs text-default-500 mt-1 max-w-32 truncate">
              {snippet}...
            </div>
          )}
        </div>
      )
    }

    return <Icon name={getFileIcon(item.mimeType || '') as any} size="lg" />
  }

  if (loading) {
    return (
      <DropdownMenu {...props}>
        <DropdownItem key="loading" isDisabled>
          <div className="flex items-center gap-2">
            <Icon name="Settings" className="animate-spin" size="sm" />
            Loading knowledge base...
          </div>
        </DropdownItem>
      </DropdownMenu>
    )
  }

  if (knowledgeItems.length === 0) {
    return (
      <DropdownMenu {...props}>
        <DropdownItem key="empty" isDisabled>
          <div className="flex items-center gap-2 text-default-500">
            <Icon name="Folder" size="sm" />
            No files in knowledge base
          </div>
        </DropdownItem>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu
      aria-label="Knowledge base file selection"
      selectionMode="single"
      onSelectionChange={handleSelectionChange}
      className="max-w-96 max-h-96 overflow-y-auto"
      {...props}
    >
      {orderedTypes.map((fileType) => (
        <DropdownSection
          key={fileType}
          title={typeNames[fileType]}
          showDivider={orderedTypes.indexOf(fileType) < orderedTypes.length - 1}
        >
          {itemsByType[fileType].slice(0, 10).map((item) => (
            <DropdownItem
              key={item.id}
              startContent={renderPreview(item)}
              endContent={
                <div className="flex items-center gap-1">
                  <Chip size="sm" variant="flat" className="text-xs">
                    {formatBytes(item.size || 0, lang)}
                  </Chip>
                </div>
              }
              description={
                <div className="flex flex-col">
                  <span className="text-xs text-default-500">
                    {item.path.replace(/^\//, '')}
                  </span>
                  <span className="text-xs text-default-400">
                    Modified {new Date(item.lastModified).toLocaleDateString()}
                  </span>
                </div>
              }
              textValue={item.name}
              className="py-2"
            >
              <div className="font-medium truncate max-w-48">{item.name}</div>
            </DropdownItem>
          ))}
        </DropdownSection>
      ))}
    </DropdownMenu>
  )
}
