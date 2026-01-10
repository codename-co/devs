import { create } from 'zustand'

import type { SearchResult } from './search-engine'

interface SearchState {
  // UI state
  isOpen: boolean
  query: string
  results: SearchResult[]
  isSearching: boolean
  selectedIndex: number

  // Actions
  open: () => void
  close: () => void
  setQuery: (query: string) => void
  setResults: (results: SearchResult[]) => void
  setIsSearching: (isSearching: boolean) => void
  setSelectedIndex: (index: number) => void
  selectNext: () => void
  selectPrevious: () => void
  reset: () => void
}

export const useSearchStore = create<SearchState>((set, get) => ({
  // Initial state
  isOpen: false,
  query: '',
  results: [],
  isSearching: false,
  selectedIndex: 0,

  // Actions
  open: () => set({ isOpen: true }),

  close: () => {
    set({
      isOpen: false,
      query: '',
      results: [],
      isSearching: false,
      selectedIndex: 0,
    })
  },

  setQuery: (query) => set({ query }),

  setResults: (results) => set({ results, selectedIndex: 0 }),

  setIsSearching: (isSearching) => set({ isSearching }),

  setSelectedIndex: (index) => set({ selectedIndex: index }),

  selectNext: () => {
    const { results, selectedIndex } = get()
    if (results.length === 0) return
    set({ selectedIndex: (selectedIndex + 1) % results.length })
  },

  selectPrevious: () => {
    const { results, selectedIndex } = get()
    if (results.length === 0) return
    set({
      selectedIndex: (selectedIndex - 1 + results.length) % results.length,
    })
  },

  reset: () =>
    set({
      query: '',
      results: [],
      isSearching: false,
      selectedIndex: 0,
    }),
}))
