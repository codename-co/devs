import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { Lang } from '@/i18n/utils'
import type { ImageProvider, ImageModel } from '@/features/studio/types'
import type {
  STTProviderType,
  TTSProviderType,
} from '@/features/live/lib/types'
import type { ModelTierConfig } from '@/types'
import { preferences, spaceSettings, whenReady } from '@/lib/yjs'
import { getColorTheme, isThemeDark, DEFAULT_COLOR_THEME } from '@/lib/themes'

// ============================================================================
// Types
// ============================================================================

export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * Settings that sync across devices via Yjs
 */
export interface SyncedSettings {
  platformName?: string
  backgroundImage?: string
  hideDefaultAgents: boolean
  // Theme overrides (per-space; when undefined, LocalSettings values apply)
  theme?: ThemeMode
  colorTheme?: string
  // Image Generation defaults
  defaultImageProvider?: ImageProvider
  defaultImageModel?: ImageModel
  // Voice settings
  kokoroVoiceId?: string
  sttProvider?: STTProviderType
  ttsProvider?: TTSProviderType
  liveAutoSpeak?: boolean
  // Memory settings
  autoMemoryLearning?: boolean
  // Suggestions
  suggestionsEnabled?: boolean
  // Web search grounding
  enableWebSearchGrounding?: boolean
  // Global system instructions
  globalSystemInstructions?: string
  // HITL — YOLO mode (auto-resolve all human-in-the-loop requests)
  yoloMode?: boolean
  // Model tiers
  fastModel?: ModelTierConfig
  balancedModel?: ModelTierConfig
  thinkingModel?: ModelTierConfig
  // PPTX presentation theme ('auto' = inherit from color theme)
  pptxTheme?: string
}

/**
 * Settings that stay local to this device (not synced)
 */
export interface LocalSettings {
  theme: ThemeMode
  /** Active color-scheme id (see src/lib/themes.ts) */
  colorTheme: string
  language: Lang
  isDrawerCollapsed: boolean
  isV2SidebarCollapsed: boolean
  isContextualPanelCollapsed: boolean
  speechToTextEnabled: boolean
  pwaInstallPromptDismissed: boolean
  /** Active space id (local per device) */
  activeSpaceId: string
}

export interface UserSettings extends Omit<SyncedSettings, 'theme' | 'colorTheme'>, LocalSettings {}

// ============================================================================
// Defaults
// ============================================================================

const defaultSyncedSettings: SyncedSettings = {
  hideDefaultAgents: false,
  suggestionsEnabled: true,
  enableWebSearchGrounding: true,
  yoloMode: false,
}

const defaultLocalSettings: LocalSettings = {
  theme: 'system',
  colorTheme: DEFAULT_COLOR_THEME,
  language: 'en',
  isDrawerCollapsed: true,
  isV2SidebarCollapsed: false,
  isContextualPanelCollapsed: false,
  speechToTextEnabled: false,
  pwaInstallPromptDismissed: false,
  activeSpaceId: 'default',
}

// ============================================================================
// Yjs Synced Settings Helpers
// ============================================================================

// Key used to store all synced settings in the preferences map
const SYNCED_SETTINGS_KEY = 'userSettings'

function getSyncedSettings(): SyncedSettings {
  const stored = preferences.get(SYNCED_SETTINGS_KEY) as
    | SyncedSettings
    | undefined
  return { ...defaultSyncedSettings, ...stored }
}

function setSyncedSetting<K extends keyof SyncedSettings>(
  key: K,
  value: SyncedSettings[K],
): void {
  const current = getSyncedSettings()
  preferences.set(SYNCED_SETTINGS_KEY, { ...current, [key]: value })
}

// ============================================================================
// Zustand Store (Local Settings + Combined Interface)
// ============================================================================

interface UserSettingsStore extends UserSettings {
  // Synced settings setters (write to Yjs)
  setPlatformName: (platformName: string) => void
  setBackgroundImage: (backgroundImage: string | undefined) => void
  setHideDefaultAgents: (hide: boolean) => void
  setDefaultImageProvider: (provider: ImageProvider | undefined) => void
  setDefaultImageModel: (model: ImageModel | undefined) => void
  setKokoroVoiceId: (voiceId: string | undefined) => void
  setSTTProvider: (provider: STTProviderType | undefined) => void
  setTTSProvider: (provider: TTSProviderType | undefined) => void
  setLiveAutoSpeak: (enabled: boolean) => void
  setAutoMemoryLearning: (enabled: boolean) => void
  setSuggestionsEnabled: (enabled: boolean) => void
  setEnableWebSearchGrounding: (enabled: boolean) => void
  setGlobalSystemInstructions: (instructions: string | undefined) => void
  setYoloMode: (enabled: boolean) => void
  setFastModel: (config: ModelTierConfig | undefined) => void
  setBalancedModel: (config: ModelTierConfig | undefined) => void
  setThinkingModel: (config: ModelTierConfig | undefined) => void
  setPptxTheme: (pptxTheme: string | undefined) => void
  setSyncedTheme: (theme: ThemeMode | undefined) => void
  setSyncedColorTheme: (colorTheme: string | undefined) => void

  // Local settings setters (localStorage only)
  setTheme: (theme: ThemeMode) => void
  setColorTheme: (colorTheme: string) => void
  setLanguage: (language: Lang) => void
  toggleDrawer: () => void
  toggleV2Sidebar: () => void
  toggleContextualPanel: () => void
  setSpeechToTextEnabled: (enabled: boolean) => void
  setPwaInstallPromptDismissed: (dismissed: boolean) => void
  setActiveSpaceId: (id: string) => void

  // Helpers
  isDarkTheme: () => boolean

  // Internal: update synced settings from Yjs
  _updateFromYjs: (settings: SyncedSettings) => void
}

export const userSettings = create<UserSettingsStore>()(
  persist(
    (set, get) => ({
      // Default values (synced will be overwritten by Yjs observer)
      ...defaultLocalSettings,
      ...defaultSyncedSettings,

      // ========================================
      // Synced Settings (write to Yjs)
      // ========================================
      setPlatformName: (platformName: string) => {
        setSyncedSetting('platformName', platformName)
        set({ platformName })
      },
      setBackgroundImage: (backgroundImage: string | undefined) => {
        setSyncedSetting('backgroundImage', backgroundImage)
        set({ backgroundImage })
      },
      setHideDefaultAgents: (hide: boolean) => {
        setSyncedSetting('hideDefaultAgents', hide)
        set({ hideDefaultAgents: hide })
      },
      setDefaultImageProvider: (provider: ImageProvider | undefined) => {
        setSyncedSetting('defaultImageProvider', provider)
        set({ defaultImageProvider: provider })
      },
      setDefaultImageModel: (model: ImageModel | undefined) => {
        setSyncedSetting('defaultImageModel', model)
        set({ defaultImageModel: model })
      },
      setKokoroVoiceId: (voiceId: string | undefined) => {
        setSyncedSetting('kokoroVoiceId', voiceId)
        set({ kokoroVoiceId: voiceId })
      },
      setSTTProvider: (provider: STTProviderType | undefined) => {
        setSyncedSetting('sttProvider', provider)
        set({ sttProvider: provider })
      },
      setTTSProvider: (provider: TTSProviderType | undefined) => {
        setSyncedSetting('ttsProvider', provider)
        set({ ttsProvider: provider })
      },
      setLiveAutoSpeak: (enabled: boolean) => {
        setSyncedSetting('liveAutoSpeak', enabled)
        set({ liveAutoSpeak: enabled })
      },
      setAutoMemoryLearning: (enabled: boolean) => {
        setSyncedSetting('autoMemoryLearning', enabled)
        set({ autoMemoryLearning: enabled })
      },
      setSuggestionsEnabled: (enabled: boolean) => {
        setSyncedSetting('suggestionsEnabled', enabled)
        set({ suggestionsEnabled: enabled })
      },
      setEnableWebSearchGrounding: (enabled: boolean) => {
        setSyncedSetting('enableWebSearchGrounding', enabled)
        set({ enableWebSearchGrounding: enabled })
      },
      setGlobalSystemInstructions: (instructions: string | undefined) => {
        setSyncedSetting('globalSystemInstructions', instructions)
        set({ globalSystemInstructions: instructions })
      },
      setYoloMode: (enabled: boolean) => {
        setSyncedSetting('yoloMode', enabled)
        set({ yoloMode: enabled })
      },
      setFastModel: (config: ModelTierConfig | undefined) => {
        setSyncedSetting('fastModel', config)
        set({ fastModel: config })
      },
      setBalancedModel: (config: ModelTierConfig | undefined) => {
        setSyncedSetting('balancedModel', config)
        set({ balancedModel: config })
      },
      setThinkingModel: (config: ModelTierConfig | undefined) => {
        setSyncedSetting('thinkingModel', config)
        set({ thinkingModel: config })
      },
      setPptxTheme: (pptxTheme: string | undefined) => {
        setSyncedSetting('pptxTheme', pptxTheme)
        set({ pptxTheme })
      },
      setSyncedTheme: (theme: ThemeMode | undefined) => {
        setSyncedSetting('theme', theme)
      },
      setSyncedColorTheme: (colorTheme: string | undefined) => {
        setSyncedSetting('colorTheme', colorTheme)
      },

      // ========================================
      // Local Settings (localStorage only)
      // ========================================
      setTheme: (theme: ThemeMode) => set({ theme }),
      setColorTheme: (colorTheme: string) => set({ colorTheme }),
      setLanguage: (language: Lang) => set({ language }),
      toggleDrawer: () =>
        set((state) => ({ isDrawerCollapsed: !state.isDrawerCollapsed })),
      toggleV2Sidebar: () =>
        set((state) => ({ isV2SidebarCollapsed: !state.isV2SidebarCollapsed })),
      toggleContextualPanel: () =>
        set((state) => ({
          isContextualPanelCollapsed: !state.isContextualPanelCollapsed,
        })),
      setSpeechToTextEnabled: (enabled: boolean) =>
        set({ speechToTextEnabled: enabled }),
      setPwaInstallPromptDismissed: (dismissed: boolean) =>
        set({ pwaInstallPromptDismissed: dismissed }),
      setActiveSpaceId: (id: string) => set({ activeSpaceId: id }),

      // ========================================
      // Helpers
      // ========================================
      isDarkTheme: () => {
        const { theme, colorTheme } = get()
        // If a color theme with a dark background is active, treat as dark
        const ct = getColorTheme(colorTheme)
        if (isThemeDark(ct)) return true
        if (theme === 'dark') return true
        if (theme === 'light') return false
        return window.matchMedia('(prefers-color-scheme: dark)').matches
      },

      // Internal: called when Yjs preferences change
      _updateFromYjs: (settings: SyncedSettings) => {
        // Exclude theme and colorTheme — those are only used as space-level
        // overrides via spaceSettings, not as global synced values.
        // The local (device-level) theme/colorTheme from LocalSettings take precedence.
        const { theme: _t, colorTheme: _ct, ...rest } = settings
        set(rest)
      },
    }),
    {
      name: 'devs-user-settings',
      // Persist both local AND synced settings to localStorage.
      // Synced settings are cached here so the first render has the
      // last-known values (no flash to defaults while Yjs hydrates).
      // The Yjs observer overwrites them with authoritative values once ready.
      partialize: (state) => ({
        // Local settings
        theme: state.theme,
        colorTheme: state.colorTheme,
        language: state.language,
        isDrawerCollapsed: state.isDrawerCollapsed,
        isV2SidebarCollapsed: state.isV2SidebarCollapsed,
        isContextualPanelCollapsed: state.isContextualPanelCollapsed,
        speechToTextEnabled: state.speechToTextEnabled,
        pwaInstallPromptDismissed: state.pwaInstallPromptDismissed,
        activeSpaceId: state.activeSpaceId,
        // Synced settings (cached for fast startup)
        platformName: state.platformName,
        backgroundImage: state.backgroundImage,
        hideDefaultAgents: state.hideDefaultAgents,
        defaultImageProvider: state.defaultImageProvider,
        defaultImageModel: state.defaultImageModel,
        kokoroVoiceId: state.kokoroVoiceId,
        sttProvider: state.sttProvider,
        ttsProvider: state.ttsProvider,
        liveAutoSpeak: state.liveAutoSpeak,
        autoMemoryLearning: state.autoMemoryLearning,
        suggestionsEnabled: state.suggestionsEnabled,
        enableWebSearchGrounding: state.enableWebSearchGrounding,
        globalSystemInstructions: state.globalSystemInstructions,
        yoloMode: state.yoloMode,
        fastModel: state.fastModel,
        balancedModel: state.balancedModel,
        thinkingModel: state.thinkingModel,
        pptxTheme: state.pptxTheme,
      }),
    },
  ),
)

// ============================================================================
// Yjs Observer - Sync settings from Yjs to Zustand
// ============================================================================

let yjsObserverInitialized = false

/**
 * Initialize Yjs observer to sync settings changes to Zustand store.
 * Called automatically when the module is imported.
 */
function initYjsObserver(): void {
  if (yjsObserverInitialized) return
  yjsObserverInitialized = true

  // Observe changes to preferences map (fires when IndexedDB hydrates too)
  preferences.observe(() => {
    const settings = getSyncedSettings()
    userSettings.getState()._updateFromYjs(settings)
  })

  // Only load initial synced settings after Yjs has hydrated from IndexedDB.
  // Reading before hydration would overwrite Zustand with empty defaults,
  // causing a visible flash (correct → defaults → correct).
  whenReady.then(() => {
    const initial = getSyncedSettings()
    userSettings.getState()._updateFromYjs(initial)
  })
}

// Initialize observer on module load
initYjsObserver()

// ============================================================================
// React Hook for Synced Settings
// ============================================================================

/**
 * Hook to subscribe to synced user settings with Yjs reactivity.
 * Use this when you need real-time updates from other devices.
 */
export function useSyncedSettings(): SyncedSettings {
  const [settings, setSettings] = useState<SyncedSettings>(getSyncedSettings)

  useEffect(() => {
    const handler = () => setSettings(getSyncedSettings())
    preferences.observe(handler)
    return () => preferences.unobserve(handler)
  }, [])

  return settings
}

// ============================================================================
// Per-Space Settings Overrides
// ============================================================================

const DEFAULT_SPACE_ID = 'default'

/**
 * Get the raw settings overrides for a specific space.
 * Returns only the keys that have been explicitly overridden.
 */
export function getSpaceSettingsOverride(
  spaceId: string,
): Partial<SyncedSettings> {
  if (!spaceId || spaceId === DEFAULT_SPACE_ID) return {}
  return (spaceSettings.get(spaceId) as Partial<SyncedSettings>) ?? {}
}

/**
 * Override a single synced setting for a specific space.
 * Pass `undefined` as the value to remove the override (fall back to global).
 */
export function setSpaceSettingOverride<K extends keyof SyncedSettings>(
  spaceId: string,
  key: K,
  value: SyncedSettings[K] | undefined,
): void {
  if (!spaceId || spaceId === DEFAULT_SPACE_ID) return
  const current = getSpaceSettingsOverride(spaceId)
  if (value === undefined) {
    const { [key]: _, ...rest } = current
    if (Object.keys(rest).length === 0) {
      spaceSettings.delete(spaceId)
    } else {
      spaceSettings.set(spaceId, rest as Record<string, unknown>)
    }
  } else {
    spaceSettings.set(spaceId, {
      ...current,
      [key]: value,
    } as Record<string, unknown>)
  }
}

/**
 * Remove all settings overrides for a specific space, reverting to global defaults.
 */
export function clearSpaceSettingsOverrides(spaceId: string): void {
  if (!spaceId || spaceId === DEFAULT_SPACE_ID) return
  spaceSettings.delete(spaceId)
}

/**
 * Get the effective synced settings for a specific space.
 * Merges global settings with space-level overrides (space wins).
 */
export function getEffectiveSettings(
  spaceId?: string,
): SyncedSettings {
  const global = getSyncedSettings()
  const id = spaceId ?? userSettings.getState().activeSpaceId
  if (!id || id === DEFAULT_SPACE_ID) return global
  const overrides = getSpaceSettingsOverride(id)
  return { ...global, ...overrides }
}

/**
 * Reactive hook: returns effective synced settings for the active space.
 * Merges global settings with any space-level overrides.
 */
export function useEffectiveSettings(): SyncedSettings {
  const activeSpaceId = userSettings((s) => s.activeSpaceId)
  const [settings, setSettings] = useState<SyncedSettings>(() =>
    getEffectiveSettings(activeSpaceId),
  )

  useEffect(() => {
    const update = () => setSettings(getEffectiveSettings(activeSpaceId))
    // Re-compute when global settings or space overrides change
    preferences.observe(update)
    spaceSettings.observe(update)
    // Also re-compute immediately for the current space
    update()
    return () => {
      preferences.unobserve(update)
      spaceSettings.unobserve(update)
    }
  }, [activeSpaceId])

  return settings
}

/**
 * Get the effective theme and color theme for the active space.
 * Resolution order: space override → device-local default.
 */
export function getEffectiveTheme(spaceId?: string): {
  theme: ThemeMode
  colorTheme: string
} {
  const local = userSettings.getState()
  const id = spaceId ?? local.activeSpaceId
  if (!id || id === DEFAULT_SPACE_ID) {
    return { theme: local.theme, colorTheme: local.colorTheme }
  }
  const overrides = getSpaceSettingsOverride(id)
  return {
    theme: overrides.theme ?? local.theme,
    colorTheme: overrides.colorTheme ?? local.colorTheme,
  }
}

/**
 * Reactive hook: returns effective theme and color theme for the active space.
 */
export function useEffectiveTheme(): {
  theme: ThemeMode
  colorTheme: string
} {
  const activeSpaceId = userSettings((s) => s.activeSpaceId)
  const localTheme = userSettings((s) => s.theme)
  const localColorTheme = userSettings((s) => s.colorTheme)
  const [result, setResult] = useState(() =>
    getEffectiveTheme(activeSpaceId),
  )

  useEffect(() => {
    const update = () => setResult(getEffectiveTheme(activeSpaceId))
    update()
    spaceSettings.observe(update)
    return () => spaceSettings.unobserve(update)
  }, [activeSpaceId, localTheme, localColorTheme])

  return result
}
