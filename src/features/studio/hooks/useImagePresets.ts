/**
 * useImagePresets Hook
 *
 * React hook for managing image generation presets.
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  ImagePreset,
  ImageGenerationSettings,
  DEFAULT_IMAGE_SETTINGS,
  PresetCategory,
} from '../types'
import {
  BUILT_IN_PRESETS,
  getPresetsByCategory,
} from '../data/presets'

const CUSTOM_PRESETS_KEY = 'devs-image-presets'

export interface UseImagePresetsReturn {
  /** All available presets (built-in + custom) */
  presets: ImagePreset[]
  /** Built-in presets only */
  builtInPresets: ImagePreset[]
  /** Custom user presets */
  customPresets: ImagePreset[]
  /** Currently active preset */
  activePreset: ImagePreset | null
  /** Current settings (from preset or custom) */
  currentSettings: ImageGenerationSettings
  /** Select a preset by ID */
  selectPreset: (presetId: string | null) => void
  /** Apply a preset's settings */
  applyPreset: (preset: ImagePreset) => ImageGenerationSettings
  /** Update current settings */
  updateSettings: (settings: Partial<ImageGenerationSettings>) => void
  /** Reset settings to defaults */
  resetSettings: () => void
  /** Save current settings as a new preset */
  saveAsPreset: (name: string, description?: string, tags?: string[]) => ImagePreset
  /** Update an existing custom preset */
  updatePreset: (presetId: string, updates: Partial<ImagePreset>) => void
  /** Delete a custom preset */
  deletePreset: (presetId: string) => void
  /** Get presets by category */
  getByCategory: (category: PresetCategory) => ImagePreset[]
  /** Search presets */
  search: (query: string) => ImagePreset[]
  /** Export presets to JSON */
  exportPresets: () => string
  /** Import presets from JSON */
  importPresets: (json: string) => number
}

export function useImagePresets(): UseImagePresetsReturn {
  const [customPresets, setCustomPresets] = useState<ImagePreset[]>([])
  const [activePresetId, setActivePresetId] = useState<string | null>(null)
  const [currentSettings, setCurrentSettings] = useState<ImageGenerationSettings>(
    DEFAULT_IMAGE_SETTINGS,
  )

  // Load custom presets from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_PRESETS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Convert date strings back to Date objects
        const presets = parsed.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: p.updatedAt ? new Date(p.updatedAt) : undefined,
        }))
        setCustomPresets(presets)
      }
    } catch (err) {
      console.error('Failed to load custom presets:', err)
    }
  }, [])

  // Save custom presets to localStorage
  const saveCustomPresets = useCallback((presets: ImagePreset[]) => {
    try {
      localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets))
      setCustomPresets(presets)
    } catch (err) {
      console.error('Failed to save custom presets:', err)
    }
  }, [])

  // All presets combined
  const presets = useMemo(
    () => [...BUILT_IN_PRESETS, ...customPresets],
    [customPresets],
  )

  // Active preset object
  const activePreset = useMemo(
    () => (activePresetId ? presets.find((p) => p.id === activePresetId) || null : null),
    [activePresetId, presets],
  )

  // Select a preset
  const selectPreset = useCallback(
    (presetId: string | null) => {
      setActivePresetId(presetId)

      if (presetId) {
        const preset = presets.find((p) => p.id === presetId)
        if (preset) {
          setCurrentSettings({
            ...DEFAULT_IMAGE_SETTINGS,
            ...preset.settings,
          })
        }
      }
    },
    [presets],
  )

  // Apply a preset's settings
  const applyPreset = useCallback((preset: ImagePreset): ImageGenerationSettings => {
    const newSettings = {
      ...DEFAULT_IMAGE_SETTINGS,
      ...preset.settings,
    }
    setCurrentSettings(newSettings)
    setActivePresetId(preset.id)
    return newSettings
  }, [])

  // Update current settings
  const updateSettings = useCallback((settings: Partial<ImageGenerationSettings>) => {
    setCurrentSettings((prev) => ({
      ...prev,
      ...settings,
    }))
    // Clear active preset when manually changing settings
    setActivePresetId(null)
  }, [])

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setCurrentSettings(DEFAULT_IMAGE_SETTINGS)
    setActivePresetId(null)
  }, [])

  // Save as new preset
  const saveAsPreset = useCallback(
    (name: string, description?: string, tags?: string[]): ImagePreset => {
      const newPreset: ImagePreset = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        description,
        settings: { ...currentSettings },
        tags,
        isBuiltIn: false,
        createdAt: new Date(),
      }

      saveCustomPresets([...customPresets, newPreset])
      setActivePresetId(newPreset.id)

      return newPreset
    },
    [currentSettings, customPresets, saveCustomPresets],
  )

  // Update existing preset
  const updatePreset = useCallback(
    (presetId: string, updates: Partial<ImagePreset>) => {
      const preset = customPresets.find((p) => p.id === presetId)
      if (!preset || preset.isBuiltIn) {
        console.warn('Cannot update built-in preset or preset not found')
        return
      }

      const updatedPresets = customPresets.map((p) =>
        p.id === presetId ? { ...p, ...updates, updatedAt: new Date() } : p,
      )
      saveCustomPresets(updatedPresets)
    },
    [customPresets, saveCustomPresets],
  )

  // Delete custom preset
  const deletePreset = useCallback(
    (presetId: string) => {
      const preset = customPresets.find((p) => p.id === presetId)
      if (!preset) return

      if (preset.isBuiltIn) {
        console.warn('Cannot delete built-in preset')
        return
      }

      saveCustomPresets(customPresets.filter((p) => p.id !== presetId))

      if (activePresetId === presetId) {
        setActivePresetId(null)
      }
    },
    [customPresets, activePresetId, saveCustomPresets],
  )

  // Get by category
  const getByCategory = useCallback(
    (category: PresetCategory): ImagePreset[] => {
      if (category === 'custom') {
        return customPresets
      }
      return getPresetsByCategory(category)
    },
    [customPresets],
  )

  // Search presets
  const search = useCallback(
    (query: string): ImagePreset[] => {
      if (!query.trim()) return presets

      const lowerQuery = query.toLowerCase()
      return presets.filter(
        (preset) =>
          preset.name.toLowerCase().includes(lowerQuery) ||
          preset.description?.toLowerCase().includes(lowerQuery) ||
          preset.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)),
      )
    },
    [presets],
  )

  // Export presets
  const exportPresets = useCallback((): string => {
    return JSON.stringify(customPresets, null, 2)
  }, [customPresets])

  // Import presets
  const importPresets = useCallback(
    (json: string): number => {
      try {
        const imported = JSON.parse(json)
        if (!Array.isArray(imported)) {
          throw new Error('Invalid preset format')
        }

        const validPresets = imported.filter(
          (p) => p.name && typeof p.settings === 'object',
        )

        // Regenerate IDs to avoid conflicts
        const newPresets = validPresets.map((p: any) => ({
          ...p,
          id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          isBuiltIn: false,
          createdAt: new Date(),
        }))

        saveCustomPresets([...customPresets, ...newPresets])
        return newPresets.length
      } catch (err) {
        console.error('Failed to import presets:', err)
        return 0
      }
    },
    [customPresets, saveCustomPresets],
  )

  return {
    presets,
    builtInPresets: BUILT_IN_PRESETS,
    customPresets,
    activePreset,
    currentSettings,
    selectPreset,
    applyPreset,
    updateSettings,
    resetSettings,
    saveAsPreset,
    updatePreset,
    deletePreset,
    getByCategory,
    search,
    exportPresets,
    importPresets,
  }
}
