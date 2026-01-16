---
name: indexeddb-operations
description: Guide for working with IndexedDB database operations in the DEVS platform. Use this when asked to add database tables, modify schemas, or work with data persistence.
---

# IndexedDB Operations for DEVS

DEVS uses Dexie.js as a wrapper around IndexedDB for all client-side data persistence. The database is defined in `src/lib/db/index.ts`.

## Database Structure

```typescript
import Dexie, { Table } from 'dexie'

class DevsDatabase extends Dexie {
  agents!: Table<Agent>
  tasks!: Table<Task>
  conversations!: Table<Conversation>
  artifacts!: Table<Artifact>
  knowledge!: Table<KnowledgeItem>
  memories!: Table<AgentMemoryEntry>
  // ... other tables

  constructor() {
    super('devs-db')

    this.version(1).stores({
      agents: 'id, slug, name, *tags, createdAt, deletedAt',
      tasks: 'id, workflowId, status, assignedAgentId, createdAt',
      conversations: 'id, agentId, workflowId, timestamp, updatedAt',
      artifacts: 'id, taskId, agentId, type, createdAt',
      knowledge: 'id, path, parentId, type, createdAt, contentHash',
      memories: 'id, agentId, category, validationStatus, learnedAt',
    })
  }
}

export const db = new DevsDatabase()
```

## Index Syntax

Dexie index syntax:

- `id` - Primary key
- `field` - Indexed field for queries
- `*field` - Multi-entry index (for arrays like tags)
- `[field1+field2]` - Compound index
- `&field` - Unique index

## Basic CRUD Operations

### Create

```typescript
import { db } from '@/lib/db'

// Add single item
const id = await db.agents.add({
  id: crypto.randomUUID(),
  name: 'New Agent',
  slug: 'new-agent',
  role: 'Assistant',
  instructions: '...',
  createdAt: new Date(),
})

// Add multiple items
await db.agents.bulkAdd([agent1, agent2, agent3])
```

### Read

```typescript
import { db } from '@/lib/db'

// Get by primary key
const agent = await db.agents.get('agent-id')

// Get all items
const allAgents = await db.agents.toArray()

// Query with where clause
const activeAgents = await db.agents
  .where('deletedAt')
  .equals(undefined)
  .toArray()

// Query with filter
const devAgents = await db.agents
  .filter((agent) => agent.tags?.includes('developer'))
  .toArray()

// Query with compound conditions
const recentTasks = await db.tasks
  .where('status')
  .equals('completed')
  .and((task) => task.completedAt > lastWeek)
  .toArray()

// Order results
const sortedConversations = await db.conversations
  .orderBy('updatedAt')
  .reverse()
  .limit(10)
  .toArray()
```

### Update

```typescript
import { db } from '@/lib/db'

// Update by primary key
await db.agents.update('agent-id', {
  name: 'Updated Name',
  updatedAt: new Date(),
})

// Update with function
await db.agents.update('agent-id', (agent) => {
  agent.name = 'Updated Name'
  agent.updatedAt = new Date()
})

// Bulk update
await db.agents.bulkPut(updatedAgents)

// Update where condition matches
await db.tasks.where('status').equals('pending').modify({ status: 'cancelled' })
```

### Delete

```typescript
import { db } from '@/lib/db'

// Delete by primary key
await db.agents.delete('agent-id')

// Bulk delete
await db.agents.bulkDelete(['id1', 'id2', 'id3'])

// Delete where condition matches
await db.tasks.where('status').equals('cancelled').delete()

// Clear entire table
await db.tasks.clear()
```

## Soft Deletes

DEVS uses soft deletes for agents (and potentially other entities):

```typescript
// Soft delete
await db.agents.update('agent-id', {
  deletedAt: new Date(),
})

// Query non-deleted items
const activeAgents = await db.agents
  .filter((agent) => !agent.deletedAt)
  .toArray()

// Restore soft-deleted item
await db.agents.update('agent-id', {
  deletedAt: undefined,
})
```

## Transactions

For operations that must be atomic:

```typescript
import { db } from '@/lib/db'

await db.transaction('rw', [db.tasks, db.artifacts], async () => {
  const task = await db.tasks.get(taskId)
  if (!task) throw new Error('Task not found')

  await db.tasks.update(taskId, { status: 'completed' })
  await db.artifacts.add({
    id: crypto.randomUUID(),
    taskId,
    type: 'deliverable',
    content: '...',
    createdAt: new Date(),
  })
})
```

## Schema Migrations

When adding new tables or modifying schemas:

```typescript
class DevsDatabase extends Dexie {
  constructor() {
    super('devs-db')

    // Original schema
    this.version(1).stores({
      agents: 'id, slug, name, *tags',
    })

    // Add new table
    this.version(2).stores({
      agents: 'id, slug, name, *tags',
      newTable: 'id, field1, field2', // New table
    })

    // Modify existing table (add index)
    this.version(3).stores({
      agents: 'id, slug, name, *tags, createdAt', // Added createdAt index
      newTable: 'id, field1, field2',
    })

    // Data migration
    this.version(4)
      .stores({
        agents: 'id, slug, name, *tags, createdAt',
      })
      .upgrade((tx) => {
        // Migrate data
        return tx
          .table('agents')
          .toCollection()
          .modify((agent) => {
            if (!agent.createdAt) {
              agent.createdAt = new Date()
            }
          })
      })
  }
}
```

## Database Initialization Check

Always check if the database is ready before operations at app startup:

```typescript
import { db } from '@/lib/db'

async function loadData() {
  // Ensure database is open
  if (!db.isOpen()) {
    await db.open()
  }

  const agents = await db.agents.toArray()
  return agents
}
```

## Live Queries (React Integration)

Use Dexie's `useLiveQuery` for reactive updates:

```typescript
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'

function AgentList() {
  // Auto-updates when data changes
  const agents = useLiveQuery(
    () => db.agents.where('deletedAt').equals(undefined).toArray(),
    [] // dependencies
  )

  if (!agents) return <Spinner />

  return (
    <ul>
      {agents.map(agent => (
        <li key={agent.id}>{agent.name}</li>
      ))}
    </ul>
  )
}
```

## Error Handling

```typescript
import { db } from '@/lib/db'
import { toast } from '@/lib/toast'

async function safeDbOperation() {
  try {
    await db.agents.add(newAgent)
  } catch (error) {
    if (error.name === 'ConstraintError') {
      toast.error('Agent with this ID already exists')
    } else if (error.name === 'QuotaExceededError') {
      toast.error('Storage quota exceeded')
    } else {
      console.error('Database error:', error)
      toast.error('Failed to save data')
    }
  }
}
```

## Performance Tips

1. **Use indexes**: Only query on indexed fields for performance
2. **Limit results**: Use `.limit()` when you don't need all records
3. **Batch operations**: Use `bulkAdd`, `bulkPut`, `bulkDelete` for multiple items
4. **Avoid large transactions**: Split large operations to prevent blocking
5. **Use compound indexes**: For queries on multiple fields together
