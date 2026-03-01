import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { QueuedTaskEntry, ApprovalGate } from '@/types'

// Mock queueStore
const mockEntries: QueuedTaskEntry[] = []
const mockUpdateEntry = vi.fn()
const mockGetEntryById = vi.fn()

vi.mock('@/stores/queueStore', () => ({
  useQueueStore: {
    getState: () => ({
      entries: mockEntries,
      getEntryById: mockGetEntryById,
      updateEntry: mockUpdateEntry,
    }),
  },
}))

let approvalGate: typeof import('@/lib/orchestrator/approval-gate')

function createTestEntry(
  overrides: Partial<QueuedTaskEntry> = {},
): QueuedTaskEntry {
  return {
    id: overrides.id ?? `entry-${Date.now()}`,
    prompt: overrides.prompt ?? 'Test prompt',
    priority: overrides.priority ?? 'normal',
    runState: overrides.runState ?? 'queued',
    progress: overrides.progress ?? 0,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    ...overrides,
  }
}

describe('approval-gate', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockEntries.length = 0
    vi.resetModules()

    vi.doMock('@/stores/queueStore', () => ({
      useQueueStore: {
        getState: () => ({
          entries: mockEntries,
          getEntryById: mockGetEntryById,
          updateEntry: mockUpdateEntry,
        }),
      },
    }))

    approvalGate = await import('@/lib/orchestrator/approval-gate')
  })

  describe('createDefaultGates', () => {
    it('should create a single before-execution gate', () => {
      const gates = approvalGate.createDefaultGates()

      expect(gates).toHaveLength(1)
      expect(gates[0].trigger).toBe('before-execution')
      expect(gates[0].status).toBe('pending')
      expect(gates[0].id).toBeDefined()
    })

    it('should auto-approve when policy is always', () => {
      const gates = approvalGate.createDefaultGates('always')

      expect(gates[0].status).toBe('auto-approved')
      expect(gates[0].autoApprovePolicy).toBe('always')
    })
  })

  describe('createComprehensiveGates', () => {
    it('should create three gates without budget', () => {
      const gates = approvalGate.createComprehensiveGates()

      expect(gates).toHaveLength(3)
      expect(gates.map((g) => g.trigger)).toEqual([
        'before-execution',
        'after-decomposition',
        'before-synthesis',
      ])
    })

    it('should create four gates with budget threshold', () => {
      const gates = approvalGate.createComprehensiveGates('never', 50000)

      expect(gates).toHaveLength(4)
      expect(gates[3].trigger).toBe('on-budget-exceed')
      expect(gates[3].budgetThreshold).toBe(50000)
    })

    it('should auto-approve all when policy is always', () => {
      const gates = approvalGate.createComprehensiveGates('always')

      expect(gates.every((g) => g.status === 'auto-approved')).toBe(true)
    })
  })

  describe('checkGate', () => {
    it('should return null when entry has no gates', () => {
      const entry = createTestEntry()
      const result = approvalGate.checkGate(entry, 'before-execution')
      expect(result).toBeNull()
    })

    it('should return null when gate is approved', () => {
      const entry = createTestEntry({
        approvalGates: [
          {
            id: 'g1',
            trigger: 'before-execution',
            status: 'approved',
            autoApprovePolicy: 'never',
          },
        ],
      })

      const result = approvalGate.checkGate(entry, 'before-execution')
      expect(result).toBeNull()
    })

    it('should return null when gate is auto-approved', () => {
      const entry = createTestEntry({
        approvalGates: [
          {
            id: 'g1',
            trigger: 'before-execution',
            status: 'auto-approved',
            autoApprovePolicy: 'always',
          },
        ],
      })

      const result = approvalGate.checkGate(entry, 'before-execution')
      expect(result).toBeNull()
    })

    it('should return the gate when pending with never policy', () => {
      const gate: ApprovalGate = {
        id: 'g1',
        trigger: 'before-execution',
        status: 'pending',
        autoApprovePolicy: 'never',
      }
      const entry = createTestEntry({ approvalGates: [gate] })

      const result = approvalGate.checkGate(entry, 'before-execution')
      expect(result).toBeTruthy()
      expect(result!.id).toBe('g1')
    })

    it('should return null for always policy even when pending', () => {
      const entry = createTestEntry({
        approvalGates: [
          {
            id: 'g1',
            trigger: 'before-execution',
            status: 'pending',
            autoApprovePolicy: 'always',
          },
        ],
      })

      const result = approvalGate.checkGate(entry, 'before-execution')
      expect(result).toBeNull()
    })

    it('should auto-approve under-budget when within threshold', () => {
      const entry = createTestEntry({
        approvalGates: [
          {
            id: 'g1',
            trigger: 'on-budget-exceed',
            status: 'pending',
            autoApprovePolicy: 'under-budget',
            budgetThreshold: 50000,
          },
        ],
      })

      // Under budget
      const result = approvalGate.checkGate(entry, 'on-budget-exceed', 30000)
      expect(result).toBeNull()
    })

    it('should block under-budget when over threshold', () => {
      const entry = createTestEntry({
        approvalGates: [
          {
            id: 'g1',
            trigger: 'on-budget-exceed',
            status: 'pending',
            autoApprovePolicy: 'under-budget',
            budgetThreshold: 50000,
          },
        ],
      })

      const result = approvalGate.checkGate(entry, 'on-budget-exceed', 60000)
      expect(result).toBeTruthy()
    })

    it('should return rejected gate', () => {
      const entry = createTestEntry({
        approvalGates: [
          {
            id: 'g1',
            trigger: 'before-execution',
            status: 'rejected',
            autoApprovePolicy: 'never',
          },
        ],
      })

      const result = approvalGate.checkGate(entry, 'before-execution')
      expect(result).toBeTruthy()
      expect(result!.status).toBe('rejected')
    })
  })

  describe('hasPendingGate', () => {
    it('should return true for pending gate', () => {
      const entry = createTestEntry({
        approvalGates: [
          {
            id: 'g1',
            trigger: 'before-execution',
            status: 'pending',
            autoApprovePolicy: 'never',
          },
        ],
      })

      expect(approvalGate.hasPendingGate(entry, 'before-execution')).toBe(true)
    })

    it('should return false for approved gate', () => {
      const entry = createTestEntry({
        approvalGates: [
          {
            id: 'g1',
            trigger: 'before-execution',
            status: 'approved',
            autoApprovePolicy: 'never',
          },
        ],
      })

      expect(approvalGate.hasPendingGate(entry, 'before-execution')).toBe(false)
    })

    it('should return false when no gates exist', () => {
      const entry = createTestEntry()
      expect(approvalGate.hasPendingGate(entry, 'before-execution')).toBe(false)
    })
  })

  describe('hasRejectedGate', () => {
    it('should return true when a gate is rejected', () => {
      const entry = createTestEntry({
        approvalGates: [
          {
            id: 'g1',
            trigger: 'before-execution',
            status: 'rejected',
            autoApprovePolicy: 'never',
          },
        ],
      })

      expect(approvalGate.hasRejectedGate(entry)).toBe(true)
    })

    it('should return false when no gates are rejected', () => {
      const entry = createTestEntry({
        approvalGates: [
          {
            id: 'g1',
            trigger: 'before-execution',
            status: 'pending',
            autoApprovePolicy: 'never',
          },
        ],
      })

      expect(approvalGate.hasRejectedGate(entry)).toBe(false)
    })
  })

  describe('approveGate', () => {
    it('should update gate status to approved', async () => {
      const entry = createTestEntry({
        id: 'e1',
        approvalGates: [
          {
            id: 'g1',
            trigger: 'before-execution',
            status: 'pending',
            autoApprovePolicy: 'never',
          },
        ],
      })
      mockGetEntryById.mockReturnValue(entry)

      await approvalGate.approveGate('e1', 'g1', 'user-1', 'Looks good')

      expect(mockUpdateEntry).toHaveBeenCalledWith('e1', {
        approvalGates: [
          expect.objectContaining({
            id: 'g1',
            status: 'approved',
            reviewedBy: 'user-1',
            note: 'Looks good',
          }),
        ],
      })
    })
  })

  describe('rejectGate', () => {
    it('should update gate status to rejected and cancel entry', async () => {
      const entry = createTestEntry({
        id: 'e1',
        approvalGates: [
          {
            id: 'g1',
            trigger: 'before-execution',
            status: 'pending',
            autoApprovePolicy: 'never',
          },
        ],
      })
      mockGetEntryById.mockReturnValue(entry)

      await approvalGate.rejectGate('e1', 'g1', 'user-1', 'Too expensive')

      expect(mockUpdateEntry).toHaveBeenCalledWith('e1', {
        approvalGates: [
          expect.objectContaining({
            id: 'g1',
            status: 'rejected',
            reviewedBy: 'user-1',
            note: 'Too expensive',
          }),
        ],
        runState: 'cancelled',
        statusMessage: 'Rejected: Too expensive',
      })
    })
  })

  describe('autoApproveAll', () => {
    it('should auto-approve all gates with always policy', async () => {
      const entry = createTestEntry({
        id: 'e1',
        approvalGates: [
          {
            id: 'g1',
            trigger: 'before-execution',
            status: 'pending',
            autoApprovePolicy: 'always',
          },
          {
            id: 'g2',
            trigger: 'after-decomposition',
            status: 'pending',
            autoApprovePolicy: 'always',
          },
        ],
      })
      mockGetEntryById.mockReturnValue(entry)

      const result = await approvalGate.autoApproveAll('e1')

      expect(result.allApproved).toBe(true)
      expect(mockUpdateEntry).toHaveBeenCalledWith('e1', {
        approvalGates: [
          expect.objectContaining({ id: 'g1', status: 'auto-approved' }),
          expect.objectContaining({ id: 'g2', status: 'auto-approved' }),
        ],
      })
    })

    it('should block gates with never policy', async () => {
      const entry = createTestEntry({
        id: 'e1',
        approvalGates: [
          {
            id: 'g1',
            trigger: 'before-execution',
            status: 'pending',
            autoApprovePolicy: 'never',
          },
        ],
      })
      mockGetEntryById.mockReturnValue(entry)

      const result = await approvalGate.autoApproveAll('e1')

      expect(result.allApproved).toBe(false)
      expect(result.blockedGateId).toBe('g1')
    })

    it('should return allApproved true when no gates exist', async () => {
      const entry = createTestEntry({ id: 'e1' })
      mockGetEntryById.mockReturnValue(entry)

      const result = await approvalGate.autoApproveAll('e1')
      expect(result.allApproved).toBe(true)
    })
  })

  describe('getPendingApprovals', () => {
    it('should return entries with pending gates', () => {
      const e1 = createTestEntry({
        id: 'e1',
        approvalGates: [
          {
            id: 'g1',
            trigger: 'before-execution',
            status: 'pending',
            autoApprovePolicy: 'never',
          },
        ],
      })
      const e2 = createTestEntry({
        id: 'e2',
        approvalGates: [
          {
            id: 'g2',
            trigger: 'before-execution',
            status: 'approved',
            autoApprovePolicy: 'never',
          },
        ],
      })

      mockEntries.push(e1, e2)

      const result = approvalGate.getPendingApprovals()

      expect(result).toHaveLength(1)
      expect(result[0].entry.id).toBe('e1')
      expect(result[0].pendingGates).toHaveLength(1)
    })

    it('should return empty array when no pending gates', () => {
      const e1 = createTestEntry({ id: 'e1' })
      mockEntries.push(e1)

      const result = approvalGate.getPendingApprovals()
      expect(result).toHaveLength(0)
    })
  })
})
