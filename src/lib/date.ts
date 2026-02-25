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
