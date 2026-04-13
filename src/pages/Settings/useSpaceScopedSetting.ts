/**
 * useSpaceScopedSetting — Hook for reading and writing settings that respect
 * the current settings scope (global vs per-space override).
 *
 * When the scope is 'global', reads/writes go through the normal userSettings store.
 * When the scope is 'space', reads come from space overrides (falling back to global),
 * and writes go to the space override layer.
 */

import { useCallback, useEffect, useState } from 'react'
import { useSettingsScope } from './SettingsContext'
import {
  type SyncedSettings,
  getSpaceSettingsOverride,
  setSpaceSettingOverride,
  getEffectiveSettings,
} from '@/stores/userStore'
import { useActiveSpaceId } from '@/stores/spaceStore'
import { spaceSettings, preferences } from '@/lib/yjs'

/**
 * Hook that returns [value, setter] for a synced setting,
 * scoped by the current settings context (global or active space).
 *
 * In global scope: reads from global settings, writes via userSettings setter.
 * In space scope: reads from space override (falls back to global), writes to space override.
 */
export function useSpaceScopedSetting<K extends keyof SyncedSettings>(
  key: K,
  globalValue: SyncedSettings[K],
  globalSetter: (value: SyncedSettings[K]) => void,
): [SyncedSettings[K], (value: SyncedSettings[K]) => void, boolean] {
  const scope = useSettingsScope()
  const spaceId = useActiveSpaceId()

  // For space scope, compute effective value
  const [spaceValue, setSpaceValue] = useState<SyncedSettings[K]>(() => {
    if (scope !== 'space') return globalValue
    const overrides = getSpaceSettingsOverride(spaceId)
    return key in overrides
      ? (overrides[key] as SyncedSettings[K])
      : globalValue
  })

  // Track whether this key has a space override
  const [hasOverride, setHasOverride] = useState(() => {
    if (scope !== 'space') return false
    const overrides = getSpaceSettingsOverride(spaceId)
    return key in overrides
  })

  // Re-sync when scope, spaceId, or Yjs data changes
  useEffect(() => {
    if (scope !== 'space') return

    const update = () => {
      const overrides = getSpaceSettingsOverride(spaceId)
      const isOverridden = key in overrides
      setHasOverride(isOverridden)
      setSpaceValue(
        isOverridden
          ? (overrides[key] as SyncedSettings[K])
          : (getEffectiveSettings(spaceId)[key] as SyncedSettings[K]),
      )
    }
    update()

    spaceSettings.observe(update)
    preferences.observe(update)
    return () => {
      spaceSettings.unobserve(update)
      preferences.unobserve(update)
    }
  }, [scope, spaceId, key])

  const spaceSetter = useCallback(
    (value: SyncedSettings[K]) => {
      setSpaceSettingOverride(spaceId, key, value)
      setSpaceValue(value)
      setHasOverride(true)
    },
    [spaceId, key],
  )

  if (scope === 'global') {
    return [globalValue, globalSetter, false]
  }

  return [spaceValue, spaceSetter, hasOverride]
}
