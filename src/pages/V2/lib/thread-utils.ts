import type { Lang } from '@/i18n'

/** Relative time string, e.g. "3 min ago", "Yesterday", "Mar 2" */
export function formatRelativeTime(
  dateStr: string | Date,
  _locale: Lang = 'en',
): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  const now = Date.now()
  const diff = now - date.getTime()

  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return 'Just now'
  if (diff < hour) return `${Math.floor(diff / minute)}m`
  if (diff < day) return `${Math.floor(diff / hour)}h`
  if (diff < 2 * day) return 'Yesterday'

  return date.toLocaleDateString(_locale, { month: 'short', day: 'numeric' })
}

/** First N chars + ellipsis */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '…'
}

/** Strip markdown formatting for snippet display */
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '[code]')
    .replace(/`[^`]+`/g, (m) => m.slice(1, -1))
    .replace(/[#*_~>\[\]!()-]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
}
