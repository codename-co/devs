import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '@/i18n/utils'

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
  platformName?: string
  backgroundImage?: string
  speechToTextEnabled: boolean
  pwaInstallPromptDismissed: boolean
}

const defaultSettings: UserSettings = {
  theme: 'system',
  language: 'en',
  isDrawerCollapsed: true,
  speechToTextEnabled: false,
  pwaInstallPromptDismissed: false,
}
interface UserSettingsStore extends UserSettings {
  setTheme: (theme: ThemeMode) => void
  setLanguage: (language: Lang) => void
  toggleDrawer: () => void
  setPlatformName: (platformName: string) => void
  setBackgroundImage: (backgroundImage: string | undefined) => void
  setSpeechToTextEnabled: (enabled: boolean) => void
  setPwaInstallPromptDismissed: (dismissed: boolean) => void
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
      setPlatformName: (platformName: string) => set({ platformName }),
      setBackgroundImage: (backgroundImage: string | undefined) =>
        set({ backgroundImage }),
      setSpeechToTextEnabled: (enabled: boolean) =>
        set({ speechToTextEnabled: enabled }),
      setPwaInstallPromptDismissed: (dismissed: boolean) =>
        set({ pwaInstallPromptDismissed: dismissed }),
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
        platformName: state.platformName,
        backgroundImage: state.backgroundImage,
        speechToTextEnabled: state.speechToTextEnabled,
        pwaInstallPromptDismissed: state.pwaInstallPromptDismissed,
      }),
    },
  ),
)
