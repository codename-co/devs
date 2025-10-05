import prettyBytes from 'pretty-bytes'

import { defaultLang, type Lang } from '@/i18n'

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, lang?: Lang): string {
  return prettyBytes(bytes, { locale: lang ?? defaultLang })

  // const byteValueNumberFormatter = Intl.NumberFormat(lang ?? defaultLang, {
  //   notation: 'compact',
  //   style: 'unit',
  //   unit: 'byte',
  //   unitDisplay: 'narrow',
  // })

  // return byteValueNumberFormatter.format(bytes)
}
