import { create } from 'zustand'
import { nanoid } from 'nanoid'
import { modelLoadEvents } from '@/lib/yjs'

interface ModelLoadingProgress {
  status: 'idle' | 'loading' | 'downloading' | 'ready' | 'error'
  message?: string
  progress?: number
  loaded?: number
  total?: number
  modelName?: string
}

/** Persisted record of a model load event (stored in Yjs). */
export interface ModelLoadEvent {
  id: string
  startedAt: number
  completedAt?: number
  status: 'loading' | 'downloading' | 'ready' | 'error'
  progress: number
  /** Model identifier (e.g. HuggingFace repo name) */
  modelName?: string
  /** Total model size in bytes (from download progress) */
  modelSize?: number
}

interface LocalLLMStore {
  loadingProgress: ModelLoadingProgress
  /** ID of the current in-flight load event (for Yjs updates). */
  currentLoadEventId: string | null
  setLoadingProgress: (progress: ModelLoadingProgress) => void
}

export const useLocalLLMStore = create<LocalLLMStore>((set, get) => ({
  loadingProgress: {
    status: 'idle',
  },
  currentLoadEventId: null,
  setLoadingProgress: (progress) => {
    const prev = get().loadingProgress
    const prevStatus = prev.status
    const nextStatus = progress.status

    let currentLoadEventId = get().currentLoadEventId

    // Transition from idle → loading/downloading: create a new persisted event
    if (
      (prevStatus === 'idle' || prevStatus === 'ready' || prevStatus === 'error') &&
      (nextStatus === 'loading' || nextStatus === 'downloading')
    ) {
      const id = nanoid()
      const event: ModelLoadEvent = {
        id,
        startedAt: Date.now(),
        status: nextStatus,
        progress: progress.progress ?? 0,
        modelName: progress.modelName,
      }
      modelLoadEvents.set(id, event)
      currentLoadEventId = id
    }
    // Still loading/downloading: update progress on persisted event
    else if (nextStatus === 'loading' || nextStatus === 'downloading') {
      if (currentLoadEventId) {
        const existing = modelLoadEvents.get(currentLoadEventId)
        if (existing && !existing.completedAt) {
          modelLoadEvents.set(currentLoadEventId, {
            ...existing,
            status: nextStatus,
            progress: progress.progress ?? 0,
            // Capture total model size from download progress
            modelSize: progress.total ?? existing.modelSize,
          })
        }
      }
    }
    // Transition to ready/error: mark completion on persisted event
    else if (
      (nextStatus === 'ready' || nextStatus === 'error') &&
      currentLoadEventId
    ) {
      const existing = modelLoadEvents.get(currentLoadEventId)
      if (existing && !existing.completedAt) {
        modelLoadEvents.set(currentLoadEventId, {
          ...existing,
          completedAt: Date.now(),
          status: nextStatus,
          progress: nextStatus === 'ready' ? 100 : existing.progress,
        })
      }
      currentLoadEventId = null
    }

    set({ loadingProgress: progress, currentLoadEventId })
  },
}))
