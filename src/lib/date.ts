export const isDate = (value: unknown): value is Date => {
  if (value instanceof Date) {
    return !isNaN(value.getTime())
  }
  if (typeof value === 'string') {
    return !isNaN(new Date(value).getTime())
  }
  return false
}

/** Safely coerce an unknown date-like value to epoch-ms (returns 0 on failure). */
export function toEpoch(v: unknown): number {
  if (!v) return 0
  if (v instanceof Date) return v.getTime() || 0
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = new Date(v).getTime()
    return Number.isNaN(n) ? 0 : n
  }
  return 0
}

export const formatDateTime = (
  dateStr: string | Date,
  lang?: string,
): string => {
  return Intl.DateTimeFormat(lang, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(dateStr))
}

// Format a date string (YYYY-MM-DD or YYYY-MM) for compact display
export const formatDateCompact = (
  dateStr: string | Date,
  lang?: string,
): string => {
  return Intl.DateTimeFormat(lang, {
    year: 'numeric',
    month: 'short',
  }).format(new Date(dateStr))
}
