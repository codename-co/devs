/**
 * SettingsContext — Allows nested setting sections to communicate a label
 * (with an optional icon) back up to the SettingsContent header.
 *
 * Also provides a "settings scope" context so sections know whether the user
 * is editing global settings or per-space overrides.
 *
 * Usage in a child component:
 *   useSettingsLabel('OpenAI')                     // header becomes "AI Providers › OpenAI"
 *   useSettingsLabel('OpenAI', 'sparkles')          // … with an icon
 *
 * The label is automatically cleared when the component unmounts.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import type { IconName } from '@/lib/types'

// ============================================================================
// Label context (existing)
// ============================================================================

export interface SettingsLabelInfo {
  label: string
  icon?: IconName
}

interface SettingsContextValue {
  labelInfo: SettingsLabelInfo | null
  setLabelInfo: (info: SettingsLabelInfo | null) => void
}

const SettingsContext = createContext<SettingsContextValue>({
  labelInfo: null,
  setLabelInfo: () => {},
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [labelInfo, setLabelInfo] = useState<SettingsLabelInfo | null>(null)
  const [scope, setScope] = useState<SettingsScope>('global')
  return (
    <SettingsContext.Provider value={{ labelInfo, setLabelInfo }}>
      <SettingsScopeContext.Provider value={{ scope, setScope }}>
        {children}
      </SettingsScopeContext.Provider>
    </SettingsContext.Provider>
  )
}

/**
 * Hook for child components to set a label (and optional icon) in the
 * Settings header.  The label is cleared automatically on unmount.
 */
export function useSettingsLabel(label: string | null, icon?: IconName) {
  const { setLabelInfo } = useContext(SettingsContext)

  useEffect(() => {
    setLabelInfo(label ? { label, icon } : null)
    return () => setLabelInfo(null)
  }, [label, icon, setLabelInfo])
}

/**
 * Hook for SettingsContent to read the current label info.
 */
export function useSettingsLabelInfo(): SettingsLabelInfo | null {
  return useContext(SettingsContext).labelInfo
}

// ============================================================================
// Settings scope context — global vs per-space
// ============================================================================

export type SettingsScope = 'global' | 'space'

interface SettingsScopeContextValue {
  scope: SettingsScope
  setScope: (scope: SettingsScope) => void
}

const SettingsScopeContext = createContext<SettingsScopeContextValue>({
  scope: 'global',
  setScope: () => {},
})

/** Read the current settings scope ('global' or 'space'). */
export function useSettingsScope(): SettingsScope {
  return useContext(SettingsScopeContext).scope
}

/** Read the scope setter. */
export function useSetSettingsScope(): (scope: SettingsScope) => void {
  return useContext(SettingsScopeContext).setScope
}
