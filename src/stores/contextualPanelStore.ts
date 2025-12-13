import { create } from 'zustand'
import type { IconName } from '@/lib/types'

export interface PanelBlock {
  id: string
  title: string
  icon?: IconName
  content: React.ReactNode
  defaultExpanded?: boolean
  priority?: number // Lower number = higher priority (shown first)
}

interface ContextualPanelState {
  // Panel content
  blocks: PanelBlock[]

  // Block management
  addBlock: (block: PanelBlock) => void
  removeBlock: (blockId: string) => void
  updateBlock: (blockId: string, updates: Partial<PanelBlock>) => void
  setBlocks: (blocks: PanelBlock[]) => void
  clearBlocks: () => void
  hasBlocks: () => boolean
}

export const useContextualPanelStore = create<ContextualPanelState>()(
  (set, get) => ({
    // Initial state
    blocks: [],

    // Block management
    addBlock: (block) =>
      set((state) => {
        // Check if block already exists
        const exists = state.blocks.some((b) => b.id === block.id)
        if (exists) {
          // Update existing block
          return {
            blocks: state.blocks.map((b) =>
              b.id === block.id ? { ...b, ...block } : b,
            ),
          }
        }
        // Add new block and sort by priority
        const newBlocks = [...state.blocks, block].sort(
          (a, b) => (a.priority ?? 999) - (b.priority ?? 999),
        )
        return { blocks: newBlocks }
      }),

    removeBlock: (blockId) =>
      set((state) => ({
        blocks: state.blocks.filter((b) => b.id !== blockId),
      })),

    updateBlock: (blockId, updates) =>
      set((state) => ({
        blocks: state.blocks.map((b) =>
          b.id === blockId ? { ...b, ...updates } : b,
        ),
      })),

    setBlocks: (blocks) => {
      const sortedBlocks = [...blocks].sort(
        (a, b) => (a.priority ?? 999) - (b.priority ?? 999),
      )
      set({ blocks: sortedBlocks })
    },

    clearBlocks: () => {
      if (get().blocks.length > 0) {
        set({ blocks: [] })
      }
    },

    hasBlocks: () => get().blocks.length > 0,
  }),
)
