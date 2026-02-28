import { create } from 'zustand'
import type { KnowledgeItem, Artifact } from '@/types'
import type { CodeBlockType } from '@/components/Widget/Widget'
import type { SourceInfo } from '@/components/InlineSource/InlineSource'

// ============================================================================
// Inspector Panel Item Types
// ============================================================================

export interface InspectorItemArtifact {
  type: 'artifact'
  artifact: Artifact
}

export interface InspectorItemWidget {
  type: 'widget'
  code: string
  widgetType: CodeBlockType
  language?: string
  title?: string
  /** Stable ID linking this inspector item to its source widget so live
   *  streaming updates are forwarded automatically. */
  widgetId?: string
}

export interface InspectorItemSource {
  type: 'source'
  source: SourceInfo
  knowledgeItem?: KnowledgeItem
}

export interface InspectorItemKnowledge {
  type: 'knowledge'
  item: KnowledgeItem
}

export type InspectorItem =
  | InspectorItemArtifact
  | InspectorItemWidget
  | InspectorItemSource
  | InspectorItemKnowledge

// ============================================================================
// Store
// ============================================================================

interface InspectorPanelState {
  /** Currently inspected item, or null if panel is closed */
  item: InspectorItem | null

  /** History stack for back navigation */
  history: InspectorItem[]

  /** Open an item in the inspector panel */
  open: (item: InspectorItem) => void

  /** Close the inspector panel */
  close: () => void

  /** Go back to the previous item */
  goBack: () => void

  /** Check if the panel is open */
  isOpen: () => boolean

  /** Update the code of a live-shared widget (no-op when the current item
   *  is not a widget or does not match the given widgetId). */
  updateLiveWidget: (
    widgetId: string,
    data: { code: string; widgetType?: CodeBlockType; language?: string },
  ) => void
}

export const useInspectorPanelStore = create<InspectorPanelState>()(
  (set, get) => ({
    item: null,
    history: [],

    open: (item) =>
      set((state) => {
        const history = state.item
          ? [...state.history, state.item]
          : state.history
        return { item, history }
      }),

    close: () => set({ item: null, history: [] }),

    goBack: () =>
      set((state) => {
        if (state.history.length === 0) {
          return { item: null, history: [] }
        }
        const history = [...state.history]
        const previous = history.pop()!
        return { item: previous, history }
      }),

    isOpen: () => get().item !== null,

    updateLiveWidget: (widgetId, data) =>
      set((state) => {
        if (
          !state.item ||
          state.item.type !== 'widget' ||
          state.item.widgetId !== widgetId
        ) {
          return state
        }
        return {
          item: {
            ...state.item,
            code: data.code,
            ...(data.widgetType !== undefined && {
              widgetType: data.widgetType,
            }),
            ...(data.language !== undefined && { language: data.language }),
          },
        }
      }),
  }),
)

// ============================================================================
// Convenience helpers (importable in non-React contexts)
// ============================================================================

export const openInspector = (item: InspectorItem) =>
  useInspectorPanelStore.getState().open(item)

export const closeInspector = () => useInspectorPanelStore.getState().close()

export const updateLiveWidget = (
  widgetId: string,
  data: { code: string; widgetType?: CodeBlockType; language?: string },
) => useInspectorPanelStore.getState().updateLiveWidget(widgetId, data)
