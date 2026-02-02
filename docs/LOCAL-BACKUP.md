# Local Backup Feature

The Local Backup feature provides automatic, bidirectional synchronization between DEVS's IndexedDB database and a local file system folder. This ensures your data remains accessible, portable, and under your complete control.

## Overview

```mermaid
graph LR
    A[IndexedDB] <--> B[Folder Sync Service]
    B <--> C[Local Folder]
    C --> D[Markdown Files]
    C --> E[JSON Export]

    subgraph "File Types"
        D --> D1[agents/*.agent.md]
        D --> D2[conversations/*.md]
        D --> D3[memories/{agentId}/*.md]
        D --> D4[knowledge/*.md]
        D --> D5[tasks/*.md]
        E --> E1[devs-database-export.json]
    end
```

## Key Features

- **Bidirectional Sync**: Changes flow both ways—edit files locally or in DEVS
- **Live Sync on Changes**: Automatic backup when data changes (2-second debounce)
- **File Change Detection**: Periodic polling (30 seconds) for external file changes
- **Conflict Resolution**: Last-write-wins strategy based on timestamps
- **Human-Readable Format**: Markdown files with YAML frontmatter
- **Full Database Export**: Complete JSON backup for disaster recovery
- **Privacy-First**: All data stays on your device—no cloud services
- **Credential Portability**: Encrypted API keys can be restored depending on encryption mode (see [Credential Portability](#credential-portability))

## Architecture

### Directory Structure

```
src/features/local-backup/
├── index.ts                    # Public API exports
├── components/
│   ├── FolderSyncSettings.tsx  # Settings UI component
│   └── LocalBackupButton.tsx   # Quick action button
├── hooks/
│   └── useAutoBackup.ts        # Auto-backup on data changes
├── lib/
│   ├── local-backup-service.ts # Core sync service
│   ├── utils.ts                # YAML/Markdown utilities
│   └── serializers/
│       ├── types.ts            # Serializer interfaces
│       ├── agent-serializer.ts
│       ├── conversation-serializer.ts
│       ├── memory-serializer.ts
│       ├── knowledge-serializer.ts
│       └── task-serializer.ts
├── stores/
│   └── folderSyncStore.ts      # Zustand state management
├── types/
│   └── file-system.d.ts        # File System Access API types
└── i18n/
    └── index.ts                # Feature translations
```

### Core Components

#### FolderSyncService

The central orchestrator managing all sync operations:

```typescript
class FolderSyncService {
  // Initialize with a directory handle
  async initialize(
    directoryHandle: FileSystemDirectoryHandle,
    options?: {
      syncAgents?: boolean
      syncConversations?: boolean
      syncMemories?: boolean
      syncKnowledge?: boolean
      syncTasks?: boolean
      syncFullExport?: boolean
    },
  ): Promise<FolderSyncConfig>

  // Sync database → files
  async syncToFiles(): Promise<void>

  // Sync files → database
  async syncFromFiles(): Promise<void>

  // Subscribe to sync events
  onSyncEvent(callback: SyncEventCallback): () => void

  // Debounced write for real-time sync
  writeEntityDebounced<T>(entity: T, serializer: Serializer<T>): void

  // Delete file when entity is deleted
  async deleteEntityFile<T>(entity: T, serializer: Serializer<T>): Promise<void>
}
```

#### Serializers

Each entity type has a dedicated serializer implementing the `Serializer<T>` interface:

```typescript
interface Serializer<T> {
  serialize(entity: T): SerializedFile
  deserialize(
    content: string,
    filename: string,
    metadata?: FileMetadata,
  ): T | null
  getDirectory(): string
  getExtension(): string
  getFilename(entity: T): string
}
```

| Serializer               | Directory             | Extension                                | Description                            |
| ------------------------ | --------------------- | ---------------------------------------- | -------------------------------------- |
| `agentSerializer`        | `agents/`             | `.agent.md`                              | Custom agent definitions               |
| `conversationSerializer` | `conversations/`      | `.md`                                    | Chat history with messages             |
| `memorySerializer`       | `memories/{agentId}/` | `.md`                                    | Agent learned memories                 |
| `knowledgeSerializer`    | `knowledge/{path}/`   | `.*.metadata.knowledge.md` + binary file | Knowledge base items (metadata hidden) |
| `taskSerializer`         | `tasks/`              | `.md`                                    | Workflow tasks                         |

### File Format

Files use Markdown with YAML frontmatter for human-readability:

```markdown
---
id: einstein
name: Albert Einstein
icon: LightBulbOn
role: Physicist & Philosopher
temperature: 0.7
tags:
  - science
  - physics
createdAt: 2025-01-10T10:30:00.000Z
updatedAt: 2025-01-10T14:20:00.000Z
---

You are Albert Einstein, the renowned theoretical physicist...

## Examples

### Quick question

> Explain relativity in simple terms
```

### Knowledge Item Format

Knowledge items are saved as two separate files to preserve the original binary content:

1. **Metadata file** (`.*.metadata.knowledge.md`) - Hidden file with YAML frontmatter and optional transcript
2. **Binary file** (original extension, e.g., `.pdf`, `.png`, `.docx`) - Contains the actual file content

Example structure:

```text
knowledge/
├── documents/
│   ├── .project-readme-abc123.metadata.knowledge.md
│   ├── project-readme-abc123.md
│   ├── .annual-report-def456.metadata.knowledge.md
│   └── annual-report-def456.pdf
└── images/
    ├── .logo-ghi789.metadata.knowledge.md
    └── logo-ghi789.png
```

**Metadata file format:**

```markdown
---
id: doc-xyz789
name: Annual Report 2025
type: file
fileType: document
mimeType: application/pdf
size: 1234567
path: /documents
binaryFile: annual-report-def456.pdf
lastModified: 2025-01-10T10:30:00.000Z
createdAt: 2025-01-10T10:30:00.000Z
tags:
  - reports
  - finance
description: Annual financial report for 2025
hasTranscript: true
---

## Transcript

Extracted text content from the PDF document...
```

The `binaryFile` field in the metadata references the companion binary file in the same directory. For text-based files (`.txt`, `.md`, `.json`, etc.), the binary file contains the raw text content. For binary files (images, PDFs, etc.), the content is stored as-is.

### State Management

The `useFolderSyncStore` Zustand store manages:

- **Sync State**: `isEnabled`, `isInitializing`, `isSyncing`, `lastSync`
- **Configuration**: `basePath`, `syncAgents`, `syncConversations`, etc.
- **Activity Tracking**: `recentEvents` (last 50 events)
- **Error Handling**: `error` state with `clearError` action

```typescript
interface FolderSyncState {
  isEnabled: boolean
  isInitializing: boolean
  isSyncing: boolean
  lastSync: Date | null
  syncStats: SyncStats | null
  error: string | null
  basePath: string | null

  // Sync toggles
  syncAgents: boolean
  syncConversations: boolean
  syncMemories: boolean
  syncKnowledge: boolean
  syncTasks: boolean
  syncFullExport: boolean

  // Actions
  enableSync: (handle: FileSystemDirectoryHandle, options?) => Promise<void>
  disableSync: () => void
  triggerSync: () => Promise<void>
  updateSyncOptions: (options) => Promise<void>
  reconnect: (handle: FileSystemDirectoryHandle) => Promise<void>
}
```

### Auto-Backup Hook

The `useAutoBackup` hook subscribes to Y.js shared data maps for instant reactivity:

```typescript
export function useAutoBackup(): void {
  // Subscribes to:
  // - agentsMap.observeDeep()
  // - conversationsMap.observeDeep()
  // - memoriesMap.observeDeep()
  // - knowledgeMap.observeDeep()
  // - tasksMap.observeDeep()
  // Triggers debounced sync (2 seconds) on any change
}
```

## Credential Portability

Local backups include encrypted LLM provider credentials. Whether these credentials can be restored depends on your encryption mode:

### Sync Mode Backups (Portable)

If sync was enabled when the backup was created:
- Credentials are encrypted with your room password
- ✅ Restore on any device by enabling sync with the same password
- ✅ Restore on same device after browser data clear
- The backup metadata includes `encryptionMode: 'sync'`

### Local Mode Backups (Non-Portable)

If sync was disabled when the backup was created:
- Credentials are encrypted with a device-specific key
- ❌ Cannot restore on a different device
- ❌ Cannot restore after clearing browser data
- The backup metadata includes `encryptionMode: 'local'`

### Restoring Backups

When importing a backup:

| Backup Mode | Current Mode | Result |
|-------------|--------------|--------|
| `sync` | `sync` (same password) | ✅ Credentials restored |
| `sync` | `sync` (different password) | ❌ Credentials fail to decrypt |
| `sync` | `local` | ⚠️ Prompt to enable sync |
| `local` | Any | ⚠️ Credentials skipped - must reconfigure |

### Best Practices

1. **Enable sync before backing up** if you want portable credentials
2. **Document your room password** securely (password manager recommended)
3. **Test restores** on a secondary device before relying on backups
4. **Export settings separately** - LLM provider URLs and model selections restore; only API keys need reconfiguration

## Usage

### Enabling Local Backup

```typescript
import { useLocalBackupStore } from '@/features/local-backup'

function MyComponent() {
  const { enableSync, isEnabled } = useLocalBackupStore()

  const handleSelectFolder = async () => {
    const directoryHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents',
    })

    await enableSync(directoryHandle, {
      syncAgents: true,
      syncConversations: true,
      syncMemories: true,
      syncKnowledge: true,
      syncTasks: true,
      syncFullExport: true,
    })
  }
}
```

### Subscribing to Sync Events

```typescript
import { localBackupService } from '@/features/local-backup'

const unsubscribe = localBackupService.onSyncEvent((event) => {
  switch (event.type) {
    case 'sync_start':
      console.log('Sync started')
      break
    case 'sync_complete':
      console.log('Sync completed')
      break
    case 'file_written':
      console.log(`Wrote: ${event.filename}`)
      break
    case 'file_read':
      console.log(`Read: ${event.filename}`)
      break
    case 'file_deleted':
      console.log(`Deleted: ${event.filename}`)
      break
    case 'sync_error':
      console.error(`Error: ${event.error}`)
      break
  }
})
```

### Using the Settings Component

```tsx
import { LocalBackupSettings } from '@/features/local-backup'

function SettingsPage() {
  return (
    <div>
      <h2>Local Backup</h2>
      <LocalBackupSettings />
    </div>
  )
}
```

## Sync Events

| Event Type      | Description              | Properties                           |
| --------------- | ------------------------ | ------------------------------------ |
| `sync_start`    | Sync operation began     | `timestamp`                          |
| `sync_complete` | Sync operation finished  | `timestamp`                          |
| `file_written`  | File was written to disk | `entityType`, `entityId`, `filename` |
| `file_read`     | File was read from disk  | `entityType`, `entityId`, `filename` |
| `file_deleted`  | File was deleted         | `entityType`, `entityId`, `filename` |
| `sync_error`    | Error during sync        | `error`                              |

## Configuration Options

| Option              | Default | Description                      |
| ------------------- | ------- | -------------------------------- |
| `syncAgents`        | `true`  | Backup custom agents             |
| `syncConversations` | `true`  | Backup chat history              |
| `syncMemories`      | `true`  | Backup agent memories            |
| `syncKnowledge`     | `true`  | Backup knowledge base files      |
| `syncTasks`         | `true`  | Backup workflow tasks            |
| `syncFullExport`    | `true`  | Export complete database as JSON |

## Technical Details

### File System Access API

Uses the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) for secure folder access:

- Requires explicit user permission (`readwrite` mode)
- Directory handles are stored in IndexedDB for reconnection
- Permission persists across sessions (browser-dependent)

### Change Detection

- **Hash-Based**: SHA-256 content hashing prevents redundant writes
- **Timestamp Comparison**: File metadata used for conflict resolution
- **Debouncing**: 1-second debounce for write operations, 2-second for auto-backup

### Timing Constants

```typescript
const WRITE_DEBOUNCE_MS = 1000 // Debounce individual writes
const SYNC_INTERVAL_MS = 30000 // Check for file changes
const AUTO_BACKUP_DEBOUNCE_MS = 2000 // Debounce auto-backup
```

## Browser Compatibility

The File System Access API is required. Supported browsers:

- ✅ Chrome 86+
- ✅ Edge 86+
- ✅ Opera 72+
- ❌ Firefox (not supported)
- ❌ Safari (not supported)

The feature gracefully degrades—UI checks for API availability before rendering.

## Security Considerations

- **No Cloud Uploads**: All data remains on the user's device
- **Permission-Based**: Explicit user consent required for folder access
- **Read/Write Isolation**: Only accesses the selected folder
- **No External Network**: Zero network requests for backup operations

## Use Cases

1. **Disaster Recovery**: Full JSON export provides complete database backup
2. **Version Control**: Sync to a Git repository for history tracking
3. **External Editing**: Edit agent prompts in your favorite text editor
4. **Cross-Device Sync**: Use cloud storage folders (Dropbox, iCloud, etc.)
5. **Data Portability**: Human-readable Markdown files are vendor-agnostic

## Public API

```typescript
// Components
export { LocalBackupSettings } from './components/FolderSyncSettings'
export { LocalBackupButton } from './components/LocalBackupButton'

// Hooks
export { useAutoBackup } from './hooks/useAutoBackup'

// Store
export {
  useLocalBackupStore,
  tryReconnectLocalBackup,
} from './stores/folderSyncStore'

// Service
export {
  localBackupService,
  agentSerializer,
  conversationSerializer,
  memorySerializer,
  knowledgeSerializer,
  taskSerializer,
  type LocalBackupConfig,
  type LocalBackupEvent,
} from './lib/local-backup-service'

// Types
export type { SerializedFile, Serializer } from './lib/serializers/types'

// i18n
export { localBackupI18n } from './i18n'
```

## Future Enhancements

- [ ] Selective file restore from backup
- [ ] Backup scheduling (hourly, daily, weekly)
- [ ] Compression for large knowledge bases
- [ ] Encrypted backup option
- [ ] Conflict resolution UI for manual intervention
- [ ] Firefox/Safari support via IndexedDB file export
