import { type DropdownMenuProps, Chip, Dropdown } from '@/components/heroui-compat'
import { useState, useEffect } from 'react'

import { Icon } from './Icon'
import { getFileIcon } from '@/lib/utils'
import { getAllKnowledgeItems } from '@/stores/knowledgeStore'
import { KnowledgeItem } from '@/types'
import { formatBytes } from '@/lib/format'
import { safeString } from '@/lib/crypto/content-encryption'
import { useI18n } from '@/i18n'

interface KnowledgeBasePickerProps extends Omit<DropdownMenuProps<object>, 'children'> {
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

  // @ts-expect-error temporarily unused after v3 migration
  const _renderPreview = (item: KnowledgeItem) => {
    const contentStr = safeString(item.content)
    if (item.fileType === 'image' && contentStr.startsWith('data:image/')) {
      return (
        <img
          src={contentStr}
          alt={item.name}
          className="w-8 h-8 rounded object-cover"
          loading="lazy"
        />
      )
    }

    // For text files, show a text snippet
    if (
      item.fileType === 'text' &&
      contentStr &&
      !contentStr.startsWith('data:')
    ) {
      const snippet = contentStr.substring(0, 50).replace(/\n/g, ' ')
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
      <Dropdown.Menu {...props}>
        <Dropdown.Item id="loading" isDisabled>
          <div className="flex items-center gap-2">
            <Icon name="Settings" className="animate-spin" size="sm" />
            Loading knowledge base...
          </div>
        </Dropdown.Item>
      </Dropdown.Menu>
    )
  }

  if (knowledgeItems.length === 0) {
    return (
      <Dropdown.Menu {...props}>
        <Dropdown.Item id="empty" isDisabled>
          <div className="flex items-center gap-2 text-default-500">
            <Icon name="Folder" size="sm" />
            No files in knowledge base
          </div>
        </Dropdown.Item>
      </Dropdown.Menu>
    )
  }

  return (
    <Dropdown.Menu
      aria-label="Knowledge base file selection"
      selectionMode="single"
      onSelectionChange={handleSelectionChange}
      className="max-w-96 max-h-96 overflow-y-auto"
      {...props}
    >
      {orderedTypes.map((fileType) => (
        <Dropdown.Section
          key={fileType}
          title={typeNames[fileType]}
          showDivider={orderedTypes.indexOf(fileType) < orderedTypes.length - 1}
        >
          {itemsByType[fileType].slice(0, 10).map((item) => (
            <Dropdown.Item
              id={item.id}
              endContent={
                <div className="flex items-center gap-1">
                  <Chip size="sm" variant="soft" className="text-xs">
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
            </Dropdown.Item>
          ))}
        </Dropdown.Section>
      ))}
    </Dropdown.Menu>
  )
}
