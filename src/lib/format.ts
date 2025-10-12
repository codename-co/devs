import prettyBytes from 'pretty-bytes'

import { defaultLang, type Lang } from '@/i18n'

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, lang?: Lang): string {
  return prettyBytes(bytes, { locale: lang ?? defaultLang })
}

/**
 * Format time duration in seconds to human-readable string
 */
export function formatDuration(duration: number, lang?: Lang): string {
  const days = Math.floor(duration / 86400)
  const hours = Math.floor(duration / 3600) - days * 24
  const minutes = Math.floor((duration % 3600) / 60) // - days * 24 * 60 - hours * 60
  const seconds = duration % 60

  console.log({ days, hours, minutes, seconds })

  // @ts-ignore
  return new Intl.DurationFormat(lang ?? defaultLang, {
    notation: 'short',
  }).format({ days, hours, minutes, seconds })
}
