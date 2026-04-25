/**
 * `useStageT` — translator for shared scenes.
 *
 * Shared scene components (SceneHook, SceneCTA, ScenePromise, SceneCollapse)
 * receive plain string props from each video composition. To keep those
 * compositions free of `useI18n` / hook plumbing (they're rendered outside
 * any I18n provider until Stage mounts), the strings are passed as raw
 * English keys. This helper resolves them against the dictionary that was
 * handed to `<Stage i18nDict={…}>` and returns the translation for the
 * currently selected in-player language.
 *
 * Pass-through behaviour: when no dict is registered, or the key isn't
 * found in the active locale, the original key is returned unchanged so
 * English keeps rendering correctly.
 */
import { useCallback } from 'react'
import { useI18n } from '@/i18n'
import { useTimeline } from '../assets/player'

export function useStageT() {
  const { i18nDict } = useTimeline()
  const { lang } = useI18n()

  return useCallback(
    (key: string): string => {
      if (!key || !i18nDict) return key
      const locale = i18nDict[lang]
      if (!locale || Array.isArray(locale)) return key
      return (locale as Record<string, string>)[key] ?? key
    },
    [i18nDict, lang],
  )
}
