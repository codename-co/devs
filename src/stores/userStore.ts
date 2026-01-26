import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '@/i18n/utils'
import type { ImageProvider, ImageModel } from '@/features/studio/types'
import type {
  STTProviderType,
  TTSProviderType,
} from '@/features/live/lib/types'

// type User = {
//   firstname: string
//   avatar: string
// }

// User settings for theme, language, etc.
export type ThemeMode = 'light' | 'dark' | 'system'

export interface UserSettings {
  theme: ThemeMode
  language: Lang
  isDrawerCollapsed: boolean
  isContextualPanelCollapsed: boolean
  platformName?: string
  backgroundImage?: string
  speechToTextEnabled: boolean
  pwaInstallPromptDismissed: boolean
  hideDefaultAgents: boolean
  // Image Generation defaults
  defaultImageProvider?: ImageProvider
  defaultImageModel?: ImageModel
  // Voice settings
  kokoroVoiceId?: string // Selected Kokoro TTS voice (default: af_heart)
  sttProvider?: STTProviderType // Selected STT provider (default: web-speech)
  ttsProvider?: TTSProviderType // Selected TTS provider (default: web-speech)
  liveAutoSpeak?: boolean // Auto-speak AI responses in Live mode (default: true)
  // Memory settings
  autoMemoryLearning?: boolean // Auto-learn from conversations (default: false)
  // Global system instructions
  globalSystemInstructions?: string // Global instructions injected into all agent prompts
}

const defaultSettings: UserSettings = {
  theme: 'system',
  language: 'en',
  isDrawerCollapsed: true,
  isContextualPanelCollapsed: false,
  speechToTextEnabled: false,
  pwaInstallPromptDismissed: false,
  hideDefaultAgents: false,
}
interface UserSettingsStore extends UserSettings {
  setTheme: (theme: ThemeMode) => void
  setLanguage: (language: Lang) => void
  toggleDrawer: () => void
  toggleContextualPanel: () => void
  setPlatformName: (platformName: string) => void
  setBackgroundImage: (backgroundImage: string | undefined) => void
  setSpeechToTextEnabled: (enabled: boolean) => void
  setPwaInstallPromptDismissed: (dismissed: boolean) => void
  setHideDefaultAgents: (hide: boolean) => void
  setDefaultImageProvider: (provider: ImageProvider | undefined) => void
  setDefaultImageModel: (model: ImageModel | undefined) => void
  setKokoroVoiceId: (voiceId: string | undefined) => void
  setSTTProvider: (provider: STTProviderType | undefined) => void
  setTTSProvider: (provider: TTSProviderType | undefined) => void
  setLiveAutoSpeak: (enabled: boolean) => void
  setAutoMemoryLearning: (enabled: boolean) => void
  setGlobalSystemInstructions: (instructions: string | undefined) => void
  isDarkTheme: () => boolean
}

export const userSettings = create<UserSettingsStore>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      setTheme: (theme: ThemeMode) => set({ theme }),
      setLanguage: (language: Lang) => set({ language }),
      toggleDrawer: () =>
        set((state) => ({ isDrawerCollapsed: !state.isDrawerCollapsed })),
      toggleContextualPanel: () =>
        set((state) => ({
          isContextualPanelCollapsed: !state.isContextualPanelCollapsed,
        })),
      setPlatformName: (platformName: string) => set({ platformName }),
      setBackgroundImage: (backgroundImage: string | undefined) =>
        set({ backgroundImage }),
      setSpeechToTextEnabled: (enabled: boolean) =>
        set({ speechToTextEnabled: enabled }),
      setPwaInstallPromptDismissed: (dismissed: boolean) =>
        set({ pwaInstallPromptDismissed: dismissed }),
      setHideDefaultAgents: (hide: boolean) => set({ hideDefaultAgents: hide }),
      setDefaultImageProvider: (provider: ImageProvider | undefined) =>
        set({ defaultImageProvider: provider }),
      setDefaultImageModel: (model: ImageModel | undefined) =>
        set({ defaultImageModel: model }),
      setKokoroVoiceId: (voiceId: string | undefined) =>
        set({ kokoroVoiceId: voiceId }),
      setSTTProvider: (provider: STTProviderType | undefined) =>
        set({ sttProvider: provider }),
      setTTSProvider: (provider: TTSProviderType | undefined) =>
        set({ ttsProvider: provider }),
      setLiveAutoSpeak: (enabled: boolean) => set({ liveAutoSpeak: enabled }),
      setAutoMemoryLearning: (enabled: boolean) =>
        set({ autoMemoryLearning: enabled }),
      setGlobalSystemInstructions: (instructions: string | undefined) =>
        set({ globalSystemInstructions: instructions }),
      isDarkTheme: () => {
        const { theme } = get()
        if (theme === 'dark') return true
        if (theme === 'light') return false
        // For 'system', check the user's system preference
        return window.matchMedia('(prefers-color-scheme: dark)').matches
      },
    }),
    {
      name: 'devs-user-settings',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        isDrawerCollapsed: state.isDrawerCollapsed,
        isContextualPanelCollapsed: state.isContextualPanelCollapsed,
        platformName: state.platformName,
        backgroundImage: state.backgroundImage,
        speechToTextEnabled: state.speechToTextEnabled,
        pwaInstallPromptDismissed: state.pwaInstallPromptDismissed,
        hideDefaultAgents: state.hideDefaultAgents,
        defaultImageProvider: state.defaultImageProvider,
        defaultImageModel: state.defaultImageModel,
        kokoroVoiceId: state.kokoroVoiceId,
        sttProvider: state.sttProvider,
        ttsProvider: state.ttsProvider,
        liveAutoSpeak: state.liveAutoSpeak,
        autoMemoryLearning: state.autoMemoryLearning,
        globalSystemInstructions: state.globalSystemInstructions,
      }),
    },
  ),
)
