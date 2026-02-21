export const isDate = (value: unknown): value is Date => {
  if (value instanceof Date) {
    return !isNaN(value.getTime())
  }
  if (typeof value === 'string') {
    return !isNaN(new Date(value).getTime())
  }
  return false
}
