import { create } from 'zustand'
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
}

export const userSettings = create<UserSettingsStore>((set) => ({
  ...defaultSettings,
  setTheme: (theme: ThemeMode) => set({ theme }),
  setLanguage: (language: Lang) => set({ language }),
  toggleDrawer: () =>
    set((state) => ({ isDrawerCollapsed: !state.isDrawerCollapsed })),
}))
