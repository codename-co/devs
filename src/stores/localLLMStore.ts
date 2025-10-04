import { create } from 'zustand'

interface ModelLoadingProgress {
  status: 'idle' | 'loading' | 'downloading' | 'ready' | 'error'
  message?: string
  progress?: number
  loaded?: number
  total?: number
}

interface LocalLLMStore {
  loadingProgress: ModelLoadingProgress
  setLoadingProgress: (progress: ModelLoadingProgress) => void
}

export const useLocalLLMStore = create<LocalLLMStore>((set) => ({
  loadingProgress: {
    status: 'idle',
  },
  setLoadingProgress: (progress) =>
    set(() => ({
      loadingProgress: progress,
    })),
}))
