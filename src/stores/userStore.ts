import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { Lang } from '@/i18n/utils'
import type { ImageProvider, ImageModel } from '@/features/studio/types'
import type {
  STTProviderType,
  TTSProviderType,
} from '@/features/live/lib/types'
import { preferences } from '@/lib/yjs'

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
}

/**
 * Settings that stay local to this device (not synced)
 */
export interface LocalSettings {
  theme: ThemeMode
  language: Lang
  isDrawerCollapsed: boolean
  isContextualPanelCollapsed: boolean
  speechToTextEnabled: boolean
  pwaInstallPromptDismissed: boolean
}

export interface UserSettings extends SyncedSettings, LocalSettings {}

// ============================================================================
// Defaults
// ============================================================================

const defaultSyncedSettings: SyncedSettings = {
  hideDefaultAgents: false,
  suggestionsEnabled: true,
  enableWebSearchGrounding: true,
}

const defaultLocalSettings: LocalSettings = {
  theme: 'system',
  language: 'en',
  isDrawerCollapsed: true,
  isContextualPanelCollapsed: false,
  speechToTextEnabled: false,
  pwaInstallPromptDismissed: false,
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

  // Local settings setters (localStorage only)
  setTheme: (theme: ThemeMode) => void
  setLanguage: (language: Lang) => void
  toggleDrawer: () => void
  toggleContextualPanel: () => void
  setSpeechToTextEnabled: (enabled: boolean) => void
  setPwaInstallPromptDismissed: (dismissed: boolean) => void

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

      // ========================================
      // Local Settings (localStorage only)
      // ========================================
      setTheme: (theme: ThemeMode) => set({ theme }),
      setLanguage: (language: Lang) => set({ language }),
      toggleDrawer: () =>
        set((state) => ({ isDrawerCollapsed: !state.isDrawerCollapsed })),
      toggleContextualPanel: () =>
        set((state) => ({
          isContextualPanelCollapsed: !state.isContextualPanelCollapsed,
        })),
      setSpeechToTextEnabled: (enabled: boolean) =>
        set({ speechToTextEnabled: enabled }),
      setPwaInstallPromptDismissed: (dismissed: boolean) =>
        set({ pwaInstallPromptDismissed: dismissed }),

      // ========================================
      // Helpers
      // ========================================
      isDarkTheme: () => {
        const { theme } = get()
        if (theme === 'dark') return true
        if (theme === 'light') return false
        return window.matchMedia('(prefers-color-scheme: dark)').matches
      },

      // Internal: called when Yjs preferences change
      _updateFromYjs: (settings: SyncedSettings) => {
        set(settings)
      },
    }),
    {
      name: 'devs-user-settings',
      // Only persist local settings to localStorage
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        isDrawerCollapsed: state.isDrawerCollapsed,
        isContextualPanelCollapsed: state.isContextualPanelCollapsed,
        speechToTextEnabled: state.speechToTextEnabled,
        pwaInstallPromptDismissed: state.pwaInstallPromptDismissed,
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

  // Load initial synced settings from Yjs
  const initial = getSyncedSettings()
  userSettings.getState()._updateFromYjs(initial)

  // Observe changes to preferences map
  preferences.observe(() => {
    const settings = getSyncedSettings()
    userSettings.getState()._updateFromYjs(settings)
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
