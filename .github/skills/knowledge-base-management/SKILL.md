---
name: knowledge-base-management
description: Guide for working with the Knowledge Base system in DEVS. Use this when asked to add knowledge management features, file handling, or document processing.
---

# Knowledge Base Management for DEVS

The Knowledge Base system allows users to store and manage files, documents, and other knowledge items that agents can reference during conversations.

## Core Concepts

### KnowledgeItem Interface

```typescript
interface KnowledgeItem {
  id: string
  name: string
  type: 'file' | 'folder'
  fileType?: 'document' | 'image' | 'text'
  content?: string // Text content or base64 for files
  contentHash?: string // SHA-256 hash for deduplication
  mimeType?: string
  size?: number
  path: string // Virtual path in knowledge base
  parentId?: string // Parent folder ID
  lastModified: Date
  createdAt: Date
  tags?: string[]
  description?: string
  syncSource?: 'manual' | 'filesystem_api' | 'connector'
  fileSystemHandle?: string // For File System API sync
  watchId?: string
  lastSyncCheck?: Date
}
```

## File Type Detection

Supported file types in `src/lib/knowledge-utils.ts`:

```typescript
const TEXT_EXTENSIONS = [
  '.txt',
  '.md',
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.css',
  '.html',
  '.xml',
  '.csv',
  '.yaml',
  '.yml',
  '.log',
]

const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.webp',
  '.svg',
  '.ico',
  '.tiff',
  '.tif',
]

const DOCUMENT_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.rtf',
  '.epub',
]

function getFileType(
  filename: string,
): 'text' | 'image' | 'document' | 'unknown' {
  const ext = filename.toLowerCase().split('.').pop()
  if (TEXT_EXTENSIONS.includes(`.${ext}`)) return 'text'
  if (IMAGE_EXTENSIONS.includes(`.${ext}`)) return 'image'
  if (DOCUMENT_EXTENSIONS.includes(`.${ext}`)) return 'document'
  return 'unknown'
}
```

## Database Operations

```typescript
import { db } from '@/lib/db'

// Create knowledge item
async function createKnowledgeItem(
  item: Omit<KnowledgeItem, 'id'>,
): Promise<string> {
  const id = crypto.randomUUID()
  await db.knowledge.add({ ...item, id })
  return id
}

// Get items by path
async function getItemsByPath(path: string): Promise<KnowledgeItem[]> {
  return db.knowledge.where('path').startsWith(path).toArray()
}

// Get folder contents
async function getFolderContents(folderId?: string): Promise<KnowledgeItem[]> {
  if (folderId) {
    return db.knowledge.where('parentId').equals(folderId).toArray()
  }
  return db.knowledge.filter((item) => !item.parentId).toArray()
}

// Search by content hash (deduplication)
async function findDuplicate(
  contentHash: string,
): Promise<KnowledgeItem | undefined> {
  return db.knowledge.where('contentHash').equals(contentHash).first()
}
```

## Content Hashing for Deduplication

```typescript
async function generateContentHash(
  content: string | ArrayBuffer,
): Promise<string> {
  const data =
    typeof content === 'string'
      ? new TextEncoder().encode(content)
      : new Uint8Array(content)

  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
```

## File Upload Handling

```typescript
async function handleFileUpload(
  file: File,
  parentId?: string,
): Promise<KnowledgeItem> {
  const content = await readFileContent(file)
  const contentHash = await generateContentHash(content)

  // Check for duplicates
  const existing = await findDuplicate(contentHash)
  if (existing) {
    toast.info('File already exists in knowledge base')
    return existing
  }

  const item: KnowledgeItem = {
    id: crypto.randomUUID(),
    name: file.name,
    type: 'file',
    fileType: getFileType(file.name),
    content: typeof content === 'string' ? content : btoa(content),
    contentHash,
    mimeType: file.type,
    size: file.size,
    path: parentId ? `${getPath(parentId)}/${file.name}` : `/${file.name}`,
    parentId,
    lastModified: new Date(file.lastModified),
    createdAt: new Date(),
    syncSource: 'manual',
  }

  await db.knowledge.add(item)
  return item
}

async function readFileContent(file: File): Promise<string | ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    if (file.type.startsWith('text/') || getFileType(file.name) === 'text') {
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    } else {
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    }
  })
}
```

## Folder Watching (File System API)

```typescript
import { db } from '@/lib/db'

async function watchFolder(handle: FileSystemDirectoryHandle): Promise<void> {
  // Request permission
  const permission = await handle.requestPermission({ mode: 'read' })
  if (permission !== 'granted') {
    throw new Error('Permission denied')
  }

  // Scan and sync folder
  await syncFolder(handle, undefined)

  // Store handle for persistence
  await db.knowledge.add({
    id: crypto.randomUUID(),
    name: handle.name,
    type: 'folder',
    path: `/${handle.name}`,
    createdAt: new Date(),
    lastModified: new Date(),
    syncSource: 'filesystem_api',
    fileSystemHandle: handle.name,
  })
}

async function syncFolder(
  handle: FileSystemDirectoryHandle,
  parentId?: string,
): Promise<void> {
  for await (const entry of handle.values()) {
    if (entry.kind === 'file') {
      const file = await entry.getFile()
      await handleFileUpload(file, parentId)
    } else if (entry.kind === 'directory') {
      // Create folder and recurse
      const folderId = await createFolder(entry.name, parentId)
      await syncFolder(entry, folderId)
    }
  }
}
```

## Context Injection for Agents

When agents need knowledge context:

```typescript
import { db } from '@/lib/db'

async function getRelevantKnowledge(
  query: string,
  agentId: string,
): Promise<KnowledgeItem[]> {
  // Get agent's assigned knowledge items
  const agentKnowledge = await getAgentKnowledge(agentId)

  // Search for relevant items
  const searchTerms = query.toLowerCase().split(' ')

  return agentKnowledge.filter((item) => {
    const searchText =
      `${item.name} ${item.description || ''} ${item.tags?.join(' ') || ''}`.toLowerCase()
    return searchTerms.some((term) => searchText.includes(term))
  })
}

function formatKnowledgeForContext(items: KnowledgeItem[]): string {
  return items
    .map((item) => {
      return `## ${item.name}
${item.description || ''}
${item.content || '[Binary content]'}
---`
    })
    .join('\n\n')
}
```

## Document Processing

For processing different document types:

```typescript
// src/lib/document-processor.ts
export async function processDocument(item: KnowledgeItem): Promise<string> {
  switch (item.fileType) {
    case 'text':
      return item.content || ''

    case 'document':
      return await extractTextFromDocument(item)

    case 'image':
      // Could use OCR or image description
      return `[Image: ${item.name}]`

    default:
      return `[Unsupported file type: ${item.mimeType}]`
  }
}
```

## Component Integration

```tsx
import { useCallback, useState } from 'react'
import { Button, Card, Progress } from '@heroui/react'
import { Icon } from '@/components/Icon'
import { toast } from '@/lib/toast'

function KnowledgeUploader() {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)

    setIsUploading(true)
    setProgress(0)

    for (let i = 0; i < files.length; i++) {
      await handleFileUpload(files[i])
      setProgress(((i + 1) / files.length) * 100)
    }

    setIsUploading(false)
    toast.success(`Uploaded ${files.length} files`)
  }, [])

  return (
    <Card
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-dashed border-2 p-8 text-center"
    >
      <Icon name="Upload" size={48} className="mx-auto mb-4" />
      <p>Drop files here to upload</p>
      {isUploading && <Progress value={progress} className="mt-4" />}
    </Card>
  )
}
```

## Testing

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from '@/lib/db'

vi.mock('@/lib/db')

describe('Knowledge Base', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should detect file types correctly', () => {
    expect(getFileType('document.md')).toBe('text')
    expect(getFileType('image.png')).toBe('image')
    expect(getFileType('file.pdf')).toBe('document')
    expect(getFileType('data.bin')).toBe('unknown')
  })

  it('should generate consistent content hashes', async () => {
    const content = 'test content'
    const hash1 = await generateContentHash(content)
    const hash2 = await generateContentHash(content)
    expect(hash1).toBe(hash2)
  })

  it('should detect duplicates', async () => {
    const hash = 'abc123'
    vi.mocked(db.knowledge.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'existing' }),
      }),
    } as any)

    const result = await findDuplicate(hash)
    expect(result).toEqual({ id: 'existing' })
  })
})
```
