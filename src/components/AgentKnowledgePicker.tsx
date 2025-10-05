import {
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  CheckboxGroup,
  Chip,
  Input,
  Spinner,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@heroui/react'
import { useState, useEffect, useMemo } from 'react'

import { db } from '@/lib/db'
import { KnowledgeItem } from '@/types'
import { Icon } from '@/components/Icon'
import { formatBytes } from '@/lib/format'
import { useI18n } from '@/i18n'

interface AgentKnowledgePickerProps {
  selectedKnowledgeIds?: string[]
  onSelectionChange: (knowledgeIds: string[]) => void
  className?: string
}

export function AgentKnowledgePicker({
  selectedKnowledgeIds = [],
  onSelectionChange,
  className,
}: AgentKnowledgePickerProps) {
  const { lang } = useI18n()

  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPreview, setSelectedPreview] = useState<KnowledgeItem | null>(
    null,
  )
  const { isOpen, onOpen, onClose } = useDisclosure()

  useEffect(() => {
    loadKnowledgeItems()
  }, [])

  const loadKnowledgeItems = async () => {
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      if (!db.hasStore('knowledgeItems')) {
        setKnowledgeItems([])
        setLoading(false)
        return
      }

      const items = await db.getAll('knowledgeItems')
      // Only show files, not folders
      const fileItems = items.filter((item) => item.type === 'file')
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

  // Filter knowledge items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return knowledgeItems

    const term = searchTerm.toLowerCase()
    return knowledgeItems.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term) ||
        item.tags?.some((tag) => tag.toLowerCase().includes(term)),
    )
  }, [knowledgeItems, searchTerm])

  const getFileIcon = (item: KnowledgeItem) => {
    switch (item.fileType) {
      case 'image':
        return <Icon name="Page" className="w-4 h-4 text-success" />
      case 'document':
        return <Icon name="Document" className="w-4 h-4 text-warning" />
      case 'text':
      default:
        return <Icon name="Page" className="w-4 h-4 text-primary" />
    }
  }

  const handleSelectionChange = (values: string[]) => {
    onSelectionChange(values)
  }

  const handlePreviewItem = (item: KnowledgeItem) => {
    setSelectedPreview(item)
    onOpen()
  }

  const renderPreviewContent = (item: KnowledgeItem) => {
    if (item.fileType === 'image' && item.content?.startsWith('data:image/')) {
      return (
        <div className="text-center">
          <img
            src={item.content}
            alt={item.name}
            className="max-w-full max-h-96 mx-auto rounded-lg"
          />
        </div>
      )
    }

    if (item.content && !item.content.startsWith('data:')) {
      // Text content
      return (
        <div className="bg-default-50 p-4 rounded-lg">
          <pre className="whitespace-pre-wrap text-sm max-h-96 overflow-y-auto">
            {item.content.length > 1000
              ? `${item.content.substring(0, 1000)}…`
              : item.content}
          </pre>
        </div>
      )
    }

    return (
      <div className="text-center text-default-500">
        <Icon name="Page" className="w-12 h-12 mx-auto mb-2" />
        <p>Preview not available for this file type</p>
      </div>
    )
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icon name="Brain" className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Knowledge Base</h3>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex justify-center">
            <Spinner size="lg" />
          </div>
        </CardBody>
      </Card>
    )
  }

  if (knowledgeItems.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icon name="Brain" className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Knowledge Base</h3>
          </div>
        </CardHeader>
        <CardBody>
          <div className="text-center text-default-500 py-8">
            <Icon name="Brain" className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No knowledge items found.</p>
            <p className="text-sm mt-2">
              Add files to your knowledge base first to associate them with this
              agent.
            </p>
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="Brain" className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Knowledge Base</h3>
              <Chip size="sm" variant="flat" color="primary">
                {selectedKnowledgeIds.length} selected
              </Chip>
            </div>
          </div>
          <Input
            placeholder="Search knowledge items…"
            value={searchTerm}
            onValueChange={setSearchTerm}
            startContent={
              <Icon name="PageSearch" className="w-4 h-4 text-default-400" />
            }
            className="mt-2"
          />
        </CardHeader>
        <CardBody className="max-h-80 overflow-y-auto">
          <CheckboxGroup
            value={selectedKnowledgeIds}
            onValueChange={handleSelectionChange}
            className="gap-2"
          >
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-default-50"
              >
                <Checkbox value={item.id} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getFileIcon(item)}
                    <span className="font-medium truncate">{item.name}</span>
                    <Button
                      size="sm"
                      variant="light"
                      onPress={() => handlePreviewItem(item)}
                      className="ml-auto"
                    >
                      Preview
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-default-400">
                      {formatBytes(item.size || 0, lang)}
                    </span>
                    <span className="text-xs text-default-400">
                      {new Date(item.lastModified).toLocaleDateString()}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-sm text-default-600 mt-1 truncate">
                      {item.description}
                    </p>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {item.tags.slice(0, 3).map((tag) => (
                        <Chip
                          key={tag}
                          size="sm"
                          variant="flat"
                          color="default"
                        >
                          {tag}
                        </Chip>
                      ))}
                      {item.tags.length > 3 && (
                        <Chip size="sm" variant="flat" color="default">
                          +{item.tags.length - 3}
                        </Chip>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CheckboxGroup>
        </CardBody>
      </Card>

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-2">
              {selectedPreview && getFileIcon(selectedPreview)}
              {selectedPreview?.name}
            </div>
          </ModalHeader>
          <ModalBody>
            {selectedPreview && (
              <div className="space-y-4">
                {selectedPreview.description && (
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-default-600">
                      {selectedPreview.description}
                    </p>
                  </div>
                )}
                <div>
                  <h4 className="font-semibold mb-2">Content</h4>
                  {renderPreviewContent(selectedPreview)}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Size:</span>{' '}
                    {formatBytes(selectedPreview.size || 0, lang)}
                  </div>
                  <div>
                    <span className="font-medium">Modified:</span>{' '}
                    {new Date(selectedPreview.lastModified).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span>{' '}
                    {selectedPreview.fileType || 'text'}
                  </div>
                  <div>
                    <span className="font-medium">MIME:</span>{' '}
                    {selectedPreview.mimeType || 'N/A'}
                  </div>
                </div>
                {selectedPreview.tags && selectedPreview.tags.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Tags</h4>
                    <div className="flex gap-1 flex-wrap">
                      {selectedPreview.tags.map((tag) => (
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
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onPress={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
