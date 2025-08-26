import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '@/i18n/utils'

// type User = {
//   firstname: string
//   avatar: string
// }

// User settings for theme, language, etc.
export type ThemeMode = 'light' | 'dark' | 'auto'

export interface UserSettings {
  theme: ThemeMode
  language: Lang
  isDrawerCollapsed: boolean
  platformName?: string
  backgroundImage?: string
}

const defaultSettings: UserSettings = {
  theme: 'auto',
  language: 'en',
  isDrawerCollapsed: true,
}
interface UserSettingsStore extends UserSettings {
  setTheme: (theme: ThemeMode) => void
  setLanguage: (language: Lang) => void
  toggleDrawer: () => void
  setPlatformName: (platformName: string) => void
  setBackgroundImage: (backgroundImage: string | undefined) => void
}

export const userSettings = create<UserSettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,
      setTheme: (theme: ThemeMode) => set({ theme }),
      setLanguage: (language: Lang) => set({ language }),
      toggleDrawer: () =>
        set((state) => ({ isDrawerCollapsed: !state.isDrawerCollapsed })),
      setPlatformName: (platformName: string) => set({ platformName }),
      setBackgroundImage: (backgroundImage: string | undefined) => set({ backgroundImage }),
    }),
    {
      name: 'devs-user-settings',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        isDrawerCollapsed: state.isDrawerCollapsed,
        platformName: state.platformName,
        backgroundImage: state.backgroundImage,
      }),
    },
  ),
)
